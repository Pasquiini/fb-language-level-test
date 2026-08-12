import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  ActivatedRoute,
} from '@angular/router';

import {
  SpeakingAnswerService,
} from '../../core/services/speaking-answer.service';

import {
  TestQuestionItem,
  TestQuestionService,
} from '../../core/services/test-question.service';

@Component({
  selector: 'app-test-speaking',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl:
    './test-speaking.component.html',
  styleUrl:
    './test-speaking.component.scss',
})
export class TestSpeakingComponent
  implements OnInit, OnDestroy {

  private readonly route =
    inject(ActivatedRoute);

  private readonly questionService =
    inject(TestQuestionService);

  private readonly speakingAnswerService =
    inject(SpeakingAnswerService);

  readonly questions =
    signal<TestQuestionItem[]>([]);

  readonly currentIndex =
    signal(0);

  readonly loading =
    signal(true);

  readonly error =
    signal<string | null>(null);

  readonly recording =
    signal(false);

  readonly saving =
    signal(false);

  readonly elapsedSeconds =
    signal(0);

  readonly recordedAudioUrl =
    signal<string | null>(null);

  readonly hasSavedCurrentAnswer =
    signal(false);

  readonly currentQuestion =
    computed(
      () =>
        this.questions()[
          this.currentIndex()
        ] ?? null,
    );

  readonly isFirstQuestion =
    computed(
      () => this.currentIndex() === 0,
    );

  readonly isLastQuestion =
    computed(() => {
      const total =
        this.questions().length;

      return (
        total > 0 &&
        this.currentIndex() ===
          total - 1
      );
    });

  readonly formattedTime =
    computed(() => {
      const seconds =
        this.elapsedSeconds();

      const minutes =
        Math.floor(
          seconds / 60,
        );

      const remainingSeconds =
        seconds % 60;

      return (
        `${minutes
          .toString()
          .padStart(2, '0')}:` +
        remainingSeconds
          .toString()
          .padStart(2, '0')
      );
    });

  private testId: string | null =
    null;

  private attemptId: string | null =
    null;

  private mediaRecorder:
    MediaRecorder | null =
      null;

  private mediaStream:
    MediaStream | null =
      null;

  private recordedBlob:
    Blob | null =
      null;

  private chunks: Blob[] = [];

  private timerId:
    ReturnType<typeof setInterval> |
    null = null;

  async ngOnInit(): Promise<void> {
    this.testId =
      this.route.snapshot
        .queryParamMap
        .get('testId');

    this.attemptId =
      this.route.snapshot
        .queryParamMap
        .get('attemptId');

    if (
      !this.testId ||
      !this.attemptId
    ) {
      this.error.set(
        'Não foi possível identificar a avaliação atual.',
      );

      this.loading.set(false);
      return;
    }

    try {
      const questions =
        await this.questionService
          .getSpeakingQuestions(
            this.testId,
          );

      if (questions.length === 0) {
        this.error.set(
          'Nenhuma questão de speaking foi encontrada.',
        );

        return;
      }

      this.questions.set(
        questions,
      );
    } catch (error) {
      console.error(
        'Could not load speaking:',
        error,
      );

      this.error.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o speaking.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.cleanupRecording();
    this.revokeAudioUrl();
  }

  async startRecording(): Promise<void> {
    this.error.set(null);

    if (
      !navigator.mediaDevices ||
      !window.MediaRecorder
    ) {
      this.error.set(
        'Seu navegador não oferece suporte à gravação de áudio.',
      );

      return;
    }

    try {
      this.revokeAudioUrl();

      this.recordedBlob = null;
      this.chunks = [];

      this.elapsedSeconds.set(0);
      this.hasSavedCurrentAnswer.set(
        false,
      );

      this.mediaStream =
        await navigator.mediaDevices
          .getUserMedia({
            audio: true,
          });

      const mimeType =
        this.getSupportedMimeType();

      this.mediaRecorder =
        mimeType
          ? new MediaRecorder(
              this.mediaStream,
              {
                mimeType,
              },
            )
          : new MediaRecorder(
              this.mediaStream,
            );

      this.mediaRecorder.ondataavailable =
        (
          event:
            BlobEvent,
        ) => {
          if (
            event.data.size > 0
          ) {
            this.chunks.push(
              event.data,
            );
          }
        };

      this.mediaRecorder.onstop =
        () => {
          const type =
            this.mediaRecorder
              ?.mimeType ||
            'audio/webm';

          this.recordedBlob =
            new Blob(
              this.chunks,
              {
                type,
              },
            );

          const url =
            URL.createObjectURL(
              this.recordedBlob,
            );

          this.recordedAudioUrl.set(
            url,
          );

          this.stopMediaStream();
        };

      this.mediaRecorder.start();

      this.recording.set(true);

      this.timerId =
        setInterval(() => {
          this.elapsedSeconds.update(
            (seconds) =>
              seconds + 1,
          );
        }, 1000);
    } catch (error) {
      console.error(
        'Could not start recording:',
        error,
      );

      this.stopMediaStream();

      this.error.set(
        'Não foi possível acessar o microfone. Verifique a permissão do navegador.',
      );
    }
  }

  stopRecording(): void {
    if (
      !this.mediaRecorder ||
      this.mediaRecorder.state ===
        'inactive'
    ) {
      return;
    }

    this.mediaRecorder.stop();

    this.recording.set(false);

    this.stopTimer();
  }

  discardRecording(): void {
    this.revokeAudioUrl();

    this.recordedBlob = null;
    this.elapsedSeconds.set(0);

    this.hasSavedCurrentAnswer.set(
      false,
    );
  }

  async saveRecording(): Promise<void> {
    const question =
      this.currentQuestion();

    if (
      !question ||
      !this.attemptId ||
      !this.recordedBlob
    ) {
      return;
    }

    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      await this.speakingAnswerService
        .saveAnswer({
          attemptId:
            this.attemptId,
          questionId:
            question.id,
          blob:
            this.recordedBlob,
          durationSeconds:
            this.elapsedSeconds(),
        });

      this.hasSavedCurrentAnswer.set(
        true,
      );
    } catch (error) {
      console.error(
        'Could not save speaking answer:',
        error,
      );

      this.error.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar sua gravação.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  previousQuestion(): void {
    if (
      this.isFirstQuestion() ||
      this.recording()
    ) {
      return;
    }

    this.currentIndex.update(
      (index) => index - 1,
    );

    this.resetCurrentRecording();
  }

  nextQuestion(): void {
    if (
      !this.hasSavedCurrentAnswer()
    ) {
      return;
    }

    if (this.isLastQuestion()) {
      console.log(
        'Speaking concluído.',
      );

      return;
    }

    this.currentIndex.update(
      (index) => index + 1,
    );

    this.resetCurrentRecording();

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  private getSupportedMimeType():
    string | null {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];

    return (
      candidates.find(
        (type) =>
          MediaRecorder
            .isTypeSupported(
              type,
            ),
      ) ?? null
    );
  }

  private resetCurrentRecording():
    void {
    this.revokeAudioUrl();

    this.recordedBlob = null;

    this.elapsedSeconds.set(0);

    this.hasSavedCurrentAnswer.set(
      false,
    );

    this.error.set(null);
  }

  private stopTimer(): void {
    if (!this.timerId) {
      return;
    }

    clearInterval(
      this.timerId,
    );

    this.timerId = null;
  }

  private stopMediaStream():
    void {
    this.mediaStream
      ?.getTracks()
      .forEach(
        (track) =>
          track.stop(),
      );

    this.mediaStream = null;
  }

  private cleanupRecording():
    void {
    this.stopTimer();

    if (
      this.mediaRecorder &&
      this.mediaRecorder.state !==
        'inactive'
    ) {
      this.mediaRecorder.stop();
    }

    this.stopMediaStream();
  }

  private revokeAudioUrl(): void {
    const url =
      this.recordedAudioUrl();

    if (url) {
      URL.revokeObjectURL(
        url,
      );
    }

    this.recordedAudioUrl.set(
      null,
    );
  }
}

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
  Router,
} from '@angular/router';

import {
  SpeakingAnswerItem,
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

  private readonly router =
    inject(Router);

  private readonly questionService =
    inject(TestQuestionService);

  private readonly speakingAnswerService =
    inject(SpeakingAnswerService);

  readonly questions =
    signal<TestQuestionItem[]>([]);

  readonly savedAnswers =
    signal<
      Record<
        string,
        SpeakingAnswerItem
      >
    >({});

  readonly currentIndex =
    signal(0);

  readonly loading =
    signal(true);

  readonly loadingAudio =
    signal(false);

  readonly error =
    signal<string | null>(null);

  readonly recording =
    signal(false);

  readonly saving =
    signal(false);

  readonly elapsedSeconds =
    signal(0);

  /*
   * URL local criada pelo browser
   * depois de uma nova gravação.
   */
  readonly recordedAudioUrl =
    signal<string | null>(
      null,
    );

  /*
   * Signed URL de uma resposta
   * que já existe no Storage.
   */
  readonly savedAudioUrl =
    signal<string | null>(
      null,
    );

  /*
   * Indica que a gravação local
   * atual já foi persistida.
   */
  readonly localRecordingSaved =
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
      () =>
        this.currentIndex() ===
        0,
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

  readonly hasSavedCurrentAnswer =
    computed(() => {
      const question =
        this.currentQuestion();

      if (!question) {
        return false;
      }

      return Boolean(
        this.savedAnswers()[
          question.id
        ],
      );
    });

  readonly hasLocalRecording =
    computed(
      () =>
        Boolean(
          this.recordedAudioUrl(),
        ),
    );

  readonly hasUnsavedLocalRecording =
    computed(
      () =>
        this.hasLocalRecording() &&
        !this.localRecordingSaved(),
    );

  readonly displayedAudioUrl =
    computed(
      () =>
        this.recordedAudioUrl() ??
        this.savedAudioUrl(),
    );

  readonly canContinue =
    computed(
      () =>
        this.hasSavedCurrentAnswer() &&
        !this.hasUnsavedLocalRecording() &&
        !this.recording() &&
        !this.saving(),
    );

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
          .padStart(
            2,
            '0',
          )}:` +
        remainingSeconds
          .toString()
          .padStart(
            2,
            '0',
          )
      );
    });

  private testId:
    string | null =
      null;

  private attemptId:
    string | null =
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

  private chunks:
    Blob[] = [];

  private timerId:
    ReturnType<
      typeof setInterval
    > | null =
      null;

  async ngOnInit():
    Promise<void> {
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
      const [
        questions,
        savedAnswers,
      ] =
        await Promise.all([
          this.questionService
            .getSpeakingQuestions(
              this.testId,
            ),

          this.speakingAnswerService
            .getAnswers(
              this.attemptId,
            ),
        ]);

      if (
        questions.length === 0
      ) {
        this.error.set(
          'Nenhuma questão de speaking foi encontrada.',
        );

        return;
      }

      this.questions.set(
        questions,
      );

      this.savedAnswers.set(
        savedAnswers,
      );

      const firstPendingIndex =
        questions.findIndex(
          (question) =>
            !savedAnswers[
              question.id
            ],
        );

      if (
        firstPendingIndex >= 0
      ) {
        this.currentIndex.set(
          firstPendingIndex,
        );
      } else {
        /*
         * Todas as respostas já
         * existem.
         *
         * Abrimos a última para que
         * o usuário possa revisar e
         * finalizar.
         */
        this.currentIndex.set(
          questions.length - 1,
        );
      }

      await this
        .loadSavedAudioForCurrentQuestion();
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

    this.revokeLocalAudioUrl();
  }

  async startRecording():
    Promise<void> {
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

    if (
      this.recording() ||
      this.saving()
    ) {
      return;
    }

    try {
      this.revokeLocalAudioUrl();

      this.recordedBlob = null;
      this.chunks = [];

      this.elapsedSeconds.set(
        0,
      );

      this.localRecordingSaved.set(
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

      this.mediaRecorder
        .ondataavailable =
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

      this.mediaRecorder
        .onstop =
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

      this.recording.set(
        true,
      );

      this.timerId =
        setInterval(
          () => {
            this.elapsedSeconds
              .update(
                (seconds) =>
                  seconds + 1,
              );
          },
          1000,
        );
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
      this.mediaRecorder
        .state ===
        'inactive'
    ) {
      return;
    }

    this.mediaRecorder.stop();

    this.recording.set(
      false,
    );

    this.stopTimer();
  }

  discardRecording(): void {
    if (
      this.recording() ||
      this.saving()
    ) {
      return;
    }

    this.revokeLocalAudioUrl();

    this.recordedBlob = null;

    this.localRecordingSaved.set(
      false,
    );

    const question =
      this.currentQuestion();

    if (!question) {
      this.elapsedSeconds.set(
        0,
      );

      return;
    }

    const savedAnswer =
      this.savedAnswers()[
        question.id
      ];

    this.elapsedSeconds.set(
      savedAnswer
        ?.durationSeconds ??
        0,
    );
  }

  async saveRecording():
    Promise<void> {
    const question =
      this.currentQuestion();

    if (
      !question ||
      !this.attemptId ||
      !this.recordedBlob
    ) {
      return;
    }

    if (
      this.saving() ||
      this.recording()
    ) {
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      const savedAnswer =
        await this
          .speakingAnswerService
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

      this.savedAnswers.update(
        (answers) => ({
          ...answers,

          [
            question.id
          ]:
            savedAnswer,
        }),
      );

      this.localRecordingSaved.set(
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

  async previousQuestion():
    Promise<void> {
    if (
      this.isFirstQuestion() ||
      this.recording() ||
      this.saving()
    ) {
      return;
    }

    if (
      this.hasUnsavedLocalRecording()
    ) {
      this.error.set(
        'Salve ou descarte a gravação atual antes de mudar de questão.',
      );

      return;
    }

    this.currentIndex.update(
      (index) =>
        index - 1,
    );

    await this
      .prepareCurrentQuestion();

    this.scrollToTop();
  }

  async nextQuestion():
    Promise<void> {
    if (
      !this.canContinue()
    ) {
      return;
    }

    if (
      this.isLastQuestion()
    ) {
      if (
        !this.testId ||
        !this.attemptId
      ) {
        this.error.set(
          'Não foi possível identificar a avaliação atual.',
        );

        return;
      }

      await this.router.navigate(
        [
          '/teste/processando',
        ],
        {
          queryParams: {
            testId:
              this.testId,

            attemptId:
              this.attemptId,
          },
        },
      );

      return;
    }

    this.currentIndex.update(
      (index) =>
        index + 1,
    );

    await this
      .prepareCurrentQuestion();

    this.scrollToTop();
  }

  private async prepareCurrentQuestion():
    Promise<void> {
    this.stopTimer();
    this.stopMediaStream();

    this.revokeLocalAudioUrl();

    this.recordedBlob = null;
    this.chunks = [];

    this.localRecordingSaved.set(
      false,
    );

    this.savedAudioUrl.set(
      null,
    );

    this.elapsedSeconds.set(
      0,
    );

    this.error.set(null);

    await this
      .loadSavedAudioForCurrentQuestion();
  }

  private async loadSavedAudioForCurrentQuestion():
    Promise<void> {
    const question =
      this.currentQuestion();

    if (!question) {
      return;
    }

    const savedAnswer =
      this.savedAnswers()[
        question.id
      ];

    if (!savedAnswer) {
      this.savedAudioUrl.set(
        null,
      );

      this.elapsedSeconds.set(
        0,
      );

      return;
    }

    this.elapsedSeconds.set(
      savedAnswer.durationSeconds,
    );

    this.loadingAudio.set(
      true,
    );

    try {
      const signedUrl =
        await this
          .speakingAnswerService
          .createSignedAudioUrl(
            savedAnswer.audioPath,
          );

      this.savedAudioUrl.set(
        signedUrl,
      );
    } catch (error) {
      console.error(
        'Could not load saved speaking audio:',
        error,
      );

      /*
       * A resposta continua considerada
       * salva mesmo que o preview falhe.
       */
      this.error.set(
        'Sua resposta está salva, mas não conseguimos carregar o áudio para reprodução.',
      );
    } finally {
      this.loadingAudio.set(
        false,
      );
    }
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

  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
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

  private stopMediaStream(): void {
    this.mediaStream
      ?.getTracks()
      .forEach(
        (track) =>
          track.stop(),
      );

    this.mediaStream = null;
  }

  private cleanupRecording(): void {
    this.stopTimer();

    if (
      this.mediaRecorder &&
      this.mediaRecorder
        .state !==
        'inactive'
    ) {
      this.mediaRecorder.stop();
    }

    this.stopMediaStream();
  }

  private revokeLocalAudioUrl():
    void {
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

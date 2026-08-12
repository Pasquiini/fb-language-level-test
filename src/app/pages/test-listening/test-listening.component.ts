import {
  CommonModule,
} from '@angular/common';

import {
  Component,
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
  TestAnswerService,
} from '../../core/services/test-answer.service';

import {
  TestQuestionItem,
  TestQuestionService,
} from '../../core/services/test-question.service';

@Component({
  selector: 'app-test-listening',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl:
    './test-listening.component.html',
  styleUrl:
    './test-listening.component.scss',
})
export class TestListeningComponent
  implements OnInit {

  readonly String = String;

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly questionService =
    inject(TestQuestionService);

  private readonly testAnswerService =
    inject(TestAnswerService);

  readonly questions =
    signal<TestQuestionItem[]>([]);

  readonly audioUrl =
    signal<string | null>(null);

  readonly currentIndex =
    signal(0);

  readonly selectedAnswers =
    signal<Record<string, string>>({});

  readonly loading =
    signal(true);

  readonly saving =
    signal(false);

  readonly error =
    signal<string | null>(null);

  readonly playCount =
    signal(0);

  readonly isPlaying =
    signal(false);

  readonly playbackFinished =
    signal(false);

  readonly currentQuestion =
    computed(
      () =>
        this.questions()[
          this.currentIndex()
        ] ?? null,
    );

  readonly currentAnswer =
    computed(() => {
      const question =
        this.currentQuestion();

      if (!question) {
        return null;
      }

      return (
        this.selectedAnswers()[
          question.id
        ] ?? null
      );
    });

  readonly progress =
    computed(() => {
      const total =
        this.questions().length;

      if (total === 0) {
        return 0;
      }

      return (
        (
          this.currentIndex() + 1
        ) /
        total
      ) * 100;
    });

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

  readonly cannotPlayAgain =
    computed(
      () =>
        this.playCount() >= 2 &&
        this.playbackFinished(),
    );

  private testId: string | null =
    null;

  private attemptId: string | null =
    null;

  async ngOnInit(): Promise<void> {
    this.testId =
      this.route.snapshot
        .queryParamMap
        .get('testId');

    this.attemptId =
      this.route.snapshot
        .queryParamMap
        .get('attemptId');

    if (!this.testId) {
      this.error.set(
        'Não foi possível identificar o teste iniciado.',
      );

      this.loading.set(false);
      return;
    }

    if (!this.attemptId) {
      this.error.set(
        'Não foi possível identificar a tentativa atual.',
      );

      this.loading.set(false);
      return;
    }

    try {
      const data =
        await this.questionService
          .getListeningQuestions(
            this.testId,
          );

      this.questions.set(
        data.questions,
      );

      this.audioUrl.set(
        data.audioUrl,
      );
    } catch (error) {
      console.error(
        'Could not load listening:',
        error,
      );

      this.error.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o listening.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  selectAnswer(
    optionId: string,
  ): void {
    const question =
      this.currentQuestion();

    if (!question) {
      return;
    }

    this.selectedAnswers.update(
      (answers) => ({
        ...answers,
        [question.id]:
          optionId,
      }),
    );
  }

  async toggleAudio(
    audio: HTMLAudioElement,
  ): Promise<void> {
    if (this.isPlaying()) {
      audio.pause();

      this.isPlaying.set(false);

      return;
    }

    if (
      this.playCount() >= 2 &&
      audio.currentTime === 0
    ) {
      return;
    }

    if (audio.currentTime === 0) {
      this.playCount.update(
        (count) => count + 1,
      );

      this.playbackFinished.set(
        false,
      );
    }

    try {
      await audio.play();

      this.isPlaying.set(true);
    } catch (error) {
      console.error(
        'Could not play audio:',
        error,
      );

      this.error.set(
        'Não foi possível reproduzir o áudio.',
      );
    }
  }

  onAudioEnded(
    audio: HTMLAudioElement,
  ): void {
    this.isPlaying.set(false);

    this.playbackFinished.set(
      true,
    );

    audio.currentTime = 0;
  }

  previousQuestion(): void {
    if (
      this.isFirstQuestion() ||
      this.saving()
    ) {
      return;
    }

    this.currentIndex.update(
      (index) => index - 1,
    );

    this.scrollToQuestion();
  }

  async nextQuestion(): Promise<void> {
    if (!this.currentAnswer()) {
      return;
    }

    if (this.saving()) {
      return;
    }

    if (!this.isLastQuestion()) {
      this.currentIndex.update(
        (index) => index + 1,
      );

      this.scrollToQuestion();

      return;
    }

    if (
      !this.testId ||
      !this.attemptId
    ) {
      this.error.set(
        'Não foi possível identificar a tentativa atual.',
      );

      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      await this.testAnswerService
        .saveAnswers(
          this.attemptId,
          this.selectedAnswers(),
        );

      await this.router.navigate(
        ['/teste/speaking'],
        {
          queryParams: {
            testId:
              this.testId,
            attemptId:
              this.attemptId,
          },
        },
      );
    } catch (error) {
      console.error(
        'Could not save listening answers:',
        error,
      );

      this.error.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar suas respostas.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private scrollToQuestion(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
}

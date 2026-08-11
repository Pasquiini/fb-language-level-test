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
} from '@angular/router';

import {
  TestQuestionItem,
  TestQuestionService,
} from '../../core/services/test-question.service';

@Component({
  selector: 'app-test-questions',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl:
    './test-questions.component.html',
  styleUrl:
    './test-questions.component.scss',
})
export class TestQuestionsComponent
  implements OnInit {
  readonly String = String;
  private readonly route =
    inject(ActivatedRoute);

  private readonly questionService =
    inject(TestQuestionService);

  readonly questions =
    signal<TestQuestionItem[]>([]);

  readonly currentIndex =
    signal(0);

  readonly selectedAnswers =
    signal<Record<string, string>>({});

  readonly loading =
    signal(true);

  readonly error =
    signal<string | null>(null);

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

  async ngOnInit(): Promise<void> {
    const testId =
      this.route.snapshot
        .queryParamMap
        .get('testId');

    if (!testId) {
      this.error.set(
        'Não foi possível identificar o teste iniciado.',
      );

      this.loading.set(false);
      return;
    }

    try {
      const questions =
        await this.questionService
          .getGrammarQuestions(testId);

      if (questions.length === 0) {
        this.error.set(
          'Nenhuma questão foi encontrada para este teste.',
        );

        return;
      }

      this.questions.set(questions);
    } catch (error) {
      console.error(
        'Could not load test questions:',
        error,
      );

      this.error.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as questões.',
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
        [question.id]: optionId,
      }),
    );
  }

  previousQuestion(): void {
    if (this.isFirstQuestion()) {
      return;
    }

    this.currentIndex.update(
      (index) => index - 1,
    );

    this.scrollToTop();
  }

  nextQuestion(): void {
    if (!this.currentAnswer()) {
      return;
    }

    if (this.isLastQuestion()) {
      console.log(
        'Grammar concluída:',
        this.selectedAnswers(),
      );

      return;
    }

    this.currentIndex.update(
      (index) => index + 1,
    );

    this.scrollToTop();
  }

  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
}

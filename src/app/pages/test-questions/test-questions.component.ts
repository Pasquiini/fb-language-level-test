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

  private readonly router =
    inject(Router);

  private readonly questionService =
    inject(TestQuestionService);

  private readonly testAnswerService =
    inject(TestAnswerService);

  readonly questions =
    signal<TestQuestionItem[]>([]);

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

  readonly saveError =
    signal<string | null>(null);

  readonly saveSuccess =
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
      const [
        questions,
        existingAnswers,
      ] =
        await Promise.all([
          this.questionService
            .getGrammarQuestions(
              this.testId,
            ),

          this.testAnswerService
            .getAnswers(
              this.attemptId,
            ),
        ]);

      if (
        questions.length === 0
      ) {
        this.error.set(
          'Nenhuma questão foi encontrada para este teste.',
        );

        return;
      }

      this.questions.set(
        questions,
      );

      const grammarAnswers =
        this.filterAnswersForQuestions(
          questions,
          existingAnswers,
        );

      this.selectedAnswers.set(
        grammarAnswers,
      );

      this.currentIndex.set(
        this.findResumeIndex(
          questions,
          grammarAnswers,
        ),
      );
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
    if (this.saving()) {
      return;
    }

    const question =
      this.currentQuestion();

    if (!question) {
      return;
    }

    this.saveError.set(null);
    this.saveSuccess.set(null);

    this.selectedAnswers.update(
      (answers) => ({
        ...answers,

        [question.id]:
          optionId,
      }),
    );
  }

  previousQuestion(): void {
    if (
      this.isFirstQuestion() ||
      this.saving()
    ) {
      return;
    }

    this.saveError.set(null);
    this.saveSuccess.set(null);

    this.currentIndex.update(
      (index) => index - 1,
    );

    this.scrollToTop();
  }

  async nextQuestion(): Promise<void> {
    if (this.saving()) {
      return;
    }

    const question =
      this.currentQuestion();

    const answer =
      this.currentAnswer();

    if (
      !question ||
      !answer
    ) {
      return;
    }

    if (
      !this.testId ||
      !this.attemptId
    ) {
      this.saveError.set(
        'Não foi possível identificar a tentativa atual.',
      );

      return;
    }

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(null);

    try {
      await this.testAnswerService
        .saveAnswers(
          this.attemptId,
          {
            [question.id]:
              answer,
          },
        );

      if (this.isLastQuestion()) {
        await this.router.navigate(
          ['/teste/listening'],
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
        (index) => index + 1,
      );

      this.saveSuccess.set(
        'Resposta salva.',
      );

      this.scrollToTop();
    } catch (error) {
      console.error(
        'Could not save grammar answer:',
        error,
      );

      this.saveError.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar sua resposta. Tente novamente.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  private filterAnswersForQuestions(
    questions: TestQuestionItem[],
    answers: Record<string, string>,
  ): Record<string, string> {
    const questionIds =
      new Set(
        questions.map(
          (question) =>
            question.id,
        ),
      );

    const filteredAnswers:
      Record<string, string> = {};

    for (
      const [
        questionId,
        selectedOptionId,
      ] of Object.entries(answers)
    ) {
      if (
        questionIds.has(
          questionId,
        )
      ) {
        filteredAnswers[
          questionId
        ] =
          selectedOptionId;
      }
    }

    return filteredAnswers;
  }

  private findResumeIndex(
    questions: TestQuestionItem[],
    answers: Record<string, string>,
  ): number {
    const unansweredIndex =
      questions.findIndex(
        (question) =>
          !answers[
            question.id
          ],
      );

    if (
      unansweredIndex !== -1
    ) {
      return unansweredIndex;
    }

    return Math.max(
      questions.length - 1,
      0,
    );
  }

  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }
}

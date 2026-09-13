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
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  AdminTestReviewDetail,
  AdminTestReviewService,
} from '../../../core/services/admin-test-review.service';

import {
  AdminSpeakingAnswer,
  AdminSpeakingReviewService,
} from '../../../core/services/admin-speaking-review.service';

interface LevelOption {
  value:
  | 'A1'
  | 'A2'
  | 'B1'
  | 'B2'
  | 'C1'
  | 'C2';

  label: string;
}

@Component({
  selector:
    'app-test-review-detail',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
  ],

  templateUrl:
    './test-review-detail.component.html',

  styleUrl:
    './test-review-detail.component.scss',
})
export class TestReviewDetailComponent
  implements OnInit {

  private readonly route =
    inject(ActivatedRoute);

  private readonly reviewService =
    inject(
      AdminTestReviewService,
    );

  private readonly speakingReviewService =
    inject(
      AdminSpeakingReviewService,
    );

  private readonly fb =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  readonly loading =
    signal(true);

  readonly error =
    signal<string | null>(
      null,
    );

  readonly review =
    signal<
      AdminTestReviewDetail | null
    >(null);

  readonly saving =
    signal(false);

  readonly saveError =
    signal<string | null>(
      null,
    );

  readonly speakingLoading =
    signal(false);

  readonly speakingError =
    signal<string | null>(
      null,
    );

  readonly speakingAnswers =
    signal<
      AdminSpeakingAnswer[]
    >([]);

  readonly confirmationOpen =
    signal(false);

  readonly completionWarning =
    signal<string | null>(
      null,
    );

  readonly reviewForm =
    this.fb.nonNullable.group({
      estimatedLevel: [
        '',
        [
          Validators.required,
        ],
      ],

      notes: [
        '',
      ],
    });

  readonly levelOptions:
    readonly LevelOption[] = [
      {
        value: 'A1',
        label: 'Iniciante',
      },
      {
        value: 'A2',
        label: 'Básico',
      },
      {
        value: 'B1',
        label: 'Intermediário',
      },
      {
        value: 'B2',
        label:
          'Intermediário avançado',
      },
      {
        value: 'C1',
        label: 'Avançado',
      },
      {
        value: 'C2',
        label: 'Proficiente',
      },
    ];

  private attemptId:
    string | null =
    null;

  async ngOnInit():
    Promise<void> {
    this.attemptId =
      this.route.snapshot
        .paramMap
        .get(
          'attemptId',
        );

    if (
      !this.attemptId
    ) {
      this.error.set(
        'Não foi possível identificar a avaliação.',
      );

      this.loading.set(
        false,
      );

      return;
    }

    await this.loadReview();
  }

  async reload():
    Promise<void> {
    if (
      this.loading() ||
      !this.attemptId
    ) {
      return;
    }

    await this.loadReview();
  }

  formatPercentage(
    value:
      number | null,
  ): string {
    if (
      value === null
    ) {
      return '—';
    }

    return `${Math.round(
      value,
    )}%`;
  }

  formatDate(
    value: string,
  ): string {
    return new Intl
      .DateTimeFormat(
        'pt-BR',
        {
          dateStyle:
            'medium',

          timeStyle:
            'short',
        },
      )
      .format(
        new Date(
          value,
        ),
      );
  }

  formatDuration(
    seconds: number,
  ): string {
    const minutes =
      Math.floor(
        seconds / 60,
      );

    const remainingSeconds =
      seconds % 60;

    return (
      `${minutes}:`
      +
      `${remainingSeconds}`
        .padStart(
          2,
          '0',
        )
    );
  }

  openConfirmation():
    void {
    this.saveError.set(
      null,
    );

    if (
      this.reviewForm.invalid
    ) {
      this.reviewForm
        .markAllAsTouched();

      return;
    }

    const review =
      this.review();

    if (
      !review ||
      review.status ===
      'completed'
    ) {
      return;
    }

    this.confirmationOpen.set(
      true,
    );
  }

  closeConfirmation():
    void {
    if (
      this.saving()
    ) {
      return;
    }

    this.confirmationOpen.set(
      false,
    );
  }

  async completeReview():
    Promise<void> {
    if (
      this.reviewForm.invalid ||
      this.saving() ||
      !this.attemptId
    ) {
      this.reviewForm
        .markAllAsTouched();

      return;
    }

    const review =
      this.review();

    if (
      !review ||
      review.status ===
      'completed'
    ) {
      return;
    }

    const values =
      this.reviewForm
        .getRawValue();

    this.saving.set(
      true,
    );

    this.saveError.set(
      null,
    );

    this.completionWarning.set(
      null,
    );

    try {
      const result =
        await this.reviewService
          .completeReview({
            attemptId:
              this.attemptId,

            /*
             * Não existe rubrica numérica
             * oficial de Speaking nesta
             * versão.
             */
            speakingScore:
              null,

            estimatedLevel:
              values
                .estimatedLevel,

            reviewNotes:
              values.notes
                .trim() ||
              null,
          });

      this.confirmationOpen.set(
        false,
      );

      if (
        !result.communicationSent
      ) {
        this.completionWarning.set(
          result.communicationError
            ? `A avaliação foi concluída, mas a notificação por WhatsApp apresentou um problema: ${result.communicationError}`
            : 'A avaliação foi concluída, mas a notificação por WhatsApp não foi enviada.',
        );

        await this.loadReview();

        return;
      }

      await this.router.navigate(
        [
          '/admin/avaliacoes',
        ],
        {
          queryParams: {
            completed:
              'true',
          },
        },
      );
    } catch (error) {
      console.error(
        'Could not complete review:',
        error,
      );

      this.saveError.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a avaliação.',
      );

      this.confirmationOpen.set(
        false,
      );
    } finally {
      this.saving.set(
        false,
      );
    }
  }

  private async loadReview():
    Promise<void> {
    if (
      !this.attemptId
    ) {
      return;
    }

    this.loading.set(
      true,
    );

    this.error.set(
      null,
    );

    try {
      const review =
        await this.reviewService
          .getReviewByAttemptId(
            this.attemptId,
          );

      this.review.set(
        review,
      );

      this.reviewForm.patchValue({
        estimatedLevel:
          review.estimatedLevel &&
            review.estimatedLevel !==
            'Pendente'
            ? review.estimatedLevel
            : '',

        notes:
          review.reviewNotes ??
          '',
      });

      await this.loadSpeakingAnswers();
    } catch (error) {
      console.error(
        'Could not load review:',
        error,
      );

      this.error.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar a avaliação.',
      );
    } finally {
      this.loading.set(
        false,
      );
    }
  }

  private async loadSpeakingAnswers():
    Promise<void> {
    if (
      !this.attemptId
    ) {
      return;
    }

    this.speakingLoading.set(
      true,
    );

    this.speakingError.set(
      null,
    );

    try {
      const answers =
        await this
          .speakingReviewService
          .getAnswers(
            this.attemptId,
          );

      this.speakingAnswers.set(
        answers,
      );
    } catch (error) {
      console.error(
        'Could not load admin speaking answers:',
        error,
      );

      this.speakingError.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os áudios.',
      );
    } finally {
      this.speakingLoading.set(
        false,
      );
    }
  }
  levelLabel(
    value: string,
  ): string {
    return this.levelOptions
      .find(
        (level) =>
          level.value ===
          value,
      )
      ?.label ??
      value;
  }
}

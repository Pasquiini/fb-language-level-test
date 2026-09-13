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
  RouterLink,
} from '@angular/router';

import {
  AdminReviewStatus,
  AdminTestReviewItem,
  AdminTestReviewService,
} from '../../../core/services/admin-test-review.service';

type ReviewStatusFilter =
  | 'all'
  | AdminReviewStatus;

@Component({
  selector:
    'app-test-reviews',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterLink,
  ],

  templateUrl:
    './test-reviews.component.html',

  styleUrl:
    './test-reviews.component.scss',
})
export class TestReviewsComponent
  implements OnInit {

  private readonly reviewService =
    inject(
      AdminTestReviewService,
    );

  readonly loading =
    signal(true);

  readonly error =
    signal<string | null>(
      null,
    );

  readonly reviews =
    signal<
      AdminTestReviewItem[]
    >([]);

  readonly search =
    signal('');

  readonly statusFilter =
    signal<
      ReviewStatusFilter
    >(
      'under_review',
    );

  readonly dateFrom =
    signal('');

  readonly dateTo =
    signal('');

  readonly pendingCount =
    computed(
      () =>
        this.reviews()
          .filter(
            (review) =>
              review.status ===
              'under_review',
          )
          .length,
    );

  readonly completedCount =
    computed(
      () =>
        this.reviews()
          .filter(
            (review) =>
              review.status ===
              'completed',
          )
          .length,
    );

  readonly activeFilterCount =
    computed(
      () => {
        let total = 0;

        if (
          this.search()
            .trim()
        ) {
          total++;
        }

        if (
          this.statusFilter() !==
          'under_review'
        ) {
          total++;
        }

        if (
          this.dateFrom()
        ) {
          total++;
        }

        if (
          this.dateTo()
        ) {
          total++;
        }

        return total;
      },
    );

  readonly filteredReviews =
    computed(
      () => {
        const search =
          this.search()
            .trim()
            .toLocaleLowerCase(
              'pt-BR',
            );

        const status =
          this.statusFilter();

        const dateFrom =
          this.dateFrom();

        const dateTo =
          this.dateTo();

        return this.reviews()
          .filter(
            (review) => {
              if (
                status !==
                  'all' &&
                review.status !==
                  status
              ) {
                return false;
              }

              if (search) {
                const haystack =
                  [
                    review.studentName,

                    review.whatsapp ??
                      '',

                    review.estimatedLevel ??
                      '',
                  ]
                    .join(' ')
                    .toLocaleLowerCase(
                      'pt-BR',
                    );

                if (
                  !haystack.includes(
                    search,
                  )
                ) {
                  return false;
                }
              }

              const created =
                new Date(
                  review.createdAt,
                );

              if (dateFrom) {
                const from =
                  new Date(
                    `${dateFrom}T00:00:00`,
                  );

                if (
                  created <
                  from
                ) {
                  return false;
                }
              }

              if (dateTo) {
                const to =
                  new Date(
                    `${dateTo}T23:59:59.999`,
                  );

                if (
                  created >
                  to
                ) {
                  return false;
                }
              }

              return true;
            },
          );
      },
    );

  async ngOnInit():
    Promise<void> {
    await this.loadReviews();
  }

  async reload():
    Promise<void> {
    if (
      this.loading()
    ) {
      return;
    }

    await this.loadReviews();
  }

  clearFilters():
    void {
    this.search.set(
      '',
    );

    this.statusFilter.set(
      'under_review',
    );

    this.dateFrom.set(
      '',
    );

    this.dateTo.set(
      '',
    );
  }

  setSearch(
    event: Event,
  ): void {
    const target =
      event.target as
        HTMLInputElement;

    this.search.set(
      target.value,
    );
  }

  setStatus(
    event: Event,
  ): void {
    const target =
      event.target as
        HTMLSelectElement;

    this.statusFilter.set(
      target.value as
        ReviewStatusFilter,
    );
  }

  setDateFrom(
    event: Event,
  ): void {
    const target =
      event.target as
        HTMLInputElement;

    this.dateFrom.set(
      target.value,
    );
  }

  setDateTo(
    event: Event,
  ): void {
    const target =
      event.target as
        HTMLInputElement;

    this.dateTo.set(
      target.value,
    );
  }

  initials(
    fullName: string,
  ): string {
    const parts =
      fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (
      parts.length === 0
    ) {
      return 'FB';
    }

    if (
      parts.length === 1
    ) {
      return parts[0]
        .slice(
          0,
          2,
        )
        .toUpperCase();
    }

    return (
      parts[0][0]
      +
      parts[
        parts.length - 1
      ][0]
    ).toUpperCase();
  }

  formatDate(
    value: string,
  ): string {
    return new Intl
      .DateTimeFormat(
        'pt-BR',
        {
          dateStyle:
            'short',

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

  statusLabel(
    status:
      AdminReviewStatus,
  ): string {
    if (
      status ===
      'completed'
    ) {
      return 'Concluída';
    }

    return (
      'Aguardando revisão'
    );
  }

  private async loadReviews():
    Promise<void> {
    this.loading.set(
      true,
    );

    this.error.set(
      null,
    );

    try {
      const reviews =
        await this
          .reviewService
          .getReviews();

      this.reviews.set(
        reviews,
      );
    } catch (error) {
      console.error(
        'Could not load admin reviews:',
        error,
      );

      this.error.set(
        error instanceof
          Error
          ? error.message
          : 'Não foi possível carregar as avaliações.',
      );
    } finally {
      this.loading.set(
        false,
      );
    }
  }
}

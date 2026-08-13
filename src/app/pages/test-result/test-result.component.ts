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
  RouterLink,
} from '@angular/router';

import {
  TestResultData,
  TestResultService,
} from '../../core/services/test-result.service';

@Component({
  selector:
    'app-test-result',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterLink,
  ],

  templateUrl:
    './test-result.component.html',

  styleUrl:
    './test-result.component.scss',
})
export class TestResultComponent
  implements OnInit {

  private readonly route =
    inject(ActivatedRoute);

  private readonly resultService =
    inject(TestResultService);

  readonly loading =
    signal(true);

  readonly error =
    signal<string | null>(
      null,
    );

  readonly result =
    signal<
      TestResultData | null
    >(null);

  readonly speakingPending =
    computed(() => {
      const result =
        this.result();

      if (!result) {
        return false;
      }

      return (
        result.speakingScore ===
          null ||
        result.status ===
          'under_review'
      );
    });

  readonly hasFinalLevel =
    computed(() => {
      const result =
        this.result();

      if (!result) {
        return false;
      }

      const level =
        result.estimatedLevel
          .trim()
          .toLowerCase();

      return (
        level !== '' &&
        level !== 'pendente'
      );
    });

  readonly hasAnalysis =
    computed(() => {
      const result =
        this.result();

      if (!result) {
        return false;
      }

      return Boolean(
        result.summary ||
        result.recommendation,
      );
    });

  readonly roundedPercentage =
    computed(() => {
      const percentage =
        this.result()
          ?.percentage ??
        0;

      return Math.round(
        percentage,
      );
    });

  private attemptId:
    string | null =
      null;

  async ngOnInit():
    Promise<void> {
    this.attemptId =
      this.route.snapshot
        .queryParamMap
        .get('attemptId');

    if (!this.attemptId) {
      this.error.set(
        'Não foi possível identificar sua avaliação.',
      );

      this.loading.set(
        false,
      );

      return;
    }

    await this.loadResult();
  }

  async retry():
    Promise<void> {
    if (
      this.loading() ||
      !this.attemptId
    ) {
      return;
    }

    await this.loadResult();
  }

private async loadResult():
  Promise<void> {
  if (!this.attemptId) {
    return;
  }

  this.loading.set(true);
  this.error.set(null);

  try {
    let result =
      await this.resultService
        .getResult(
          this.attemptId,
        );

    this.result.set(
      result,
    );

    const alreadyHasAnalysis =
      Boolean(
        result.summary &&
        result.recommendation &&
        result.aiAnalysis,
      );

    if (!alreadyHasAnalysis) {
      try {
        await this.resultService
          .generateAnalysis(
            this.attemptId,
          );

        result =
          await this.resultService
            .getResult(
              this.attemptId,
            );

        this.result.set(
          result,
        );
      } catch (
        analysisError
      ) {
        console.error(
          'Could not generate AI analysis:',
          analysisError,
        );
      }
    }
  } catch (error) {
    console.error(
      'Could not load test result:',
      error,
    );

    this.error.set(
      error instanceof Error
        ? error.message
        : 'Não foi possível carregar seu resultado.',
    );
  } finally {
    this.loading.set(
      false,
    );
  }
}
}

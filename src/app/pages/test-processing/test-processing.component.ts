import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  ActivatedRoute,
  Router,
} from '@angular/router';

import {
  TestFinalizationService,
} from '../../core/services/test-finalization.service';

@Component({
  selector:
    'app-test-processing',

  standalone:
    true,

  imports: [
    CommonModule,
  ],

  templateUrl:
    './test-processing.component.html',

  styleUrl:
    './test-processing.component.scss',
})
export class TestProcessingComponent
  implements OnInit {

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly finalizationService =
    inject(TestFinalizationService);

  readonly processing =
    signal(true);

  readonly error =
    signal<string | null>(
      null,
    );

  readonly completed =
    signal(false);

  private testId:
    string | null =
      null;

  private attemptId:
    string | null =
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
        'Não foi possível identificar sua avaliação.',
      );

      this.processing.set(
        false,
      );

      return;
    }

    await this.finalizeTest();
  }

  async retry():
    Promise<void> {
    if (
      this.processing() ||
      !this.attemptId
    ) {
      return;
    }

    await this.finalizeTest();
  }

  private async finalizeTest():
    Promise<void> {
    if (
      !this.attemptId ||
      !this.testId
    ) {
      return;
    }

    this.processing.set(true);
    this.error.set(null);
    this.completed.set(false);

    try {
      await this.finalizationService
        .finalizeAttempt(
          this.attemptId,
        );

      this.completed.set(
        true,
      );

      const navigated =
        await this.router.navigate(
          [
            '/teste/resultado',
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

      if (!navigated) {
        this.error.set(
          'Sua avaliação foi concluída, mas não conseguimos abrir o resultado.',
        );
      }
    } catch (error) {
      console.error(
        'Could not finalize test:',
        error,
      );

      this.error.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível finalizar sua avaliação.',
      );
    } finally {
      this.processing.set(
        false,
      );
    }
  }
}

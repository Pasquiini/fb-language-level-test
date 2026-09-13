import {
  DatePipe,
  DecimalPipe,
} from '@angular/common';

import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import {
  RouterLink,
} from '@angular/router';

import {
  StudentPortalAttempt,
  StudentPortalService,
} from '../../../core/services/student-portal.service';

@Component({
  selector:
    'app-portal-tests',

  standalone:
    true,

  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
  ],

  templateUrl:
    './portal-tests.component.html',

  styleUrl:
    './portal-tests.component.scss',
})
export class PortalTestsComponent
  implements OnInit {

  private readonly portalService =
    inject(StudentPortalService);

  readonly attempts =
    signal<StudentPortalAttempt[]>(
      [],
    );

  readonly isLoading =
    signal(true);

  readonly errorMessage =
    signal<string | null>(
      null,
    );

  ngOnInit():
    void {
    void this.loadTests();
  }

  statusLabel(
    status: string,
  ): string {
    switch (status) {
      case 'under_review':
        return 'Em avaliação';

      case 'completed':
        return 'Concluído';

      case 'in_progress':
        return 'Em andamento';

      default:
        return status
          .replaceAll(
            '_',
            ' ',
          );
    }
  }

  statusClass(
    status: string,
  ): string {
    switch (status) {
      case 'completed':
        return 'is-completed';

      case 'under_review':
        return 'is-review';

      case 'in_progress':
        return 'is-progress';

      default:
        return 'is-neutral';
    }
  }

  private async loadTests():
    Promise<void> {
    this.isLoading.set(
      true,
    );

    this.errorMessage.set(
      null,
    );

    try {
      const dashboard =
        await this.portalService
          .getDashboard();

      this.attempts.set(
        dashboard.attempts,
      );
    } catch (error) {
      console.error(
        'Could not load tests:',
        error,
      );

      this.errorMessage.set(
        'Não foi possível carregar seus testes.',
      );
    } finally {
      this.isLoading.set(
        false,
      );
    }
  }
}

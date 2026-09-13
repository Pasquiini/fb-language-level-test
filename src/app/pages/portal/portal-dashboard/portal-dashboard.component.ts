import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  DecimalPipe,
} from '@angular/common';

import {
  RouterLink,
} from '@angular/router';

import {
  AuthService,
} from '../../../core/services/auth.service';

import {
  StudentPortalAttempt,
  StudentPortalService,
} from '../../../core/services/student-portal.service';

@Component({
  selector:
    'app-portal-dashboard',

  standalone:
    true,

  imports: [
    DecimalPipe,
    RouterLink,
  ],

  templateUrl:
    './portal-dashboard.component.html',

  styleUrl:
    './portal-dashboard.component.scss',
})
export class PortalDashboardComponent
  implements OnInit {

  private readonly authService =
    inject(AuthService);

  private readonly portalService =
    inject(StudentPortalService);

  readonly isLoading =
    signal(true);

  readonly errorMessage =
    signal<string | null>(
      null,
    );

  readonly latestAttempt =
    signal<StudentPortalAttempt | null>(
      null,
    );

  readonly totalAttempts =
    signal(0);

  readonly firstName =
    computed(
      () => {
        const name =
          this.authService
            .profile()
            ?.fullName
            ?.trim();

        return (
          name
            ?.split(/\s+/)[0]
          || 'Aluno'
        );
      },
    );

  readonly currentLevel =
    computed(
      () => {
        const level =
          this.latestAttempt()
            ?.result
            ?.estimatedLevel;

        if (
          !level
          ||
          level
            .trim()
            .toLowerCase()
            === 'pendente'
        ) {
          return null;
        }

        return level;
      },
    );

  readonly recommendation =
    computed(
      () =>
        this.latestAttempt()
          ?.result
          ?.recommendation
        ?? null,
    );

  readonly summary =
    computed(
      () =>
        this.latestAttempt()
          ?.result
          ?.summary
        ?? null,
    );

  ngOnInit():
    void {
    void this.loadDashboard();
  }

  statusLabel(
    status: string | null,
  ): string {
    switch (status) {
      case 'under_review':
        return 'Em avaliação';

      case 'completed':
        return 'Concluído';

      case 'in_progress':
        return 'Em andamento';

      default:
        return 'Sem teste';
    }
  }

  statusClass(
    status: string | null,
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

  private async loadDashboard():
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

      this.latestAttempt.set(
        dashboard.latestAttempt,
      );

      this.totalAttempts.set(
        dashboard.attempts.length,
      );
    } catch (error) {
      console.error(
        'Could not load portal dashboard:',
        error,
      );

      this.errorMessage.set(
        'Não foi possível carregar seu portal.',
      );
    } finally {
      this.isLoading.set(
        false,
      );
    }
  }
}

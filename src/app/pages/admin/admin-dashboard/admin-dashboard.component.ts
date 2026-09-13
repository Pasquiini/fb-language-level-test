import {
  DatePipe,
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
  AuthService,
} from '../../../core/services/auth.service';

import {
  AdminDashboardData,
  AdminDashboardService,
} from '../../../core/services/admin-dashboard.service';

interface DashboardShortcut {
  title: string;
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector:
    'app-admin-dashboard',

  standalone:
    true,

  imports: [
    DatePipe,
    RouterLink,
  ],

  templateUrl:
    './admin-dashboard.component.html',

  styleUrl:
    './admin-dashboard.component.scss',
})
export class AdminDashboardComponent
  implements OnInit {

  private readonly authService =
    inject(AuthService);

  private readonly dashboardService =
    inject(
      AdminDashboardService,
    );

  readonly isLoading =
    signal(true);

  readonly errorMessage =
    signal<string | null>(
      null,
    );

  readonly dashboard =
    signal<
      AdminDashboardData | null
    >(
      null,
    );

  readonly firstName =
    computed(
      () => {
        const fullName =
          this.authService
            .profile()
            ?.fullName
            ?.trim();

        if (!fullName) {
          return 'Admin';
        }

        return fullName
          .split(/\s+/)[0];
      },
    );

  readonly stats =
    computed(
      () =>
        this.dashboard()
          ?.stats
        ?? {
          underReview:
            0,

          completed:
            0,

          totalTests:
            0,

          communicationIssues:
            0,
        },
    );

  readonly recentStudents =
    computed(
      () =>
        this.dashboard()
          ?.recentStudents
        ?? [],
    );

  readonly shortcuts:
    readonly DashboardShortcut[] = [
      {
        title:
          'Avaliações',

        description:
          'Revise os testes de nivelamento e finalize avaliações.',

        icon:
          'bi-clipboard-check',

        route:
          '/admin/avaliacoes',
      },

      {
        title:
          'Alunos',

        description:
          'Consulte alunos, níveis e histórico de testes.',

        icon:
          'bi-people',

        route:
          '/admin/alunos',
      },

      {
        title:
          'WhatsApp',

        description:
          'Acompanhe o histórico e o estado das mensagens.',

        icon:
          'bi-whatsapp',

        route:
          '/admin/whatsapp',
      },
    ];

  ngOnInit():
    void {
    void this.loadDashboard();
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
        await this.dashboardService
          .getDashboard();

      this.dashboard.set(
        dashboard,
      );
    } catch (error) {
      console.error(
        'Could not load admin dashboard:',
        error,
      );

      this.errorMessage.set(
        'Não foi possível carregar os indicadores administrativos.',
      );
    } finally {
      this.isLoading.set(
        false,
      );
    }
  }
}

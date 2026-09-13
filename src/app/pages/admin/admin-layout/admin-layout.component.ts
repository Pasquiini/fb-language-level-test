import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import {
  AuthService,
} from '../../../core/services/auth.service';

interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector:
    'app-admin-layout',

  standalone:
    true,

  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],

  templateUrl:
    './admin-layout.component.html',

  styleUrl:
    './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  readonly mobileMenuOpen =
    signal(false);

  readonly isLoggingOut =
    signal(false);

  readonly profile =
    this.authService.profile;

  readonly userName =
    computed(
      () =>
        this.profile()?.fullName
        || 'Administrador',
    );

  readonly userInitials =
    computed(
      () => {
        const name =
          this.userName()
            .trim();

        if (!name) {
          return 'FB';
        }

        const parts =
          name
            .split(/\s+/)
            .filter(Boolean);

        if (
          parts.length === 1
        ) {
          return parts[0]
            .slice(0, 2)
            .toUpperCase();
        }

        return (
          parts[0][0]
          +
          parts[
            parts.length - 1
          ][0]
        ).toUpperCase();
      },
    );

  readonly roleLabel =
    computed(
      () => {
        const role =
          this.profile()?.role;

        switch (role) {
          case 'admin':
            return 'Administrador';

          case 'teacher':
            return 'Professor';

          default:
            return 'Equipe';
        }
      },
    );

  readonly navigation:
    readonly AdminNavItem[] = [
      {
        label:
          'Dashboard',

        icon:
          'bi-grid-1x2',

        route:
          '/admin',

        exact:
          true,
      },

      {
        label:
          'Avaliações',

        icon:
          'bi-clipboard-check',

        route:
          '/admin/avaliacoes',
      },

      {
        label:
          'Alunos',

        icon:
          'bi-people',

        route:
          '/admin/alunos',
      },

      {
        label:
          'WhatsApp',

        icon:
          'bi-whatsapp',

        route:
          '/admin/whatsapp',
      },

      // {
      //   label:
      //     'Agenda',

      //   icon:
      //     'bi-calendar3',

      //   route:
      //     '/admin/agenda',
      // },

      // {
      //   label:
      //     'Configurações',

      //   icon:
      //     'bi-sliders',

      //   route:
      //     '/admin/configuracoes',
      // },
    ];

  toggleMobileMenu():
    void {
    this.mobileMenuOpen.update(
      (open) =>
        !open,
    );
  }

  closeMobileMenu():
    void {
    this.mobileMenuOpen.set(
      false,
    );
  }

  async signOut():
    Promise<void> {
    if (
      this.isLoggingOut()
    ) {
      return;
    }

    this.isLoggingOut.set(
      true,
    );

    try {
      const result =
        await this.authService
          .signOut();

      if (
        !result.success
      ) {
        console.error(
          'Could not sign out:',
          result.message,
        );

        return;
      }

      await this.router
        .navigateByUrl(
          '/login',
        );

    } finally {
      this.isLoggingOut.set(
        false,
      );
    }
  }
}

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

interface PortalNavigationItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector:
    'app-portal-layout',

  standalone:
    true,

  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],

  templateUrl:
    './portal-layout.component.html',

  styleUrl:
    './portal-layout.component.scss',
})
export class PortalLayoutComponent {
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

  readonly studentName =
    computed(
      () =>
        this.profile()?.fullName
        || 'Aluno',
    );

  readonly firstName =
    computed(
      () => {
        const name =
          this.studentName()
            .trim();

        return (
          name
            .split(/\s+/)[0]
          || 'Aluno'
        );
      },
    );

  readonly initials =
    computed(
      () => {
        const parts =
          this.studentName()
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

  readonly navigation:
    readonly PortalNavigationItem[] = [
      {
        label:
          'Início',

        icon:
          'bi-house',

        route:
          '/portal',

        exact:
          true,
      },

      {
        label:
          'Meus testes',

        icon:
          'bi-journal-check',

        route:
          '/portal/testes',
      },

      {
        label:
          'Meu perfil',

        icon:
          'bi-person',

        route:
          '/portal/perfil',
      },
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

import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import {
  filter,
} from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';


interface NavigationItem {
  label: string;
  fragment?: string;
  route: string;
}

@Component({
  selector:
    'app-header',

  standalone:
    true,

  imports: [
    RouterLink,
    RouterLinkActive,
  ],

  templateUrl:
    './header.component.html',

  styleUrl:
    './header.component.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class Header {

  private readonly router =
    inject(Router);

  readonly authService =
    inject(AuthService);

  readonly isMenuOpen =
    signal(false);

  readonly currentUrl =
    signal(
      this.router.url,
    );

  readonly navigationItems:
    readonly NavigationItem[] = [
      {
        label:
          'Início',

        route:
          '/',
      },

      {
        label:
          'Como funciona',

        route:
          '/',

        fragment:
          'como-funciona',
      },

      {
        label:
          'Sobre a FB',

        route:
          '/',

        fragment:
          'sobre',
      },
    ];

  readonly hideHeader =
    computed(
      () => {
        const url =
          this.currentUrl()
            .split('?')[0]
            .split('#')[0];

        return (
          url === '/login'
          ||
          url === '/primeiro-acesso'
          ||
          url === '/teste'
          ||
          url.startsWith(
            '/teste/',
          )
          ||
          url === '/admin'
          ||
          url.startsWith(
            '/admin/',
          )
          ||
          url === '/portal'
          ||
          url.startsWith(
            '/portal/',
          )
        );
      },
    );

  readonly hasPermanentSession =
    computed(
      () =>
        this.authService
          .isAuthenticated()
        &&
        !this.authService
          .isAnonymous(),
    );

  readonly portalRoute =
    computed(
      () => {
        if (
          this.authService
            .isStaff()
        ) {
          return '/admin';
        }

        if (
          this.authService
            .isStudent()
        ) {
          return '/portal';
        }

        return '/login';
      },
    );

  readonly portalLabel =
    computed(
      () => {
        if (
          this.authService
            .isStaff()
        ) {
          return 'Painel administrativo';
        }

        if (
          this.authService
            .isStudent()
        ) {
          return 'Meu portal';
        }

        return 'Acessar portal';
      },
    );

  constructor() {
    this.router.events
      .pipe(
        filter(
          (
            event,
          ): event is NavigationEnd =>
            event instanceof
            NavigationEnd,
        ),
      )
      .subscribe(
        (
          event,
        ) => {
          this.currentUrl.set(
            event.urlAfterRedirects,
          );

          this.closeMenu();
        },
      );
  }

  toggleMenu():
    void {
    this.isMenuOpen.update(
      (
        isOpen,
      ) =>
        !isOpen,
    );
  }

  closeMenu():
    void {
    this.isMenuOpen.set(
      false,
    );
  }

  async navigateToSection(
    route: string,
    fragment?: string,
  ): Promise<void> {
    this.closeMenu();

    await this.router.navigate(
      [
        route,
      ],
      fragment
        ? {
            fragment,
          }
        : undefined,
    );
  }

  async signOut():
    Promise<void> {
    this.closeMenu();

    await this.authService
      .signOut();

    await this.router
      .navigateByUrl(
        '/',
      );
  }

  @HostListener(
    'document:keydown.escape',
  )
  handleEscapeKey():
    void {
    if (
      this.isMenuOpen()
    ) {
      this.closeMenu();
    }
  }

  @HostListener(
    'window:resize',
  )
  handleWindowResize():
    void {
    if (
      typeof window !==
        'undefined'
      &&
      window.innerWidth >=
        992
      &&
      this.isMenuOpen()
    ) {
      this.closeMenu();
    }
  }
}

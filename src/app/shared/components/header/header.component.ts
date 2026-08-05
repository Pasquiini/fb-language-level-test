import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  signal,
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

interface NavigationItem {
  label: string;
  fragment?: string;
  route: string;
}

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  readonly isMenuOpen = signal<boolean>(false);

  readonly navigationItems: readonly NavigationItem[] = [
    {
      label: 'Início',
      route: '/',
    },
    {
      label: 'Como funciona',
      route: '/',
      fragment: 'como-funciona',
    },
    {
      label: 'Sobre a FB',
      route: '/',
      fragment: 'sobre',
    },
  ];

  constructor(private readonly router: Router) {}

  toggleMenu(): void {
    this.isMenuOpen.update((isOpen) => !isOpen);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  async navigateToSection(
    route: string,
    fragment?: string,
  ): Promise<void> {
    this.closeMenu();

    await this.router.navigate(
      [route],
      fragment
        ? {
            fragment,
          }
        : undefined,
    );
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.isMenuOpen()) {
      this.closeMenu();
    }
  }

  @HostListener('window:resize')
  handleWindowResize(): void {
    if (
      typeof window !== 'undefined' &&
      window.innerWidth >= 992 &&
      this.isMenuOpen()
    ) {
      this.closeMenu();
    }
  }
}

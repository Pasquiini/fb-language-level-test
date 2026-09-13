import {
  Component,
  computed,
  inject,
} from '@angular/core';

import {
  AuthService,
} from '../../../core/services/auth.service';

@Component({
  selector:
    'app-portal-profile',

  standalone:
    true,

  templateUrl:
    './portal-profile.component.html',

  styleUrl:
    './portal-profile.component.scss',
})
export class PortalProfileComponent {
  private readonly authService =
    inject(AuthService);

  readonly profile =
    this.authService.profile;

  readonly initials =
    computed(
      () => {
        const name =
          this.profile()
            ?.fullName
            ?.trim();

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
}

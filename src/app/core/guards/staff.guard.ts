import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router,
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const staffGuard: CanActivateFn =
  async () => {
    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    while (!authService.initialized()) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 25);
      });
    }

    if (
      authService.isAuthenticated() &&
      authService.isStaff()
    ) {
      return true;
    }

    if (authService.isStudent()) {
      return router.createUrlTree([
        '/aluno',
      ]);
    }

    return router.createUrlTree([
      '/login',
    ]);
  };

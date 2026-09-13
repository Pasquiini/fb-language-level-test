import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router,
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const studentGuard: CanActivateFn =
  async () => {
    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    await authService
      .waitUntilInitialized();

    if (
      !authService
        .isAuthenticated()
    ) {
      return router.createUrlTree([
        '/login',
      ]);
    }

    if (
      authService
        .isStudent()
    ) {
      return true;
    }

    if (
      authService
        .isStaff()
    ) {
      return router.createUrlTree([
        '/admin',
      ]);
    }

    return router.createUrlTree([
      '/login',
    ]);
  };

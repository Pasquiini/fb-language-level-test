import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router,
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn =
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
        .isAdmin()
    ) {
      return true;
    }

    if (
      authService
        .isStudent()
    ) {
      return router.createUrlTree([
        '/portal',
      ]);
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

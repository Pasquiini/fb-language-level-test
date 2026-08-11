import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router,
} from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn =
  async (_route, state) => {
    const authService =
      inject(AuthService);

    const router =
      inject(Router);

    while (!authService.initialized()) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 25);
      });
    }

    if (authService.isAuthenticated()) {
      return true;
    }

    return router.createUrlTree(
      ['/login'],
      {
        queryParams: {
          redirect: state.url,
        },
      },
    );
  };

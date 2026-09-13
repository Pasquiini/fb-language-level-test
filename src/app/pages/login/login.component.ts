import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  AuthService,
} from '../../core/services/auth.service';

@Component({
  selector:
    'app-login',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],

  templateUrl:
    './login.component.html',

  styleUrl:
    './login.component.scss',
})
export class LoginComponent
  implements OnInit {
  private readonly formBuilder =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly route =
    inject(ActivatedRoute);

  readonly isSubmitting =
    signal(false);

  readonly showPassword =
    signal(false);

  readonly errorMessage =
    signal<string | null>(
      null,
    );

  readonly loginForm =
    this.formBuilder
      .nonNullable
      .group({
        email: [
          '',
          [
            Validators.required,
            Validators.email,
          ],
        ],

        password: [
          '',
          [
            Validators.required,
          ],
        ],
      });

  readonly emailControl =
    this.loginForm.controls.email;

  readonly passwordControl =
    this.loginForm.controls.password;

  readonly canSubmit =
    computed(
      () =>
        !this.isSubmitting(),
    );
  async ngOnInit():
    Promise<void> {
    await this.authService
      .waitUntilInitialized();

    if (
      !this.authService
        .isAuthenticated()
    ) {
      return;
    }
    if (
      this.authService
        .isAnonymous()
    ) {
      return;
    }

    await this.redirectAfterLogin();
  }

  togglePassword():
    void {
    this.showPassword.update(
      (value) =>
        !value,
    );
  }

  async submit():
    Promise<void> {
    if (
      this.loginForm.invalid
    ) {
      this.loginForm
        .markAllAsTouched();

      return;
    }

    if (
      this.isSubmitting()
    ) {
      return;
    }

    this.isSubmitting.set(
      true,
    );

    this.errorMessage.set(
      null,
    );

    try {
      const result =
        await this.authService
          .signInWithPassword(
            this.loginForm
              .getRawValue(),
          );

      if (
        !result.success
      ) {
        this.errorMessage.set(
          result.message,
        );

        return;
      }

      await this.redirectAfterLogin();

    } catch (error) {
      console.error(
        'Login error:',
        error,
      );

      this.errorMessage.set(
        'Não foi possível entrar. Tente novamente.',
      );

    } finally {
      this.isSubmitting.set(
        false,
      );
    }
  }

  private async redirectAfterLogin():
    Promise<void> {
    const redirect =
      this.route.snapshot
        .queryParamMap
        .get('redirect');

    if (
      this.authService
        .isAdmin()
    ) {
      await this.router
        .navigateByUrl(
          this.getAdminRedirect(
            redirect,
          ),
        );

      return;
    }

    if (
      this.authService
        .isStudent()
    ) {
      await this.router
        .navigateByUrl(
          this.getStudentRedirect(
            redirect,
          ),
        );

      return;
    }

    if (
      this.authService
        .isStaff()
    ) {
      await this.router
        .navigateByUrl(
          '/admin',
        );

      return;
    }

    await this.authService
      .signOut();

    this.errorMessage.set(
      'Seu perfil não possui acesso disponível.',
    );
  }

  private getAdminRedirect(
    redirect: string | null,
  ): string {
    if (
      redirect &&
      redirect.startsWith(
        '/admin',
      )
    ) {
      return redirect;
    }

    return '/admin';
  }

  private getStudentRedirect(
    redirect: string | null,
  ): string {
    if (
      redirect &&
      redirect.startsWith(
        '/portal',
      )
    ) {
      return redirect;
    }

    return '/portal';
  }
}

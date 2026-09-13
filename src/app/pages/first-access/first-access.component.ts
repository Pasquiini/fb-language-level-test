import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  Router,
  RouterLink,
} from '@angular/router';

import {
  AuthService,
} from '../../core/services/auth.service';

@Component({
  selector:
    'app-first-access',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],

  templateUrl:
    './first-access.component.html',

  styleUrl:
    './first-access.component.scss',
})
export class FirstAccessComponent
  implements OnInit {

  private readonly formBuilder =
    inject(FormBuilder);

  readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  readonly validating =
    signal(true);

  readonly submitting =
    signal(false);

  readonly showPassword =
    signal(false);

  readonly showConfirmPassword =
    signal(false);

  readonly errorMessage =
    signal<string | null>(
      null,
    );

  readonly form =
    this.formBuilder
      .nonNullable
      .group({
        password: [
          '',
          [
            Validators.required,
            Validators.minLength(
              8,
            ),
          ],
        ],

        confirmPassword: [
          '',
          [
            Validators.required,
          ],
        ],
      });

  readonly passwordControl =
    this.form.controls.password;

  readonly confirmPasswordControl =
    this.form.controls
      .confirmPassword;

  readonly passwordsMatch =
    computed(
      () => {
        const password =
          this.passwordControl
            .value;

        const confirmation =
          this.confirmPasswordControl
            .value;

        return (
          !confirmation ||
          password === confirmation
        );
      },
    );

  readonly canSubmit =
    computed(
      () =>
        !this.submitting(),
    );

  async ngOnInit():
    Promise<void> {
    await this.authService
      .waitUntilInitialized();

    this.validating.set(
      false,
    );

    if (
      !this.authService.user()
    ) {
      this.errorMessage.set(
        'Este link de primeiro acesso é inválido ou expirou.',
      );
    }
  }

  togglePassword():
    void {
    this.showPassword.update(
      (value) =>
        !value,
    );
  }

  toggleConfirmPassword():
    void {
    this.showConfirmPassword.update(
      (value) =>
        !value,
    );
  }

  async submit():
    Promise<void> {
    this.errorMessage.set(
      null,
    );

    if (
      this.form.invalid
    ) {
      this.form
        .markAllAsTouched();

      return;
    }

    const {
      password,
      confirmPassword,
    } =
      this.form.getRawValue();

    if (
      password !==
      confirmPassword
    ) {
      this.confirmPasswordControl
        .markAsTouched();

      this.errorMessage.set(
        'As senhas não coincidem.',
      );

      return;
    }

    if (
      !this.authService.user()
    ) {
      this.errorMessage.set(
        'Sua sessão de primeiro acesso não está mais válida.',
      );

      return;
    }

    if (
      this.submitting()
    ) {
      return;
    }

    this.submitting.set(
      true,
    );

    try {
      const result =
        await this.authService
          .updatePassword(
            password,
          );

      if (
        !result.success
      ) {
        this.errorMessage.set(
          result.message,
        );

        return;
      }

      await this.router.navigateByUrl(
        '/portal',
      );
    } catch (error) {
      console.error(
        'Could not configure first access:',
        error,
      );

      this.errorMessage.set(
        'Não foi possível criar sua senha. Tente novamente.',
      );
    } finally {
      this.submitting.set(
        false,
      );
    }
  }

  hasError(
    controlName:
      'password' |
      'confirmPassword',

    errorName:
      string,
  ): boolean {
    const control =
      this.form.controls[
        controlName
      ];

    return (
      control.touched &&
      control.hasError(
        errorName,
      )
    );
  }
}

import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import {
  Router,
  RouterLink,
} from '@angular/router';

import {
  TestRegistrationService,
} from '../../core/services/test-registration.service';

const whatsappValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(
    control.value ?? '',
  );

  const digits = value.replace(
    /\D/g,
    '',
  );

  if (!digits) {
    return null;
  }

  if (
    digits.length !== 10 &&
    digits.length !== 11
  ) {
    return {
      whatsappLength: true,
    };
  }

  const areaCode =
    digits.slice(0, 2);

  const phoneNumber =
    digits.slice(2);

  if (
    areaCode.startsWith('0') ||
    phoneNumber.startsWith('0')
  ) {
    return {
      whatsappFormat: true,
    };
  }

  return null;
};

const noWhitespaceValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = String(
    control.value ?? '',
  );

  if (!value) {
    return null;
  }

  return /\s/.test(value)
    ? {
        whitespace: true,
      }
    : null;
};

@Component({
  selector: 'app-lead-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl:
    './lead-form.component.html',
  styleUrl:
    './lead-form.component.scss',
})
export class LeadFormComponent {
  private readonly formBuilder =
    inject(FormBuilder);

  private readonly testRegistration =
    inject(TestRegistrationService);

  private readonly router =
    inject(Router);

  readonly levelOptions = [
    {
      value: 'beginner',
      label: 'Iniciante',
    },
    {
      value: 'basic',
      label: 'Básico',
    },
    {
      value: 'intermediate',
      label: 'Intermediário',
    },
    {
      value: 'advanced',
      label: 'Avançado',
    },
    {
      value: 'unsure',
      label: 'Não sei informar',
    },
  ];

  readonly studyDurationOptions = [
    {
      value: 'never',
      label: 'Nunca estudei inglês',
    },
    {
      value: 'less_than_6_months',
      label: 'Menos de 6 meses',
    },
    {
      value: '6_to_12_months',
      label: 'De 6 meses a 1 ano',
    },
    {
      value: '1_to_2_years',
      label: 'De 1 a 2 anos',
    },
    {
      value: '2_to_5_years',
      label: 'De 2 a 5 anos',
    },
    {
      value: 'more_than_5_years',
      label: 'Mais de 5 anos',
    },
  ];

  readonly goalOptions = [
    {
      value: 'travel',
      label: 'Viagens',
    },
    {
      value: 'work',
      label: 'Trabalho',
    },
    {
      value: 'studies',
      label: 'Estudos',
    },
    {
      value: 'conversation',
      label: 'Conversação',
    },
    {
      value: 'certification',
      label: 'Prova / certificação',
    },
    {
      value: 'personal_development',
      label: 'Desenvolvimento pessoal',
    },
    {
      value: 'general_english',
      label: 'Inglês geral',
    },
  ];

  readonly modalityOptions = [
    {
      value: 'individual',
      label: 'Individual',
    },
    {
      value: 'pair',
      label: 'Dupla',
    },
    {
      value: 'group',
      label: 'Grupo',
    },
    {
      value: 'recorded_course',
      label: 'Curso gravado',
    },
    {
      value: 'unsure',
      label: 'Ainda não sei',
    },
  ];

  readonly availabilityOptions = [
    {
      value: 'morning',
      label: 'Manhã',
    },
    {
      value: 'afternoon',
      label: 'Tarde',
    },
    {
      value: 'evening',
      label: 'Noite',
    },
  ];

  readonly form =
    this.formBuilder
      .nonNullable
      .group({
        fullName: [
          '',
          [
            Validators.required,
            Validators.minLength(3),
            Validators.maxLength(120),
          ],
        ],

        whatsapp: [
          '',
          [
            Validators.required,
            whatsappValidator,
          ],
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.maxLength(160),
            noWhitespaceValidator,
          ],
        ],

        perceivedLevel: [
          '',
          Validators.required,
        ],

        studyDuration: [
          '',
          Validators.required,
        ],

        previousSchool: [
          '',
          Validators.maxLength(160),
        ],

        mainGoal: [
          '',
          Validators.required,
        ],

        preferredModality: [
          '',
          Validators.required,
        ],

        availabilityPeriod: [
          '',
          Validators.required,
        ],
      });

  submitted = false;
  submitting = false;

  submitError: string | null = null;

  get fullName() {
    return this.form.controls.fullName;
  }

  get whatsapp() {
    return this.form.controls.whatsapp;
  }

  get email() {
    return this.form.controls.email;
  }

  get perceivedLevel() {
    return this.form.controls.perceivedLevel;
  }

  get studyDuration() {
    return this.form.controls.studyDuration;
  }

  get previousSchool() {
    return this.form.controls.previousSchool;
  }

  get mainGoal() {
    return this.form.controls.mainGoal;
  }

  get preferredModality() {
    return this.form.controls
      .preferredModality;
  }

  get availabilityPeriod() {
    return this.form.controls
      .availabilityPeriod;
  }

  isInvalid(
    controlName:
      keyof typeof this.form.controls,
  ): boolean {
    const control =
      this.form.controls[controlName];

    return (
      control.invalid &&
      (
        control.touched ||
        this.submitted
      )
    );
  }

  onWhatsappInput(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const formattedValue =
      this.formatWhatsapp(
        input.value,
      );

    this.whatsapp.setValue(
      formattedValue,
      {
        emitEvent: false,
      },
    );

    input.value =
      formattedValue;
  }

  onEmailBlur(): void {
    const normalizedEmail =
      this.normalizeEmail(
        this.email.value,
      );

    this.email.setValue(
      normalizedEmail,
      {
        emitEvent: false,
      },
    );

    this.email.updateValueAndValidity({
      emitEvent: false,
    });
  }

  private formatWhatsapp(
    value: string,
  ): string {
    const digits =
      this.normalizeWhatsapp(value)
        .slice(0, 11);

    if (!digits) {
      return '';
    }

    if (digits.length <= 2) {
      return `(${digits}`;
    }

    const areaCode =
      digits.slice(0, 2);

    const phone =
      digits.slice(2);

    if (phone.length <= 4) {
      return `(${areaCode}) ${phone}`;
    }

    if (digits.length <= 10) {
      const firstPart =
        phone.slice(0, 4);

      const lastPart =
        phone.slice(4, 8);

      return lastPart
        ? `(${areaCode}) ${firstPart}-${lastPart}`
        : `(${areaCode}) ${firstPart}`;
    }

    const firstPart =
      phone.slice(0, 5);

    const lastPart =
      phone.slice(5, 9);

    return lastPart
      ? `(${areaCode}) ${firstPart}-${lastPart}`
      : `(${areaCode}) ${firstPart}`;
  }

  private normalizeWhatsapp(
    value: string,
  ): string {
    return value.replace(
      /\D/g,
      '',
    );
  }

  private normalizeEmail(
    value: string,
  ): string {
    return value
      .trim()
      .toLowerCase();
  }

  async onSubmit(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.submitted = true;
    this.submitError = null;

    this.onEmailBlur();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;

    this.form.disable({
      emitEvent: false,
    });

    try {
      const formValue =
        this.form.getRawValue();

      const registrationData = {
        ...formValue,

        fullName:
          formValue.fullName.trim(),

        whatsapp:
          this.normalizeWhatsapp(
            formValue.whatsapp,
          ),

        email:
          this.normalizeEmail(
            formValue.email,
          ),

        previousSchool:
          formValue.previousSchool.trim(),
      };

      const result =
        await this.testRegistration
          .register(
            registrationData,
          );

      if (!result.success) {
        this.submitError =
          result.message;

        return;
      }

      if (
        !result.testId ||
        !result.attemptId
      ) {
        this.submitError =
          'Sua avaliação foi preparada, mas não conseguimos identificar a tentativa. Tente novamente.';

        return;
      }

      await this.router.navigate(
        ['/teste/perguntas'],
        {
          queryParams: {
            testId:
              result.testId,
            attemptId:
              result.attemptId,
          },
        },
      );
    } catch (error) {
      console.error(
        'Could not start test:',
        error,
      );

      this.submitError =
        'Não foi possível preparar sua avaliação. Verifique sua conexão e tente novamente.';
    } finally {
      this.submitting = false;

      this.form.enable({
        emitEvent: false,
      });
    }
  }
}

import {
  CommonModule,
} from '@angular/common';

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

interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

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

  const countryCode =
    String(
      control.parent
        ?.get('countryCode')
        ?.value ?? '+55',
    );

  const dialCodeDigits =
    countryCode.replace(
      /\D/g,
      '',
    );

  const maxNationalLength =
    15 - dialCodeDigits.length;

  if (countryCode === '+55') {
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
  }

  if (
    digits.length < 6 ||
    digits.length >
      maxNationalLength
  ) {
    return {
      internationalWhatsappLength:
        true,
    };
  }

  if (digits.startsWith('0')) {
    return {
      whatsappFormat: true,
    };
  }

  return null;
};

const noWhitespaceValidator:
  ValidatorFn = (
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

  readonly countryOptions:
    CountryOption[] = [
      {
        code: 'BR',
        name: 'Brasil',
        dialCode: '+55',
        flag: '🇧🇷',
      },
      {
        code: 'US',
        name: 'Estados Unidos',
        dialCode: '+1',
        flag: '🇺🇸',
      },
      {
        code: 'CA',
        name: 'Canadá',
        dialCode: '+1',
        flag: '🇨🇦',
      },
      {
        code: 'PT',
        name: 'Portugal',
        dialCode: '+351',
        flag: '🇵🇹',
      },
      {
        code: 'GB',
        name: 'Reino Unido',
        dialCode: '+44',
        flag: '🇬🇧',
      },
      {
        code: 'IE',
        name: 'Irlanda',
        dialCode: '+353',
        flag: '🇮🇪',
      },
      {
        code: 'ES',
        name: 'Espanha',
        dialCode: '+34',
        flag: '🇪🇸',
      },
      {
        code: 'FR',
        name: 'França',
        dialCode: '+33',
        flag: '🇫🇷',
      },
      {
        code: 'DE',
        name: 'Alemanha',
        dialCode: '+49',
        flag: '🇩🇪',
      },
      {
        code: 'IT',
        name: 'Itália',
        dialCode: '+39',
        flag: '🇮🇹',
      },
      {
        code: 'CH',
        name: 'Suíça',
        dialCode: '+41',
        flag: '🇨🇭',
      },
      {
        code: 'AU',
        name: 'Austrália',
        dialCode: '+61',
        flag: '🇦🇺',
      },
      {
        code: 'NZ',
        name: 'Nova Zelândia',
        dialCode: '+64',
        flag: '🇳🇿',
      },
      {
        code: 'AR',
        name: 'Argentina',
        dialCode: '+54',
        flag: '🇦🇷',
      },
      {
        code: 'UY',
        name: 'Uruguai',
        dialCode: '+598',
        flag: '🇺🇾',
      },
      {
        code: 'PY',
        name: 'Paraguai',
        dialCode: '+595',
        flag: '🇵🇾',
      },
      {
        code: 'CL',
        name: 'Chile',
        dialCode: '+56',
        flag: '🇨🇱',
      },
      {
        code: 'CO',
        name: 'Colômbia',
        dialCode: '+57',
        flag: '🇨🇴',
      },
      {
        code: 'MX',
        name: 'México',
        dialCode: '+52',
        flag: '🇲🇽',
      },
      {
        code: 'PE',
        name: 'Peru',
        dialCode: '+51',
        flag: '🇵🇪',
      },
    ];

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
      value:
        'personal_development',
      label:
        'Desenvolvimento pessoal',
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

        countryCode: [
          '+55',
          Validators.required,
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

  submitError: string | null =
    null;

  get fullName() {
    return this.form.controls
      .fullName;
  }

  get countryCode() {
    return this.form.controls
      .countryCode;
  }

  get whatsapp() {
    return this.form.controls
      .whatsapp;
  }

  get email() {
    return this.form.controls.email;
  }

  get perceivedLevel() {
    return this.form.controls
      .perceivedLevel;
  }

  get studyDuration() {
    return this.form.controls
      .studyDuration;
  }

  get previousSchool() {
    return this.form.controls
      .previousSchool;
  }

  get mainGoal() {
    return this.form.controls
      .mainGoal;
  }

  get preferredModality() {
    return this.form.controls
      .preferredModality;
  }

  get availabilityPeriod() {
    return this.form.controls
      .availabilityPeriod;
  }

  get isBrazil(): boolean {
    return (
      this.countryCode.value ===
      '+55'
    );
  }

  get whatsappPlaceholder():
    string {
    return this.isBrazil
      ? '(00) 00000-0000'
      : 'Número do WhatsApp';
  }

  get whatsappMaxLength():
    number {
    return this.isBrazil
      ? 15
      : 18;
  }

  isInvalid(
    controlName:
      keyof typeof this.form.controls,
  ): boolean {
    const control =
      this.form.controls[
        controlName
      ];

    return (
      control.invalid &&
      (
        control.touched ||
        this.submitted
      )
    );
  }

  onCountryCodeChange(): void {
    const digits =
      this.normalizeWhatsapp(
        this.whatsapp.value,
      );

    const formattedValue =
      this.isBrazil
        ? this.formatBrazilWhatsapp(
            digits,
          )
        : digits;

    this.whatsapp.setValue(
      formattedValue,
      {
        emitEvent: false,
      },
    );

    this.whatsapp
      .updateValueAndValidity({
        emitEvent: false,
      });
  }

  onWhatsappInput(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const formattedValue =
      this.isBrazil
        ? this.formatBrazilWhatsapp(
            input.value,
          )
        : this.formatInternationalWhatsapp(
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

    this.whatsapp
      .updateValueAndValidity({
        emitEvent: false,
      });
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

    this.email
      .updateValueAndValidity({
        emitEvent: false,
      });
  }

  private formatBrazilWhatsapp(
    value: string,
  ): string {
    const digits =
      this.normalizeWhatsapp(
        value,
      ).slice(0, 11);

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
      return (
        `(${areaCode}) ` +
        phone
      );
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

  private formatInternationalWhatsapp(
    value: string,
  ): string {
    const digits =
      this.normalizeWhatsapp(
        value,
      );

    const dialCodeDigits =
      this.countryCode.value
        .replace(
          /\D/g,
          '',
        );

    const maxNationalLength =
      15 -
      dialCodeDigits.length;

    return digits.slice(
      0,
      maxNationalLength,
    );
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

  private buildInternationalWhatsapp(
    countryCode: string,
    whatsapp: string,
  ): string {
    const dialCode =
      countryCode.replace(
        /\D/g,
        '',
      );

    const nationalNumber =
      this.normalizeWhatsapp(
        whatsapp,
      );

    return (
      `+${dialCode}` +
      nationalNumber
    );
  }

  async onSubmit(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.submitted = true;
    this.submitError = null;

    this.onEmailBlur();

    this.whatsapp
      .updateValueAndValidity({
        emitEvent: false,
      });

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

      const {
        countryCode,
        ...registrationFormValue
      } = formValue;

      const registrationData = {
        ...registrationFormValue,

        fullName:
          formValue.fullName.trim(),

        whatsapp:
          this.buildInternationalWhatsapp(
            countryCode,
            formValue.whatsapp,
          ),

        email:
          this.normalizeEmail(
            formValue.email,
          ),

        previousSchool:
          formValue.previousSchool
            .trim(),
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
        [
          '/teste/perguntas',
        ],
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

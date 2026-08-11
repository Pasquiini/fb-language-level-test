import {
  CommonModule,
} from '@angular/common';

import {
  Component,
  inject,
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
  TestRegistrationService,
} from '../../core/services/test-registration.service';

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
            Validators.minLength(10),
            Validators.maxLength(20),
          ],
        ],

        email: [
          '',
          [
            Validators.required,
            Validators.email,
            Validators.maxLength(160),
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
  submitSuccess: string | null = null;

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

  async onSubmit(): Promise<void> {
    this.submitted = true;
    this.submitError = null;
    this.submitSuccess = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.submitting) {
      return;
    }

    this.submitting = true;

    try {
      const result =
        await this.testRegistration
          .register(
            this.form.getRawValue(),
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
          'O teste foi iniciado, mas não foi possível identificar a tentativa.';

        return;
      }

      this.submitSuccess =
        result.message;

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
        'Não foi possível iniciar sua avaliação. Tente novamente.';
    } finally {
      this.submitting = false;
    }
  }
}

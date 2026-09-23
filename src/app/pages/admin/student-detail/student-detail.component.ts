import {
  DatePipe,
  DecimalPipe,
} from '@angular/common';

import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  ActivatedRoute,
  RouterLink,
} from '@angular/router';

import {
  AdminAttemptAnswerBreakdown,
  AdminStudentDetail,
  AdminStudentService,
  AdminStudentTest,
} from '../../../core/services/admin-student.service';

@Component({
  selector:
    'app-student-detail',

  standalone:
    true,

  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
  ],

  templateUrl:
    './student-detail.component.html',

  styleUrl:
    './student-detail.component.scss',
})
export class StudentDetailComponent
  implements OnInit {

  private readonly route =
    inject(ActivatedRoute);

  private readonly studentService =
    inject(AdminStudentService);

  readonly detail =
    signal<AdminStudentDetail | null>(
      null,
    );

  readonly isLoading =
    signal(true);
  readonly messages =
    computed(
      () =>
        this.detail()?.messages
        ?? [],
    );
  readonly errorMessage =
    signal<string | null>(
      null,
    );

  readonly student =
    computed(
      () =>
        this.detail()?.student
        ?? null,
    );

  readonly tests =
    computed(
      () =>
        this.detail()?.tests
        ?? [],
    );

  readonly totalTests =
    computed(
      () =>
        this.tests().length,
    );

  readonly lastTest =
    computed<AdminStudentTest | null>(
      () =>
        this.tests()[0]
        ?? null,
    );

  readonly currentLevel =
    computed(
      () => {
        for (
          const test
          of this.tests()
        ) {
          const level =
            test.result
              ?.estimatedLevel;

          if (
            level &&
            level.toLowerCase()
            !== 'pendente'
          ) {
            return level;
          }
        }

        return null;
      },
    );
  readonly expandedTestId =
    signal<string | null>(
      null,
    );

  readonly answerBreakdowns =
    signal<
      Record<
        string,
        AdminAttemptAnswerBreakdown
      >
    >({});

  readonly loadingAnswersTestId =
    signal<string | null>(
      null,
    );

  readonly answerErrors =
    signal<
      Record<string, string>
    >({});

  ngOnInit():
    void {
    const studentId =
      this.route.snapshot
        .paramMap
        .get('studentId');

    if (!studentId) {
      this.errorMessage.set(
        'Aluno não identificado.',
      );

      this.isLoading.set(
        false,
      );

      return;
    }

    void this.loadStudent(
      studentId,
    );
  }

  profileValueLabel(
    value: string | null,
  ): string {
    if (!value) {
      return 'Não informado';
    }

    const labels:
      Record<string, string> = {
      // Nível percebido
      beginner:
        'Iniciante',
      basic:
        'Básico',
      intermediate:
        'Intermediário',
      advanced:
        'Avançado',
      unsure:
        'Não sei informar',

      // Tempo de estudo
      never:
        'Nunca estudou inglês',
      less_than_6_months:
        'Menos de 6 meses',
      '6_to_12_months':
        'De 6 meses a 1 ano',
      '1_to_2_years':
        'De 1 a 2 anos',
      '2_to_5_years':
        'De 2 a 5 anos',
      more_than_5_years:
        'Mais de 5 anos',

      // Objetivo
      travel:
        'Viagens',
      work:
        'Trabalho',
      studies:
        'Estudos',
      conversation:
        'Conversação',
      certification:
        'Prova / certificação',
      personal_development:
        'Desenvolvimento pessoal',
      general_english:
        'Inglês geral',

      // Modalidade
      individual:
        'Individual',
      pair:
        'Dupla',
      group:
        'Grupo',
      recorded_course:
        'Curso gravado',

      // Frequência
      once_per_week:
        '1 vez por semana',
      twice_per_week:
        '2 vezes por semana',

      // Período
      morning:
        'Manhã',
      afternoon:
        'Tarde',
      evening:
        'Noite',
    };

    return (
      labels[value]
      ?? value.replaceAll(
        '_',
        ' ',
      )
    );
  }

  messageStatusLabel(
    status: string,
  ): string {
    switch (status) {
      case 'sent':
        return 'Enviada';

      case 'pending':
        return 'Pendente';

      case 'failed':
        return 'Falha';

      case 'processing':
        return 'Processando';

      default:
        return status
          .replaceAll(
            '_',
            ' ',
          );
    }
  }
  profileValuesLabel(
    values: string[] | null,
  ): string {
    if (
      !values ||
      values.length === 0
    ) {
      return 'Não informado';
    }

    return values
      .map(
        value =>
          this.profileValueLabel(
            value,
          ),
      )
      .join(', ');
  }
  messageStatusClass(
    status: string,
  ): string {
    switch (status) {
      case 'sent':
        return 'is-sent';

      case 'failed':
        return 'is-failed';

      case 'pending':
        return 'is-pending';

      default:
        return 'is-neutral';
    }
  }

  statusLabel(
    status: string,
  ): string {
    switch (status) {
      case 'under_review':
        return 'Em avaliação';

      case 'completed':
        return 'Concluído';

      case 'in_progress':
        return 'Em andamento';

      default:
        return status
          .replaceAll(
            '_',
            ' ',
          );
    }
  }

  statusClass(
    status: string,
  ): string {
    switch (status) {
      case 'completed':
        return 'is-completed';

      case 'under_review':
        return 'is-review';

      default:
        return 'is-neutral';
    }
  }

  isTestAnswersExpanded(
    testId: string,
  ): boolean {
    return (
      this.expandedTestId()
      === testId
    );
  }

  breakdownFor(
    testId: string,
  ): AdminAttemptAnswerBreakdown | null {
    return (
      this.answerBreakdowns()[
      testId
      ]
      ?? null
    );
  }

  answerErrorFor(
    testId: string,
  ): string | null {
    return (
      this.answerErrors()[
      testId
      ]
      ?? null
    );
  }

  async toggleTestAnswers(
    testId: string,
  ): Promise<void> {

    if (
      this.expandedTestId()
      === testId
    ) {
      this.expandedTestId.set(
        null,
      );

      return;
    }

    this.expandedTestId.set(
      testId,
    );

    const existing =
      this.answerBreakdowns()[
      testId
      ];

    if (existing) {
      return;
    }

    this.loadingAnswersTestId.set(
      testId,
    );

    this.answerErrors.update(
      (current) => {

        const next = {
          ...current,
        };

        delete next[
          testId
        ];

        return next;
      },
    );

    try {
      const breakdown =
        await this.studentService
          .getAttemptAnswerBreakdown(
            testId,
          );

      this.answerBreakdowns.update(
        (current) => ({
          ...current,

          [testId]:
            breakdown,
        }),
      );

    } catch (error) {
      console.error(
        'Could not load test answers:',
        error,
      );

      this.answerErrors.update(
        (current) => ({
          ...current,

          [testId]:
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar as respostas.',
        }),
      );

    } finally {

      if (
        this.loadingAnswersTestId()
        === testId
      ) {
        this.loadingAnswersTestId.set(
          null,
        );
      }
    }
  }

  categoryLabel(
    category: string,
  ): string {

    const labels:
      Record<string, string> = {
      grammar:
        'Grammar',

      vocabulary:
        'Vocabulary',

      reading:
        'Reading',

      context:
        'Context',

      listening:
        'Listening',

      speaking:
        'Speaking',
    };

    return (
      labels[
      category
      ]
      ?? category
    );
  }

  answerStatusLabel(
    isCorrect:
      boolean | null,
  ): string {

    if (
      isCorrect === true
    ) {
      return 'Correta';
    }

    if (
      isCorrect === false
    ) {
      return 'Incorreta';
    }

    return 'Não respondida';
  }

  answerStatusClass(
    isCorrect:
      boolean | null,
  ): string {

    if (
      isCorrect === true
    ) {
      return 'is-correct';
    }

    if (
      isCorrect === false
    ) {
      return 'is-incorrect';
    }

    return 'is-unanswered';
  }

  private async loadStudent(
    studentId: string,
  ): Promise<void> {
    this.isLoading.set(
      true,
    );

    this.errorMessage.set(
      null,
    );

    try {
      const detail =
        await this.studentService
          .getStudentDetail(
            studentId,
          );

      if (!detail) {
        this.errorMessage.set(
          'Aluno não encontrado.',
        );

        return;
      }

      this.detail.set(
        detail,
      );

    } catch (error) {
      console.error(
        'Could not load student:',
        error,
      );

      this.errorMessage.set(
        'Não foi possível carregar os dados do aluno.',
      );

    } finally {
      this.isLoading.set(
        false,
      );
    }
  }
}

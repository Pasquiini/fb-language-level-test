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

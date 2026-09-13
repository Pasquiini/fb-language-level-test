import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  FormControl,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  RouterLink,
} from '@angular/router';

import {
  AdminStudentListItem,
  AdminStudentService,
} from '../../../core/services/admin-student.service';

@Component({
  selector:
    'app-students',

  standalone:
    true,

  imports: [
    ReactiveFormsModule,
    RouterLink,
  ],

  templateUrl:
    './students.component.html',

  styleUrl:
    './students.component.scss',
})
export class StudentsComponent
  implements OnInit {

  private readonly studentService =
    inject(AdminStudentService);

  readonly students =
    signal<
      AdminStudentListItem[]
    >([]);

  readonly isLoading =
    signal(true);

  readonly errorMessage =
    signal<string | null>(
      null,
    );

  readonly searchControl =
    new FormControl(
      '',
      {
        nonNullable: true,
      },
    );

  readonly searchTerm =
    signal('');

  readonly filteredStudents =
    computed(
      () => {
        const term =
          this.normalizeText(
            this.searchTerm(),
          );

        if (!term) {
          return this.students();
        }

        return this.students()
          .filter(
            (student) => {
              const searchable =
                this.normalizeText(
                  [
                    student.fullName,
                    student.email ?? '',
                    student.whatsapp ?? '',
                  ].join(' '),
                );

              return searchable
                .includes(term);
            },
          );
      },
    );

  readonly totalStudents =
    computed(
      () =>
        this.students().length,
    );

  readonly filteredTotal =
    computed(
      () =>
        this.filteredStudents()
          .length,
    );

  ngOnInit():
    void {
    this.searchControl
      .valueChanges
      .subscribe(
        (value) => {
          this.searchTerm.set(
            value,
          );
        },
      );

    void this.loadStudents();
  }

  async reload():
    Promise<void> {
    await this.loadStudents();
  }

  clearSearch():
    void {
    this.searchControl.setValue(
      '',
    );
  }

  initials(
    student:
      AdminStudentListItem,
  ): string {
    const parts =
      student.fullName
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (
      parts.length === 0
    ) {
      return 'AL';
    }

    if (
      parts.length === 1
    ) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      parts[0][0]
      +
      parts[
        parts.length - 1
      ][0]
    ).toUpperCase();
  }

  private async loadStudents():
    Promise<void> {
    this.isLoading.set(
      true,
    );

    this.errorMessage.set(
      null,
    );

    try {
      const students =
        await this.studentService
          .getStudents();

      this.students.set(
        students,
      );

    } catch (error) {
      console.error(
        'Could not load students:',
        error,
      );

      this.errorMessage.set(
        'Não foi possível carregar os alunos.',
      );

    } finally {
      this.isLoading.set(
        false,
      );
    }
  }

  private normalizeText(
    value: string,
  ): string {
    return value
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .trim()
      .toLowerCase();
  }
}

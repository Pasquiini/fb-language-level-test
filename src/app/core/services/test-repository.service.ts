import {
  Injectable,
  inject,
} from '@angular/core';

import {
  DatabaseTest,
} from '../models';

import {
  SupabaseService,
} from './supabase.service';

export interface OpenTestAttempt {
  id: string;
  testId: string;
  studentId: string;
  status: string;
}

export interface StudentTestAttempt {
  id: string;
  testId: string;
  studentId: string;
  status:
    | 'in_progress'
    | 'submitted'
    | 'under_review'
    | 'completed';

  submittedAt: string | null;
  completedAt: string | null;
}

interface OpenTestAttemptRow {
  id: string;
  test_id: string;
  student_id: string;
  status: string;
}

interface StudentTestAttemptRow {
  id: string;
  test_id: string;
  student_id: string;

  status:
    | 'in_progress'
    | 'submitted'
    | 'under_review'
    | 'completed';

  submitted_at: string | null;
  completed_at: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TestRepositoryService {
  private readonly supabase =
    inject(SupabaseService);

  async getActiveTest():
    Promise<DatabaseTest | null> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from('tests')
        .select(`
          id,
          name,
          slug,
          description,
          estimated_minutes,
          version,
          is_active
        `)
        .eq(
          'is_active',
          true,
        )
        .order(
          'version',
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle();

    if (error) {
      throw new Error(
        `Não foi possível carregar o teste: ${error.message}`,
      );
    }

    return (
      data satisfies
        DatabaseTest | null
    );
  }

  async getOpenAttempt(
    studentId: string,
    testId: string,
  ): Promise<OpenTestAttempt | null> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from('test_attempts')
        .select(`
          id,
          test_id,
          student_id,
          status
        `)
        .eq(
          'student_id',
          studentId,
        )
        .eq(
          'test_id',
          testId,
        )
        .is(
          'submitted_at',
          null,
        )
        .is(
          'completed_at',
          null,
        )
        .order(
          'started_at',
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle<OpenTestAttemptRow>();

    if (error) {
      throw new Error(
        `Não foi possível verificar uma tentativa existente: ${error.message}`,
      );
    }

    if (!data) {
      return null;
    }

    return {
      id:
        data.id,

      testId:
        data.test_id,

      studentId:
        data.student_id,

      status:
        data.status,
    };
  }

  async getAttemptForStudent(
    attemptId: string,
    studentId: string,
  ): Promise<StudentTestAttempt | null> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from('test_attempts')
        .select(`
          id,
          test_id,
          student_id,
          status,
          submitted_at,
          completed_at
        `)
        .eq(
          'id',
          attemptId,
        )
        .eq(
          'student_id',
          studentId,
        )
        .maybeSingle<StudentTestAttemptRow>();

    if (error) {
      throw new Error(
        `Não foi possível validar a tentativa: ${error.message}`,
      );
    }

    if (!data) {
      return null;
    }

    return {
      id:
        data.id,

      testId:
        data.test_id,

      studentId:
        data.student_id,

      status:
        data.status,

      submittedAt:
        data.submitted_at,

      completedAt:
        data.completed_at,
    };
  }

  async countSavedObjectiveAnswers(
    attemptId: string,
  ): Promise<number> {
    const {
      count,
      error,
    } =
      await this.supabase.client
        .from('test_answers')
        .select(
          'question_id',
          {
            count:
              'exact',

            head:
              true,
          },
        )
        .eq(
          'attempt_id',
          attemptId,
        );

    if (error) {
      throw new Error(
        `Não foi possível verificar o progresso do teste: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  async countSavedSpeakingAnswers(
    attemptId: string,
  ): Promise<number> {
    const {
      count,
      error,
    } =
      await this.supabase.client
        .from('speaking_answers')
        .select(
          'question_id',
          {
            count:
              'exact',

            head:
              true,
          },
        )
        .eq(
          'attempt_id',
          attemptId,
        );

    if (error) {
      throw new Error(
        `Não foi possível verificar o progresso do speaking: ${error.message}`,
      );
    }

    return count ?? 0;
  }

  async countRequiredSpeakingQuestions(
    testId: string,
  ): Promise<number> {
    const {
      data: sections,
      error: sectionsError,
    } =
      await this.supabase.client
        .from('test_sections')
        .select('id')
        .eq(
          'test_id',
          testId,
        );

    if (sectionsError) {
      throw new Error(
        `Não foi possível verificar as etapas do teste: ${sectionsError.message}`,
      );
    }

    const sectionIds =
      (
        sections ?? []
      ).map(
        (section) =>
          section.id,
      );

    if (
      sectionIds.length === 0
    ) {
      return 0;
    }

    const {
      count,
      error,
    } =
      await this.supabase.client
        .from('questions')
        .select(
          'id',
          {
            count:
              'exact',

            head:
              true,
          },
        )
        .in(
          'section_id',
          sectionIds,
        )
        .eq(
          'type',
          'speaking',
        )
        .eq(
          'is_active',
          true,
        );

    if (error) {
      throw new Error(
        `Não foi possível verificar as questões de speaking: ${error.message}`,
      );
    }

    return count ?? 0;
  }
}

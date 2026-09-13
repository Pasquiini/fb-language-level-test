import {
  Injectable,
  inject,
} from '@angular/core';

import {
  SupabaseService,
} from './supabase.service';

export interface StudentPortalTestResult {
  id: string;

  objectiveScore: number;
  speakingScore: number | null;
  totalScore: number;
  percentage: number;

  estimatedLevel: string;

  summary: string | null;
  recommendation: string | null;
  reviewNotes: string | null;

  generatedAt: string;
}

export interface StudentPortalAttempt {
  id: string;
  status: string;

  startedAt: string;
  submittedAt: string | null;
  completedAt: string | null;

  result: StudentPortalTestResult | null;
}

export interface StudentPortalDashboard {
  latestAttempt: StudentPortalAttempt | null;
  attempts: StudentPortalAttempt[];
}

interface AttemptRow {
  id: string;
  status: string;
  started_at: string;
  submitted_at: string | null;
  completed_at: string | null;
}

interface ResultRow {
  id: string;
  attempt_id: string;
  objective_score: number;
  speaking_score: number | null;
  total_score: number;
  percentage: number;
  estimated_level: string;
  summary: string | null;
  recommendation: string | null;
  review_notes: string | null;
  generated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class StudentPortalService {
  private readonly supabase =
    inject(SupabaseService);

  async getDashboard():
    Promise<StudentPortalDashboard> {
    const {
      data: userData,
      error: userError,
    } =
      await this.supabase.client
        .auth
        .getUser();

    if (
      userError
      ||
      !userData.user
    ) {
      throw new Error(
        'Usuário não autenticado.',
      );
    }

    const studentId =
      userData.user.id;

    const {
      data: attemptsData,
      error: attemptsError,
    } =
      await this.supabase.client
        .from('test_attempts')
        .select(`
          id,
          status,
          started_at,
          submitted_at,
          completed_at
        `)
        .eq(
          'student_id',
          studentId,
        )
        .order(
          'started_at',
          {
            ascending: false,
          },
        );

    if (
      attemptsError
    ) {
      throw attemptsError;
    }

    const attempts =
      (
        attemptsData ?? []
      ) as AttemptRow[];

    const attemptIds =
      attempts.map(
        (attempt) =>
          attempt.id,
      );

    let results:
      ResultRow[] = [];

    if (
      attemptIds.length > 0
    ) {
      const {
        data: resultsData,
        error: resultsError,
      } =
        await this.supabase.client
          .from('test_results')
          .select(`
            id,
            attempt_id,
            objective_score,
            speaking_score,
            total_score,
            percentage,
            estimated_level,
            summary,
            recommendation,
            review_notes,
            generated_at
          `)
          .in(
            'attempt_id',
            attemptIds,
          );

      if (
        resultsError
      ) {
        throw resultsError;
      }

      results =
        (
          resultsData ?? []
        ) as ResultRow[];
    }

    const resultByAttempt =
      new Map<
        string,
        ResultRow
      >();

    for (
      const result
      of results
    ) {
      resultByAttempt.set(
        result.attempt_id,
        result,
      );
    }

    const mappedAttempts:
      StudentPortalAttempt[] =
      attempts.map(
        (attempt) => {
          const result =
            resultByAttempt.get(
              attempt.id,
            );

          return {
            id:
              attempt.id,

            status:
              attempt.status,

            startedAt:
              attempt.started_at,

            submittedAt:
              attempt.submitted_at,

            completedAt:
              attempt.completed_at,

            result:
              result
                ? {
                    id:
                      result.id,

                    objectiveScore:
                      Number(
                        result.objective_score,
                      ),

                    speakingScore:
                      result.speaking_score
                        === null
                        ? null
                        : Number(
                            result.speaking_score,
                          ),

                    totalScore:
                      Number(
                        result.total_score,
                      ),

                    percentage:
                      Number(
                        result.percentage,
                      ),

                    estimatedLevel:
                      result.estimated_level,

                    summary:
                      result.summary,

                    recommendation:
                      result.recommendation,

                    reviewNotes:
                      result.review_notes,

                    generatedAt:
                      result.generated_at,
                  }
                : null,
          };
        },
      );

    return {
      latestAttempt:
        mappedAttempts[0]
        ?? null,

      attempts:
        mappedAttempts,
    };
  }
}

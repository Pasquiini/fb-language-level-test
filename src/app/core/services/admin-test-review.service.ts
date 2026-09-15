import {
  Injectable,
  inject,
} from '@angular/core';

import {
  environment,
} from '../../../environments/environment';

import {
  SupabaseService,
} from './supabase.service';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';


export type AdminReviewStatus =
  | 'under_review'
  | 'completed';


export interface AdminTestReviewItem {
  attemptId: string;
  testId: string;
  studentId: string;

  studentName: string;
  whatsapp: string | null;

  status:
    AdminReviewStatus;

  objectiveScore:
    number | null;

  percentage:
    number | null;

  speakingScore:
    number | null;

  estimatedLevel:
    string | null;

  createdAt: string;
  updatedAt:
    string | null;
}


export interface AdminTestReviewDetail
  extends
    AdminTestReviewItem {

  summary:
    string | null;

  recommendation:
    string | null;

  reviewNotes:
    string | null;
}


export interface CompleteAdminReviewParams {
  attemptId: string;

  speakingScore:
    number | null;

  estimatedLevel:
    string;

  reviewNotes:
    string | null;
}


export interface CompleteAdminReviewResult {
  success: boolean;

  attemptId:
    string;

  status:
    'completed';

  speakingScore:
    number | null;

  estimatedLevel:
    string;

  communicationSent:
    boolean;

  communicationAlreadySent?:
    boolean;

  communicationError?:
    string;

  providerMessageId?:
    string | null;
}


interface AttemptRow {
  id: string;
  test_id: string;
  student_id: string;

  status:
    AdminReviewStatus;

  created_at: string;
  updated_at:
    string | null;
}


interface ProfileRow {
  id: string;
  full_name:
    string | null;
  whatsapp:
    string | null;
}


interface ResultRow {
  attempt_id: string;

  objective_score:
    number | string | null;

  percentage:
    number | string | null;

  speaking_score:
    number | string | null;

  estimated_level:
    string | null;

  summary:
    string | null;

  recommendation:
    string | null;

  review_notes:
    string | null;
}


@Injectable({
  providedIn: 'root',
})
export class AdminTestReviewService {

  private readonly supabase =
    inject(
      SupabaseService,
    );


  async getReviews():
    Promise<
      AdminTestReviewItem[]
    > {

    const {
      data:
        attemptsData,
      error:
        attemptsError,
    } =
      await this
        .supabase
        .client
        .from(
          'test_attempts',
        )
        .select(`
          id,
          test_id,
          student_id,
          status,
          created_at,
          updated_at
        `)
        .in(
          'status',
          [
            'under_review',
            'completed',
          ],
        )
        .order(
          'created_at',
          {
            ascending:
              false,
          },
        );


    if (attemptsError) {
      console.error(
        'Could not load admin attempts:',
        attemptsError,
      );

      throw new Error(
        'Não foi possível carregar as avaliações.',
      );
    }


    const attempts =
      (
        attemptsData ??
        []
      ) as
        AttemptRow[];


    if (
      attempts.length ===
      0
    ) {
      return [];
    }


    const studentIds =
      [
        ...new Set(
          attempts.map(
            (item) =>
              item.student_id,
          ),
        ),
      ];


    const attemptIds =
      attempts.map(
        (item) =>
          item.id,
      );


    const [
      profilesResult,
      resultsResult,
    ] =
      await Promise.all([
        this.supabase
          .client
          .from(
            'profiles',
          )
          .select(`
            id,
            full_name,
            whatsapp
          `)
          .in(
            'id',
            studentIds,
          ),

        this.supabase
          .client
          .from(
            'test_results',
          )
          .select(`
            attempt_id,
            objective_score,
            percentage,
            speaking_score,
            estimated_level,
            summary,
            recommendation,
            review_notes
          `)
          .in(
            'attempt_id',
            attemptIds,
          ),
      ]);


    if (
      profilesResult.error
    ) {
      throw new Error(
        'Não foi possível carregar os alunos.',
      );
    }


    if (
      resultsResult.error
    ) {
      throw new Error(
        'Não foi possível carregar os resultados.',
      );
    }


    const profiles =
      (
        profilesResult
          .data ??
        []
      ) as
        ProfileRow[];


    const results =
      (
        resultsResult
          .data ??
        []
      ) as
        ResultRow[];


    const profileMap =
      new Map(
        profiles.map(
          (profile) => [
            profile.id,
            profile,
          ],
        ),
      );


    const resultMap =
      new Map(
        results.map(
          (result) => [
            result.attempt_id,
            result,
          ],
        ),
      );


    return attempts.map(
      (attempt) => {

        const profile =
          profileMap.get(
            attempt
              .student_id,
          );

        const result =
          resultMap.get(
            attempt.id,
          );


        return {
          attemptId:
            attempt.id,

          testId:
            attempt.test_id,

          studentId:
            attempt
              .student_id,

          studentName:
            profile
              ?.full_name ??
            'Aluno',

          whatsapp:
            profile
              ?.whatsapp ??
            null,

          status:
            attempt.status,

          objectiveScore:
            this.toNumber(
              result
                ?.objective_score,
            ),

          percentage:
            this.toNumber(
              result
                ?.percentage,
            ),

          speakingScore:
            this.toNumber(
              result
                ?.speaking_score,
            ),

          estimatedLevel:
            result
              ?.estimated_level ??
            null,

          createdAt:
            attempt
              .created_at,

          updatedAt:
            attempt
              .updated_at,
        };
      },
    );
  }


  async getReviewByAttemptId(
    attemptId: string,
  ): Promise<
    AdminTestReviewDetail
  > {

    const {
      data:
        attemptData,
      error:
        attemptError,
    } =
      await this
        .supabase
        .client
        .from(
          'test_attempts',
        )
        .select(`
          id,
          test_id,
          student_id,
          status,
          created_at,
          updated_at
        `)
        .eq(
          'id',
          attemptId,
        )
        .maybeSingle();


    if (attemptError) {
      throw new Error(
        'Não foi possível carregar a avaliação.',
      );
    }


    if (!attemptData) {
      throw new Error(
        'Avaliação não encontrada.',
      );
    }


    const attempt =
      attemptData as
        AttemptRow;


    const [
      profileResult,
      resultResult,
    ] =
      await Promise.all([
        this.supabase
          .client
          .from(
            'profiles',
          )
          .select(`
            id,
            full_name,
            whatsapp
          `)
          .eq(
            'id',
            attempt
              .student_id,
          )
          .maybeSingle(),

        this.supabase
          .client
          .from(
            'test_results',
          )
          .select(`
            attempt_id,
            objective_score,
            percentage,
            speaking_score,
            estimated_level,
            summary,
            recommendation,
            review_notes
          `)
          .eq(
            'attempt_id',
            attemptId,
          )
          .maybeSingle(),
      ]);


    if (
      profileResult.error
    ) {
      throw new Error(
        'Não foi possível carregar o aluno.',
      );
    }


    if (
      resultResult.error
    ) {
      throw new Error(
        'Não foi possível carregar o resultado.',
      );
    }


    const profile =
      profileResult
        .data as
        ProfileRow | null;


    const result =
      resultResult
        .data as
        ResultRow | null;


    return {
      attemptId:
        attempt.id,

      testId:
        attempt.test_id,

      studentId:
        attempt
          .student_id,

      studentName:
        profile
          ?.full_name ??
        'Aluno',

      whatsapp:
        profile
          ?.whatsapp ??
        null,

      status:
        attempt.status,

      objectiveScore:
        this.toNumber(
          result
            ?.objective_score,
        ),

      percentage:
        this.toNumber(
          result
            ?.percentage,
        ),

      speakingScore:
        this.toNumber(
          result
            ?.speaking_score,
        ),

      estimatedLevel:
        result
          ?.estimated_level ??
        null,

      summary:
        result
          ?.summary ??
        null,

      recommendation:
        result
          ?.recommendation ??
        null,

      reviewNotes:
        result
          ?.review_notes ??
        null,

      createdAt:
        attempt
          .created_at,

      updatedAt:
        attempt
          .updated_at,
    };
  }


  async completeReview(
  params:
    CompleteAdminReviewParams,
): Promise<
  CompleteAdminReviewResult
> {

  const {
    data: {
      session,
    },

    error:
      sessionError,
  } =
    await this.supabase
      .client
      .auth
      .getSession();


  if (sessionError) {
    console.error(
      '[AdminTestReviewService] session:',
      sessionError,
    );

    throw new Error(
      'Não foi possível validar sua sessão.',
    );
  }


  if (!session) {
    throw new Error(
      'Sua sessão expirou. Faça login novamente.',
    );
  }


  const {
    data,
    error,
  } =
    await this.supabase
      .client
      .functions
      .invoke<
        CompleteAdminReviewResult
      >(
        'admin-complete-test-review',
        {
          body: {
            attemptId:
              params
                .attemptId,

            speakingScore:
              params
                .speakingScore,

            estimatedLevel:
              params
                .estimatedLevel,

            reviewNotes:
              params
                .reviewNotes,
          },

          headers: {
            Authorization:
              `Bearer ${session.access_token}`,
          },
        },
      );


  if (error) {
    console.error(
      '[AdminTestReviewService] admin-complete-test-review:',
      error,
    );

    throw new Error(
      await this
        .extractFunctionError(
          error,
        ),
    );
  }


  if (
    !data ||
    !data.success
  ) {
    throw new Error(
      (
        data as {
          error?: string;
        } | null
      )?.error ??
      'Não foi possível concluir a avaliação.',
    );
  }


  return data;
}
private async extractFunctionError(
  error: unknown,
): Promise<string> {

  if (
    error instanceof
    FunctionsHttpError
  ) {
    try {
      const context =
        await error.context
          .json();

      if (
        context &&
        typeof context ===
          'object' &&
        'error' in context &&
        typeof context.error ===
          'string'
      ) {
        return context.error;
      }
    } catch {
      return (
        error.message ||
        'Erro retornado pela função.'
      );
    }
  }


  if (
    error instanceof
    FunctionsRelayError
  ) {
    return (
      error.message ||
      'Erro de comunicação com a função.'
    );
  }


  if (
    error instanceof
    FunctionsFetchError
  ) {
    return (
      error.message ||
      'Não foi possível acessar a função.'
    );
  }


  if (
    error instanceof Error
  ) {
    return error.message;
  }


  return (
    'Não foi possível concluir a avaliação.'
  );
}
  private toNumber(
    value:
      number |
      string |
      null |
      undefined,
  ): number | null {

    if (
      value ===
        null ||
      value ===
        undefined
    ) {
      return null;
    }


    const number =
      Number(value);


    return Number.isFinite(
      number,
    )
      ? number
      : null;
  }
}

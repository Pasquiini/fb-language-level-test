import {
  Injectable,
  inject,
} from '@angular/core';

import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import {
  SupabaseService,
} from './supabase.service';


export interface AdminSpeakingAnswer {
  questionId: string;
  durationSeconds: number;
  audioUrl: string | null;
  error: string | null;
}


interface AdminSpeakingReviewResponse {
  success: boolean;

  attemptId?: string;

  status?: string;

  answers?: AdminSpeakingAnswer[];

  error?: string;
}


@Injectable({
  providedIn: 'root',
})
export class AdminSpeakingReviewService {

  private readonly supabase =
    inject(
      SupabaseService,
    );


  async getAnswers(
    attemptId: string,
  ): Promise<
    AdminSpeakingAnswer[]
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
        '[AdminSpeakingReviewService] session:',
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
          AdminSpeakingReviewResponse
        >(
          'admin-speaking-review',
          {
            body: {
              attemptId,
            },

            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          },
        );


    if (error) {
      console.error(
        '[AdminSpeakingReviewService] function:',
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
        data?.error ??
        'Não foi possível carregar os áudios de Speaking.',
      );
    }


    return (
      data.answers ??
      []
    );
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
          context
          && typeof context ===
            'object'
          && 'error' in context
          && typeof context.error ===
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
      'Não foi possível carregar os áudios de Speaking.'
    );
  }
}

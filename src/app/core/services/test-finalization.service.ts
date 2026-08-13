import {
  Injectable,
  inject,
} from '@angular/core';

import {
  SupabaseService,
} from './supabase.service';

export interface FinalizedTestResult {
  attemptId: string;
  status:
    | 'in_progress'
    | 'submitted'
    | 'under_review'
    | 'completed';

  objectiveScore: number;
  percentage: number;
  estimatedLevel: string;
}

interface FinalizeTestAttemptRow {
  attempt_id: string;

  status:
    | 'in_progress'
    | 'submitted'
    | 'under_review'
    | 'completed';

  objective_score:
    number | string;

  percentage:
    number | string;

  estimated_level:
    string;
}

@Injectable({
  providedIn: 'root',
})
export class TestFinalizationService {
  private readonly supabase =
    inject(SupabaseService);

  async finalizeAttempt(
    attemptId: string,
  ): Promise<FinalizedTestResult> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .rpc(
          'finalize_test_attempt',
          {
            p_attempt_id:
              attemptId,
          },
        );

    if (error) {
      console.error(
        'finalize_test_attempt RPC error:',
        error,
      );

      throw new Error(
        this.getFinalizeErrorMessage(
          error.message,
        ),
      );
    }

    const rows =
      (data ?? []) as
        FinalizeTestAttemptRow[];

    const result =
      rows[0];

    if (!result) {
      throw new Error(
        'A avaliação foi finalizada, mas o resultado não pôde ser carregado.',
      );
    }

    return {
      attemptId:
        result.attempt_id,

      status:
        result.status,

      objectiveScore:
        Number(
          result.objective_score,
        ),

      percentage:
        Number(
          result.percentage,
        ),

      estimatedLevel:
        result.estimated_level,
    };
  }

  private getFinalizeErrorMessage(
    message: string,
  ): string {
    if (
      message.includes(
        'Grammar ou Listening sem resposta',
      )
    ) {
      return (
        'Ainda existem questões de Grammar ou Listening sem resposta.'
      );
    }

    if (
      message.includes(
        'Speaking sem gravação',
      )
    ) {
      return (
        'Ainda existem atividades de Speaking sem gravação.'
      );
    }

    if (
      message.includes(
        'não possui acesso',
      )
    ) {
      return (
        'Não foi possível validar o acesso a esta avaliação.'
      );
    }

    if (
      message.includes(
        'não pode ser finalizada',
      )
    ) {
      return (
        'Esta avaliação não pode ser finalizada neste momento.'
      );
    }

    if (
      message.includes(
        'Tentativa não encontrada',
      )
    ) {
      return (
        'Não foi possível localizar sua avaliação.'
      );
    }

    return (
      'Não foi possível finalizar sua avaliação. Tente novamente.'
    );
  }
}

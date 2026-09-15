import {
  Injectable,
  inject,
} from '@angular/core';

import {
  SupabaseService,
} from './supabase.service';
import { environment } from '../../../environments/environment';

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

  communicationTriggered: boolean;
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

interface HandleTestSubmittedResponse {
  success: boolean;
  attemptId?: string;
  eventId?: string;
  processed?: number;
  sent?: number;
  failed?: number;
  error?: string;
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

    const communicationTriggered =
      await this.triggerTestSubmittedCommunication(
        result.attempt_id,
      );

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

      communicationTriggered,
    };
  }

private async triggerTestSubmittedCommunication(
  attemptId: string,
): Promise<boolean> {

  try {
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
        '[TestFinalizationService] session:',
        sessionError,
      );

      return false;
    }


    if (!session) {
      console.error(
        '[TestFinalizationService] sessão não encontrada.',
      );

      return false;
    }


    const {
      data,
      error,
    } =
      await this.supabase
        .client
        .functions
        .invoke<
          HandleTestSubmittedResponse
        >(
          'handle-test-submitted',
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
        '[TestFinalizationService] handle-test-submitted:',
        error,
      );

      return false;
    }


    if (
      !data ||
      !data.success
    ) {
      console.error(
        'handle-test-submitted returned failure:',
        data,
      );

      return false;
    }


    console.log(
      'Test submitted communication processed:',
      {
        attemptId:
          data.attemptId,

        eventId:
          data.eventId,

        processed:
          data.processed,

        sent:
          data.sent,

        failed:
          data.failed,
      },
    );


    return true;

  } catch (error) {

    console.error(
      'Could not trigger test submitted communication:',
      error,
    );


    /*
     * A comunicação não deve transformar
     * uma finalização pedagógica válida
     * em falha para o aluno.
     */

    return false;
  }
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

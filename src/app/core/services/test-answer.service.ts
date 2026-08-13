import {
  Injectable,
  inject,
} from '@angular/core';

import {
  SupabaseService,
} from './supabase.service';

export interface SaveTestAnswerParams {
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
}

interface TestAnswerRow {
  question_id: string;
  selected_option_id: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class TestAnswerService {
  private readonly supabase =
    inject(SupabaseService);

  async saveAnswer(
    params: SaveTestAnswerParams,
  ): Promise<void> {
    const {
      error,
    } =
      await this.supabase.client
        .rpc(
          'save_test_answer',
          {
            p_attempt_id:
              params.attemptId,

            p_question_id:
              params.questionId,

            p_selected_option_id:
              params.selectedOptionId,
          },
        );

    if (error) {
      console.error(
        'save_test_answer RPC error:',
        error,
      );

      throw new Error(
        this.getSaveErrorMessage(
          error.message,
        ),
      );
    }
  }

  async saveAnswers(
    attemptId: string,
    answers:
      Record<string, string>,
  ): Promise<void> {
    const entries =
      Object.entries(
        answers,
      );

    if (
      entries.length === 0
    ) {
      return;
    }

    /*
     * Atualmente Grammar e Listening
     * chamam este método com uma resposta
     * por vez.
     *
     * Mantemos suporte a múltiplas respostas
     * para não quebrar outros consumidores.
     *
     * Cada resposta passa individualmente
     * pela RPC segura.
     */
    for (
      const [
        questionId,
        selectedOptionId,
      ] of entries
    ) {
      await this.saveAnswer({
        attemptId,
        questionId,
        selectedOptionId,
      });
    }
  }

  async getAnswers(
    attemptId: string,
  ): Promise<Record<string, string>> {
    const {
      data,
      error,
    } =
      await this.supabase.client
        .from('test_answers')
        .select(`
          question_id,
          selected_option_id
        `)
        .eq(
          'attempt_id',
          attemptId,
        );

    if (error) {
      throw new Error(
        `Não foi possível recuperar suas respostas: ${error.message}`,
      );
    }

    const answers:
      Record<string, string> = {};

    for (
      const row of
        (data ?? []) as TestAnswerRow[]
    ) {
      if (
        !row.question_id ||
        !row.selected_option_id
      ) {
        continue;
      }

      answers[
        row.question_id
      ] =
        row.selected_option_id;
    }

    return answers;
  }

  private getSaveErrorMessage(
    message: string,
  ): string {
    if (
      message.includes(
        'não pertence à questão',
      )
    ) {
      return (
        'A alternativa selecionada não é válida para esta questão.'
      );
    }

    if (
      message.includes(
        'não pertence a esta tentativa',
      )
    ) {
      return (
        'Esta questão não pertence à sua avaliação.'
      );
    }

    if (
      message.includes(
        'não aceita mais respostas',
      )
    ) {
      return (
        'Esta avaliação já foi encerrada e não aceita novas respostas.'
      );
    }

    if (
      message.includes(
        'não possui acesso',
      )
    ) {
      return (
        'Não foi possível validar o acesso a esta tentativa.'
      );
    }

    return (
      'Não foi possível salvar sua resposta. Tente novamente.'
    );
  }
}

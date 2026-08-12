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

@Injectable({
  providedIn: 'root',
})
export class TestAnswerService {
  private readonly supabase =
    inject(SupabaseService);

  async saveAnswer(
    params: SaveTestAnswerParams,
  ): Promise<void> {
    /*
     * test_answers possui UNIQUE:
     *
     * attempt_id,
     * question_id
     *
     * Portanto podemos usar upsert para permitir
     * que o aluno volte e altere a resposta.
     */
    const {
      error,
    } = await this.supabase.client
      .from('test_answers')
      .upsert(
        {
          attempt_id:
            params.attemptId,

          question_id:
            params.questionId,

          selected_option_id:
            params.selectedOptionId,

          text_answer: null,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            'attempt_id,question_id',
        },
      );

    if (error) {
      throw new Error(
        `Não foi possível salvar a resposta: ${error.message}`,
      );
    }
  }

  async saveAnswers(
    attemptId: string,
    answers:
      Record<string, string>,
  ): Promise<void> {
    const entries =
      Object.entries(answers);

    if (entries.length === 0) {
      return;
    }

    const rows =
      entries.map(
        ([
          questionId,
          selectedOptionId,
        ]) => ({
          attempt_id:
            attemptId,

          question_id:
            questionId,

          selected_option_id:
            selectedOptionId,

          text_answer: null,

          updated_at:
            new Date().toISOString(),
        }),
      );

    const {
      error,
    } = await this.supabase.client
      .from('test_answers')
      .upsert(
        rows,
        {
          onConflict:
            'attempt_id,question_id',
        },
      );

    if (error) {
      throw new Error(
        `Não foi possível salvar as respostas: ${error.message}`,
      );
    }
  }
}

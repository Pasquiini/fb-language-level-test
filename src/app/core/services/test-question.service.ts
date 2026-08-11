import {
  Injectable,
  inject,
} from '@angular/core';

import {
  SupabaseService,
} from './supabase.service';

interface QuestionRow {
  id: string;
  statement: string;
  instructions: string | null;
  order_index: number;
  level: string | null;
}

interface QuestionOptionRow {
  id: string;
  question_id: string;
  text: string;
  order_index: number;
}

export interface TestQuestionOption {
  id: string;
  text: string;
  orderIndex: number;
}

export interface TestQuestionItem {
  id: string;
  statement: string;
  instructions: string | null;
  orderIndex: number;
  level: string | null;
  options: TestQuestionOption[];
}

@Injectable({
  providedIn: 'root',
})
export class TestQuestionService {
  private readonly supabase =
    inject(SupabaseService);

  async getGrammarQuestions(
    testId: string,
  ): Promise<TestQuestionItem[]> {
    /*
     * Primeiro buscamos a seção Grammar
     * pertencente ao teste informado.
     */
    const {
      data: section,
      error: sectionError,
    } = await this.supabase.client
      .from('test_sections')
      .select(`
        id
      `)
      .eq('test_id', testId)
      .eq('order_index', 1)
      .maybeSingle<{ id: string }>();

    if (sectionError) {
      throw new Error(
        `Não foi possível carregar a seção de gramática: ${sectionError.message}`,
      );
    }

    if (!section) {
      throw new Error(
        'A seção de gramática não foi encontrada.',
      );
    }

    /*
     * Busca somente as questões objetivas ativas.
     */
    const {
      data: questions,
      error: questionsError,
    } = await this.supabase.client
      .from('questions')
      .select(`
        id,
        statement,
        instructions,
        order_index,
        level
      `)
      .eq('section_id', section.id)
      .eq('type', 'multiple_choice')
      .eq('is_active', true)
      .order('order_index', {
        ascending: true,
      });

    if (questionsError) {
      throw new Error(
        `Não foi possível carregar as questões: ${questionsError.message}`,
      );
    }

    const typedQuestions =
      (questions ?? []) as QuestionRow[];

    if (typedQuestions.length === 0) {
      return [];
    }

    const questionIds =
      typedQuestions.map(
        (question) => question.id,
      );

    /*
     * IMPORTANTE:
     * utilizamos a VIEW segura.
     *
     * is_correct não existe nessa consulta.
     */
    const {
      data: options,
      error: optionsError,
    } = await this.supabase.client
      .from('public_question_options')
      .select(`
        id,
        question_id,
        text,
        order_index
      `)
      .in('question_id', questionIds)
      .order('order_index', {
        ascending: true,
      });

    if (optionsError) {
      throw new Error(
        `Não foi possível carregar as alternativas: ${optionsError.message}`,
      );
    }

    const typedOptions =
      (options ?? []) as QuestionOptionRow[];

    return typedQuestions.map(
      (question) => ({
        id: question.id,
        statement: question.statement,
        instructions:
          question.instructions,
        orderIndex:
          question.order_index,
        level: question.level,
        options: typedOptions
          .filter(
            (option) =>
              option.question_id ===
              question.id,
          )
          .map(
            (option) => ({
              id: option.id,
              text: option.text,
              orderIndex:
                option.order_index,
            }),
          ),
      }),
    );
  }
}

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
  audio_path: string | null;
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
  audioPath: string | null;
  orderIndex: number;
  level: string | null;
  options: TestQuestionOption[];
}

export interface ListeningTestData {
  questions: TestQuestionItem[];
  audioUrl: string;
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
    const sectionId =
      await this.getSectionId(
        testId,
        1,
        'gramática',
      );

    return this.getQuestions(
      sectionId,
      'multiple_choice',
      true,
    );
  }

  async getListeningQuestions(
    testId: string,
  ): Promise<ListeningTestData> {
    const sectionId =
      await this.getSectionId(
        testId,
        2,
        'listening',
      );

    const questions =
      await this.getQuestions(
        sectionId,
        'listening',
        true,
      );

    if (questions.length === 0) {
      throw new Error(
        'Nenhuma questão de listening foi encontrada.',
      );
    }

    const audioPath =
      questions[0].audioPath;

    if (!audioPath) {
      throw new Error(
        'O áudio do listening não foi configurado.',
      );
    }

    const {
      data,
      error,
    } = await this.supabase.client
      .storage
      .from('test-audio')
      .createSignedUrl(
        audioPath,
        60 * 30,
      );

    if (error) {
      throw new Error(
        `Não foi possível carregar o áudio: ${error.message}`,
      );
    }

    return {
      questions,
      audioUrl: data.signedUrl,
    };
  }

  async getSpeakingQuestions(
    testId: string,
  ): Promise<TestQuestionItem[]> {
    const sectionId =
      await this.getSectionId(
        testId,
        3,
        'speaking',
      );

    return this.getQuestions(
      sectionId,
      'speaking',
      false,
    );
  }

  private async getSectionId(
    testId: string,
    orderIndex: number,
    sectionName: string,
  ): Promise<string> {
    const {
      data: section,
      error,
    } = await this.supabase.client
      .from('test_sections')
      .select(`
        id
      `)
      .eq('test_id', testId)
      .eq('order_index', orderIndex)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(
        `Não foi possível carregar a seção de ${sectionName}: ${error.message}`,
      );
    }

    if (!section) {
      throw new Error(
        `A seção de ${sectionName} não foi encontrada.`,
      );
    }

    return section.id;
  }

  private async getQuestions(
    sectionId: string,
    type:
      | 'multiple_choice'
      | 'listening'
      | 'speaking',
    loadOptions: boolean,
  ): Promise<TestQuestionItem[]> {
    const {
      data: questions,
      error: questionsError,
    } = await this.supabase.client
      .from('questions')
      .select(`
        id,
        statement,
        instructions,
        audio_path,
        order_index,
        level
      `)
      .eq('section_id', sectionId)
      .eq('type', type)
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

    if (!loadOptions) {
      return typedQuestions.map(
        (question) => ({
          id: question.id,
          statement:
            question.statement,
          instructions:
            question.instructions,
          audioPath:
            question.audio_path,
          orderIndex:
            question.order_index,
          level:
            question.level,
          options: [],
        }),
      );
    }

    const questionIds =
      typedQuestions.map(
        (question) => question.id,
      );

    const {
      data: options,
      error: optionsError,
    } = await this.supabase.client
      .rpc(
        'get_public_question_options',
        {
          p_question_ids:
            questionIds,
        },
      );

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
        statement:
          question.statement,
        instructions:
          question.instructions,
        audioPath:
          question.audio_path,
        orderIndex:
          question.order_index,
        level:
          question.level,
        options:
          typedOptions
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

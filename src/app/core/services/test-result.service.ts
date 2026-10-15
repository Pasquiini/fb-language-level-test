import {
  Injectable,
  inject,
} from '@angular/core';

import {
  AuthService,
} from './auth.service';

import {
  SupabaseService,
} from './supabase.service';

export type TestResultStatus =
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'completed';

export interface TestResultQuestion {
  questionId: string;

  sectionId: string;
  sectionName: string;

  questionNumber: number;
  questionText: string;

  selectedAnswer: string | null;

  correctAnswer: string | null;

  isAnswered: boolean;
  isCorrect: boolean;
}

export interface TestResultSection {
  sectionId: string;
  sectionName: string;

  correctAnswers: number;
  answeredQuestions: number;
  totalQuestions: number;

  percentage: number;
}

export interface TestResultData {
  attemptId: string;
  status: TestResultStatus;

  objectiveScore: number;
  speakingScore: number | null;
  totalScore: number;
  percentage: number;

  objectiveCorrectAnswers: number;
  objectiveAnsweredQuestions: number;
  objectiveTotalQuestions: number;

  sections: TestResultSection[];
  answers: TestResultQuestion[];

  estimatedLevel: string;

  summary: string | null;
  recommendation: string | null;
  aiAnalysis: unknown | null;

  generatedAt: string;
}

export interface GeneratedTestAnalysis {
  summary: string;
  recommendation: string;
  aiAnalysis: unknown;
}

interface GenerateAnalysisResponse {
  success: boolean;
  cached: boolean;

  analysis: {
    summary: string;
    recommendation: string;
    aiAnalysis: unknown;
  };
}

interface TestResultRow {
  attempt_id: string;

  objective_score:
  number | string;

  speaking_score:
  number | string | null;

  total_score:
  number | string;

  percentage:
  number | string;

  estimated_level:
  string;

  summary:
  string | null;

  recommendation:
  string | null;

  ai_analysis:
  unknown | null;

  generated_at:
  string;
}

interface TestAttemptRow {
  status: TestResultStatus;
  test_id: string;
}

interface TestSectionRow {
  id: string;
  name: string;
  order_index: number;
}

interface QuestionRow {
  id: string;
  section_id: string;
  statement: string;
  order_index: number;
  points: number | string;
}

interface TestAnswerRow {
  question_id: string;

  selected_option_id:
  string | null;

  text_answer:
  string | null;

  awarded_points:
  number | string | null;
}


@Injectable({
  providedIn: 'root',
})
export class TestResultService {

  private readonly supabase =
    inject(SupabaseService);

  private readonly auth =
    inject(AuthService);

  async getResult(
    attemptId: string,
  ): Promise<TestResultData> {

    await this.auth
      .waitUntilInitialized();

    const user =
      this.auth.user();

    if (!user) {
      throw new Error(
        'Nenhum usuário autenticado foi encontrado.',
      );
    }

    /*
     * ----------------------------------------
     * 1. Resultado + tentativa
     * ----------------------------------------
     */

    const [
      resultResponse,
      attemptResponse,
    ] =
      await Promise.all([

        this.supabase.client
          .from(
            'test_results',
          )
          .select(
            `
              attempt_id,
              objective_score,
              speaking_score,
              total_score,
              percentage,
              estimated_level,
              summary,
              recommendation,
              ai_analysis,
              generated_at
            `,
          )
          .eq(
            'attempt_id',
            attemptId,
          )
          .maybeSingle(),

        this.supabase.client
          .from(
            'test_attempts',
          )
          .select(
            `
              status,
              test_id
            `,
          )
          .eq(
            'id',
            attemptId,
          )
          .maybeSingle(),

      ]);

    if (
      attemptResponse.error
    ) {

      console.error(
        'Could not load attempt:',
        attemptResponse.error,
      );

      throw new Error(
        'Não foi possível validar sua avaliação.',
      );
    }

    if (
      !attemptResponse.data
    ) {
      throw new Error(
        'Não foi possível localizar esta avaliação.',
      );
    }

    if (
      resultResponse.error
    ) {

      console.error(
        'Could not load test result:',
        resultResponse.error,
      );

      throw new Error(
        'Não foi possível carregar seu resultado.',
      );
    }

    if (
      !resultResponse.data
    ) {
      throw new Error(
        'Seu resultado ainda não está disponível.',
      );
    }

    const result =
      resultResponse.data as
      TestResultRow;

    const attempt =
      attemptResponse.data as
      TestAttemptRow;

    /*
     * ----------------------------------------
     * 2. Seções do teste
     * ----------------------------------------
     */

    const {
      data:
      sectionsData,
      error:
      sectionsError,
    } =
      await this.supabase.client
        .from(
          'test_sections',
        )
        .select(
          `
            id,
            name,
            order_index
          `,
        )
        .eq(
          'test_id',
          attempt.test_id,
        )
        .order(
          'order_index',
          {
            ascending:
              true,
          },
        );

    if (
      sectionsError
    ) {

      console.error(
        'Could not load test sections:',
        sectionsError,
      );

      throw new Error(
        'Não foi possível carregar os detalhes da avaliação.',
      );
    }

    const allSections =
      (
        sectionsData ??
        []
      ) as TestSectionRow[];

    /*
     * Speaking não entra no breakdown
     * objetivo.
     */
    const objectiveSections =
      allSections.filter(
        section =>
          !this.isSpeakingSection(
            section.name,
          ),
      );

    const objectiveSectionIds =
      objectiveSections.map(
        section =>
          section.id,
      );

    /*
     * ----------------------------------------
     * 3. Questões objetivas
     * ----------------------------------------
     */

    let questions:
      QuestionRow[] =
      [];

    if (
      objectiveSectionIds.length >
      0
    ) {

      const {
        data,
        error,
      } =
        await this.supabase.client
          .from(
            'questions',
          )
          .select(
            `
              id,
              section_id,
              statement,
              order_index,
              points
            `,
          )
          .in(
            'section_id',
            objectiveSectionIds,
          )
          .order(
            'order_index',
            {
              ascending:
                true,
            },
          );

      if (error) {

        console.error(
          'Could not load objective questions:',
          error,
        );

        throw new Error(
          'Não foi possível carregar as questões da avaliação.',
        );
      }

      questions =
        (
          data ??
          []
        ) as QuestionRow[];
    }

    /*
     * ----------------------------------------
     * 4. Respostas do aluno
     * ----------------------------------------
     */

    const {
      data:
      answersData,
      error:
      answersError,
    } =
      await this.supabase.client
        .from(
          'test_answers',
        )
        .select(
          `
            question_id,
            selected_option_id,
            text_answer,
            awarded_points
          `,
        )
        .eq(
          'attempt_id',
          attemptId,
        );

    if (
      answersError
    ) {

      console.error(
        'Could not load test answers:',
        answersError,
      );

      throw new Error(
        'Não foi possível carregar suas respostas.',
      );
    }

    const studentAnswers =
      (
        answersData ??
        []
      ) as TestAnswerRow[];





    /*
     * ----------------------------------------
     * 6. Maps para cruzamento rápido
     * ----------------------------------------
     */

    const sectionMap =
      new Map(
        objectiveSections.map(
          section => [
            section.id,
            section,
          ],
        ),
      );

    const answerMap =
      new Map(
        studentAnswers.map(
          answer => [
            answer.question_id,
            answer,
          ],
        ),
      );



    /*
     * ----------------------------------------
     * 7. Ordenação real das questões
     * ----------------------------------------
     */

    const sortedQuestions =
      [...questions]
        .sort(
          (
            questionA,
            questionB,
          ) => {

            const sectionA =
              sectionMap.get(
                questionA
                  .section_id,
              );

            const sectionB =
              sectionMap.get(
                questionB
                  .section_id,
              );

            const sectionOrderA =
              sectionA
                ?.order_index ??
              0;

            const sectionOrderB =
              sectionB
                ?.order_index ??
              0;

            if (
              sectionOrderA !==
              sectionOrderB
            ) {
              return (
                sectionOrderA -
                sectionOrderB
              );
            }

            return (
              questionA
                .order_index -
              questionB
                .order_index
            );
          },
        );

    /*
     * ----------------------------------------
     * 8. Montagem das respostas para o front
     * ----------------------------------------
     */

    const {
      data: answerReviewData,
      error: answerReviewError,
    } =
      await this.supabase.client
        .rpc(
          'get_student_attempt_answer_review',
          {
            p_attempt_id:
              attemptId,
          },
        );

    if (answerReviewError) {
      console.error(
        'Could not load answer review:',
        answerReviewError,
      );

      throw new Error(
        'Não foi possível carregar a correção das respostas.',
      );
    }

    interface AnswerReviewRow {
      questionId: string;
      selectedOptionId: string | null;
      selectedAnswer: string | null;
      correctOptionId: string | null;
      correctAnswer: string | null;
      isAnswered: boolean;
      isCorrect: boolean;
    }

    const answerReview =
      (
        answerReviewData ?? []
      ) as AnswerReviewRow[];

    const answerReviewMap =
      new Map(
        answerReview.map(
          item => [
            item.questionId,
            item,
          ],
        ),
      );

    const answers:
      TestResultQuestion[] =
      sortedQuestions
        .map(
          (
            question,
            index,
          ) => {

            const section =
              sectionMap.get(
                question
                  .section_id,
              );

            const studentAnswer =
              answerMap.get(
                question.id,
              );

            const review =
              answerReviewMap.get(
                question.id,
              );

            const selectedAnswer =
              review
                ?.selectedAnswer
              ?? studentAnswer
                ?.text_answer
              ?? null;

            const correctAnswer =
              review
                ?.correctAnswer
              ?? null;

            const isAnswered =
              review
                ?.isAnswered
              ?? Boolean(
                studentAnswer &&
                (
                  studentAnswer
                    .selected_option_id ||
                  studentAnswer
                    .text_answer
                ),
              );

            const isCorrect =
              review
                ?.isCorrect
              ?? false;

            return {
              questionId:
                question.id,

              sectionId:
                question
                  .section_id,

              sectionName:
                section
                  ?.name ??
                'Avaliação',

              questionNumber:
                index +
                1,

              questionText:
                question
                  .statement,

              selectedAnswer,

              correctAnswer,

              isAnswered,

              isCorrect,
            };
          },
        );

    /*
     * ----------------------------------------
     * 9. Breakdown por seção
     * ----------------------------------------
     */

    const sections:
      TestResultSection[] =
      objectiveSections
        .map(
          section => {

            const sectionAnswers =
              answers.filter(
                answer =>
                  answer
                    .sectionId ===
                  section.id,
              );

            const totalQuestions =
              sectionAnswers
                .length;

            const answeredQuestions =
              sectionAnswers
                .filter(
                  answer =>
                    answer
                      .isAnswered,
                )
                .length;

            const correctAnswers =
              sectionAnswers
                .filter(
                  answer =>
                    answer
                      .isCorrect,
                )
                .length;

            const percentage =
              totalQuestions >
                0
                ? Math.round(
                  (
                    correctAnswers /
                    totalQuestions
                  ) *
                  100,
                )
                : 0;

            return {
              sectionId:
                section.id,

              sectionName:
                section.name,

              correctAnswers,

              answeredQuestions,

              totalQuestions,

              percentage,
            };
          },
        );

    /*
     * ----------------------------------------
     * 10. Totais objetivos
     * ----------------------------------------
     */

    const objectiveTotalQuestions =
      answers.length;

    const objectiveAnsweredQuestions =
      answers.filter(
        answer =>
          answer.isAnswered,
      ).length;

    const objectiveCorrectAnswers =
      answers.filter(
        answer =>
          answer.isCorrect,
      ).length;

    /*
     * ----------------------------------------
     * 11. Resultado final
     * ----------------------------------------
     */

    return {
      attemptId:
        result.attempt_id,

      status:
        attempt.status,

      objectiveScore:
        Number(
          result.objective_score,
        ),

      speakingScore:
        result.speaking_score ===
          null
          ? null
          : Number(
            result
              .speaking_score,
          ),

      totalScore:
        Number(
          result.total_score,
        ),

      percentage:
        Number(
          result.percentage,
        ),

      objectiveCorrectAnswers,

      objectiveAnsweredQuestions,

      objectiveTotalQuestions,

      sections,

      answers,

      estimatedLevel:
        result.estimated_level,

      summary:
        result.summary,

      recommendation:
        result.recommendation,

      aiAnalysis:
        result.ai_analysis,

      generatedAt:
        result.generated_at,
    };
  }

  async generateAnalysis(
    attemptId: string,
  ): Promise<GeneratedTestAnalysis> {

    await this.auth
      .waitUntilInitialized();

    const user =
      this.auth.user();

    if (!user) {
      throw new Error(
        'Nenhum usuário autenticado foi encontrado.',
      );
    }

    const {
      data,
      error,
    } =
      await this.supabase.client
        .functions
        .invoke(
          'generate-test-analysis',
          {
            body: {
              attemptId,
            },
          },
        );

    if (error) {

      console.error(
        'generate-test-analysis function error:',
        error,
      );

      throw new Error(
        'Não foi possível gerar sua análise personalizada.',
      );
    }

    const response =
      data as
      GenerateAnalysisResponse;

    if (
      !response?.success ||
      !response.analysis
    ) {
      throw new Error(
        'A análise personalizada não pôde ser carregada.',
      );
    }

    return {
      summary:
        response
          .analysis
          .summary,

      recommendation:
        response
          .analysis
          .recommendation,

      aiAnalysis:
        response
          .analysis
          .aiAnalysis,
    };
  }

  private isSpeakingSection(
    sectionName: string,
  ): boolean {

    const normalized =
      sectionName
        .trim()
        .toLowerCase();

    return (
      normalized ===
      'speaking' ||
      normalized.includes(
        'speaking',
      ) ||
      normalized.includes(
        'oral',
      )
    );
  }
}

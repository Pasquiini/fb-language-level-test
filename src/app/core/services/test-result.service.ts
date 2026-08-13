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

export interface TestResultData {
  attemptId: string;
  status: TestResultStatus;

  objectiveScore: number;
  speakingScore: number | null;
  totalScore: number;
  percentage: number;

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
            'status',
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
        'Could not load attempt status:',
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

    if (!resultResponse.data) {
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
      response.analysis
        .summary,

    recommendation:
      response.analysis
        .recommendation,

    aiAnalysis:
      response.analysis
        .aiAnalysis,
  };
}
}

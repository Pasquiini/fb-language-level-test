import "@supabase/functions-js/edge-runtime.d.ts";

import {
  withSupabase,
} from "@supabase/server";

interface GenerateAnalysisRequest {
  attemptId?: string;
  force?: boolean;
}

interface TestAttemptRow {
  id: string;
  status:
  | "in_progress"
  | "submitted"
  | "under_review"
  | "completed";
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
}

interface SpeakingAnswerRow {
  question_id: string;

  transcript:
  string | null;

  awarded_points:
  number | string | null;

  teacher_feedback:
  string | null;
}

interface GeminiAnalysis {
  summary: string;

  strengths: string[];

  areas_to_improve: string[];

  recommendation: string;

  study_focus: string[];
}


const MODEL =
  Deno.env.get(
    "GEMINI_MODEL",
  ) ??
  "gemini-3.6-flash";

const GEMINI_API_KEY =
  Deno.env.get(
    "GEMINI_API_KEY",
  );

const analysisSchema = {
  type: "object",

  properties: {
    summary: {
      type: "string",
      description:
        "Resumo curto, acolhedor e objetivo sobre o momento atual do aluno com o inglês.",
    },

    strengths: {
      type: "array",
      description:
        "Pontos fortes observáveis apenas a partir dos dados fornecidos.",
      items: {
        type: "string",
      },
      minItems: 1,
      maxItems: 4,
    },

    areas_to_improve: {
      type: "array",
      description:
        "Aspectos que o aluno pode desenvolver. Não invente deficiências não sustentadas pelos dados.",
      items: {
        type: "string",
      },
      minItems: 1,
      maxItems: 4,
    },

    recommendation: {
      type: "string",
      description:
        "Recomendação pedagógica prática para os próximos passos do aluno.",
    },

    study_focus: {
      type: "array",
      description:
        "Lista curta de focos de estudo recomendados.",
      items: {
        type: "string",
      },
      minItems: 1,
      maxItems: 4,
    },
  },

  required: [
    "summary",
    "strengths",
    "areas_to_improve",
    "recommendation",
    "study_focus",
  ],

  additionalProperties:
    false,
};

export default {
  fetch: withSupabase(
    {
      auth: "user",
    },

    async (
      req,
      ctx,
    ) => {
      try {
        if (
          req.method !==
          "POST"
        ) {
          return Response.json(
            {
              error:
                "Método não permitido.",
            },
            {
              status: 405,
            },
          );
        }

        if (
          !GEMINI_API_KEY
        ) {
          console.error(
            "GEMINI_API_KEY is not configured.",
          );

          return Response.json(
            {
              error:
                "A integração de análise ainda não está configurada.",
            },
            {
              status: 500,
            },
          );
        }

        let body:
          GenerateAnalysisRequest;

        try {
          body =
            await req.json();
        } catch {
          return Response.json(
            {
              error:
                "Corpo da requisição inválido.",
            },
            {
              status: 400,
            },
          );
        }

        const attemptId =
          String(
            body.attemptId ??
            "",
          ).trim();

        const force =
          body.force === true;

        if (!attemptId) {
          return Response.json(
            {
              error:
                "attemptId é obrigatório.",
            },
            {
              status: 400,
            },
          );
        }

        /*
         * IMPORTANTE:
         *
         * Esta consulta usa ctx.supabase,
         * portanto está sujeita ao RLS.
         *
         * Se a tentativa não pertencer ao
         * usuário autenticado, ela não deve
         * aparecer aqui.
         */
        const {
          data:
          attemptData,
          error:
          attemptError,
        } =
          await ctx.supabase
            .from(
              "test_attempts",
            )
            .select(
              `
                id,
                status
              `,
            )
            .eq(
              "id",
              attemptId,
            )
            .maybeSingle();

        if (
          attemptError
        ) {
          console.error(
            "Could not validate attempt:",
            attemptError,
          );

          return Response.json(
            {
              error:
                "Não foi possível validar a avaliação.",
            },
            {
              status: 500,
            },
          );
        }

        if (
          !attemptData
        ) {
          return Response.json(
            {
              error:
                "Avaliação não encontrada ou acesso não autorizado.",
            },
            {
              status: 404,
            },
          );
        }

        const attempt =
          attemptData as
          TestAttemptRow;

        if (
          attempt.status ===
          "in_progress"
        ) {
          return Response.json(
            {
              error:
                "A avaliação ainda não foi finalizada.",
            },
            {
              status: 409,
            },
          );
        }

        /*
         * Também carregamos o resultado
         * através do client sujeito ao RLS.
         */
        const {
          data:
          resultData,
          error:
          resultError,
        } =
          await ctx.supabase
            .from(
              "test_results",
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
                ai_analysis
              `,
            )
            .eq(
              "attempt_id",
              attemptId,
            )
            .maybeSingle();

        if (
          resultError
        ) {
          console.error(
            "Could not load test result:",
            resultError,
          );

          return Response.json(
            {
              error:
                "Não foi possível carregar o resultado.",
            },
            {
              status: 500,
            },
          );
        }

        if (!resultData) {
          return Response.json(
            {
              error:
                "O resultado ainda não está disponível.",
            },
            {
              status: 404,
            },
          );
        }

        const result =
          resultData as
          TestResultRow;

        /*
         * Evita gastar uma nova chamada
         * Gemini toda vez que o aluno
         * atualizar a página.
         */
        if (
          !force &&
          result.summary &&
          result.recommendation &&
          result.ai_analysis
        ) {
          return Response.json({
            success: true,
            cached: true,

            analysis: {
              summary:
                result.summary,

              recommendation:
                result.recommendation,

              aiAnalysis:
                result.ai_analysis,
            },
          });
        }

        /*
         * Recuperamos somente informações
         * pedagógicas seguras do Speaking.
         *
         * Não consultamos:
         * - question_options
         * - is_correct
         * - gabarito
         */
        const {
          data:
          speakingData,
          error:
          speakingError,
        } =
          await ctx.supabase
            .from(
              "speaking_answers",
            )
            .select(
              `
                question_id,
                transcript,
                awarded_points,
                teacher_feedback
              `,
            )
            .eq(
              "attempt_id",
              attemptId,
            );

        if (
          speakingError
        ) {
          console.error(
            "Could not load speaking answers:",
            speakingError,
          );

          return Response.json(
            {
              error:
                "Não foi possível carregar os dados de Speaking.",
            },
            {
              status: 500,
            },
          );
        }

        const speakingAnswers =
          (
            speakingData ??
            []
          ) as
          SpeakingAnswerRow[];

        const speakingContext =
          speakingAnswers.map(
            (
              answer,
              index,
            ) => ({
              activity:
                index + 1,

              transcript:
                answer.transcript ??
                null,

              awardedPoints:
                answer.awarded_points ===
                  null
                  ? null
                  : Number(
                    answer.awarded_points,
                  ),

              teacherFeedback:
                answer.teacher_feedback ??
                null,
            }),
          );

        const context = {
          objective: {
            score:
              Number(
                result.objective_score,
              ),

            percentage:
              Number(
                result.percentage,
              ),
          },

          speaking: {
            status:
              result.speaking_score ===
                null
                ? "pending"
                : "evaluated",

            score:
              result.speaking_score ===
                null
                ? null
                : Number(
                  result.speaking_score,
                ),

            answers:
              speakingContext,
          },

          level: {
            estimated:
              result.estimated_level,
          },
        };

        const prompt = `
Você é um assistente pedagógico da FB Language Center.

Sua tarefa é criar uma análise breve e útil para um aluno que acabou de realizar um teste de nivelamento de inglês.

REGRAS IMPORTANTES:

1. Use APENAS os dados fornecidos.
2. Não invente erros, acertos, habilidades ou dificuldades.
3. Não tente reconstruir o gabarito.
4. Não determine nem altere o nível CEFR oficial.
5. O campo "estimated" é apenas informação do sistema.
6. Se o nível estiver como "Pendente", diga claramente que o nível final ainda está em definição.
7. Se Speaking estiver "pending", não avalie fluência, gramática oral, pronúncia ou comunicação como se já tivessem sido analisadas.
8. Se não houver transcrições de Speaking, não faça inferências sobre a fala do aluno.
9. Não cite pontuações internas excessivamente no texto.
10. Use português brasileiro.
11. O tom deve ser profissional, acolhedor e educacional.
12. Não faça promessas de evolução garantida.
13. Produza recomendações práticas e realistas.
14. Não mencione Gemini, inteligência artificial, prompt ou sistema interno.

DADOS DA AVALIAÇÃO:

${JSON.stringify(
          context,
          null,
          2,
        )}
        `.trim();

        const geminiResponse =
          await fetch(
            "https://generativelanguage.googleapis.com/v1beta/interactions",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "x-goog-api-key":
                  GEMINI_API_KEY,
              },

              body:
                JSON.stringify({
                  model:
                    MODEL,

                  input:
                    prompt,

                  response_format: [
                    {
                      type:
                        "text",

                      mime_type:
                        "application/json",

                      schema:
                        analysisSchema,
                    },
                  ],
                }),
            },
          );

        if (!geminiResponse.ok) {
          const errorBody =
            await geminiResponse
              .text();

          console.error(
            "Gemini API error:",
            geminiResponse.status,
            errorBody,
          );

          return Response.json(
            {
              error:
                "Não foi possível gerar a análise neste momento.",

              providerStatus:
                geminiResponse.status,
            },
            {
              status: 502,
            },
          );
        }

        interface GeminiInteractionResponse {
          steps?: Array<{
            type?: string;

            content?: Array<{
              type?: string;
              text?: string;
            }>;

            text?: string;
          }>;

          output_text?: string;
        }

        const geminiData =
          await geminiResponse
            .json() as
          GeminiInteractionResponse;

        console.log(
          "Gemini interaction response:",
          JSON.stringify(
            geminiData,
          ),
        );

        let rawAnalysis =
          geminiData.output_text ??
          "";

        if (!rawAnalysis) {
          const texts: string[] =
            [];

          for (
            const step
            of geminiData.steps ??
            []
          ) {
            if (
              typeof step.text ===
              "string" &&
              step.text.trim()
            ) {
              texts.push(
                step.text,
              );
            }

            for (
              const content
              of step.content ??
              []
            ) {
              if (
                typeof content.text ===
                "string" &&
                content.text.trim()
              ) {
                texts.push(
                  content.text,
                );
              }
            }
          }

          rawAnalysis =
            texts.join("");
        }

        if (!rawAnalysis) {
          console.error(
            "Gemini returned no readable text:",
            geminiData,
          );

          return Response.json(
            {
              error:
                "A análise foi gerada sem conteúdo válido.",

              debug:
                "Gemini respondeu, mas nenhum texto foi encontrado em output_text ou steps.",
            },
            {
              status: 502,
            },
          );
        }

        let analysis:
          GeminiAnalysis;

        try {
          analysis =
            JSON.parse(
              rawAnalysis,
            ) as
            GeminiAnalysis;
        } catch (
        parseError
        ) {
          console.error(
            "Could not parse Gemini JSON:",
            parseError,
            rawAnalysis,
          );

          return Response.json(
            {
              error:
                "Não foi possível interpretar a análise gerada.",
            },
            {
              status: 502,
            },
          );
        }

        if (
          !isValidAnalysis(
            analysis,
          )
        ) {
          console.error(
            "Gemini analysis failed semantic validation:",
            analysis,
          );

          return Response.json(
            {
              error:
                "A análise gerada não passou pela validação.",
            },
            {
              status: 502,
            },
          );
        }

        const aiAnalysis = {
          version: 1,

          model:
            MODEL,

          generatedAt:
            new Date()
              .toISOString(),

          strengths:
            analysis.strengths,

          areasToImprove:
            analysis
              .areas_to_improve,

          studyFocus:
            analysis
              .study_focus,
        };

        /*
         * A autorização já foi comprovada
         * através das consultas com
         * ctx.supabase + RLS.
         *
         * Agora usamos o admin apenas para
         * persistir campos que o aluno não
         * possui permissão de UPDATE direto.
         */
        const {
          error:
          updateError,
        } =
          await ctx
            .supabaseAdmin
            .from(
              "test_results",
            )
            .update({
              summary:
                analysis.summary,

              recommendation:
                analysis
                  .recommendation,

              ai_analysis:
                aiAnalysis,
            })
            .eq(
              "attempt_id",
              attemptId,
            );

        if (
          updateError
        ) {
          console.error(
            "Could not save AI analysis:",
            updateError,
          );

          return Response.json(
            {
              error:
                "A análise foi criada, mas não pôde ser salva.",
            },
            {
              status: 500,
            },
          );
        }

        return Response.json({
          success: true,

          cached: false,

          analysis: {
            summary:
              analysis.summary,

            recommendation:
              analysis
                .recommendation,

            aiAnalysis,
          },
        });
      } catch (error) {
        console.error(
          "Unexpected generate-test-analysis error:",
          error,
        );

        return Response.json(
          {
            error:
              "Não foi possível gerar sua análise neste momento.",
          },
          {
            status: 500,
          },
        );
      }
    },
  ),
};

function isValidAnalysis(
  value: unknown,
): value is GeminiAnalysis {
  if (
    !value ||
    typeof value !==
    "object"
  ) {
    return false;
  }

  const analysis =
    value as
    Partial<
      GeminiAnalysis
    >;

  if (
    typeof analysis.summary !==
    "string" ||
    analysis.summary
      .trim()
      .length <
    20
  ) {
    return false;
  }

  if (
    typeof analysis.recommendation !==
    "string" ||
    analysis.recommendation
      .trim()
      .length <
    20
  ) {
    return false;
  }

  if (
    !isStringArray(
      analysis.strengths,
    ) ||
    !isStringArray(
      analysis
        .areas_to_improve,
    ) ||
    !isStringArray(
      analysis.study_focus,
    )
  ) {
    return false;
  }

  return true;
}

function isStringArray(
  value: unknown,
): value is string[] {
  return (
    Array.isArray(
      value,
    ) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item ===
        "string" &&
        item
          .trim()
          .length >
        0,
    )
  );
}

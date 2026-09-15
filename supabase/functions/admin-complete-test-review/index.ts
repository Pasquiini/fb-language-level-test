import {
  createClient,
} from 'npm:@supabase/supabase-js@2';


const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
};


function getErrorMessage(
  error: unknown,
): string {

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    'string'
  ) {
    return error;
  }

  try {
    return JSON.stringify(
      error,
    );
  } catch {
    return 'Erro desconhecido.';
  }
}


function normalizePhone(
  value: string,
): string {

  return value.replace(
    /\D/g,
    '',
  );
}


Deno.serve(
  async (
    req: Request,
  ) => {

    /*
     * =========================================
     * CORS
     * =========================================
     */

    if (
      req.method ===
      'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          status: 200,

          headers:
            corsHeaders,
        },
      );
    }


    if (
      req.method !==
      'POST'
    ) {
      return Response.json(
        {
          success: false,

          error:
            'Método não permitido.',
        },
        {
          status: 405,

          headers:
            corsHeaders,
        },
      );
    }


    try {

      /*
       * =========================================
       * AUTENTICAÇÃO
       * =========================================
       */

      const authorization =
        req.headers.get(
          'Authorization',
        );


      if (!authorization) {
        return Response.json(
          {
            success: false,

            error:
              'Não autenticado.',
          },
          {
            status: 401,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * =========================================
       * CONFIGURAÇÃO
       * =========================================
       */

      const supabaseUrl =
        Deno.env.get(
          'SUPABASE_URL',
        );


      const anonKey =
        Deno.env.get(
          'SUPABASE_ANON_KEY',
        );


      const serviceRoleKey =
        Deno.env.get(
          'SUPABASE_SERVICE_ROLE_KEY',
        );


      const evolutionApiUrl =
        Deno.env.get(
          'EVOLUTION_API_URL',
        )
          ?.replace(
            /\/+$/,
            '',
          );


      const evolutionApiKey =
        Deno.env.get(
          'EVOLUTION_API_KEY',
        );


      const evolutionInstance =
        Deno.env.get(
          'EVOLUTION_INSTANCE',
        );


      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceRoleKey ||
        !evolutionApiUrl ||
        !evolutionApiKey ||
        !evolutionInstance
      ) {
        const missing:
          string[] =
          [];


        if (!supabaseUrl) {
          missing.push(
            'SUPABASE_URL',
          );
        }


        if (!anonKey) {
          missing.push(
            'SUPABASE_ANON_KEY',
          );
        }


        if (!serviceRoleKey) {
          missing.push(
            'SUPABASE_SERVICE_ROLE_KEY',
          );
        }


        if (!evolutionApiUrl) {
          missing.push(
            'EVOLUTION_API_URL',
          );
        }


        if (!evolutionApiKey) {
          missing.push(
            'EVOLUTION_API_KEY',
          );
        }


        if (!evolutionInstance) {
          missing.push(
            'EVOLUTION_INSTANCE',
          );
        }


        throw new Error(
          `Configuração de ambiente incompleta: ${missing.join(', ')}.`,
        );
      }


      /*
       * =========================================
       * VALIDAR STAFF
       * =========================================
       */

      const authClient =
        createClient(
          supabaseUrl,
          anonKey,
          {
            global: {
              headers: {
                Authorization:
                  authorization,
              },
            },

            auth: {
              persistSession:
                false,

              autoRefreshToken:
                false,
            },
          },
        );


      const {
        data: isStaff,
        error: staffError,
      } =
        await authClient.rpc(
          'is_staff',
        );


      if (staffError) {
        console.error(
          '[admin-complete-test-review] staff-check',
          staffError,
        );


        return Response.json(
          {
            success: false,

            error:
              'Não foi possível validar a permissão administrativa.',
          },
          {
            status: 403,

            headers:
              corsHeaders,
          },
        );
      }


      if (!isStaff) {
        return Response.json(
          {
            success: false,

            error:
              'Acesso não autorizado.',
          },
          {
            status: 403,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * =========================================
       * BODY
       * =========================================
       */

      const body =
        await req.json();


      const attemptId =
        typeof body
          ?.attemptId ===
          'string'
          ? body
              .attemptId
              .trim()
          : null;


      const rawSpeakingScore =
        body?.speakingScore;


      const speakingScore =
        rawSpeakingScore ===
          null ||
        rawSpeakingScore ===
          undefined ||
        rawSpeakingScore ===
          ''
          ? null
          : Number(
              rawSpeakingScore,
            );


      const estimatedLevel =
        typeof body
          ?.estimatedLevel ===
          'string'
          ? body
              .estimatedLevel
              .trim()
          : '';


      const finalLevel =
        estimatedLevel
          .toUpperCase();


      const reviewNotes =
        typeof body
          ?.reviewNotes ===
          'string'
          ? (
              body
                .reviewNotes
                .trim() ||
              null
            )
          : null;


      if (!attemptId) {
        return Response.json(
          {
            success: false,

            error:
              'attemptId é obrigatório.',
          },
          {
            status: 400,

            headers:
              corsHeaders,
          },
        );
      }


      if (
        speakingScore !== null &&
        (
          !Number.isFinite(
            speakingScore,
          ) ||
          speakingScore < 0
        )
      ) {
        return Response.json(
          {
            success: false,

            error:
              'Nota de Speaking inválida.',
          },
          {
            status: 400,

            headers:
              corsHeaders,
          },
        );
      }


      const allowedLevels =
        new Set([
          'A1',
          'A2',
          'B1',
          'B2',
          'C1',
          'C2',
        ]);


      if (
        !finalLevel ||
        !allowedLevels.has(
          finalLevel,
        )
      ) {
        return Response.json(
          {
            success: false,

            error:
              'Nível final inválido.',
          },
          {
            status: 400,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * =========================================
       * CLIENT PRIVILEGIADO
       * =========================================
       */

      const supabase =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              persistSession:
                false,

              autoRefreshToken:
                false,
            },
          },
        );


      /*
       * =========================================
       * 1. CONCLUSÃO PEDAGÓGICA
       * =========================================
       */

      const {
        data:
          completionRows,

        error:
          completionError,
      } =
        await supabase.rpc(
          'complete_test_review',
          {
            p_attempt_id:
              attemptId,

            p_speaking_score:
              speakingScore,

            p_estimated_level:
              finalLevel,

            p_review_notes:
              reviewNotes,
          },
        );


      if (completionError) {
        throw completionError;
      }


      const completion =
        Array.isArray(
          completionRows,
        )
          ? completionRows[0]
          : completionRows;


      if (!completion) {
        throw new Error(
          'A conclusão não retornou resultado.',
        );
      }


      const eventId =
        completion.event_id;


      if (!eventId) {
        throw new Error(
          'A conclusão não retornou o evento de comunicação.',
        );
      }


      /*
       * =========================================
       * 2. CRIAR MENSAGEM TEST_COMPLETED
       * =========================================
       */

      const {
        error:
          enqueueError,
      } =
        await supabase.rpc(
          'enqueue_test_completed_message',
          {
            p_event_id:
              eventId,
          },
        );


      if (enqueueError) {
        console.error(
          '[admin-complete-test-review] enqueue-error',
          enqueueError,
        );


        /*
         * Importante:
         *
         * a conclusão pedagógica já
         * aconteceu.
         *
         * Falha de comunicação não
         * desfaz o resultado.
         */

        return Response.json(
          {
            success: true,

            attemptId,

            status:
              'completed',

            speakingScore,

            estimatedLevel:
              finalLevel,

            communicationSent:
              false,

            communicationError:
              getErrorMessage(
                enqueueError,
              ),
          },
          {
            status: 200,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * =========================================
       * 3. LOCALIZAR MENSAGEM
       * =========================================
       */

      const {
        data: message,
        error:
          messageError,
      } =
        await supabase
          .from(
            'communication_messages',
          )
          .select(`
            id,
            recipient,
            message_body,
            status,
            attempt_count
          `)
          .eq(
            'event_id',
            eventId,
          )
          .eq(
            'recipient_type',
            'student',
          )
          .maybeSingle();


      if (messageError) {
        throw messageError;
      }


      if (!message) {
        return Response.json(
          {
            success: true,

            attemptId,

            status:
              'completed',

            speakingScore,

            estimatedLevel:
              finalLevel,

            communicationSent:
              false,

            communicationError:
              'Mensagem de conclusão não encontrada.',
          },
          {
            status: 200,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * Idempotência.
       *
       * Se outra execução já enviou,
       * não disparamos novamente.
       */

      if (
        message.status ===
        'sent'
      ) {
        return Response.json(
          {
            success: true,

            attemptId,

            status:
              'completed',

            speakingScore,

            estimatedLevel:
              finalLevel,

            communicationSent:
              true,

            communicationAlreadySent:
              true,
          },
          {
            status: 200,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * =========================================
       * 4. RESERVAR MENSAGEM
       * =========================================
       */

      const {
        data:
          lockedMessage,

        error:
          lockError,
      } =
        await supabase
          .from(
            'communication_messages',
          )
          .update({
            status:
              'processing',

            attempt_count:
              (
                message
                  .attempt_count ??
                0
              ) + 1,

            last_error:
              null,
          })
          .eq(
            'id',
            message.id,
          )
          .in(
            'status',
            [
              'pending',
              'failed',
            ],
          )
          .select(
            'id',
          )
          .maybeSingle();


      if (lockError) {
        throw lockError;
      }


      if (!lockedMessage) {
        return Response.json(
          {
            success: true,

            attemptId,

            status:
              'completed',

            speakingScore,

            estimatedLevel:
              finalLevel,

            communicationSent:
              false,

            communicationError:
              'Mensagem já está sendo processada.',
          },
          {
            status: 200,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * =========================================
       * 5. EVOLUTION
       * =========================================
       */

      try {

        const recipient =
          normalizePhone(
            String(
              message.recipient,
            ),
          );


        if (!recipient) {
          throw new Error(
            'WhatsApp do aluno inválido.',
          );
        }


        const evolutionResponse =
          await fetch(
            `${evolutionApiUrl}/message/sendText/${evolutionInstance}`,
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                apikey:
                  evolutionApiKey,
              },

              body:
                JSON.stringify({
                  number:
                    recipient,

                  text:
                    message
                      .message_body,
                }),
            },
          );


        const responseText =
          await evolutionResponse
            .text();


        let evolutionData:
          unknown =
          null;


        if (responseText) {
          try {
            evolutionData =
              JSON.parse(
                responseText,
              );
          } catch {
            evolutionData =
              responseText;
          }
        }


        if (
          !evolutionResponse.ok
        ) {
          throw new Error(
            `Evolution API HTTP ${evolutionResponse.status}: ${getErrorMessage(
              evolutionData,
            )}`,
          );
        }


        const evolutionRecord =
          (
            evolutionData &&
            typeof evolutionData ===
              'object'
          )
            ? evolutionData as
                Record<
                  string,
                  any
                >
            : null;


        const providerMessageId =
          evolutionRecord
            ?.key?.id ??
          evolutionRecord
            ?.messageId ??
          evolutionRecord
            ?.id ??
          null;


        /*
         * =========================================
         * 6. MARCAR COMO ENVIADA
         * =========================================
         */

        const {
          error:
            sentError,
        } =
          await supabase
            .from(
              'communication_messages',
            )
            .update({
              status:
                'sent',

              provider:
                'evolution',

              provider_message_id:
                providerMessageId,

              sent_at:
                new Date()
                  .toISOString(),

              last_error:
                null,

              next_retry_at:
                null,
            })
            .eq(
              'id',
              message.id,
            );


        if (sentError) {
          throw sentError;
        }


        return Response.json(
          {
            success: true,

            attemptId,

            status:
              'completed',

            speakingScore,

            estimatedLevel:
              finalLevel,

            communicationSent:
              true,

            providerMessageId,
          },
          {
            status: 200,

            headers:
              corsHeaders,
          },
        );

      } catch (
        communicationError
      ) {

        const errorMessage =
          getErrorMessage(
            communicationError,
          );


        console.error(
          '[admin-complete-test-review] communication-error',
          errorMessage,
        );


        const {
          error:
            failedUpdateError,
        } =
          await supabase
            .from(
              'communication_messages',
            )
            .update({
              status:
                'failed',

              provider:
                'evolution',

              last_error:
                errorMessage,

              next_retry_at:
                new Date(
                  Date.now() +
                  (
                    5 *
                    60 *
                    1000
                  ),
                )
                  .toISOString(),
            })
            .eq(
              'id',
              message.id,
            );


        if (failedUpdateError) {
          console.error(
            '[admin-complete-test-review] failed-status-update',
            failedUpdateError,
          );
        }


        /*
         * Resultado permanece concluído.
         */

        return Response.json(
          {
            success: true,

            attemptId,

            status:
              'completed',

            speakingScore,

            estimatedLevel:
              finalLevel,

            communicationSent:
              false,

            communicationError:
              errorMessage,
          },
          {
            status: 200,

            headers:
              corsHeaders,
          },
        );
      }

    } catch (error) {

      console.error(
        '[admin-complete-test-review] fatal',
        error,
      );


      return Response.json(
        {
          success: false,

          error:
            getErrorMessage(
              error,
            ),
        },
        {
          status: 500,

          headers:
            corsHeaders,
        },
      );
    }
  },
);

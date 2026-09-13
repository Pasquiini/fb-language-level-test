import {
  createClient,
} from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
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
    if (
      req.method ===
      'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
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
      const supabaseUrl =
        Deno.env.get(
          'FB_SUPABASE_URL',
        );

      const serviceRoleKey =
        Deno.env.get(
          'FB_SUPABASE_SERVICE_ROLE_KEY',
        );

      const evolutionApiUrl =
        Deno.env.get(
          'EVOLUTION_API_URL',
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
        !serviceRoleKey ||
        !evolutionApiUrl ||
        !evolutionApiKey ||
        !evolutionInstance
      ) {
        throw new Error(
          'Configuração de ambiente incompleta.',
        );
      }

      const body =
        await req.json();

      const attemptId =
        typeof body
          ?.attemptId ===
          'string'
          ? body.attemptId
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
          ? body
            .reviewNotes
            .trim()
          : null;


      if (!attemptId) {
        return Response.json(
          {
            success:
              false,

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
            success:
              false,

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


      if (
        !estimatedLevel
      ) {
        return Response.json(
          {
            success:
              false,

            error:
              'Nível final é obrigatório.',
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
       * ----------------------------------------
       * 1. Conclusão pedagógica
       * ----------------------------------------
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


      if (
        completionError
      ) {
        throw completionError;
      }


      const completion =
        completionRows?.[0];

      if (!completion) {
        throw new Error(
          'A conclusão não retornou resultado.',
        );
      }


      /*
       * ----------------------------------------
       * 2. Cria mensagem TEST_COMPLETED
       * ----------------------------------------
       */

      const {
        error:
        enqueueError,
      } =
        await supabase.rpc(
          'enqueue_test_completed_message',
          {
            p_event_id:
              completion
                .event_id,
          },
        );


      if (enqueueError) {
        console.error(
          '[admin-complete-test-review] enqueue-error',
          enqueueError,
        );

        /*
         * A avaliação JÁ foi concluída.
         * Comunicação não deve desfazer
         * conclusão pedagógica.
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
            headers:
              corsHeaders,
          },
        );
      }


      /*
       * ----------------------------------------
       * 3. Localiza a mensagem
       * ----------------------------------------
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
            completion
              .event_id,
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
        throw new Error(
          'Mensagem de conclusão não encontrada.',
        );
      }


      /*
       * Se já foi enviada em outra execução,
       * não envia novamente.
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
            headers:
              corsHeaders,
          },
        );
      }


      /*
       * ----------------------------------------
       * 4. Reserva
       * ----------------------------------------
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


      if (
        !lockedMessage
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
              false,

            communicationError:
              'Mensagem já está sendo processada.',
          },
          {
            headers:
              corsHeaders,
          },
        );
      }


      /*
       * ----------------------------------------
       * 5. Evolution
       * ----------------------------------------
       */

      try {
        const recipient =
          normalizePhone(
            String(
              message
                .recipient,
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
          any = null;


        try {
          evolutionData =
            responseText
              ? JSON.parse(
                responseText,
              )
              : null;
        } catch {
          evolutionData =
            responseText;
        }


        if (
          !evolutionResponse
            .ok
        ) {
          throw new Error(
            `Evolution API HTTP ${evolutionResponse.status}: ${getErrorMessage(
              evolutionData,
            )}`,
          );
        }


        const providerMessageId =
          evolutionData
            ?.key?.id ??
          evolutionData
            ?.messageId ??
          evolutionData
            ?.id ??
          null;


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
                5 *
                60 *
                1000,
              )
                .toISOString(),
          })
          .eq(
            'id',
            message.id,
          );


        /*
         * Resultado continua concluído.
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

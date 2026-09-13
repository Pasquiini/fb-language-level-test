import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Erro desconhecido.';
  }
}

Deno.serve(
  async (req: Request) => {
    if (req.method === 'OPTIONS') {
      return new Response(
        'ok',
        {
          headers: corsHeaders,
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

      console.log(
        '[process-communications] environment',
        {
          supabaseUrl,
          hasServiceRoleKey:
            Boolean(serviceRoleKey),
          evolutionApiUrl,
          evolutionInstance,
          hasEvolutionApiKey:
            Boolean(evolutionApiKey),
        },
      );

      const supabase =
        createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          },
        );

      const {
        data: messages,
        error: messagesError,
      } =
        await supabase
          .from(
            'communication_messages',
          )
          .select(
            `
              id,
              event_id,
              attempt_id,
              student_id,
              recipient,
              recipient_type,
              message_body,
              status,
              attempt_count
            `,
          )
          .eq(
            'status',
            'pending',
          )
          .order(
            'created_at',
            {
              ascending: true,
            },
          )
          .limit(10);

      console.log(
        '[process-communications] pending-messages',
        {
          count:
            messages?.length ?? 0,
          messages:
            messages?.map(
              (message) => ({
                id:
                  message.id,
                recipientType:
                  message.recipient_type,
                recipient:
                  message.recipient,
                attemptCount:
                  message.attempt_count,
              }),
            ) ?? [],
        },
      );

      if (messagesError) {
        console.error(
          '[process-communications] messagesError',
          messagesError,
        );

        throw messagesError;
      }

      if (!messages?.length) {
        return Response.json(
          {
            success: true,
            processed: 0,
            message:
              'Nenhuma mensagem pendente.',
          },
          {
            headers:
              corsHeaders,
          },
        );
      }

      const results = [];

      for (
        const message of messages
      ) {
        console.log(
          '[process-communications] processing-message',
          {
            id:
              message.id,
            recipientType:
              message.recipient_type,
            attemptCount:
              message.attempt_count,
          },
        );

        /*
         * Reserva da mensagem.
         *
         * O status precisa continuar pending
         * para que apenas um worker consiga
         * assumir o processamento.
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
                message
                  .attempt_count +
                1,

              last_error:
                null,
            })
            .eq(
              'id',
              message.id,
            )
            .eq(
              'status',
              'pending',
            )
            .select(
              'id',
            )
            .maybeSingle();

        if (lockError) {
          console.error(
            '[process-communications] lock-error',
            {
              id:
                message.id,
              error:
                lockError,
            },
          );

          results.push({
            id:
              message.id,
            success:
              false,
            stage:
              'lock',
            error:
              getErrorMessage(
                lockError,
              ),
          });

          continue;
        }

        if (!lockedMessage) {
          console.log(
            '[process-communications] lock-skipped',
            {
              id:
                message.id,
            },
          );

          continue;
        }

        try {
          /*
           * Normalização do telefone.
           *
           * Ex:
           * +5517991957226
           * vira
           * 5517991957226
           */
          const recipient =
            String(
              message.recipient,
            ).replace(
              /\D/g,
              '',
            );

          if (!recipient) {
            throw new Error(
              'Destinatário inválido.',
            );
          }

          console.log(
            '[process-communications] evolution-request',
            {
              id:
                message.id,
              recipientType:
                message
                  .recipient_type,
              recipient,
            },
          );

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
            unknown;

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

          console.log(
            '[process-communications] evolution-response',
            {
              id:
                message.id,
              status:
                evolutionResponse
                  .status,
              ok:
                evolutionResponse
                  .ok,
              data:
                evolutionData,
            },
          );

          if (
            !evolutionResponse.ok
          ) {
            throw new Error(
              `Evolution API retornou HTTP ${evolutionResponse.status}: ${getErrorMessage(
                evolutionData,
              )}`,
            );
          }

          const data =
            evolutionData as
              | Record<
                  string,
                  any
                >
              | null;

          const providerMessageId =
            data?.key?.id ??
            data?.messageId ??
            data?.id ??
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
            console.error(
              '[process-communications] sent-update-error',
              {
                id:
                  message.id,
                error:
                  sentError,
              },
            );

            throw sentError;
          }

          console.log(
            '[process-communications] message-sent',
            {
              id:
                message.id,
              providerMessageId,
            },
          );

          results.push({
            id:
              message.id,
            success:
              true,
            providerMessageId,
          });
        } catch (error) {
          const errorMessage =
            getErrorMessage(
              error,
            );

          console.error(
            '[process-communications] message-failed',
            {
              id:
                message.id,
              error:
                errorMessage,
            },
          );

          const retryAt =
            new Date(
              Date.now() +
                5 *
                  60 *
                  1000,
            ).toISOString();

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
                  retryAt,
              })
              .eq(
                'id',
                message.id,
              );

          if (
            failedUpdateError
          ) {
            console.error(
              '[process-communications] failed-update-error',
              {
                id:
                  message.id,
                error:
                  failedUpdateError,
              },
            );
          }

          results.push({
            id:
              message.id,
            success:
              false,
            error:
              errorMessage,
          });
        }
      }

      console.log(
        '[process-communications] completed',
        {
          processed:
            results.length,
          results,
        },
      );

      return Response.json(
        {
          success: true,

          processed:
            results.length,

          results,
        },
        {
          headers:
            corsHeaders,
        },
      );
    } catch (error) {
      const errorMessage =
        getErrorMessage(
          error,
        );

      console.error(
        '[process-communications] fatal',
        {
          error:
            errorMessage,
        },
      );

      return Response.json(
        {
          success: false,
          error:
            errorMessage,
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

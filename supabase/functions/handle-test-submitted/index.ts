import {
  createClient,
} from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  whatsapp: string | null;
  role: string | null;
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error === 'string'
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
  phone: string,
): string {
  return phone.replace(
    /\D/g,
    '',
  );
}

function normalizeEmail(
  email: string,
): string {
  return email
    .trim()
    .toLowerCase();
}

function isValidEmail(
  email: string,
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);
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

    try {
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

      const supabaseUrl =
        Deno.env.get(
          'FB_SUPABASE_URL',
        );

      const serviceRoleKey =
        Deno.env.get(
          'FB_SUPABASE_SERVICE_ROLE_KEY',
        );

      const schoolWhatsapp =
        Deno.env.get(
          'FB_SCHOOL_WHATSAPP',
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

      const appUrl =
        Deno.env.get(
          'FB_APP_URL',
        );

      if (
        !supabaseUrl ||
        !serviceRoleKey ||
        !schoolWhatsapp ||
        !evolutionApiUrl ||
        !evolutionApiKey ||
        !evolutionInstance ||
        !appUrl
      ) {
        throw new Error(
          'Configuração de ambiente incompleta.',
        );
      }

      const body =
        await req.json();

      const attemptId =
        typeof body?.attemptId ===
        'string'
          ? body.attemptId
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

      console.log(
        '[handle-test-submitted] start',
        {
          attemptId,
        },
      );

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

              detectSessionInUrl:
                false,
            },
          },
        );

      /*
       * 1. Localiza o evento
       * TEST_SUBMITTED.
       */
      const {
        data: event,
        error: eventError,
      } =
        await supabase
          .from(
            'communication_events',
          )
          .select(`
            id,
            attempt_id,
            student_id,
            event_type
          `)
          .eq(
            'attempt_id',
            attemptId,
          )
          .eq(
            'event_type',
            'TEST_SUBMITTED',
          )
          .maybeSingle();

      if (eventError) {
        throw eventError;
      }

      if (!event) {
        return Response.json(
          {
            success: false,
            stage:
              'find-event',

            error:
              'Evento TEST_SUBMITTED não encontrado para esta tentativa.',
          },
          {
            status: 404,
            headers:
              corsHeaders,
          },
        );
      }

      if (
        !event.student_id
      ) {
        throw new Error(
          'Evento TEST_SUBMITTED não possui student_id.',
        );
      }

      console.log(
        '[handle-test-submitted] event-found',
        {
          eventId:
            event.id,

          studentId:
            event.student_id,
        },
      );

      /*
       * 2. Confirma que a tentativa
       * realmente pertence ao aluno
       * indicado pelo evento.
       */
      const {
        data: attempt,
        error: attemptError,
      } =
        await supabase
          .from(
            'test_attempts',
          )
          .select(`
            id,
            student_id,
            status
          `)
          .eq(
            'id',
            attemptId,
          )
          .maybeSingle();

      if (attemptError) {
        throw attemptError;
      }

      if (!attempt) {
        throw new Error(
          'Tentativa não encontrada.',
        );
      }

      if (
        attempt.student_id !==
        event.student_id
      ) {
        throw new Error(
          'O aluno do evento não corresponde ao proprietário da tentativa.',
        );
      }

      if (
        attempt.status !==
          'under_review' &&
        attempt.status !==
          'completed'
      ) {
        throw new Error(
          `Status inválido para TEST_SUBMITTED: ${attempt.status}.`,
        );
      }

      /*
       * 3. Carrega o perfil oficial
       * do aluno.
       */
      const {
        data: profile,
        error: profileError,
      } =
        await supabase
          .from(
            'profiles',
          )
          .select(`
            id,
            full_name,
            email,
            whatsapp,
            role
          `)
          .eq(
            'id',
            event.student_id,
          )
          .maybeSingle<ProfileRow>();

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        throw new Error(
          'Perfil do aluno não encontrado.',
        );
      }

      if (
        profile.role !==
        'student'
      ) {
        throw new Error(
          'O usuário vinculado à tentativa não possui role student.',
        );
      }

      if (
        !profile.email ||
        !profile.email.trim()
      ) {
        throw new Error(
          'O aluno não possui e-mail cadastrado.',
        );
      }

      const studentEmail =
        normalizeEmail(
          profile.email,
        );

      if (
        !isValidEmail(
          studentEmail,
        )
      ) {
        throw new Error(
          'O aluno possui um e-mail inválido.',
        );
      }

      /*
       * 4. Busca a identidade Auth
       * pelo MESMO student_id.
       */
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.admin
          .getUserById(
            event.student_id,
          );

      if (authError) {
        throw authError;
      }

      const authUser =
        authData.user;

      if (!authUser) {
        throw new Error(
          'Usuário Auth do aluno não encontrado.',
        );
      }

      const authEmail =
        authUser.email
          ? normalizeEmail(
              authUser.email,
            )
          : null;

      /*
       * Nunca sobrescrevemos uma
       * identidade permanente que
       * pertence a outro e-mail.
       */
      if (
        authEmail &&
        authEmail !==
          studentEmail
      ) {
        throw new Error(
          'O usuário Auth já possui um e-mail diferente do perfil do aluno.',
        );
      }

      /*
       * 5. Promove/vincula a identidade
       * existente.
       *
       * O UUID NÃO muda.
       */
      if (
        authUser.is_anonymous ===
          true ||
        !authEmail
      ) {
        console.log(
          '[handle-test-submitted] promoting-user',
          {
            studentId:
              event.student_id,
          },
        );

        const {
          data:
            updatedAuthData,
          error:
            updateAuthError,
        } =
          await supabase
            .auth
            .admin
            .updateUserById(
              event.student_id,
              {
                email:
                  studentEmail,

                email_confirm:
                  true,
              },
            );

        if (
          updateAuthError
        ) {
          throw updateAuthError;
        }

        if (
          !updatedAuthData.user
        ) {
          throw new Error(
            'O Supabase não retornou o usuário após a atualização da identidade.',
          );
        }

        if (
          updatedAuthData
            .user.id !==
          event.student_id
        ) {
          throw new Error(
            'A identidade Auth retornada não corresponde ao aluno original.',
          );
        }

        const updatedEmail =
          updatedAuthData
            .user.email
            ? normalizeEmail(
                updatedAuthData
                  .user.email,
              )
            : null;

        if (
          updatedEmail !==
          studentEmail
        ) {
          throw new Error(
            'O e-mail não foi vinculado corretamente à identidade Auth.',
          );
        }

        /*
         * Esta verificação é
         * proposital.
         *
         * Não queremos seguir para
         * WhatsApp se a conta continuar
         * anônima após a promoção.
         */
        if (
          updatedAuthData
            .user
            .is_anonymous ===
          true
        ) {
          throw new Error(
            'A identidade Auth permaneceu anônima após a vinculação do e-mail.',
          );
        }
      }

      /*
       * 6. Gera um link de recovery
       * para a identidade JÁ existente.
       *
       * O Supabase não envia e-mail
       * aqui. Nós usaremos o link
       * pelo WhatsApp.
       */
      const firstAccessRedirectUrl =
        `${
          appUrl.replace(
            /\/+$/,
            '',
          )
        }/primeiro-acesso`;

      const {
        data: linkData,
        error: linkError,
      } =
        await supabase.auth.admin
          .generateLink({
            type:
              'recovery',

            email:
              studentEmail,

            options: {
              redirectTo:
                firstAccessRedirectUrl,
            },
          });

      if (linkError) {
        throw linkError;
      }

      const firstAccessUrl =
        linkData
          ?.properties
          ?.action_link;

      if (
        !firstAccessUrl
      ) {
        throw new Error(
          'Não foi possível gerar o link seguro de primeiro acesso.',
        );
      }

      console.log(
        '[handle-test-submitted] first-access-ready',
        {
          studentId:
            event.student_id,
        },
      );

      /*
       * 7. Prepara as mensagens.
       *
       * A RPC continua responsável
       * pela idempotência das mensagens.
       */
      const {
        data: enqueueData,
        error: enqueueError,
      } =
        await supabase.rpc(
          'enqueue_test_submitted_messages',
          {
            p_event_id:
              event.id,

            p_school_whatsapp:
              schoolWhatsapp,

            p_first_access_url:
              firstAccessUrl,
          },
        );

      if (enqueueError) {
        console.error(
          '[handle-test-submitted] enqueue-error',
          enqueueError,
        );

        throw enqueueError;
      }

      console.log(
        '[handle-test-submitted] enqueue-success',
        {
          eventId:
            event.id,

          data:
            enqueueData,
        },
      );

      /*
       * 8. Busca apenas mensagens
       * pendentes deste evento.
       */
      const {
        data: messages,
        error: messagesError,
      } =
        await supabase
          .from(
            'communication_messages',
          )
          .select(`
            id,
            recipient,
            recipient_type,
            message_body,
            status,
            attempt_count
          `)
          .eq(
            'event_id',
            event.id,
          )
          .eq(
            'status',
            'pending',
          )
          .order(
            'created_at',
            {
              ascending:
                true,
            },
          );

      if (
        messagesError
      ) {
        throw messagesError;
      }

      console.log(
        '[handle-test-submitted] pending-messages',
        {
          count:
            messages?.length ??
            0,
        },
      );

      if (
        !messages?.length
      ) {
        return Response.json(
          {
            success: true,
            attemptId,
            eventId:
              event.id,

            processed:
              0,

            message:
              'As mensagens já foram preparadas ou processadas anteriormente.',
          },
          {
            headers:
              corsHeaders,
          },
        );
      }

      /*
       * 9. Envia pela Evolution.
       */
      const results:
        Array<{
          id: string;
          recipientType:
            string;
          success: boolean;
          providerMessageId?:
            string | null;
          error?: string;
        }> = [];

      for (
        const message
        of messages
      ) {
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
          results.push({
            id:
              message.id,

            recipientType:
              message
                .recipient_type,

            success:
              false,

            error:
              getErrorMessage(
                lockError,
              ),
          });

          continue;
        }

        if (
          !lockedMessage
        ) {
          continue;
        }

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
              'Número de WhatsApp inválido.',
            );
          }

          console.log(
            '[handle-test-submitted] sending',
            {
              messageId:
                message.id,

              recipientType:
                message
                  .recipient_type,

              recipient,
            },
          );

          const response =
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
            await response
              .text();

          let responseData:
            unknown = null;

          try {
            responseData =
              responseText
                ? JSON.parse(
                    responseText,
                  )
                : null;
          } catch {
            responseData =
              responseText;
          }

          console.log(
            '[handle-test-submitted] evolution-response',
            {
              messageId:
                message.id,

              httpStatus:
                response.status,

              data:
                responseData,
            },
          );

          if (
            !response.ok
          ) {
            throw new Error(
              `Evolution API HTTP ${response.status}: ${
                getErrorMessage(
                  responseData,
                )
              }`,
            );
          }

          let providerMessageId:
            string | null =
              null;

          if (
            responseData &&
            typeof responseData ===
              'object'
          ) {
            const responseRecord =
              responseData as Record<
                string,
                unknown
              >;

            const key =
              responseRecord[
                'key'
              ];

            if (
              key &&
              typeof key ===
                'object'
            ) {
              const keyRecord =
                key as Record<
                  string,
                  unknown
                >;

              if (
                typeof keyRecord[
                  'id'
                ] ===
                'string'
              ) {
                providerMessageId =
                  keyRecord[
                    'id'
                  ] as string;
              }
            }

            if (
              !providerMessageId &&
              typeof responseRecord[
                'messageId'
              ] ===
                'string'
            ) {
              providerMessageId =
                responseRecord[
                  'messageId'
                ] as string;
            }

            if (
              !providerMessageId &&
              typeof responseRecord[
                'id'
              ] ===
                'string'
            ) {
              providerMessageId =
                responseRecord[
                  'id'
                ] as string;
            }
          }

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

                last_error:
                  null,

                next_retry_at:
                  null,

                sent_at:
                  new Date()
                    .toISOString(),
              })
              .eq(
                'id',
                message.id,
              );

          if (sentError) {
            throw sentError;
          }

          results.push({
            id:
              message.id,

            recipientType:
              message
                .recipient_type,

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
            '[handle-test-submitted] send-error',
            {
              messageId:
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
              failureUpdateError,
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
            failureUpdateError
          ) {
            console.error(
              '[handle-test-submitted] failure-update-error',
              failureUpdateError,
            );
          }

          results.push({
            id:
              message.id,

            recipientType:
              message
                .recipient_type,

            success:
              false,

            error:
              errorMessage,
          });
        }
      }

      const sent =
        results.filter(
          (
            result,
          ) =>
            result.success,
        ).length;

      const failed =
        results.length -
        sent;

      console.log(
        '[handle-test-submitted] completed',
        {
          attemptId,

          eventId:
            event.id,

          processed:
            results.length,

          sent,

          failed,
        },
      );

      return Response.json(
        {
          success:
            failed === 0,

          attemptId,

          eventId:
            event.id,

          processed:
            results.length,

          sent,

          failed,

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
        '[handle-test-submitted] fatal',
        {
          error:
            errorMessage,
        },
      );

      return Response.json(
        {
          success: false,

          stage:
            'fatal',

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

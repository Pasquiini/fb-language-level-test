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


interface ProfileRow {
  id: string;

  full_name:
    string | null;

  email:
    string | null;

  whatsapp:
    string | null;

  role:
    string | null;
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
    .test(
      email,
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
       * AUTENTICAÇÃO DO CHAMADOR
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


      const schoolWhatsapp =
        Deno.env.get(
          'FB_SCHOOL_WHATSAPP',
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


      const appUrl =
        Deno.env.get(
          'FB_APP_URL',
        )
          ?.replace(
            /\/+$/,
            '',
          );


      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceRoleKey ||
        !schoolWhatsapp ||
        !evolutionApiUrl ||
        !evolutionApiKey ||
        !evolutionInstance ||
        !appUrl
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


        if (!schoolWhatsapp) {
          missing.push(
            'FB_SCHOOL_WHATSAPP',
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


        if (!appUrl) {
          missing.push(
            'FB_APP_URL',
          );
        }


        throw new Error(
          `Configuração de ambiente incompleta: ${missing.join(', ')}.`,
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


      /*
       * =========================================
       * VALIDAR JWT DO ALUNO
       * =========================================
       *
       * Neste ponto o aluno pode ainda
       * possuir uma sessão anônima.
       *
       * Isso é esperado.
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

              detectSessionInUrl:
                false,
            },
          },
        );


      const {
        data:
          callerData,

        error:
          callerError,
      } =
        await authClient
          .auth
          .getUser();


      if (
        callerError ||
        !callerData.user
      ) {
        console.error(
          '[handle-test-submitted] caller-auth-error',
          callerError,
        );


        return Response.json(
          {
            success: false,

            error:
              'Não foi possível validar o usuário da avaliação.',
          },
          {
            status: 401,

            headers:
              corsHeaders,
          },
        );
      }


      const callerUserId =
        callerData
          .user
          .id;


      /*
       * =========================================
       * CLIENT PRIVILEGIADO
       * =========================================
       *
       * A partir daqui temos acesso
       * administrativo ao banco/Auth.
       *
       * Por isso validaremos ownership
       * antes de promover a conta ou
       * disparar qualquer mensagem.
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

              detectSessionInUrl:
                false,
            },
          },
        );


      /*
       * =========================================
       * 1. LOCALIZAR EVENTO TEST_SUBMITTED
       * =========================================
       */

      const {
        data: event,

        error:
          eventError,
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
       * =========================================
       * 2. VALIDAR TENTATIVA E OWNERSHIP
       * =========================================
       */

      const {
        data: attempt,

        error:
          attemptError,
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


      /*
       * O JWT precisa pertencer ao
       * proprietário da tentativa.
       */

      if (
        callerUserId !==
        attempt.student_id
      ) {
        console.error(
          '[handle-test-submitted] ownership-denied',
          {
            callerUserId,

            attemptId,

            studentId:
              attempt.student_id,
          },
        );


        return Response.json(
          {
            success: false,

            error:
              'Você não possui acesso a esta avaliação.',
          },
          {
            status: 403,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * O evento também precisa apontar
       * para exatamente o mesmo aluno.
       */

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
       * =========================================
       * 3. PERFIL DO ALUNO
       * =========================================
       */

      const {
        data: profile,

        error:
          profileError,
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
          .maybeSingle<
            ProfileRow
          >();


      if (profileError) {
        throw profileError;
      }


      if (!profile) {
        throw new Error(
          'Perfil do aluno não encontrado.',
        );
      }


      if (
        profile.id !==
        event.student_id
      ) {
        throw new Error(
          'O perfil retornado não corresponde ao aluno da tentativa.',
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
       * =========================================
       * 4. IDENTIDADE AUTH DO MESMO ALUNO
       * =========================================
       */

      const {
        data:
          authData,

        error:
          authError,
      } =
        await supabase
          .auth
          .admin
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


      if (
        authUser.id !==
        event.student_id
      ) {
        throw new Error(
          'A identidade Auth não corresponde ao aluno original.',
        );
      }


      const authEmail =
        authUser.email
          ? normalizeEmail(
              authUser.email,
            )
          : null;


      /*
       * Nunca sobrescrevemos uma conta
       * permanente associada a outro
       * endereço de e-mail.
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
       * =========================================
       * 5. PROMOVER IDENTIDADE ANÔNIMA
       * =========================================
       *
       * O UUID permanece exatamente
       * o mesmo.
       */

      if (
        authUser
          .is_anonymous ===
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
          !updatedAuthData
            .user
        ) {
          throw new Error(
            'O Supabase não retornou o usuário após a atualização da identidade.',
          );
        }


        if (
          updatedAuthData
            .user
            .id !==
          event.student_id
        ) {
          throw new Error(
            'A identidade Auth retornada não corresponde ao aluno original.',
          );
        }


        const updatedEmail =
          updatedAuthData
            .user
            .email
            ? normalizeEmail(
                updatedAuthData
                  .user
                  .email,
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


        console.log(
          '[handle-test-submitted] user-promoted',
          {
            studentId:
              event.student_id,
          },
        );
      }


      /*
       * =========================================
       * 6. GERAR LINK DE PRIMEIRO ACESSO
       * =========================================
       *
       * O link é gerado para a MESMA
       * identidade Auth.
       *
       * Nenhum e-mail é enviado pelo
       * Supabase nesta etapa.
       */

      const firstAccessRedirectUrl =
        `${appUrl}/primeiro-acesso`;


      const {
        data: linkData,

        error:
          linkError,
      } =
        await supabase
          .auth
          .admin
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


      if (!firstAccessUrl) {
        throw new Error(
          'Não foi possível gerar o link seguro de primeiro acesso.',
        );
      }


      /*
       * Não logamos o action_link.
       *
       * Ele funciona como credencial
       * temporária.
       */

      console.log(
        '[handle-test-submitted] first-access-ready',
        {
          studentId:
            event.student_id,

          redirectTo:
            firstAccessRedirectUrl,
        },
      );


      /*
       * =========================================
       * 7. PREPARAR MENSAGENS
       * =========================================
       */

      const {
        data:
          enqueueData,

        error:
          enqueueError,
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
       * =========================================
       * 8. BUSCAR MENSAGENS PENDENTES
       * =========================================
       */

      const {
        data: messages,

        error:
          messagesError,
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


      if (messagesError) {
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


      /*
       * Idempotência:
       *
       * se já foram preparadas/enviadas
       * anteriormente, não reenviamos.
       */

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

            sent:
              0,

            failed:
              0,

            message:
              'As mensagens já foram preparadas ou processadas anteriormente.',
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
       * 9. ENVIAR PELA EVOLUTION
       * =========================================
       */

      const results:
        Array<{
          id: string;

          recipientType:
            string;

          success:
            boolean;

          providerMessageId?:
            string | null;

          error?:
            string;
        }> = [];


      for (
        const message of
        messages
      ) {

        /*
         * Reserva atômica simples.
         *
         * Só uma execução consegue
         * transformar pending em
         * processing.
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


        if (!lockedMessage) {
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
            unknown =
            null;


          if (responseText) {
            try {
              responseData =
                JSON.parse(
                  responseText,
                );
            } catch {
              responseData =
                responseText;
            }
          }


          /*
           * Não logamos a resposta inteira.
           *
           * Dependendo da Evolution, ela
           * pode conter informações do
           * destinatário/mensagem.
           */

          console.log(
            '[handle-test-submitted] evolution-response',
            {
              messageId:
                message.id,

              httpStatus:
                response.status,
            },
          );


          if (!response.ok) {
            throw new Error(
              `Evolution API HTTP ${response.status}: ${getErrorMessage(
                responseData,
              )}`,
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
              responseData as
                Record<
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
                key as
                  Record<
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


          /*
           * =====================================
           * MARCAR COMO ENVIADA
           * =====================================
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

              recipientType:
                message
                  .recipient_type,

              error:
                errorMessage,
            },
          );


          const retryAt =
            new Date(
              Date.now() +
              (
                5 *
                60 *
                1000
              ),
            )
              .toISOString();


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


      /*
       * =========================================
       * 10. RESULTADO
       * =========================================
       */

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
          /*
           * A função executou o fluxo,
           * mas reportamos false se algum
           * envio efetivamente falhou.
           *
           * O TestFinalizationService já
           * trata comunicação como
           * best-effort e não desfaz a
           * finalização do teste.
           */
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
          status: 200,

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

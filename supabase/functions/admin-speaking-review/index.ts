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
    return (
      'Erro desconhecido.'
    );
  }
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


      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceRoleKey
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


        throw new Error(
          `Configuração Supabase incompleta: ${missing.join(', ')}.`,
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
          '[admin-speaking-review] staff-check',
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
        typeof body?.attemptId ===
          'string'
          ? body.attemptId
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


      /*
       * =========================================
       * CLIENT PRIVILEGIADO
       * =========================================
       *
       * O service role só é usado depois
       * da validação de staff.
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
       * TENTATIVA
       * =========================================
       */

      const {
        data: attempt,
        error: attemptError,
      } =
        await supabase
          .from(
            'test_attempts',
          )
          .select(
            `
              id,
              student_id,
              status
            `,
          )
          .eq(
            'id',
            attemptId,
          )
          .maybeSingle();


      if (attemptError) {
        throw attemptError;
      }


      if (!attempt) {
        return Response.json(
          {
            success: false,

            error:
              'Tentativa não encontrada.',
          },
          {
            status: 404,

            headers:
              corsHeaders,
          },
        );
      }


      /*
       * =========================================
       * SPEAKING ANSWERS
       * =========================================
       */

      const {
        data: answers,
        error: answersError,
      } =
        await supabase
          .from(
            'speaking_answers',
          )
          .select(
            `
              question_id,
              audio_path,
              duration_seconds
            `,
          )
          .eq(
            'attempt_id',
            attemptId,
          )
          .order(
            'question_id',
            {
              ascending:
                true,
            },
          );


      if (answersError) {
        throw answersError;
      }


      const items = [];


      for (
        const answer of
        answers ?? []
      ) {

        /*
         * Proteção para registros antigos
         * ou incompletos.
         */

        if (!answer.audio_path) {
          items.push({
            questionId:
              answer.question_id,

            durationSeconds:
              Math.max(
                0,
                Math.round(
                  answer
                    .duration_seconds ??
                  0,
                ),
              ),

            audioUrl:
              null,

            error:
              'Áudio não encontrado.',
          });

          continue;
        }


        const {
          data: signedData,
          error: signedError,
        } =
          await supabase
            .storage
            .from(
              'speaking-audio',
            )
            .createSignedUrl(
              answer.audio_path,
              10 * 60,
            );


        if (
          signedError ||
          !signedData?.signedUrl
        ) {
          console.error(
            '[admin-speaking-review] signed-url-error',
            {
              questionId:
                answer.question_id,

              error:
                signedError,
            },
          );


          items.push({
            questionId:
              answer.question_id,

            durationSeconds:
              Math.max(
                0,
                Math.round(
                  answer
                    .duration_seconds ??
                  0,
                ),
              ),

            audioUrl:
              null,

            error:
              'Não foi possível gerar a URL do áudio.',
          });

          continue;
        }


        items.push({
          questionId:
            answer.question_id,

          durationSeconds:
            Math.max(
              0,
              Math.round(
                answer
                  .duration_seconds ??
                0,
              ),
            ),

          audioUrl:
            signedData.signedUrl,

          error:
            null,
        });
      }


      /*
       * =========================================
       * RESPONSE
       * =========================================
       */

      return Response.json(
        {
          success:
            true,

          attemptId,

          status:
            attempt.status,

          answers:
            items,
        },
        {
          status: 200,

          headers:
            corsHeaders,
        },
      );

    } catch (error) {

      console.error(
        '[admin-speaking-review] fatal',
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

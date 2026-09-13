import {
  createClient,
} from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type Action =
  | 'status'
  | 'connect'
  | 'logout'
  | 'restart'
  | 'send-test';

interface RequestBody {
  action: Action;
  number?: string;
  message?: string;
}

interface EvolutionStateResponse {
  instance?: {
    instanceName?: string;
    state?: string;
    status?: string;
  };

  state?: string;
}

interface EvolutionConnectResponse {
  base64?: string;
  code?: string;
  pairingCode?: string;

  qrcode?: {
    base64?: string;
    code?: string;
    pairingCode?: string;
  };
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

function normalizeState(
  value:
    string | undefined,
):
  | 'open'
  | 'connecting'
  | 'close'
  | 'unknown' {

  if (
    value === 'open'
  ) {
    return 'open';
  }

  if (
    value === 'connecting'
  ) {
    return 'connecting';
  }

  if (
    value === 'close'
    ||
    value === 'closed'
  ) {
    return 'close';
  }

  return 'unknown';
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
      /*
       * =========================================
       * AUTORIZAÇÃO ADMINISTRATIVA
       * =========================================
       */

      const supabaseUrl =
        Deno.env.get(
          'SUPABASE_URL',
        );

      const supabaseAnonKey =
        Deno.env.get(
          'SUPABASE_ANON_KEY',
        );

      if (
        !supabaseUrl ||
        !supabaseAnonKey
      ) {
        throw new Error(
          'Configuração do Supabase incompleta.',
        );
      }

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

      const supabase =
        createClient(
          supabaseUrl,
          supabaseAnonKey,
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
        await supabase.rpc(
          'is_staff',
        );

      if (staffError) {
        console.error(
          '[evolution-manager] staff-check',
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
       * EVOLUTION
       * =========================================
       */

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
        !evolutionApiUrl ||
        !evolutionApiKey ||
        !evolutionInstance
      ) {
        const missing: string[] = [];

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

        console.error(
          '[evolution-manager] configuração ausente:',
          missing,
        );

        throw new Error(
          `Configuração da Evolution API incompleta: ${missing.join(', ')}.`,
        );
      }

      const body =
        await req.json() as
        RequestBody;

      if (!body.action) {
        return Response.json(
          {
            success: false,

            error:
              'Ação não informada.',
          },
          {
            status: 400,

            headers:
              corsHeaders,
          },
        );
      }

      const evolutionFetch =
        async (
          path: string,
          options:
            RequestInit = {},
        ): Promise<unknown> => {

          const response =
            await fetch(
              `${evolutionApiUrl}${path}`,
              {
                ...options,

                headers: {
                  'Content-Type':
                    'application/json',

                  apikey:
                    evolutionApiKey,

                  ...(
                    options.headers ??
                    {}
                  ),
                },
              },
            );

          const text =
            await response.text();

          let data:
            unknown =
            null;

          if (text) {
            try {
              data =
                JSON.parse(
                  text,
                );
            } catch {
              data =
                text;
            }
          }

          if (!response.ok) {
            console.error(
              '[evolution-manager] provider-error',
              {
                path,
                status:
                  response.status,
                data,
              },
            );

            throw new Error(
              `Evolution API retornou HTTP ${response.status}: ${getErrorMessage(
                data,
              )}`,
            );
          }

          return data;
        };

      switch (
      body.action
      ) {
        /*
         * =====================================
         * STATUS
         * =====================================
         */

        case 'status': {
          const data =
            await evolutionFetch(
              `/instance/connectionState/${evolutionInstance}`,
              {
                method:
                  'GET',
              },
            );

          const raw =
            data as
            EvolutionStateResponse;

          const state =
            normalizeState(
              raw
                ?.instance
                ?.state
              ??
              raw
                ?.instance
                ?.status
              ??
              raw
                ?.state,
            );

          return Response.json(
            {
              instance:
                evolutionInstance,

              state,
            },
            {
              headers:
                corsHeaders,
            },
          );
        }


        /*
         * =====================================
         * CONNECT
         * =====================================
         */

        case 'connect': {
          const data =
            await evolutionFetch(
              `/instance/connect/${evolutionInstance}`,
              {
                method:
                  'GET',
              },
            );

          const raw =
            data as
            EvolutionConnectResponse;

          return Response.json(
            {
              base64:
                raw.base64
                ??
                raw.qrcode
                  ?.base64,

              code:
                raw.code
                ??
                raw.qrcode
                  ?.code,

              pairingCode:
                raw.pairingCode
                ??
                raw.qrcode
                  ?.pairingCode,
            },
            {
              headers:
                corsHeaders,
            },
          );
        }


        /*
         * =====================================
         * LOGOUT
         * =====================================
         */

        case 'logout': {
          await evolutionFetch(
            `/instance/logout/${evolutionInstance}`,
            {
              method:
                'DELETE',
            },
          );

          return Response.json(
            {
              success:
                true,
            },
            {
              headers:
                corsHeaders,
            },
          );
        }


        /*
         * =====================================
         * RESTART
         * =====================================
         */

        case 'restart': {
          /*
           * Não fazemos logout aqui.
           *
           * Logout remove a sessão do
           * WhatsApp e exige QR novamente.
           *
           * Restart deve preservar a sessão.
           */
          const data =
            await evolutionFetch(
              `/instance/restart/${evolutionInstance}`,
              {
                method:
                  'POST',
              },
            );

          return Response.json(
            {
              success:
                true,

              data,
            },
            {
              headers:
                corsHeaders,
            },
          );
        }


        /*
         * =====================================
         * SEND TEST
         * =====================================
         */

        case 'send-test': {
          if (
            !body.number
              ?.trim()
          ) {
            return Response.json(
              {
                success:
                  false,

                error:
                  'Número não informado.',
              },
              {
                status: 400,

                headers:
                  corsHeaders,
              },
            );
          }

          if (
            !body.message
              ?.trim()
          ) {
            return Response.json(
              {
                success:
                  false,

                error:
                  'Mensagem não informada.',
              },
              {
                status: 400,

                headers:
                  corsHeaders,
              },
            );
          }

          const number =
            body.number
              .replace(
                /\D/g,
                '',
              );

          if (!number) {
            return Response.json(
              {
                success:
                  false,

                error:
                  'Número inválido.',
              },
              {
                status: 400,

                headers:
                  corsHeaders,
              },
            );
          }

          const data =
            await evolutionFetch(
              `/message/sendText/${evolutionInstance}`,
              {
                method:
                  'POST',

                body:
                  JSON.stringify({
                    number,

                    text:
                      body.message
                        .trim(),
                  }),
              },
            );

          return Response.json(
            {
              success:
                true,

              data,
            },
            {
              headers:
                corsHeaders,
            },
          );
        }


        default:
          return Response.json(
            {
              success:
                false,

              error:
                'Ação inválida.',
            },
            {
              status: 400,

              headers:
                corsHeaders,
            },
          );
      }
    } catch (error) {
      console.error(
        '[evolution-manager] fatal',
        error,
      );

      return Response.json(
        {
          success:
            false,

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

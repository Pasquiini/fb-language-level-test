
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':
    '*',

  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',

  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
};

function getErrorDetails(
  error: unknown,
) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (
    typeof error === 'object' &&
    error !== null
  ) {
    const record =
      error as Record<string, unknown>;

    return {
      message:
        typeof record['message'] === 'string'
          ? record['message']
          : undefined,

      code:
        typeof record['code'] === 'string'
          ? record['code']
          : undefined,

      details:
        typeof record['details'] === 'string'
          ? record['details']
          : undefined,

      hint:
        typeof record['hint'] === 'string'
          ? record['hint']
          : undefined,

      raw: record,
    };
  }

  return {
    message: String(error),
  };
}

Deno.serve(
  async (req: Request) => {
    if (
      req.method === 'OPTIONS'
    ) {
      return new Response(
        'ok',
        {
          headers: corsHeaders,
        },
      );
    }

    try {

      const authorization =
        req.headers.get(
          'Authorization',
        );

      if (!authorization) {
        return new Response(
          JSON.stringify({
            success: false,

            error:
              'Não autenticado.',
          }),
          {
            status: 401,

            headers: {
              ...corsHeaders,

              'Content-Type':
                'application/json',
            },
          },
        );
      }
      const supabaseUrl =
        Deno.env.get(
          'SUPABASE_URL',
        );

      const serviceRoleKey =
        Deno.env.get(
          'SUPABASE_SERVICE_ROLE_KEY',
        );

      const anonKey =
        Deno.env.get(
          'SUPABASE_ANON_KEY',
        );

      const schoolWhatsapp =
        Deno.env.get(
          'FB_SCHOOL_WHATSAPP',
        );


      if (
        !supabaseUrl ||
        !serviceRoleKey ||
        !anonKey
      ) {
        const missing: string[] =
          [];

        if (!supabaseUrl) {
          missing.push(
            'SUPABASE_URL',
          );
        }

        if (!serviceRoleKey) {
          missing.push(
            'SUPABASE_SERVICE_ROLE_KEY',
          );
        }

        if (!anonKey) {
          missing.push(
            'SUPABASE_ANON_KEY',
          );
        }

        throw new Error(
          `Configuração do Supabase incompleta: ${missing.join(', ')}.`,
        );
      }


      if (!schoolWhatsapp) {
        throw new Error(
          'FB_SCHOOL_WHATSAPP não configurado.',
        );
      }

      console.log(
        '[enqueue-communications] environment',
        {
          supabaseUrl,
          hasServiceRoleKey:
            Boolean(serviceRoleKey),
          schoolWhatsappConfigured:
            Boolean(schoolWhatsapp),
        },
      );
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
          '[enqueue-communications] staff-check',
          getErrorDetails(
            staffError,
          ),
        );

        return new Response(
          JSON.stringify({
            success: false,

            error:
              'Não foi possível validar a permissão administrativa.',
          }),
          {
            status: 403,

            headers: {
              ...corsHeaders,

              'Content-Type':
                'application/json',
            },
          },
        );
      }

      if (!isStaff) {
        return new Response(
          JSON.stringify({
            success: false,

            error:
              'Acesso não autorizado.',
          }),
          {
            status: 403,

            headers: {
              ...corsHeaders,

              'Content-Type':
                'application/json',
            },
          },
        );
      }
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

      const allEventsResult =
        await supabase
          .from(
            'communication_events',
          )
          .select(
            'id, event_type, created_at',
          );

      console.log(
        '[enqueue-communications] ALL communication_events',
        {
          count:
            allEventsResult.data?.length ?? 0,
          data:
            allEventsResult.data,
          error:
            allEventsResult.error
              ? getErrorDetails(
                allEventsResult.error,
              )
              : null,
        },
      );

      const {
        data: events,
        error: eventsError,
      } =
        await supabase
          .from(
            'communication_events',
          )
          .select(
            `
        id,
        attempt_id,
        student_id,
        event_type,
        created_at
      `,
          )
          .eq(
            'event_type',
            'TEST_SUBMITTED',
          )
          .order(
            'created_at',
            {
              ascending: true,
            },
          );

      console.log(
        '[enqueue-communications] events',
        {
          count:
            events?.length ??
            0,

          events,

          eventsError:
            eventsError
              ? getErrorDetails(
                eventsError,
              )
              : null,
        },
      );

      if (eventsError) {
        console.error(
          '[enqueue-communications] eventsError',
          getErrorDetails(
            eventsError,
          ),
        );

        return new Response(
          JSON.stringify({
            success: false,
            stage:
              'load-events',
            error:
              getErrorDetails(
                eventsError,
              ),
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type':
                'application/json',
            },
          },
        );
      }

      let processed = 0;
      let skipped = 0;

      const results = [];

      for (
        const event of
        events ?? []
      ) {
        console.log(
          '[enqueue-communications] processing-event',
          {
            eventId:
              event.id,
            attemptId:
              event.attempt_id,
            studentId:
              event.student_id,
          },
        );

        const {
          data:
          existingMessages,
          error:
          messagesError,
        } =
          await supabase
            .from(
              'communication_messages',
            )
            .select(
              'id, recipient_type, status',
            )
            .eq(
              'event_id',
              event.id,
            );

        if (
          messagesError
        ) {
          const details =
            getErrorDetails(
              messagesError,
            );

          console.error(
            '[enqueue-communications] messagesError',
            {
              eventId:
                event.id,

              error:
                details,
            },
          );

          results.push({
            eventId:
              event.id,

            success:
              false,

            stage:
              'check-existing-messages',

            error:
              details,
          });

          continue;
        }

        console.log(
          '[enqueue-communications] existing-messages',
          {
            eventId:
              event.id,

            count:
              existingMessages
                ?.length ??
              0,

            existingMessages,
          },
        );

        const hasStudent =
          existingMessages
            ?.some(
              (
                message,
              ) =>
                message
                  .recipient_type ===
                'student',
            ) ??
          false;

        const hasSchool =
          existingMessages
            ?.some(
              (
                message,
              ) =>
                message
                  .recipient_type ===
                'school',
            ) ??
          false;

        if (
          hasStudent &&
          hasSchool
        ) {
          skipped++;

          console.log(
            '[enqueue-communications] skipped',
            {
              eventId:
                event.id,

              reason:
                'Mensagens já preparadas.',
            },
          );

          results.push({
            eventId:
              event.id,

            success:
              true,

            skipped:
              true,

            reason:
              'Mensagens já preparadas.',
          });

          continue;
        }

        console.log(
          '[enqueue-communications] calling-rpc',
          {
            eventId:
              event.id,

            schoolWhatsapp,
          },
        );

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
            },
          );

        if (
          enqueueError
        ) {
          const details =
            getErrorDetails(
              enqueueError,
            );

          console.error(
            '[enqueue-communications] enqueueError',
            {
              eventId:
                event.id,

              attemptId:
                event
                  .attempt_id,

              studentId:
                event
                  .student_id,

              error:
                details,
            },
          );

          results.push({
            eventId:
              event.id,

            attemptId:
              event
                .attempt_id,

            success:
              false,

            stage:
              'enqueue-rpc',

            error:
              details,
          });

          continue;
        }

        console.log(
          '[enqueue-communications] rpc-success',
          {
            eventId:
              event.id,

            data:
              enqueueData,
          },
        );

        processed++;

        results.push({
          eventId:
            event.id,

          attemptId:
            event
              .attempt_id,

          success:
            true,

          data:
            enqueueData,
        });
      }

      console.log(
        '[enqueue-communications] completed',
        {
          totalEvents:
            events?.length ??
            0,

          processed,

          skipped,

          results,
        },
      );

      return new Response(
        JSON.stringify({
          success: true,

          totalEvents:
            events?.length ??
            0,

          processed,

          skipped,

          results,
        }),
        {
          status: 200,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        },
      );
    } catch (error) {
      const details =
        getErrorDetails(
          error,
        );

      console.error(
        '[enqueue-communications] fatal',
        details,
      );
      const authorization =
        req.headers.get(
          'Authorization',
        );

      if (!authorization) {
        return new Response(
          JSON.stringify({
            success: false,

            error:
              'Não autenticado.',
          }),
          {
            status: 401,

            headers: {
              ...corsHeaders,

              'Content-Type':
                'application/json',
            },
          },
        );
      }
      return new Response(
        JSON.stringify({
          success: false,

          stage:
            'fatal',

          error:
            details,
        }),
        {
          status: 500,

          headers: {
            ...corsHeaders,

            'Content-Type':
              'application/json',
          },
        },
      );

    }
  },
);

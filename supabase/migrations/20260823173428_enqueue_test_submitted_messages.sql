-- FB Language Center
-- Migration: enqueue_test_submitted_messages
--
-- Purpose:
--   Create two outbound WhatsApp messages for TEST_SUBMITTED:
--   one for the student and one for the school.
--
-- Security:
--   The school WhatsApp number is supplied by a trusted backend/Edge Function,
--   ideally from a Supabase Secret such as FB_SCHOOL_WHATSAPP.
--
-- Idempotency:
--   TEST_SUBMITTED:STUDENT:<attempt_id>
--   TEST_SUBMITTED:SCHOOL:<attempt_id>

begin;

create or replace function public.enqueue_test_submitted_messages(
  p_event_id uuid,
  p_school_whatsapp text
)
returns table(
  message_id uuid,
  recipient_type text,
  status text
)
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_event public.communication_events%rowtype;
  v_student_name text;
  v_student_whatsapp text;
  v_student_message text;
  v_school_message text;
begin
  if p_event_id is null then
    raise exception
      'Evento de comunicação não informado.'
      using errcode = '22023';
  end if;

  if p_school_whatsapp is null
     or btrim(p_school_whatsapp) = '' then
    raise exception
      'WhatsApp da escola não informado.'
      using errcode = '22023';
  end if;

  select
    ce.*
  into
    v_event
  from
    public.communication_events ce
  where
    ce.id = p_event_id
  for update;

  if not found then
    raise exception
      'Evento de comunicação não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_event.event_type <> 'TEST_SUBMITTED' then
    raise exception
      'O evento informado não é TEST_SUBMITTED.'
      using errcode = '22023';
  end if;

  if v_event.attempt_id is null then
    raise exception
      'O evento não possui tentativa vinculada.'
      using errcode = 'P0001';
  end if;

  if v_event.student_id is null then
    raise exception
      'O evento não possui aluno vinculado.'
      using errcode = 'P0001';
  end if;

  select
    p.full_name,
    p.whatsapp
  into
    v_student_name,
    v_student_whatsapp
  from
    public.profiles p
  where
    p.id = v_event.student_id;

  if not found then
    raise exception
      'Perfil do aluno não encontrado.'
      using errcode = 'P0002';
  end if;

  if v_student_whatsapp is null
     or btrim(v_student_whatsapp) = '' then
    raise exception
      'O aluno não possui WhatsApp cadastrado.'
      using errcode = 'P0001';
  end if;

  v_student_message :=
    format(
      'Olá, %s! Recebemos sua avaliação de inglês com sucesso. '
      || 'Seu teste agora está sendo analisado pela equipe da FB Language Center. '
      || 'Assim que a avaliação for concluída, entraremos em contato com o resultado.',
      v_student_name
    );

  v_school_message :=
    format(
      'Nova avaliação aguardando revisão. '
      || 'Aluno: %s. '
      || 'Status: Aguardando análise. '
      || 'Acesse o painel administrativo para revisar.',
      v_student_name
    );

  insert into public.communication_messages (
    event_id,
    attempt_id,
    student_id,
    channel,
    recipient_type,
    recipient,
    message_body,
    status,
    provider,
    idempotency_key,
    attempt_count
  )
  values (
    v_event.id,
    v_event.attempt_id,
    v_event.student_id,
    'whatsapp',
    'student',
    v_student_whatsapp,
    v_student_message,
    'pending',
    null,
    'TEST_SUBMITTED:STUDENT:' || v_event.attempt_id::text,
    0
  )
  on conflict (idempotency_key)
  do nothing;

  insert into public.communication_messages (
    event_id,
    attempt_id,
    student_id,
    channel,
    recipient_type,
    recipient,
    message_body,
    status,
    provider,
    idempotency_key,
    attempt_count
  )
  values (
    v_event.id,
    v_event.attempt_id,
    v_event.student_id,
    'whatsapp',
    'school',
    p_school_whatsapp,
    v_school_message,
    'pending',
    null,
    'TEST_SUBMITTED:SCHOOL:' || v_event.attempt_id::text,
    0
  )
  on conflict (idempotency_key)
  do nothing;

  return query
  select
    cm.id,
    cm.recipient_type,
    cm.status
  from
    public.communication_messages cm
  where
    cm.event_id = v_event.id
    and cm.idempotency_key in (
      'TEST_SUBMITTED:STUDENT:' || v_event.attempt_id::text,
      'TEST_SUBMITTED:SCHOOL:' || v_event.attempt_id::text
    )
  order by
    cm.recipient_type;
end;
$function$;

revoke all on function public.enqueue_test_submitted_messages(uuid, text)
from public;

revoke all on function public.enqueue_test_submitted_messages(uuid, text)
from anon;

revoke all on function public.enqueue_test_submitted_messages(uuid, text)
from authenticated;

grant execute on function public.enqueue_test_submitted_messages(uuid, text)
to service_role;

commit;

-- =========================================================
-- FB LANGUAGE CENTER
-- Fechamento do módulo administrativo de avaliações
-- =========================================================


-- ---------------------------------------------------------
-- Observações pedagógicas do professor
-- ---------------------------------------------------------

alter table public.test_results
add column if not exists review_notes text;


-- ---------------------------------------------------------
-- Idempotência de eventos
-- ---------------------------------------------------------

create unique index if not exists
  communication_events_attempt_event_type_uidx
on public.communication_events (
  attempt_id,
  event_type
);


-- ---------------------------------------------------------
-- Idempotência das mensagens
-- ---------------------------------------------------------

create unique index if not exists
  communication_messages_idempotency_key_uidx
on public.communication_messages (
  idempotency_key
);


-- =========================================================
-- COMPLETE TEST REVIEW
-- =========================================================

create or replace function public.complete_test_review(
  p_attempt_id uuid,
  p_speaking_score numeric,
  p_estimated_level text,
  p_review_notes text default null
)
returns table (
  attempt_id uuid,
  status text,
  speaking_score numeric,
  estimated_level text,
  event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.test_attempts%rowtype;
  v_event_id uuid;
begin

  if p_attempt_id is null then
    raise exception
      'attempt_id é obrigatório';
  end if;

  if p_speaking_score is null then
    raise exception
      'speaking_score é obrigatório';
  end if;

  if p_speaking_score < 0 then
    raise exception
      'speaking_score inválido';
  end if;

  if
    p_estimated_level is null
    or trim(p_estimated_level) = ''
    or lower(trim(p_estimated_level)) =
      'pendente'
  then
    raise exception
      'estimated_level final é obrigatório';
  end if;


  select *
  into v_attempt
  from public.test_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception
      'Tentativa não encontrada';
  end if;


  if v_attempt.status not in (
    'under_review',
    'completed'
  ) then
    raise exception
      'A tentativa não está disponível para conclusão';
  end if;


  if not exists (
    select 1
    from public.test_results
    where attempt_id = p_attempt_id
  ) then
    raise exception
      'Resultado da tentativa não encontrado';
  end if;


  update public.test_results
  set
    speaking_score =
      p_speaking_score,

    estimated_level =
      upper(
        trim(
          p_estimated_level
        )
      ),

    review_notes =
      nullif(
        trim(
          coalesce(
            p_review_notes,
            ''
          )
        ),
        ''
      )
  where attempt_id =
    p_attempt_id;


  update public.test_attempts
  set
    status =
      'completed',

    updated_at =
      now()
  where id =
    p_attempt_id;


  insert into public.communication_events (
    attempt_id,
    student_id,
    event_type,
    payload,
    created_by
  )
  values (
    p_attempt_id,

    v_attempt.student_id,

    'TEST_COMPLETED',

    jsonb_build_object(
      'status',
      'completed',

      'test_id',
      v_attempt.test_id,

      'speaking_score',
      p_speaking_score,

      'estimated_level',
      upper(
        trim(
          p_estimated_level
        )
      )
    ),

    null
  )
  on conflict (
    attempt_id,
    event_type
  )
  do update
  set
    payload =
      excluded.payload;


  select id
  into v_event_id
  from public.communication_events
  where
    communication_events.attempt_id =
      p_attempt_id

    and event_type =
      'TEST_COMPLETED'
  limit 1;


  return query
  select
    p_attempt_id,

    'completed'::text,

    p_speaking_score,

    upper(
      trim(
        p_estimated_level
      )
    ),

    v_event_id;

end;
$$;


revoke all
on function public.complete_test_review(
  uuid,
  numeric,
  text,
  text
)
from public;

revoke all
on function public.complete_test_review(
  uuid,
  numeric,
  text,
  text
)
from anon;

revoke all
on function public.complete_test_review(
  uuid,
  numeric,
  text,
  text
)
from authenticated;

grant execute
on function public.complete_test_review(
  uuid,
  numeric,
  text,
  text
)
to service_role;


-- =========================================================
-- ENQUEUE TEST COMPLETED
-- =========================================================

create or replace function public.enqueue_test_completed_message(
  p_event_id uuid
)
returns table (
  message_id uuid,
  recipient_type text,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.communication_events%rowtype;

  v_student_name text;
  v_student_whatsapp text;

  v_level text;

  v_message_body text;

  v_message_id uuid;
begin

  select *
  into v_event
  from public.communication_events
  where id = p_event_id;

  if not found then
    raise exception
      'Evento não encontrado';
  end if;


  if v_event.event_type <>
    'TEST_COMPLETED'
  then
    raise exception
      'Evento inválido para esta operação';
  end if;


  select
    full_name,
    whatsapp
  into
    v_student_name,
    v_student_whatsapp
  from public.profiles
  where id =
    v_event.student_id;


  if
    v_student_whatsapp is null
    or trim(v_student_whatsapp) = ''
  then
    raise exception
      'Aluno sem WhatsApp cadastrado';
  end if;


  v_level =
    coalesce(
      v_event.payload
        ->> 'estimated_level',
      ''
    );


  v_message_body =
    'Olá, '
    ||
    coalesce(
      nullif(
        trim(
          v_student_name
        ),
        ''
      ),
      'aluno'
    )
    ||
    '! Sua avaliação de inglês na FB Language Center foi concluída.'
    ||
    case
      when v_level <> ''
      then
        ' O nível definido na avaliação foi '
        || v_level
        || '.'
      else
        ''
    end
    ||
    ' Nossa equipe seguirá com as orientações dos próximos passos.';


  insert into public.communication_messages (
    event_id,
    attempt_id,
    student_id,

    channel,

    recipient_type,
    recipient,

    message_body,

    status,

    idempotency_key,

    attempt_count,

    created_at,
    updated_at
  )
  values (
    v_event.id,

    v_event.attempt_id,

    v_event.student_id,

    'whatsapp',

    'student',

    v_student_whatsapp,

    v_message_body,

    'pending',

    'TEST_COMPLETED:STUDENT:'
      || v_event.attempt_id::text,

    0,

    now(),
    now()
  )
  on conflict (
    idempotency_key
  )
  do nothing;


  select id
  into v_message_id
  from public.communication_messages
  where
    idempotency_key =
      'TEST_COMPLETED:STUDENT:'
      || v_event.attempt_id::text
  limit 1;


  return query
  select
    v_message_id,
    'student'::text,
    (
      select
        communication_messages.status
      from public.communication_messages
      where id = v_message_id
    );

end;
$$;


revoke all
on function public.enqueue_test_completed_message(
  uuid
)
from public;

revoke all
on function public.enqueue_test_completed_message(
  uuid
)
from anon;

revoke all
on function public.enqueue_test_completed_message(
  uuid
)
from authenticated;

grant execute
on function public.enqueue_test_completed_message(
  uuid
)
to service_role;

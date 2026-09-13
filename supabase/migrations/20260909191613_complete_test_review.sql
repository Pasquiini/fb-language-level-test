-- =========================================================
-- FB Language Center
-- Finalização pedagógica de uma avaliação
-- =========================================================


-- ---------------------------------------------------------
-- Garante idempotência dos eventos de ciclo de vida
-- ---------------------------------------------------------

create unique index if not exists
  communication_events_attempt_event_type_uidx
on public.communication_events (
  attempt_id,
  event_type
);


-- ---------------------------------------------------------
-- RPC:
-- complete_test_review
--
-- Responsabilidade:
-- - receber a nota de Speaking
-- - receber o nível final definido pelo professor
-- - atualizar test_results
-- - marcar test_attempts como completed
-- - criar TEST_COMPLETED
--
-- Importante:
-- esta função NÃO calcula CEFR.
-- ---------------------------------------------------------

create or replace function public.complete_test_review(
  p_attempt_id uuid,
  p_speaking_score numeric,
  p_estimated_level text
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
  v_result public.test_results%rowtype;
  v_event_id uuid;
begin

  -- -------------------------------------------------------
  -- Validações básicas
  -- -------------------------------------------------------

  if p_attempt_id is null then
    raise exception
      'attempt_id é obrigatório';
  end if;

  if p_speaking_score is null then
    raise exception
      'speaking_score é obrigatório';
  end if;

  if
    p_estimated_level is null
    or trim(p_estimated_level) = ''
    or lower(trim(p_estimated_level)) = 'pendente'
  then
    raise exception
      'estimated_level final é obrigatório';
  end if;


  -- -------------------------------------------------------
  -- Busca e bloqueia a tentativa
  -- -------------------------------------------------------

  select *
  into v_attempt
  from public.test_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception
      'Tentativa não encontrada';
  end if;


  -- -------------------------------------------------------
  -- Só permite concluir avaliações que passaram pela
  -- submissão e revisão
  -- -------------------------------------------------------

  if v_attempt.status not in (
    'under_review',
    'completed'
  ) then
    raise exception
      'A tentativa não está disponível para conclusão';
  end if;


  -- -------------------------------------------------------
  -- Busca resultado existente
  -- -------------------------------------------------------

  select *
  into v_result
  from public.test_results
  where test_results.attempt_id =
    p_attempt_id
  for update;

  if not found then
    raise exception
      'Resultado da tentativa não encontrado';
  end if;


  -- -------------------------------------------------------
  -- Atualiza avaliação pedagógica
  -- -------------------------------------------------------

  update public.test_results
  set
    speaking_score =
      p_speaking_score,

    estimated_level =
      trim(p_estimated_level),

    updated_at =
      now()
  where test_results.attempt_id =
    p_attempt_id;


  -- -------------------------------------------------------
  -- Marca tentativa como concluída
  -- -------------------------------------------------------

  update public.test_attempts
  set
    status = 'completed',

    updated_at = now()
  where id = p_attempt_id;


  -- -------------------------------------------------------
  -- Cria evento TEST_COMPLETED
  --
  -- ON CONFLICT mantém a operação idempotente.
  -- -------------------------------------------------------

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
      trim(p_estimated_level)
    ),

    null
  )
  on conflict (
    attempt_id,
    event_type
  )
  do nothing;


  -- -------------------------------------------------------
  -- Recupera evento, novo ou já existente
  -- -------------------------------------------------------

  select id
  into v_event_id
  from public.communication_events
  where
    communication_events.attempt_id =
      p_attempt_id
    and event_type =
      'TEST_COMPLETED'
  limit 1;


  -- -------------------------------------------------------
  -- Retorno
  -- -------------------------------------------------------

  return query
  select
    p_attempt_id,
    'completed'::text,
    p_speaking_score,
    trim(p_estimated_level),
    v_event_id;

end;
$$;


-- ---------------------------------------------------------
-- Backend only por enquanto
-- ---------------------------------------------------------

revoke all
on function public.complete_test_review(
  uuid,
  numeric,
  text
)
from public;

revoke all
on function public.complete_test_review(
  uuid,
  numeric,
  text
)
from anon;

revoke all
on function public.complete_test_review(
  uuid,
  numeric,
  text
)
from authenticated;

grant execute
on function public.complete_test_review(
  uuid,
  numeric,
  text
)
to service_role;

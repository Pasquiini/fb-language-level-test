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
    where attempt_id =
      p_attempt_id
  ) then
    raise exception
      'Resultado da tentativa não encontrado';
  end if;

  update public.test_results
  set
    speaking_score =
      p_speaking_score,

    estimated_level =
      trim(
        p_estimated_level
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
      trim(
        p_estimated_level
      )
    ),

    null
  )
  on conflict (
    attempt_id,
    event_type
  )
  do nothing;

  select id
  into v_event_id
  from public.communication_events
  where
    attempt_id =
      p_attempt_id
    and event_type =
      'TEST_COMPLETED'
  limit 1;

  return query
  select
    p_attempt_id,
    'completed'::text,
    p_speaking_score,
    trim(
      p_estimated_level
    ),
    v_event_id;
end;
$$;

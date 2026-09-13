create or replace function
  public.complete_test_review(
    p_attempt_id uuid,
    p_speaking_score numeric,
    p_estimated_level text,
    p_review_notes text default null
  )
returns table(
  attempt_id uuid,
  status text,
  speaking_score numeric,
  estimated_level text,
  event_id uuid
)
language plpgsql
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column

declare
  v_attempt
    public.test_attempts%rowtype;

  v_event_id
    uuid;

  v_final_level
    text;

begin
  /*
   * ----------------------------------------
   * 1. Validação
   * ----------------------------------------
   */

  if p_attempt_id is null then
    raise exception
      'attempt_id é obrigatório'
      using errcode = '22023';
  end if;

  /*
   * Speaking é uma avaliação qualitativa
   * nesta versão.
   *
   * Mantemos speaking_score no schema
   * para compatibilidade e possível
   * rubrica futura, mas ele pode ser NULL.
   */
  if
    p_speaking_score is not null
    and p_speaking_score < 0
  then
    raise exception
      'speaking_score inválido'
      using errcode = '22023';
  end if;

  if
    p_estimated_level is null
    or btrim(
      p_estimated_level
    ) = ''
    or lower(
      btrim(
        p_estimated_level
      )
    ) = 'pendente'
  then
    raise exception
      'estimated_level final é obrigatório'
      using errcode = '22023';
  end if;

  v_final_level :=
    upper(
      btrim(
        p_estimated_level
      )
    );

  /*
   * Impede valores arbitrários fora
   * da escala CEFR utilizada pelo projeto.
   */
  if
    v_final_level not in (
      'A1',
      'A2',
      'B1',
      'B2',
      'C1',
      'C2'
    )
  then
    raise exception
      'estimated_level inválido'
      using errcode = '22023';
  end if;


  /*
   * ----------------------------------------
   * 2. Tentativa
   * ----------------------------------------
   */

  select
    ta.*
  into
    v_attempt
  from
    public.test_attempts ta
  where
    ta.id =
      p_attempt_id
  for update;

  if not found then
    raise exception
      'Tentativa não encontrada'
      using errcode = 'P0002';
  end if;

  if
    v_attempt.status not in (
      'under_review',
      'completed'
    )
  then
    raise exception
      'A tentativa não está disponível para conclusão'
      using errcode = 'P0001';
  end if;


  /*
   * ----------------------------------------
   * 3. Resultado existente
   * ----------------------------------------
   */

  if not exists (
    select
      1
    from
      public.test_results tr
    where
      tr.attempt_id =
        p_attempt_id
  ) then
    raise exception
      'Resultado da tentativa não encontrado'
      using errcode = 'P0002';
  end if;


  /*
   * ----------------------------------------
   * 4. Resultado pedagógico
   * ----------------------------------------
   */

  update
    public.test_results tr
  set
    speaking_score =
      p_speaking_score,

    estimated_level =
      v_final_level,

    review_notes =
      nullif(
        btrim(
          coalesce(
            p_review_notes,
            ''
          )
        ),
        ''
      )
  where
    tr.attempt_id =
      p_attempt_id;


  /*
   * ----------------------------------------
   * 5. Conclusão da tentativa
   * ----------------------------------------
   */

  update
    public.test_attempts ta
  set
    status =
      'completed',

    completed_at =
      coalesce(
        ta.completed_at,
        now()
      ),

    updated_at =
      now()
  where
    ta.id =
      p_attempt_id;


  /*
   * ----------------------------------------
   * 6. Evento TEST_COMPLETED
   * ----------------------------------------
   */

  insert into
    public.communication_events (
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
      v_final_level
    ),

    null
  )
  on conflict (
    attempt_id,
    event_type
  )
  where
    attempt_id is not null
    and event_type in (
      'TEST_SUBMITTED',
      'TEST_COMPLETED'
    )
  do update
  set
    payload =
      excluded.payload;


  /*
   * ----------------------------------------
   * 7. Recupera evento
   * ----------------------------------------
   */

  select
    ce.id
  into
    v_event_id
  from
    public.communication_events ce
  where
    ce.attempt_id =
      p_attempt_id
    and ce.event_type =
      'TEST_COMPLETED'
  order by
    ce.created_at desc
  limit 1;

  if v_event_id is null then
    raise exception
      'Evento TEST_COMPLETED não foi encontrado após a conclusão'
      using errcode = 'P0002';
  end if;


  /*
   * ----------------------------------------
   * 8. Retorno
   * ----------------------------------------
   */

  return query
  select
    p_attempt_id
      as attempt_id,

    'completed'::text
      as status,

    p_speaking_score
      as speaking_score,

    v_final_level
      as estimated_level,

    v_event_id
      as event_id;

end;
$function$;

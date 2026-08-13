/*
 * Finalização segura do teste.
 *
 * Responsabilidades:
 *
 * - validar usuário e propriedade da tentativa;
 * - exigir todas as respostas objetivas;
 * - exigir todas as respostas de Speaking;
 * - corrigir Grammar + Listening no PostgreSQL;
 * - nunca retornar is_correct;
 * - preencher awarded_points;
 * - calcular objective_score;
 * - calcular percentage;
 * - criar/atualizar test_results;
 * - marcar tentativa como under_review;
 * - tornar a operação idempotente.
 */


create or replace function public.finalize_test_attempt(
  p_attempt_id uuid
)
returns table (
  attempt_id uuid,
  status public.attempt_status,
  objective_score numeric,
  percentage numeric,
  estimated_level text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;

  v_attempt public.test_attempts%rowtype;

  v_required_objective_count integer;
  v_answered_objective_count integer;

  v_required_speaking_count integer;
  v_answered_speaking_count integer;

  v_objective_score numeric(8, 2);
  v_objective_max numeric(8, 2);
  v_percentage numeric(5, 2);

  v_estimated_level text :=
    'Pendente';
begin
  /*
   * =========================================================
   * Autenticação
   * =========================================================
   */

  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  if p_attempt_id is null then
    raise exception
      'Tentativa não informada.'
      using errcode = '22023';
  end if;


  /*
   * =========================================================
   * Tentativa
   * =========================================================
   */

  select
    ta.*
  into
    v_attempt
  from
    public.test_attempts ta
  where
    ta.id = p_attempt_id
  for update;

  if not found then
    raise exception
      'Tentativa não encontrada.'
      using errcode = 'P0002';
  end if;


  if
    v_attempt.student_id <>
    v_user_id
  then
    raise exception
      'Você não possui acesso a esta tentativa.'
      using errcode = '42501';
  end if;


  /*
   * =========================================================
   * Idempotência
   * =========================================================
   *
   * Se a tentativa já foi enviada anteriormente,
   * não corrigimos tudo novamente.
   *
   * Apenas devolvemos o resultado existente.
   *
   * Isso será especialmente útil em:
   *
   * /teste/processando
   *
   * caso o usuário atualize a página.
   */

  if
    v_attempt.status in (
      'submitted'::public.attempt_status,
      'under_review'::public.attempt_status,
      'completed'::public.attempt_status
    )
  then
    return query
    select
      tr.attempt_id,
      v_attempt.status,
      tr.objective_score,
      tr.percentage,
      tr.estimated_level
    from
      public.test_results tr
    where
      tr.attempt_id =
        p_attempt_id;

    return;
  end if;


  /*
   * Somente tentativas em andamento
   * podem chegar aqui.
   */

  if
    v_attempt.status <>
      'in_progress'::public.attempt_status
    or v_attempt.submitted_at is not null
    or v_attempt.completed_at is not null
  then
    raise exception
      'Esta tentativa não pode ser finalizada.'
      using errcode = 'P0001';
  end if;


  /*
   * =========================================================
   * Quantidade de questões objetivas exigidas
   * =========================================================
   *
   * Não hardcodamos 23.
   *
   * Consultamos as questões ativas do teste.
   */

  select
    count(*)
  into
    v_required_objective_count
  from
    public.questions q
  inner join
    public.test_sections ts
      on ts.id = q.section_id
  where
    ts.test_id =
      v_attempt.test_id
    and q.is_active = true
    and q.category::text in (
      'grammar',
      'listening'
    );


  /*
   * Quantidade efetivamente respondida.
   *
   * Também confirmamos novamente que:
   *
   * selected_option_id existe
   * +
   * pertence à mesma question_id.
   *
   * Isso protege inclusive dados antigos que
   * tenham sido gravados antes da RPC segura.
   */

  select
    count(*)
  into
    v_answered_objective_count
  from
    public.test_answers ta
  inner join
    public.questions q
      on q.id = ta.question_id
  inner join
    public.test_sections ts
      on ts.id = q.section_id
  inner join
    public.question_options qo
      on qo.id =
        ta.selected_option_id
      and qo.question_id =
        ta.question_id
  where
    ta.attempt_id =
      p_attempt_id
    and ts.test_id =
      v_attempt.test_id
    and q.is_active = true
    and q.category::text in (
      'grammar',
      'listening'
    );


  if
    v_answered_objective_count <>
    v_required_objective_count
  then
    raise exception
      'Ainda existem questões de Grammar ou Listening sem resposta.'
      using errcode = 'P0001';
  end if;


  /*
   * =========================================================
   * Speaking obrigatório
   * =========================================================
   */

  select
    count(*)
  into
    v_required_speaking_count
  from
    public.questions q
  inner join
    public.test_sections ts
      on ts.id = q.section_id
  where
    ts.test_id =
      v_attempt.test_id
    and q.is_active = true
    and q.type::text =
      'speaking';


  select
    count(*)
  into
    v_answered_speaking_count
  from
    public.speaking_answers sa
  inner join
    public.questions q
      on q.id =
        sa.question_id
  inner join
    public.test_sections ts
      on ts.id =
        q.section_id
  where
    sa.attempt_id =
      p_attempt_id
    and ts.test_id =
      v_attempt.test_id
    and q.is_active = true
    and q.type::text =
      'speaking';


  if
    v_answered_speaking_count <>
    v_required_speaking_count
  then
    raise exception
      'Ainda existem atividades de Speaking sem gravação.'
      using errcode = 'P0001';
  end if;


  /*
   * =========================================================
   * Correção objetiva
   * =========================================================
   *
   * Esta é a única etapa que consulta is_correct.
   *
   * Tudo acontece dentro do PostgreSQL.
   *
   * O browser nunca recebe essa informação.
   */

  update
    public.test_answers ta
  set
    awarded_points =
      case
        when qo.is_correct
          then q.points
        else 0
      end,

    updated_at =
      now()
  from
    public.questions q,

    public.test_sections ts,

    public.question_options qo
  where
    ta.attempt_id =
      p_attempt_id

    and q.id =
      ta.question_id

    and ts.id =
      q.section_id

    and ts.test_id =
      v_attempt.test_id

    and qo.id =
      ta.selected_option_id

    and qo.question_id =
      ta.question_id

    and q.is_active = true

    and q.category::text in (
      'grammar',
      'listening'
    );


  /*
   * =========================================================
   * Pontuação obtida
   * =========================================================
   */

  select
    coalesce(
      sum(
        ta.awarded_points
      ),
      0
    )
  into
    v_objective_score
  from
    public.test_answers ta
  inner join
    public.questions q
      on q.id =
        ta.question_id
  inner join
    public.test_sections ts
      on ts.id =
        q.section_id
  where
    ta.attempt_id =
      p_attempt_id
    and ts.test_id =
      v_attempt.test_id
    and q.is_active = true
    and q.category::text in (
      'grammar',
      'listening'
    );


  /*
   * Pontuação máxima objetiva.
   */

  select
    coalesce(
      sum(
        q.points
      ),
      0
    )
  into
    v_objective_max
  from
    public.questions q
  inner join
    public.test_sections ts
      on ts.id =
        q.section_id
  where
    ts.test_id =
      v_attempt.test_id
    and q.is_active = true
    and q.category::text in (
      'grammar',
      'listening'
    );


  if
    v_objective_max <= 0
  then
    raise exception
      'A pontuação máxima do teste é inválida.'
      using errcode = 'P0001';
  end if;


  v_percentage :=
    round(
      (
        v_objective_score /
        v_objective_max
      ) * 100,
      2
    );


  /*
   * =========================================================
   * Resultado
   * =========================================================
   *
   * speaking_score fica NULL enquanto
   * a professora não avaliar o Speaking.
   *
   * total_score representa, por enquanto,
   * somente a pontuação já consolidada.
   *
   * A fórmula final será atualizada quando
   * o Speaking for avaliado.
   *
   * estimated_level fica Pendente até
   * definirmos explicitamente a regra
   * Grammar + Listening -> CEFR.
   */

  insert into
    public.test_results (
      attempt_id,
      objective_score,
      speaking_score,
      total_score,
      percentage,
      estimated_level,
      summary,
      recommendation,
      ai_analysis,
      generated_at
    )
  values (
    p_attempt_id,
    v_objective_score,
    null,
    v_objective_score,
    v_percentage,
    v_estimated_level,
    'Pontuação objetiva calculada. Speaking aguardando avaliação pedagógica.',
    null,
    null,
    now()
  )
  on conflict (
    attempt_id
  )
  do update
  set
    objective_score =
      excluded.objective_score,

    speaking_score =
      null,

    total_score =
      excluded.total_score,

    percentage =
      excluded.percentage,

    estimated_level =
      excluded.estimated_level,

    summary =
      excluded.summary,

    recommendation =
      null,

    ai_analysis =
      null,

    generated_at =
      now();


  /*
   * =========================================================
   * Estado da tentativa
   * =========================================================
   *
   * O aluno terminou a prova, mas o Speaking
   * ainda requer avaliação pedagógica.
   *
   * Portanto:
   *
   * submitted_at = agora
   * status = under_review
   * completed_at continua NULL
   */

  update
    public.test_attempts
  set
    status =
      'under_review'::public.attempt_status,

    submitted_at =
      now(),

    updated_at =
      now()
  where
    id =
      p_attempt_id;


  /*
   * =========================================================
   * Retorno seguro
   * =========================================================
   *
   * Nada de:
   *
   * is_correct
   * alternativa correta
   * resposta por questão
   */

  return query
  select
    tr.attempt_id,
    'under_review'::public.attempt_status,
    tr.objective_score,
    tr.percentage,
    tr.estimated_level
  from
    public.test_results tr
  where
    tr.attempt_id =
      p_attempt_id;
end;
$$;


/*
 * =========================================================
 * Permissões da RPC
 * =========================================================
 */

revoke all
on function public.finalize_test_attempt(
  uuid
)
from public;

revoke all
on function public.finalize_test_attempt(
  uuid
)
from anon;

grant execute
on function public.finalize_test_attempt(
  uuid
)
to authenticated;

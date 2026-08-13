/*
 * Segurança das respostas objetivas do teste.
 *
 * Objetivos:
 *
 * 1. impedir INSERT/UPDATE direto pelo navegador;
 * 2. salvar respostas somente por RPC;
 * 3. validar que a tentativa pertence ao usuário;
 * 4. validar que a tentativa ainda está em andamento;
 * 5. validar que a questão pertence ao teste da tentativa;
 * 6. validar que a alternativa pertence à questão;
 * 7. não acessar nem retornar is_correct;
 * 8. manter SELECT para recuperação de progresso.
 */


/*
 * =========================================================
 * RPC: save_test_answer
 * =========================================================
 */

create or replace function public.save_test_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_option_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;

  v_attempt public.test_attempts%rowtype;

  v_question_test_id uuid;
begin
  /*
   * Usuário autenticado atual.
   *
   * Sessões anônimas do Supabase também executam
   * como authenticated depois do signInAnonymously().
   */
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';
  end if;


  /*
   * Não aceitamos parâmetros nulos.
   */
  if p_attempt_id is null then
    raise exception
      'Tentativa não informada.'
      using errcode = '22023';
  end if;

  if p_question_id is null then
    raise exception
      'Questão não informada.'
      using errcode = '22023';
  end if;

  if p_selected_option_id is null then
    raise exception
      'Alternativa não informada.'
      using errcode = '22023';
  end if;


  /*
   * Busca e bloqueia a tentativa durante a operação.
   *
   * FOR UPDATE ajuda a evitar que o estado da tentativa
   * seja alterado simultaneamente enquanto a resposta
   * está sendo validada e salva.
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


  /*
   * A tentativa deve pertencer ao usuário autenticado.
   */
  if v_attempt.student_id <> v_user_id then
    raise exception
      'Você não possui acesso a esta tentativa.'
      using errcode = '42501';
  end if;


  /*
   * A tentativa precisa continuar aberta.
   *
   * Agora conhecemos o valor real do enum:
   * in_progress.
   */
  if
    v_attempt.status <>
      'in_progress'::public.attempt_status
    or v_attempt.submitted_at is not null
    or v_attempt.completed_at is not null
  then
    raise exception
      'Esta tentativa não aceita mais respostas.'
      using errcode = 'P0001';
  end if;


  /*
   * Descobre a qual teste a questão pertence:
   *
   * questions
   *   -> test_sections
   *   -> tests
   *
   * Também exigimos que a questão esteja ativa.
   */
  select
    ts.test_id
  into
    v_question_test_id
  from
    public.questions q
  inner join
    public.test_sections ts
      on ts.id = q.section_id
  where
    q.id = p_question_id
    and q.is_active = true;

  if not found then
    raise exception
      'Questão não encontrada ou indisponível.'
      using errcode = 'P0002';
  end if;


  /*
   * A questão precisa pertencer exatamente
   * ao teste da tentativa.
   */
  if
    v_question_test_id <>
    v_attempt.test_id
  then
    raise exception
      'A questão não pertence a esta tentativa.'
      using errcode = '42501';
  end if;


  /*
   * A FK de selected_option_id garante apenas
   * que a alternativa existe.
   *
   * Aqui fazemos a validação que faltava:
   *
   * selected_option_id
   * realmente pertence
   * a p_question_id?
   */
  if not exists (
    select
      1
    from
      public.question_options qo
    where
      qo.id =
        p_selected_option_id
      and qo.question_id =
        p_question_id
  ) then
    raise exception
      'A alternativa não pertence à questão informada.'
      using errcode = '22023';
  end if;


  /*
   * UPSERT seguro.
   *
   * UNIQUE:
   * attempt_id,
   * question_id
   *
   * Portanto alterar uma resposta substitui
   * selected_option_id sem criar duplicação.
   *
   * awarded_points é zerado para null por segurança
   * caso uma resposta seja alterada antes da
   * finalização/correção.
   */
  insert into public.test_answers (
    attempt_id,
    question_id,
    selected_option_id,
    text_answer,
    awarded_points,
    answered_at,
    updated_at
  )
  values (
    p_attempt_id,
    p_question_id,
    p_selected_option_id,
    null,
    null,
    now(),
    now()
  )
  on conflict (
    attempt_id,
    question_id
  )
  do update
  set
    selected_option_id =
      excluded.selected_option_id,

    text_answer =
      null,

    awarded_points =
      null,

    updated_at =
      now();
end;
$$;


/*
 * =========================================================
 * EXECUTE da função
 * =========================================================
 *
 * Funções recebem EXECUTE para PUBLIC por padrão.
 * Removemos isso explicitamente.
 */

revoke all
on function public.save_test_answer(
  uuid,
  uuid,
  uuid
)
from public;

revoke all
on function public.save_test_answer(
  uuid,
  uuid,
  uuid
)
from anon;

grant execute
on function public.save_test_answer(
  uuid,
  uuid,
  uuid
)
to authenticated;


/*
 * =========================================================
 * Privilégios diretos em test_answers
 * =========================================================
 *
 * anon não precisa acessar esta tabela.
 *
 * authenticated continua podendo SELECT para
 * recuperação de progresso, mas não poderá
 * INSERT/UPDATE diretamente.
 */

revoke all privileges
on table public.test_answers
from anon;

revoke
  insert,
  update,
  delete,
  truncate,
  references,
  trigger
on table public.test_answers
from authenticated;

grant select
on table public.test_answers
to authenticated;


/*
 * =========================================================
 * RLS
 * =========================================================
 */

alter table public.test_answers
enable row level security;


/*
 * Existem atualmente policies duplicadas.
 *
 * Removemos as policies de escrita porque a escrita
 * passará exclusivamente pela RPC SECURITY DEFINER.
 */

drop policy if exists
  "Students can insert own test answers"
on public.test_answers;

drop policy if exists
  "Students can update own test answers"
on public.test_answers;

drop policy if exists
  "students can create own answers"
on public.test_answers;

drop policy if exists
  "students can update own answers"
on public.test_answers;


/*
 * Também existiam duas policies equivalentes
 * para leitura do próprio aluno.
 *
 * Limpamos ambas e recriamos apenas uma.
 */

drop policy if exists
  "Students can view own test answers"
on public.test_answers;

drop policy if exists
  "students can read own answers"
on public.test_answers;


/*
 * O estudante pode continuar lendo somente
 * respostas pertencentes às próprias tentativas.
 */

create policy
  "students can read own answers"
on public.test_answers
for select
to authenticated
using (
  exists (
    select
      1
    from
      public.test_attempts ta
    where
      ta.id =
        test_answers.attempt_id
      and ta.student_id =
        auth.uid()
  )
);


/*
 * Não removemos:
 *
 * "staff can read all answers"
 *
 * Ela continua responsável pela leitura administrativa.
 */

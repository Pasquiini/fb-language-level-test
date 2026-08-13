/*
 * Segurança das respostas de Speaking.
 *
 * Objetivos:
 *
 * 1. impedir INSERT direto em speaking_answers pelo aluno;
 * 2. salvar metadados somente por RPC;
 * 3. confirmar ownership da tentativa;
 * 4. confirmar que a tentativa continua aberta;
 * 5. confirmar que a questão pertence ao teste;
 * 6. confirmar que a questão é do tipo speaking;
 * 7. confirmar que audio_path pertence ao usuário/tentativa/questão;
 * 8. confirmar que o objeto realmente existe no bucket;
 * 9. preservar UPDATE direto apenas para staff via RLS;
 * 10. limpar policies duplicadas do Storage.
 */


/*
 * =========================================================
 * RPC: save_speaking_answer
 * =========================================================
 */

create or replace function public.save_speaking_answer(
  p_attempt_id uuid,
  p_question_id uuid,
  p_audio_path text,
  p_duration_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public, storage, auth
as $$
declare
  v_user_id uuid;

  v_attempt public.test_attempts%rowtype;

  v_question_test_id uuid;

  v_question_type public.question_type;

  v_expected_prefix text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception
      'Usuário não autenticado.'
      using errcode = '42501';
  end if;


  /*
   * ---------------------------------------------------------
   * Parâmetros básicos
   * ---------------------------------------------------------
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

  if
    p_audio_path is null
    or btrim(p_audio_path) = ''
  then
    raise exception
      'Caminho do áudio não informado.'
      using errcode = '22023';
  end if;

  if
    p_duration_seconds is not null
    and p_duration_seconds < 0
  then
    raise exception
      'Duração do áudio inválida.'
      using errcode = '22023';
  end if;


  /*
   * ---------------------------------------------------------
   * Tentativa
   * ---------------------------------------------------------
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
   * A tentativa precisa pertencer ao usuário.
   */
  if
    v_attempt.student_id <>
    v_user_id
  then
    raise exception
      'Você não possui acesso a esta tentativa.'
      using errcode = '42501';
  end if;


  /*
   * A tentativa ainda precisa aceitar respostas.
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
   * ---------------------------------------------------------
   * Questão
   * ---------------------------------------------------------
   *
   * questions
   *   -> test_sections
   *   -> tests
   */

  select
    ts.test_id,
    q.type
  into
    v_question_test_id,
    v_question_type
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
   * Questão precisa pertencer ao teste
   * da tentativa.
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
   * A questão precisa ser realmente Speaking.
   */
  if
    v_question_type <>
      'speaking'::public.question_type
  then
    raise exception
      'A questão informada não é uma questão de speaking.'
      using errcode = '22023';
  end if;


  /*
   * ---------------------------------------------------------
   * Caminho esperado do arquivo
   * ---------------------------------------------------------
   *
   * Estrutura:
   *
   * <auth.uid()>/
   * <attempt_id>/
   * <question_id>.<extensão>
   */

  v_expected_prefix :=
    v_user_id::text
    || '/'
    || p_attempt_id::text
    || '/'
    || p_question_id::text
    || '.';


  if
    p_audio_path not like
      v_expected_prefix || '%'
  then
    raise exception
      'O caminho do áudio não corresponde à resposta informada.'
      using errcode = '42501';
  end if;


  /*
   * Não aceitamos subpastas ou caminhos artificiais
   * depois do prefixo esperado.
   */
  if
    position(
      '/' in substring(
        p_audio_path
        from char_length(v_expected_prefix) + 1
      )
    ) > 0
  then
    raise exception
      'Caminho do áudio inválido.'
      using errcode = '22023';
  end if;


  /*
   * ---------------------------------------------------------
   * Arquivo realmente existe no Storage
   * ---------------------------------------------------------
   */

  if not exists (
    select
      1
    from
      storage.objects so
    where
      so.bucket_id = 'speaking-audio'
      and so.name = p_audio_path
  ) then
    raise exception
      'A gravação enviada não foi encontrada.'
      using errcode = 'P0002';
  end if;


  /*
   * ---------------------------------------------------------
   * UPSERT speaking_answers
   * ---------------------------------------------------------
   *
   * UNIQUE:
   *
   * attempt_id,
   * question_id
   *
   * Se o aluno gravar novamente, substituímos
   * somente os dados que ele pode controlar.
   *
   * Campos pedagógicos/review ficam zerados
   * para não preservar uma avaliação antiga
   * após uma nova gravação.
   */

  insert into public.speaking_answers (
    attempt_id,
    question_id,
    audio_path,
    duration_seconds,
    transcript,
    teacher_feedback,
    ai_feedback,
    awarded_points,
    reviewed_by,
    reviewed_at,
    created_at,
    updated_at
  )
  values (
    p_attempt_id,
    p_question_id,
    p_audio_path,
    p_duration_seconds,
    null,
    null,
    null,
    null,
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
    audio_path =
      excluded.audio_path,

    duration_seconds =
      excluded.duration_seconds,

    transcript =
      null,

    teacher_feedback =
      null,

    ai_feedback =
      null,

    awarded_points =
      null,

    reviewed_by =
      null,

    reviewed_at =
      null,

    updated_at =
      now();
end;
$$;


/*
 * =========================================================
 * Permissões da RPC
 * =========================================================
 */

revoke all
on function public.save_speaking_answer(
  uuid,
  uuid,
  text,
  integer
)
from public;

revoke all
on function public.save_speaking_answer(
  uuid,
  uuid,
  text,
  integer
)
from anon;

grant execute
on function public.save_speaking_answer(
  uuid,
  uuid,
  text,
  integer
)
to authenticated;


/*
 * =========================================================
 * speaking_answers
 * =========================================================
 */

alter table public.speaking_answers
enable row level security;


/*
 * anon não precisa acessar speaking_answers.
 */

revoke all privileges
on table public.speaking_answers
from anon;


/*
 * Alunos não terão INSERT direto.
 *
 * Mantemos SELECT para aluno/staff.
 *
 * Mantemos UPDATE no nível de grant porque professores
 * e admins usam a policy "staff can update speaking answers".
 * Um aluno autenticado terá o grant SQL, mas a RLS
 * impedirá o UPDATE porque ele não satisfaz a policy de staff.
 */

revoke
  insert,
  delete,
  truncate,
  references,
  trigger
on table public.speaking_answers
from authenticated;

grant
  select,
  update
on table public.speaking_answers
to authenticated;


/*
 * A policy antiga de INSERT do aluno deixa de existir.
 */

drop policy if exists
  "students can create own speaking answers"
on public.speaking_answers;


/*
 * Mantemos:
 *
 * students can read own speaking answers
 * staff can read speaking answers
 * staff can update speaking answers
 */


/*
 * =========================================================
 * Storage speaking-audio
 * =========================================================
 *
 * Limpamos policies duplicadas e recriamos um único
 * conjunto de policies para o aluno.
 */

drop policy if exists
  "Students can delete own speaking audio"
on storage.objects;

drop policy if exists
  "Students can read own speaking audio"
on storage.objects;

drop policy if exists
  "Students can update own speaking audio"
on storage.objects;

drop policy if exists
  "Students can upload own speaking audio"
on storage.objects;

drop policy if exists
  "students can read own speaking audio"
on storage.objects;

drop policy if exists
  "students can update own speaking audio"
on storage.objects;

drop policy if exists
  "students can upload own speaking audio"
on storage.objects;


/*
 * ---------------------------------------------------------
 * INSERT
 * ---------------------------------------------------------
 *
 * Pasta 1 = auth.uid()
 * Pasta 2 = attempt_id pertencente ao auth.uid()
 */

create policy
  "students can upload own speaking audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'speaking-audio'
  and
  (storage.foldername(name))[1] =
    auth.uid()::text
  and
  exists (
    select
      1
    from
      public.test_attempts ta
    where
      ta.id::text =
        (storage.foldername(name))[2]
      and ta.student_id =
        auth.uid()
      and ta.status =
        'in_progress'::public.attempt_status
      and ta.submitted_at is null
      and ta.completed_at is null
  )
);


/*
 * ---------------------------------------------------------
 * SELECT
 * ---------------------------------------------------------
 */

create policy
  "students can read own speaking audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'speaking-audio'
  and
  (storage.foldername(name))[1] =
    auth.uid()::text
  and
  exists (
    select
      1
    from
      public.test_attempts ta
    where
      ta.id::text =
        (storage.foldername(name))[2]
      and ta.student_id =
        auth.uid()
  )
);


/*
 * ---------------------------------------------------------
 * UPDATE
 * ---------------------------------------------------------
 *
 * Necessário porque o Angular usa upsert: true.
 */

create policy
  "students can update own speaking audio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'speaking-audio'
  and
  (storage.foldername(name))[1] =
    auth.uid()::text
  and
  exists (
    select
      1
    from
      public.test_attempts ta
    where
      ta.id::text =
        (storage.foldername(name))[2]
      and ta.student_id =
        auth.uid()
      and ta.status =
        'in_progress'::public.attempt_status
      and ta.submitted_at is null
      and ta.completed_at is null
  )
)
with check (
  bucket_id = 'speaking-audio'
  and
  (storage.foldername(name))[1] =
    auth.uid()::text
  and
  exists (
    select
      1
    from
      public.test_attempts ta
    where
      ta.id::text =
        (storage.foldername(name))[2]
      and ta.student_id =
        auth.uid()
      and ta.status =
        'in_progress'::public.attempt_status
      and ta.submitted_at is null
      and ta.completed_at is null
  )
);


/*
 * ---------------------------------------------------------
 * DELETE
 * ---------------------------------------------------------
 */

create policy
  "students can delete own speaking audio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'speaking-audio'
  and
  (storage.foldername(name))[1] =
    auth.uid()::text
  and
  exists (
    select
      1
    from
      public.test_attempts ta
    where
      ta.id::text =
        (storage.foldername(name))[2]
      and ta.student_id =
        auth.uid()
      and ta.status =
        'in_progress'::public.attempt_status
      and ta.submitted_at is null
      and ta.completed_at is null
  )
);


/*
 * Não removemos:
 *
 * staff can read speaking audio
 *
 * nem:
 *
 * Authenticated users can read test audio
 *
 * pois pertencem a outros requisitos válidos.
 */

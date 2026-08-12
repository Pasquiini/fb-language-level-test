/*
 * FB Language Center
 * RLS das respostas objetivas.
 *
 * O aluno só pode acessar respostas de tentativas
 * que pertencem ao próprio auth.uid().
 */

alter table public.test_answers
enable row level security;


/*
 * SELECT
 */

drop policy if exists
  "Students can view own test answers"
on public.test_answers;

create policy
  "Students can view own test answers"
on public.test_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.test_attempts as ta
    where
      ta.id = test_answers.attempt_id
      and ta.student_id = auth.uid()
  )
);


/*
 * INSERT
 */

drop policy if exists
  "Students can insert own test answers"
on public.test_answers;

create policy
  "Students can insert own test answers"
on public.test_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_attempts as ta
    where
      ta.id = test_answers.attempt_id
      and ta.student_id = auth.uid()
  )
);


/*
 * UPDATE
 */

drop policy if exists
  "Students can update own test answers"
on public.test_answers;

create policy
  "Students can update own test answers"
on public.test_answers
for update
to authenticated
using (
  exists (
    select 1
    from public.test_attempts as ta
    where
      ta.id = test_answers.attempt_id
      and ta.student_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.test_attempts as ta
    where
      ta.id = test_answers.attempt_id
      and ta.student_id = auth.uid()
  )
);

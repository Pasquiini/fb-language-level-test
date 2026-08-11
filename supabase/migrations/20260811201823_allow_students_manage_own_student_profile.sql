/*
 * FB Language Center
 * RLS para student_profiles.
 *
 * O aluno autenticado pode criar, visualizar
 * e atualizar somente o próprio perfil acadêmico.
 */

alter table public.student_profiles
enable row level security;


/*
 * SELECT
 *
 * O usuário pode visualizar apenas a linha
 * cujo user_id corresponde ao próprio auth.uid().
 */
drop policy if exists
  "Students can view own student profile"
on public.student_profiles;

create policy
  "Students can view own student profile"
on public.student_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
);


/*
 * INSERT
 *
 * Permite criar somente uma linha cujo user_id
 * seja o próprio usuário autenticado.
 */
drop policy if exists
  "Students can insert own student profile"
on public.student_profiles;

create policy
  "Students can insert own student profile"
on public.student_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
);


/*
 * UPDATE
 *
 * O usuário só pode atualizar a própria linha
 * e a linha deve continuar pertencendo a ele.
 */
drop policy if exists
  "Students can update own student profile"
on public.student_profiles;

create policy
  "Students can update own student profile"
on public.student_profiles
for update
to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);

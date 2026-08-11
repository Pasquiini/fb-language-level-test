/*
 * FB Language Center
 * Permite que usuários autenticados consultem
 * alternativas das questões.
 *
 * A aplicação do aluno acessará essas alternativas
 * exclusivamente através da view
 * public.public_question_options, que não expõe
 * a coluna is_correct.
 */

alter table public.question_options
enable row level security;


/*
 * Remove policy anterior com o mesmo nome,
 * caso exista.
 */
drop policy if exists
  "Authenticated users can read question options"
on public.question_options;


/*
 * O teste é público para usuários que já possuem
 * sessão autenticada, incluindo sessões anônimas
 * do Supabase Auth.
 *
 * A proteção contra exposição de is_correct ocorre
 * através da view public_question_options.
 */
create policy
  "Authenticated users can read question options"
on public.question_options
for select
to authenticated
using (true);

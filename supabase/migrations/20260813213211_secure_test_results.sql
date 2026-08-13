/*
 * Segurança de test_results.
 *
 * Objetivos:
 *
 * - anon não acessa resultados;
 * - aluno autenticado pode apenas SELECT do próprio resultado;
 * - staff continua podendo ler e gerenciar resultados;
 * - INSERT/UPDATE da finalização continua acontecendo
 *   pela RPC SECURITY DEFINER finalize_test_attempt();
 */


alter table public.test_results
enable row level security;


/*
 * =========================================================
 * anon
 * =========================================================
 */

revoke all privileges
on table public.test_results
from anon;


/*
 * =========================================================
 * authenticated
 * =========================================================
 *
 * authenticated é usado tanto pelos alunos quanto
 * por professores/admins.
 *
 * Portanto mantemos os grants necessários ao staff,
 * e deixamos a RLS separar quem pode fazer o quê.
 *
 * Não precisamos de:
 *
 * TRUNCATE
 * REFERENCES
 * TRIGGER
 */

revoke
  truncate,
  references,
  trigger
on table public.test_results
from authenticated;


/*
 * SELECT:
 *
 * aluno -> própria policy
 * staff -> policy de staff
 */

grant select
on table public.test_results
to authenticated;


/*
 * Staff continua precisando gerenciar resultados
 * futuramente pelo painel administrativo.
 *
 * As policies existentes de staff restringem
 * INSERT / UPDATE / DELETE.
 */

grant
  insert,
  update,
  delete
on table public.test_results
to authenticated;


/*
 * =========================================================
 * Limpeza das policies
 * =========================================================
 *
 * Atualmente existem:
 *
 * - staff can manage results       ALL
 * - staff can read all results     SELECT
 * - students can read own result   SELECT
 *
 * A policy ALL do staff já inclui SELECT,
 * portanto "staff can read all results" é redundante.
 */

drop policy if exists
  "staff can read all results"
on public.test_results;


/*
 * Recriamos a leitura do aluno em formato único
 * e explícito.
 */

drop policy if exists
  "students can read own result"
on public.test_results;

create policy
  "students can read own result"
on public.test_results
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
        test_results.attempt_id
      and ta.student_id =
        auth.uid()
  )
);


/*
 * Mantemos:
 *
 * "staff can manage results"
 *
 * que usa is_staff() para ALL.
 */


/*
 * =========================================================
 * RPC finalize_test_attempt
 * =========================================================
 *
 * Reforçamos as permissões da função caso esta migration
 * seja aplicada após a criação da RPC.
 */

revoke all
on function public.finalize_test_attempt(uuid)
from public;

revoke all
on function public.finalize_test_attempt(uuid)
from anon;

grant execute
on function public.finalize_test_attempt(uuid)
to authenticated;

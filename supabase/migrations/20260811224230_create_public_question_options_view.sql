/*
 * FB Language Center
 * View segura para alternativas exibidas ao aluno.
 *
 * IMPORTANTE:
 * is_correct não é exposto pela view.
 */

create or replace view public.public_question_options
with (security_invoker = true)
as
select
  id,
  question_id,
  text,
  order_index
from public.question_options;


/*
 * Remove qualquer acesso anterior por precaução.
 */
revoke all
on public.public_question_options
from anon;

revoke all
on public.public_question_options
from authenticated;


/*
 * Usuários autenticados podem consultar somente
 * as colunas expostas pela view.
 */
grant select
on public.public_question_options
to authenticated;

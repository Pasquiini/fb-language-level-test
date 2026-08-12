/*
 * FB Language Center
 * RPC segura para alternativas do teste.
 *
 * Retorna somente os campos necessários ao aluno.
 * is_correct nunca é exposto.
 */

create or replace function public.get_public_question_options(
  p_question_ids uuid[]
)
returns table (
  id uuid,
  question_id uuid,
  text text,
  order_index integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    qo.id,
    qo.question_id,
    qo.text,
    qo.order_index
  from public.question_options as qo
  where qo.question_id = any(p_question_ids)
  order by
    qo.question_id,
    qo.order_index;
$$;


/*
 * PostgreSQL concede EXECUTE de funções a PUBLIC
 * por padrão em muitos cenários.
 * Removemos e liberamos explicitamente.
 */
revoke all
on function public.get_public_question_options(uuid[])
from public;

grant execute
on function public.get_public_question_options(uuid[])
to authenticated;


/*
 * Remove o SELECT direto que havíamos liberado
 * temporariamente para authenticated.
 */
drop policy if exists
  "Authenticated users can read question options"
on public.question_options;


/*
 * A view antiga deixa de ser necessária.
 */
drop view if exists
  public.public_question_options;

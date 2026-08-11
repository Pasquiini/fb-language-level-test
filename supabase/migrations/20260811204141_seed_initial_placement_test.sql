/*
 * FB Language Center
 * Teste inicial de nivelamento.
 *
 * Fonte:
 * FB Language Center — English Placement Test
 *
 * Estrutura prevista:
 * - 20 questões Grammar
 * - 3 questões Listening
 * - 3 questões Speaking
 * - total de 26 atividades
 *
 * As questões serão cadastradas em uma migration
 * separada para manter o seed organizado.
 */

insert into public.tests (
  name,
  slug,
  description,
  estimated_minutes,
  version,
  is_active
)
values (
  'Teste de Nivelamento de Inglês',
  'english-placement-test',
  'Avaliação de nivelamento da FB Language Center com Grammar, Listening e Speaking.',
  20,
  1,
  true
)
on conflict (slug)
do update set
  name = excluded.name,
  description = excluded.description,
  estimated_minutes = excluded.estimated_minutes,
  version = excluded.version,
  is_active = excluded.is_active,
  updated_at = now();

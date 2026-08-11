/*
 * FB Language Center
 * Proteção de colunas sensíveis do perfil.
 *
 * Um usuário comum pode alterar seus próprios dados pessoais,
 * mas não pode promover a si mesmo para teacher/admin.
 */

revoke update
on table public.profiles
from authenticated;

/*
 * Alunos, professores e admins autenticados podem editar
 * somente os campos pessoais listados abaixo através da
 * Data API.
 */
grant update (
  full_name,
  email,
  whatsapp,
  avatar_url,
  updated_at
)
on table public.profiles
to authenticated;

/*
 * role fica propositalmente fora do grant.
 *
 * Alterações de papel serão feitas futuramente por uma
 * operação administrativa segura, e não por update direto
 * vindo do navegador.
 */

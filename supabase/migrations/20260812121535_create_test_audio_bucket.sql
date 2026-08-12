/*
 * FB Language Center
 * Bucket privado para áudios utilizados nos testes.
 */

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'test-audio',
  'test-audio',
  false
)
on conflict (id)
do update set
  public = false;


/*
 * Usuários autenticados podem ouvir os áudios
 * utilizados durante as avaliações.
 */
drop policy if exists
  "Authenticated users can read test audio"
on storage.objects;

create policy
  "Authenticated users can read test audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'test-audio'
);

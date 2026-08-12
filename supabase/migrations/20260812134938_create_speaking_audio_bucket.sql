/*
 * FB Language Center
 * Bucket privado para gravações de Speaking.
 */

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'speaking-audio',
  'speaking-audio',
  false
)
on conflict (id)
do update set
  public = false;


/*
 * O aluno autenticado pode enviar arquivos somente
 * dentro da própria pasta:
 *
 * speaking-audio/<auth.uid()>/...
 */
drop policy if exists
  "Students can upload own speaking audio"
on storage.objects;

create policy
  "Students can upload own speaking audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);


/*
 * Necessário para upsert de arquivos existentes.
 */
drop policy if exists
  "Students can update own speaking audio"
on storage.objects;

create policy
  "Students can update own speaking audio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);


/*
 * Permite ao aluno consultar as próprias gravações.
 */
drop policy if exists
  "Students can read own speaking audio"
on storage.objects;

create policy
  "Students can read own speaking audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);


/*
 * Permite remover somente os próprios arquivos,
 * útil quando o aluno decidir regravar.
 */
drop policy if exists
  "Students can delete own speaking audio"
on storage.objects;

create policy
  "Students can delete own speaking audio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

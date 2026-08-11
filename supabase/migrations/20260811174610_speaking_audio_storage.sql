create policy "students can upload own speaking audio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] =
    (select auth.uid())::text
);

create policy "students can read own speaking audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] =
    (select auth.uid())::text
);

create policy "students can update own speaking audio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] =
    (select auth.uid())::text
)
with check (
  bucket_id = 'speaking-audio'
  and (storage.foldername(name))[1] =
    (select auth.uid())::text
);

create policy "staff can read speaking audio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'speaking-audio'
  and (select public.is_staff())
);

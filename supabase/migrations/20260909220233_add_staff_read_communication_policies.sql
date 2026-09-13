alter table public.communication_events
enable row level security;

alter table public.communication_messages
enable row level security;


drop policy if exists
  "staff can read communication events"
on public.communication_events;

create policy
  "staff can read communication events"
on public.communication_events
for select
to authenticated
using (
  (select public.is_staff())
);


drop policy if exists
  "staff can read communication messages"
on public.communication_messages;

create policy
  "staff can read communication messages"
on public.communication_messages
for select
to authenticated
using (
  (select public.is_staff())
);


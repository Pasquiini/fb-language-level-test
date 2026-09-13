grant select
on table public.communication_events
to service_role;

grant select, insert, update
on table public.communication_messages
to service_role;

grant select
on table public.profiles
to service_role;

grant select
on table public.student_profiles
to service_role;

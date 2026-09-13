-- FB Language Center
-- Migration: create_communication_infrastructure
-- Created: 2026-08-18
--
-- Assumptions:
--   public.test_attempts(id) exists
--   public.student_profiles(id) exists
--
-- Purpose:
--   Create the event/message infrastructure for WhatsApp and future communication channels.

begin;

-- ============================================================
-- 1. Communication events
-- ============================================================

create table if not exists public.communication_events (
  id uuid primary key default gen_random_uuid(),

  attempt_id uuid
    references public.test_attempts(id)
    on delete cascade,

  student_id uuid
    references public.student_profiles(user_id)
    on delete set null,

  event_type text not null
    check (
      event_type in (
        'TEST_SUBMITTED',
        'TEST_COMPLETED',
        'ADMIN_MANUAL_MESSAGE',
        'MEETING_SCHEDULED',
        'MEETING_REMINDER'
      )
    ),

  payload jsonb not null default '{}'::jsonb,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now()
);

comment on table public.communication_events is
  'System/business events that may generate one or more communication messages.';

comment on column public.communication_events.event_type is
  'Supported events: TEST_SUBMITTED, TEST_COMPLETED, ADMIN_MANUAL_MESSAGE, MEETING_SCHEDULED, MEETING_REMINDER.';


-- ============================================================
-- 2. Communication messages
-- ============================================================

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),

  event_id uuid
    references public.communication_events(id)
    on delete cascade,

  attempt_id uuid
    references public.test_attempts(id)
    on delete cascade,

  student_id uuid
    references public.student_profiles(user_id)
    on delete set null,

  channel text not null
    check (
      channel in ('whatsapp')
    ),

  recipient_type text not null
    check (
      recipient_type in ('student', 'school')
    ),

  recipient text not null,
  message_body text not null,

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'processing',
        'sent',
        'failed'
      )
    ),

  provider text,
  provider_message_id text,
  idempotency_key text not null,

  attempt_count integer not null default 0
    check (attempt_count >= 0),

  last_error text,
  next_retry_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.communication_messages is
  'Individual outbound messages created from communication events.';

comment on column public.communication_messages.idempotency_key is
  'Unique key used to prevent duplicated outbound messages during retries or repeated calls.';

comment on column public.communication_messages.next_retry_at is
  'Timestamp after which a failed message may be retried.';


-- ============================================================
-- 3. Idempotency
-- ============================================================

create unique index if not exists
  communication_messages_idempotency_key_idx
on public.communication_messages(idempotency_key);


-- ============================================================
-- 4. Query indexes
-- ============================================================

create index if not exists
  communication_events_attempt_id_idx
on public.communication_events(attempt_id);

create index if not exists
  communication_events_student_id_idx
on public.communication_events(student_id);

create index if not exists
  communication_events_event_type_idx
on public.communication_events(event_type);

create index if not exists
  communication_events_created_at_idx
on public.communication_events(created_at desc);

create index if not exists
  communication_messages_event_id_idx
on public.communication_messages(event_id);

create index if not exists
  communication_messages_attempt_id_idx
on public.communication_messages(attempt_id);

create index if not exists
  communication_messages_student_id_idx
on public.communication_messages(student_id);

create index if not exists
  communication_messages_status_idx
on public.communication_messages(status);

create index if not exists
  communication_messages_created_at_idx
on public.communication_messages(created_at desc);

create index if not exists
  communication_messages_retry_idx
on public.communication_messages(status, next_retry_at)
where status = 'failed';


-- ============================================================
-- 5. updated_at trigger
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists
  set_communication_messages_updated_at
on public.communication_messages;

create trigger set_communication_messages_updated_at
before update
on public.communication_messages
for each row
execute function public.set_updated_at();


-- ============================================================
-- 6. Row Level Security
-- ============================================================

alter table public.communication_events enable row level security;
alter table public.communication_messages enable row level security;

-- No INSERT/UPDATE/DELETE policies are intentionally created here.
-- The Angular client must not write directly to these tables.
-- Backend code / Edge Functions using the service role can manage them.
--
-- Read policies for admin/teacher/staff can be added after the admin
-- authorization model is finalized.


-- ============================================================
-- 7. Internal helper for creating communication events
-- ============================================================

create or replace function public.create_communication_event(
  p_attempt_id uuid,
  p_student_id uuid,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if p_event_type not in (
    'TEST_SUBMITTED',
    'TEST_COMPLETED',
    'ADMIN_MANUAL_MESSAGE',
    'MEETING_SCHEDULED',
    'MEETING_REMINDER'
  ) then
    raise exception 'Unsupported communication event type: %', p_event_type;
  end if;

  insert into public.communication_events (
    attempt_id,
    student_id,
    event_type,
    payload,
    created_by
  )
  values (
    p_attempt_id,
    p_student_id,
    p_event_type,
    coalesce(p_payload, '{}'::jsonb),
    auth.uid()
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

-- Keep this helper private for now.
revoke all on function public.create_communication_event(uuid, uuid, text, jsonb)
from public;

revoke all on function public.create_communication_event(uuid, uuid, text, jsonb)
from anon;

revoke all on function public.create_communication_event(uuid, uuid, text, jsonb)
from authenticated;


-- ============================================================
-- 8. Explicitly prevent direct API writes for client roles
-- ============================================================

revoke insert, update, delete, truncate
on table public.communication_events
from anon, authenticated;

revoke insert, update, delete, truncate
on table public.communication_messages
from anon, authenticated;

commit;

create extension if not exists "pgcrypto";

create type public.user_role as enum (
  'student',
  'teacher',
  'admin'
);

create type public.lead_status as enum (
  'new',
  'contacted',
  'trial_class',
  'enrolled',
  'not_interested'
);

create type public.question_type as enum (
  'multiple_choice',
  'listening',
  'speaking'
);

create type public.question_category as enum (
  'grammar',
  'vocabulary',
  'reading',
  'context',
  'listening',
  'speaking'
);

create type public.attempt_status as enum (
  'in_progress',
  'submitted',
  'under_review',
  'completed'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text not null,

  email text,

  whatsapp text,

  role public.user_role not null default 'student',

  avatar_url text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create table public.student_profiles (
  user_id uuid primary key
    references public.profiles(id)
    on delete cascade,

  perceived_level text,

  study_duration text,

  previous_school text,

  main_goal text,

  preferred_modality text,

  availability_period text,

  notes text,

  current_lead_status public.lead_status
    not null
    default 'new',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create table public.tests (
  id uuid primary key default gen_random_uuid(),

  name text not null,

  slug text not null unique,

  description text,

  estimated_minutes integer,

  version integer not null default 1,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint tests_estimated_minutes_check
    check (
      estimated_minutes is null
      or estimated_minutes > 0
    )
);

create table public.test_sections (
  id uuid primary key default gen_random_uuid(),

  test_id uuid not null
    references public.tests(id)
    on delete cascade,

  name text not null,

  description text,

  order_index integer not null,

  created_at timestamptz not null default now(),

  unique (
    test_id,
    order_index
  )
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),

  section_id uuid not null
    references public.test_sections(id)
    on delete cascade,

  type public.question_type not null,

  category public.question_category not null,

  level text,

  statement text not null,

  instructions text,

  audio_path text,

  order_index integer not null,

  points numeric(6, 2) not null default 1,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (
    section_id,
    order_index
  ),

  constraint questions_points_check
    check (points >= 0),

  constraint questions_audio_check
    check (
      type <> 'listening'
      or audio_path is not null
    )
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),

  question_id uuid not null
    references public.questions(id)
    on delete cascade,

  text text not null,

  is_correct boolean not null default false,

  order_index integer not null,

  created_at timestamptz not null default now(),

  unique (
    question_id,
    order_index
  )
);

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),

  test_id uuid not null
    references public.tests(id),

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  status public.attempt_status
    not null
    default 'in_progress',

  current_question_id uuid
    references public.questions(id)
    on delete set null,

  started_at timestamptz not null default now(),

  submitted_at timestamptz,

  completed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create table public.test_answers (
  id uuid primary key default gen_random_uuid(),

  attempt_id uuid not null
    references public.test_attempts(id)
    on delete cascade,

  question_id uuid not null
    references public.questions(id)
    on delete cascade,

  selected_option_id uuid
    references public.question_options(id)
    on delete set null,

  text_answer text,

  awarded_points numeric(6, 2),

  answered_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (
    attempt_id,
    question_id
  ),

  constraint test_answers_awarded_points_check
    check (
      awarded_points is null
      or awarded_points >= 0
    )
);

create table public.speaking_answers (
  id uuid primary key default gen_random_uuid(),

  attempt_id uuid not null
    references public.test_attempts(id)
    on delete cascade,

  question_id uuid not null
    references public.questions(id)
    on delete cascade,

  audio_path text not null,

  duration_seconds integer,

  transcript text,

  teacher_feedback text,

  ai_feedback text,

  awarded_points numeric(6, 2),

  reviewed_by uuid
    references public.profiles(id)
    on delete set null,

  reviewed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  unique (
    attempt_id,
    question_id
  ),

  constraint speaking_duration_check
    check (
      duration_seconds is null
      or duration_seconds >= 0
    ),

  constraint speaking_points_check
    check (
      awarded_points is null
      or awarded_points >= 0
    )
);

create table public.test_results (
  id uuid primary key default gen_random_uuid(),

  attempt_id uuid not null unique
    references public.test_attempts(id)
    on delete cascade,

  objective_score numeric(8, 2)
    not null
    default 0,

  speaking_score numeric(8, 2),

  total_score numeric(8, 2)
    not null
    default 0,

  percentage numeric(5, 2)
    not null
    default 0,

  estimated_level text not null,

  summary text,

  recommendation text,

  ai_analysis text,

  generated_at timestamptz
    not null
    default now(),

  constraint test_results_percentage_check
    check (
      percentage >= 0
      and percentage <= 100
    )
);

create table public.lead_status_history (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null
    references public.profiles(id)
    on delete cascade,

  previous_status public.lead_status,

  new_status public.lead_status not null,

  changed_by uuid
    references public.profiles(id)
    on delete set null,

  notes text,

  created_at timestamptz not null default now()
);

create index test_sections_test_id_idx
  on public.test_sections(test_id);

create index questions_section_id_idx
  on public.questions(section_id);

create index question_options_question_id_idx
  on public.question_options(question_id);

create index test_attempts_student_id_idx
  on public.test_attempts(student_id);

create index test_attempts_test_id_idx
  on public.test_attempts(test_id);

create index test_attempts_status_idx
  on public.test_attempts(status);

create index test_answers_attempt_id_idx
  on public.test_answers(attempt_id);

create index test_answers_question_id_idx
  on public.test_answers(question_id);

create index speaking_answers_attempt_id_idx
  on public.speaking_answers(attempt_id);

create index lead_status_history_student_id_idx
  on public.lead_status_history(student_id);
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

create trigger tests_set_updated_at
before update on public.tests
for each row
execute function public.set_updated_at();

create trigger questions_set_updated_at
before update on public.questions
for each row
execute function public.set_updated_at();

create trigger test_attempts_set_updated_at
before update on public.test_attempts
for each row
execute function public.set_updated_at();

create trigger test_answers_set_updated_at
before update on public.test_answers
for each row
execute function public.set_updated_at();

create trigger speaking_answers_set_updated_at
before update on public.speaking_answers
for each row
execute function public.set_updated_at();
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    email,
    role
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(
        coalesce(new.email, ''),
        '@',
        1
      )
    ),
    new.email,
    'student'
  );

  insert into public.student_profiles (
    user_id
  )
  values (
    new.id
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid());
$$;
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.current_user_role()
      in ('teacher', 'admin'),
    false
  );
$$;
alter table public.profiles
enable row level security;

alter table public.student_profiles
enable row level security;

alter table public.tests
enable row level security;

alter table public.test_sections
enable row level security;

alter table public.questions
enable row level security;

alter table public.question_options
enable row level security;

alter table public.test_attempts
enable row level security;

alter table public.test_answers
enable row level security;

alter table public.speaking_answers
enable row level security;

alter table public.test_results
enable row level security;

alter table public.lead_status_history
enable row level security;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
);

create policy "staff can read all profiles"
on public.profiles
for select
to authenticated
using (
  (select public.is_staff())
);

create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
)
with check (
  id = (select auth.uid())
);

create policy "staff can update profiles"
on public.profiles
for update
to authenticated
using (
  (select public.is_staff())
)
with check (
  (select public.is_staff())
);
create policy "students can read own student profile"
on public.student_profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
);

create policy "students can update own student profile"
on public.student_profiles
for update
to authenticated
using (
  user_id = (select auth.uid())
)
with check (
  user_id = (select auth.uid())
);

create policy "staff can read student profiles"
on public.student_profiles
for select
to authenticated
using (
  (select public.is_staff())
);

create policy "staff can update student profiles"
on public.student_profiles
for update
to authenticated
using (
  (select public.is_staff())
)
with check (
  (select public.is_staff())
);
create policy "authenticated users can read active tests"
on public.tests
for select
to authenticated
using (
  is_active = true
  or (select public.is_staff())
);

create policy "authenticated users can read test sections"
on public.test_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.tests
    where tests.id = test_sections.test_id
      and (
        tests.is_active = true
        or (select public.is_staff())
      )
  )
);

create policy "authenticated users can read active questions"
on public.questions
for select
to authenticated
using (
  is_active = true
  or (select public.is_staff())
);
create policy "staff can read question options"
on public.question_options
for select
to authenticated
using (
  (select public.is_staff())
);
create policy "students can read own attempts"
on public.test_attempts
for select
to authenticated
using (
  student_id = (select auth.uid())
);

create policy "students can create own attempts"
on public.test_attempts
for insert
to authenticated
with check (
  student_id = (select auth.uid())
);

create policy "students can update own attempts"
on public.test_attempts
for update
to authenticated
using (
  student_id = (select auth.uid())
)
with check (
  student_id = (select auth.uid())
);

create policy "staff can read all attempts"
on public.test_attempts
for select
to authenticated
using (
  (select public.is_staff())
);

create policy "staff can update all attempts"
on public.test_attempts
for update
to authenticated
using (
  (select public.is_staff())
)
with check (
  (select public.is_staff())
);
create policy "students can read own answers"
on public.test_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.test_attempts
    where test_attempts.id = test_answers.attempt_id
      and test_attempts.student_id =
        (select auth.uid())
  )
);

create policy "students can create own answers"
on public.test_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_attempts
    where test_attempts.id = test_answers.attempt_id
      and test_attempts.student_id =
        (select auth.uid())
  )
);

create policy "students can update own answers"
on public.test_answers
for update
to authenticated
using (
  exists (
    select 1
    from public.test_attempts
    where test_attempts.id = test_answers.attempt_id
      and test_attempts.student_id =
        (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.test_attempts
    where test_attempts.id = test_answers.attempt_id
      and test_attempts.student_id =
        (select auth.uid())
  )
);

create policy "staff can read all answers"
on public.test_answers
for select
to authenticated
using (
  (select public.is_staff())
);
create policy "students can read own speaking answers"
on public.speaking_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.test_attempts
    where test_attempts.id =
      speaking_answers.attempt_id
      and test_attempts.student_id =
        (select auth.uid())
  )
);

create policy "students can create own speaking answers"
on public.speaking_answers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.test_attempts
    where test_attempts.id =
      speaking_answers.attempt_id
      and test_attempts.student_id =
        (select auth.uid())
  )
);

create policy "staff can read speaking answers"
on public.speaking_answers
for select
to authenticated
using (
  (select public.is_staff())
);

create policy "staff can update speaking answers"
on public.speaking_answers
for update
to authenticated
using (
  (select public.is_staff())
)
with check (
  (select public.is_staff())
);
create policy "students can read own result"
on public.test_results
for select
to authenticated
using (
  exists (
    select 1
    from public.test_attempts
    where test_attempts.id =
      test_results.attempt_id
      and test_attempts.student_id =
        (select auth.uid())
  )
);

create policy "staff can read all results"
on public.test_results
for select
to authenticated
using (
  (select public.is_staff())
);

create policy "staff can manage results"
on public.test_results
for all
to authenticated
using (
  (select public.is_staff())
)
with check (
  (select public.is_staff())
);
create policy "students can read own lead history"
on public.lead_status_history
for select
to authenticated
using (
  student_id = (select auth.uid())
);

create policy "staff can read lead history"
on public.lead_status_history
for select
to authenticated
using (
  (select public.is_staff())
);

create policy "staff can create lead history"
on public.lead_status_history
for insert
to authenticated
with check (
  (select public.is_staff())
);

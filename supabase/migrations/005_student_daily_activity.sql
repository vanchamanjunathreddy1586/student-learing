create table if not exists public.student_daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  study_minutes integer not null default 0 check (study_minutes >= 0),
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  quizzes_completed integer not null default 0 check (quizzes_completed >= 0),
  questions_solved integer not null default 0 check (questions_solved >= 0),
  notes_created integer not null default 0 check (notes_created >= 0),
  assignments_completed integer not null default 0 check (assignments_completed >= 0),
  ai_questions integer not null default 0 check (ai_questions >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create table if not exists public.student_study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  activity_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists student_daily_activity_user_date_idx
  on public.student_daily_activity (user_id, activity_date desc);
create index if not exists student_daily_activity_date_idx
  on public.student_daily_activity (activity_date);
create index if not exists student_study_sessions_user_date_idx
  on public.student_study_sessions (user_id, activity_date desc);
create unique index if not exists student_one_active_session_idx
  on public.student_study_sessions (user_id)
  where ended_at is null;

alter table public.student_daily_activity enable row level security;
alter table public.student_study_sessions enable row level security;

drop policy if exists "students can manage own daily activity" on public.student_daily_activity;
create policy "students can manage own daily activity"
  on public.student_daily_activity for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "students can manage own study sessions" on public.student_study_sessions;
create policy "students can manage own study sessions"
  on public.student_study_sessions for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.ensure_daily_activity(target_date date)
returns public.student_daily_activity
language sql
set search_path = public
as $$
  insert into public.student_daily_activity (user_id, activity_date)
  values ((select auth.uid()), target_date)
  on conflict (user_id, activity_date) do nothing
  returning *;
$$;

create or replace function public.increment_daily_activity(
  target_date date,
  study_minutes_delta integer default 0,
  lessons_delta integer default 0,
  quizzes_delta integer default 0,
  questions_delta integer default 0,
  notes_delta integer default 0,
  assignments_delta integer default 0,
  ai_questions_delta integer default 0,
  xp_delta integer default 0
)
returns public.student_daily_activity
language plpgsql
set search_path = public
as $$
declare
  result public.student_daily_activity;
begin
  if coalesce(study_minutes_delta, 0) < 0 or coalesce(lessons_delta, 0) < 0
    or coalesce(quizzes_delta, 0) < 0 or coalesce(questions_delta, 0) < 0
    or coalesce(notes_delta, 0) < 0 or coalesce(assignments_delta, 0) < 0
    or coalesce(ai_questions_delta, 0) < 0 or coalesce(xp_delta, 0) < 0 then
    raise exception 'Activity increments cannot be negative';
  end if;

  insert into public.student_daily_activity (user_id, activity_date)
  values ((select auth.uid()), target_date)
  on conflict (user_id, activity_date) do nothing;

  update public.student_daily_activity
  set study_minutes = study_minutes + coalesce(study_minutes_delta, 0),
      lessons_completed = lessons_completed + coalesce(lessons_delta, 0),
      quizzes_completed = quizzes_completed + coalesce(quizzes_delta, 0),
      questions_solved = questions_solved + coalesce(questions_delta, 0),
      notes_created = notes_created + coalesce(notes_delta, 0),
      assignments_completed = assignments_completed + coalesce(assignments_delta, 0),
      ai_questions = ai_questions + coalesce(ai_questions_delta, 0),
      xp_earned = xp_earned + coalesce(xp_delta, 0),
      updated_at = now()
  where user_id = (select auth.uid()) and activity_date = target_date
  returning * into result;

  return result;
end;
$$;

create or replace function public.start_student_study_session(target_date date)
returns public.student_study_sessions
language plpgsql
set search_path = public
as $$
declare
  result public.student_study_sessions;
begin
  insert into public.student_study_sessions (user_id, activity_date)
  values ((select auth.uid()), target_date)
  returning * into result;
  return result;
exception when unique_violation then
  select * into result
  from public.student_study_sessions
  where user_id = (select auth.uid()) and ended_at is null;
  return result;
end;
$$;

create or replace function public.stop_student_study_session()
returns public.student_study_sessions
language plpgsql
set search_path = public
as $$
declare
  current_session public.student_study_sessions;
  elapsed_minutes integer;
begin
  select * into current_session
  from public.student_study_sessions
  where user_id = (select auth.uid()) and ended_at is null
  for update;

  if current_session.id is null then
    return null;
  end if;

  elapsed_minutes := greatest(0, least(1440, floor(extract(epoch from (now() - current_session.started_at)) / 60)::integer));

  update public.student_study_sessions
  set ended_at = now(), duration_minutes = elapsed_minutes
  where id = current_session.id
  returning * into current_session;

  perform public.increment_daily_activity(current_session.activity_date, elapsed_minutes);
  return current_session;
end;
$$;

revoke all on function public.ensure_daily_activity(date) from public;
revoke all on function public.increment_daily_activity(date, integer, integer, integer, integer, integer, integer, integer, integer) from public;
revoke all on function public.start_student_study_session(date) from public;
revoke all on function public.stop_student_study_session() from public;
grant execute on function public.ensure_daily_activity(date) to authenticated;
grant execute on function public.increment_daily_activity(date, integer, integer, integer, integer, integer, integer, integer, integer) to authenticated;
grant execute on function public.start_student_study_session(date) to authenticated;
grant execute on function public.stop_student_study_session() to authenticated;
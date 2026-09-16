create extension if not exists pgcrypto;

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  year text,
  college text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
drop policy if exists "own student profile" on public.student_profiles;
drop policy if exists "students read own student profile" on public.student_profiles;
drop policy if exists "students insert own student profile" on public.student_profiles;
drop policy if exists "students update own student profile" on public.student_profiles;

create policy "students read own student profile"
  on public.student_profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);
create policy "students insert own student profile"
  on public.student_profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create policy "students update own student profile"
  on public.student_profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.student_profiles to authenticated;
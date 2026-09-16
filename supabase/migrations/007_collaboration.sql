-- 007_collaboration.sql

create table if not exists public.public_notes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.public_notes enable row level security;

create policy "anyone can read public notes" on public.public_notes for select using (true);
create policy "users can create public notes" on public.public_notes for insert with check (auth.uid() = user_id);
create policy "users can edit own notes" on public.public_notes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own notes" on public.public_notes for delete using (auth.uid() = user_id);

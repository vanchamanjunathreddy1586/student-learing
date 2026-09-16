create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  accent_color text not null default '#62e6e2',
  ui_density text not null default 'comfortable' check (ui_density in ('compact', 'comfortable', 'spacious')),
  animations_enabled boolean not null default true,
  effects_3d_enabled boolean not null default true,
  notifications jsonb not null default '{"push":true,"email":true,"assignments":true,"quizzes":true,"study":true,"ai":true}'::jsonb,
  learning_preferences jsonb not null default '{"study_goal":45,"reminder_time":"18:00","difficulty":"balanced","default_mode":"guided"}'::jsonb,
  ai_preferences jsonb not null default '{"default_model":"guided-tutor","temperature":0.7,"token_limit":2048,"system_prompt":"You are a patient, precise learning companion."}'::jsonb,
  enabled_tools jsonb not null default '[]'::jsonb,
  language text not null default 'en',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
drop policy if exists "users read own settings" on public.user_settings;
drop policy if exists "users insert own settings" on public.user_settings;
drop policy if exists "users update own settings" on public.user_settings;
create policy "users read own settings" on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy "users insert own settings" on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "users update own settings" on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update on public.user_settings to authenticated;
create table if not exists public.onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  education_level text,
  year text,
  college text,
  department text,
  subjects jsonb not null default '[]'::jsonb,
  difficult_subjects jsonb not null default '[]'::jsonb,
  weak_topics jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  learning_style text,
  study_time integer,
  preferred_study_time text,
  exam_dates jsonb not null default '[]'::jsonb,
  assignment_workload text,
  interests jsonb not null default '[]'::jsonb,
  preferred_explanation_difficulty text,
  preferred_language text default 'en',
  career_interests jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  accent_color text not null default '#62e6e2',
  ui_density text not null default 'comfortable',
  animations_enabled boolean not null default true,
  effects_3d_enabled boolean not null default true,
  reduced_motion boolean not null default false,
  language text not null default 'en',
  timezone text not null default 'UTC',
  notifications jsonb not null default '{"push":true,"email":true,"assignments":true,"quizzes":true,"study":true,"ai":true}'::jsonb,
  learning_preferences jsonb not null default '{"study_goal":45,"reminder_time":"18:00","difficulty":"balanced","default_mode":"guided"}'::jsonb,
  ai_preferences jsonb not null default '{"default_provider":"demo","default_model":"guided-tutor","temperature":0.7,"token_limit":2048,"system_prompt":"You are a patient, precise learning companion."}'::jsonb,
  enabled_tools jsonb not null default '[]'::jsonb,
  privacy_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  plan jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'pomodoro',
  duration_minutes integer not null default 25,
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_tools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  name text not null,
  category text not null,
  provider text not null,
  enabled boolean not null default false,
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, tool_id)
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  model text not null,
  feature text not null,
  status text not null default 'success',
  tokens integer default 0,
  requested_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists onboarding_profiles_user_idx on public.onboarding_profiles(user_id);
create index if not exists user_settings_user_idx on public.user_settings(user_id);
create index if not exists user_activities_user_created_idx on public.user_activities(user_id, created_at desc);
create index if not exists study_plans_user_status_idx on public.study_plans(user_id, status);
create index if not exists focus_sessions_user_idx on public.focus_sessions(user_id, started_at desc);
create index if not exists user_tools_user_idx on public.user_tools(user_id, tool_id);
create index if not exists ai_usage_user_idx on public.ai_usage(user_id, requested_at desc);

alter table public.onboarding_profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_activities enable row level security;
alter table public.study_plans enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.user_tools enable row level security;
alter table public.ai_usage enable row level security;

create policy "users can manage own onboarding" on public.onboarding_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own settings" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own activities" on public.user_activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own plans" on public.study_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own focus sessions" on public.focus_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own tool settings" on public.user_tools for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can view own ai usage" on public.ai_usage for select using (auth.uid() = user_id);
create policy "users can insert own ai usage" on public.ai_usage for insert with check (auth.uid() = user_id);

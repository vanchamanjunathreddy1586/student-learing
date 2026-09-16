-- 006_smart_learning_core.sql

-- Subjects
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  mastery_percentage integer default 0 check (mastery_percentage >= 0 and mastery_percentage <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Topics
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mastery_status text not null default 'Needs Practice', -- Strong, Improving, Weak, Needs Practice
  completed boolean default false,
  created_at timestamptz not null default now()
);

-- Learning Materials
create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  file_url text,
  file_type text,
  extracted_text text,
  summary text,
  created_at timestamptz not null default now()
);

-- Material Chunks (for RAG / AI context)
create table if not exists public.material_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  content text not null,
  chunk_index integer not null,
  created_at timestamptz not null default now()
);

-- Quiz Attempts
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  score integer default 0,
  total_questions integer default 0,
  accuracy_percentage integer default 0,
  time_taken_seconds integer default 0,
  created_at timestamptz not null default now()
);

-- Quiz Questions
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question text not null,
  type text not null, -- MCQ, True/False, etc.
  difficulty text not null, -- Easy, Medium, Hard
  options jsonb,
  correct_answer text not null,
  explanation text
);

-- Student Answers
create table if not exists public.student_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_question_id uuid not null references public.quiz_questions(id) on delete cascade,
  student_answer text,
  is_correct boolean default false,
  time_taken_seconds integer default 0
);

-- Weak Topics
create table if not exists public.weak_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  status text not null default 'Weak',
  detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Assignments
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  due_date timestamptz,
  difficulty text default 'Medium',
  estimated_time_minutes integer,
  priority text default 'Medium',
  completed boolean default false,
  created_at timestamptz not null default now()
);

-- Timetables
create table if not exists public.timetables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_name text not null,
  teacher text,
  room text,
  day_of_week text not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now()
);

-- Study Schedule (Smart Study Planner)
create table if not exists public.study_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  task_type text not null, -- Assignment, Revision, Quiz, etc.
  scheduled_for timestamptz not null,
  estimated_duration integer,
  completed boolean default false,
  created_at timestamptz not null default now()
);

-- Flashcards
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  question text not null,
  answer text not null,
  difficulty text default 'Medium',
  next_review timestamptz,
  created_at timestamptz not null default now()
);

-- Study Groups
create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Group Members
create table if not exists public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Gamification Profiles
create table if not exists public.gamification_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer default 0,
  level integer default 1,
  current_streak integer default 0,
  best_streak integer default 0,
  updated_at timestamptz not null default now()
);

-- Badges
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  icon_url text,
  xp_reward integer default 0
);

-- Student Badges
create table if not exists public.student_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- AI Conversations
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AI Messages
create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);


-- RLS Setup
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.learning_materials enable row level security;
alter table public.material_chunks enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.student_answers enable row level security;
alter table public.weak_topics enable row level security;
alter table public.assignments enable row level security;
alter table public.timetables enable row level security;
alter table public.study_schedule enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.gamification_profiles enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

-- Policies for user-specific data (simplified for brevity: users own their rows)
create policy "users can manage own subjects" on public.subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own topics" on public.topics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own materials" on public.learning_materials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own chunks" on public.material_chunks for all using (
  exists (select 1 from public.learning_materials where id = material_id and user_id = auth.uid())
) with check (
  exists (select 1 from public.learning_materials where id = material_id and user_id = auth.uid())
);
create policy "users can manage own quizzes" on public.quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own quiz questions" on public.quiz_questions for all using (
  exists (select 1 from public.quiz_attempts where id = quiz_attempt_id and user_id = auth.uid())
) with check (
  exists (select 1 from public.quiz_attempts where id = quiz_attempt_id and user_id = auth.uid())
);
create policy "users can manage own answers" on public.student_answers for all using (
  exists (
    select 1 from public.quiz_questions q 
    join public.quiz_attempts a on q.quiz_attempt_id = a.id
    where q.id = quiz_question_id and a.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.quiz_questions q 
    join public.quiz_attempts a on q.quiz_attempt_id = a.id
    where q.id = quiz_question_id and a.user_id = auth.uid()
  )
);
create policy "users can manage own weak topics" on public.weak_topics for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own assignments" on public.assignments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own timetables" on public.timetables for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own study schedule" on public.study_schedule for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own flashcards" on public.flashcards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Group Policies
create policy "members can read group" on public.study_groups for select using (
  exists (select 1 from public.group_members where group_id = id and user_id = auth.uid()) or created_by = auth.uid()
);
create policy "users can create groups" on public.study_groups for insert with check (auth.uid() = created_by);
create policy "members can read group members" on public.group_members for select using (
  exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
);
create policy "users can join groups" on public.group_members for insert with check (auth.uid() = user_id);

-- Gamification Policies
create policy "users can view own gamification" on public.gamification_profiles for select using (auth.uid() = user_id);
create policy "users can update own gamification" on public.gamification_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can insert own gamification" on public.gamification_profiles for insert with check (auth.uid() = user_id);

-- Badges are public read
create policy "anyone can read badges" on public.badges for select using (true);
create policy "users can read own badges" on public.student_badges for select using (auth.uid() = user_id);

-- AI Conversations
create policy "users can manage own ai conversations" on public.ai_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can manage own ai messages" on public.ai_messages for all using (
  exists (select 1 from public.ai_conversations where id = conversation_id and user_id = auth.uid())
) with check (
  exists (select 1 from public.ai_conversations where id = conversation_id and user_id = auth.uid())
);

-- Trigger to insert gamification profile on new auth user
create or replace function public.handle_new_user_gamification()
returns trigger as $$
begin
  insert into public.gamification_profiles (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- we can't create trigger on auth.users easily unless we have superuser.
-- wait, we CAN in supabase.
create trigger on_auth_user_created_gamification
  after insert on auth.users
  for each row execute procedure public.handle_new_user_gamification();

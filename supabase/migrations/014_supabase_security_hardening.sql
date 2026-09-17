-- ============================================================
-- SUPABASE PRODUCTION DATABASE — FINAL SAFE HARDENING
-- ============================================================
-- This migration safely cleans up duplicate RLS policies, applies
-- optimized (select auth.uid()) checks, and adds missing indexes.
-- No data is deleted. No tables are dropped.

-- ==========================================
-- PHASE 2 & 3: PROFILE RLS TARGET
-- ==========================================
DO $$ 
BEGIN
  -- Safely drop all overlapping profile policies
  DROP POLICY IF EXISTS "anyone can read profiles" ON public.student_profiles;
  DROP POLICY IF EXISTS "profiles are insertable" ON public.student_profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile." ON public.student_profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON public.student_profiles;
  DROP POLICY IF EXISTS "students insert own student profile" ON public.student_profiles;
  DROP POLICY IF EXISTS "Users can view their own profile." ON public.student_profiles;
  DROP POLICY IF EXISTS "Users can view their own profile" ON public.student_profiles;
  DROP POLICY IF EXISTS "profiles are viewable by owner or admin" ON public.student_profiles;
  DROP POLICY IF EXISTS "Users can update their own profile." ON public.student_profiles;
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.student_profiles;
  DROP POLICY IF EXISTS "profiles are updatable by owner or admin" ON public.student_profiles;
  DROP POLICY IF EXISTS "students update own student profile" ON public.student_profiles;
  DROP POLICY IF EXISTS "own student profile" ON public.student_profiles;
END $$;

-- Create minimal, safe, performant profile policies
CREATE POLICY "profiles_select_own_or_admin" ON public.student_profiles FOR SELECT USING (
  user_id = (select auth.uid()) OR public.is_staff()
);
CREATE POLICY "profiles_insert_own" ON public.student_profiles FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "profiles_update_own_or_admin" ON public.student_profiles FOR UPDATE USING (
  user_id = (select auth.uid()) OR public.is_staff()
) WITH CHECK (
  user_id = (select auth.uid()) OR public.is_staff()
);

-- ==========================================
-- PHASE 4: USER_SETTINGS RLS CLEANUP
-- ==========================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
  DROP POLICY IF EXISTS "Users can insert their own settings." ON public.user_settings;
  DROP POLICY IF EXISTS "users insert own settings" ON public.user_settings;
  DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
  DROP POLICY IF EXISTS "Users can view their own settings." ON public.user_settings;
  DROP POLICY IF EXISTS "users read own settings" ON public.user_settings;
  DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
  DROP POLICY IF EXISTS "Users can update their own settings." ON public.user_settings;
  DROP POLICY IF EXISTS "users update own settings" ON public.user_settings;
  DROP POLICY IF EXISTS "users can manage own settings" ON public.user_settings;
END $$;

CREATE POLICY "settings_select_own" ON public.user_settings FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "settings_insert_own" ON public.user_settings FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "settings_update_own" ON public.user_settings FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "settings_delete_own" ON public.user_settings FOR DELETE USING (user_id = (select auth.uid()));

-- ==========================================
-- PHASE 5: STUDENT_DIARIES RLS
-- ==========================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can manage their own diaries" ON public.student_diaries;
  DROP POLICY IF EXISTS "Users can insert their own diaries" ON public.student_diaries;
  DROP POLICY IF EXISTS "Users can update their own diaries" ON public.student_diaries;
  DROP POLICY IF EXISTS "Users can view their own diaries" ON public.student_diaries;
  DROP POLICY IF EXISTS "Users can delete their own diaries" ON public.student_diaries;
END $$;

CREATE POLICY "diary_select_own" ON public.student_diaries FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "diary_insert_own" ON public.student_diaries FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "diary_update_own" ON public.student_diaries FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "diary_delete_own" ON public.student_diaries FOR DELETE USING (user_id = (select auth.uid()));

-- ==========================================
-- PHASE 6: DIARY_ACCOUNTS
-- ==========================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own diary account" ON public.diary_accounts;
  DROP POLICY IF EXISTS "diary_accounts_select" ON public.diary_accounts;
  DROP POLICY IF EXISTS "Users can insert their own diary account" ON public.diary_accounts;
  DROP POLICY IF EXISTS "diary_accounts_insert" ON public.diary_accounts;
  DROP POLICY IF EXISTS "Users can update their own diary account" ON public.diary_accounts;
  DROP POLICY IF EXISTS "diary_accounts_update" ON public.diary_accounts;
END $$;

CREATE POLICY "diary_accounts_select_own" ON public.diary_accounts FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "diary_accounts_insert_own" ON public.diary_accounts FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "diary_accounts_update_own" ON public.diary_accounts FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "diary_accounts_delete_own" ON public.diary_accounts FOR DELETE USING (user_id = (select auth.uid()));

-- ==========================================
-- PHASE 7: AI TABLES
-- ==========================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.ai_conversations;
  DROP POLICY IF EXISTS "Users can read their own conversations" ON public.ai_conversations;
  DROP POLICY IF EXISTS "Users can update their own conversations" ON public.ai_conversations;
  DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.ai_conversations;
  DROP POLICY IF EXISTS "own conversations" ON public.ai_conversations;
  DROP POLICY IF EXISTS "users can manage own ai conversations" ON public.ai_conversations;

  DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON public.ai_messages;
  DROP POLICY IF EXISTS "Users can read messages from their conversations" ON public.ai_messages;
END $$;

CREATE POLICY "ai_conversations_select_own" ON public.ai_conversations FOR SELECT USING (user_id = (select auth.uid()));
CREATE POLICY "ai_conversations_insert_own" ON public.ai_conversations FOR INSERT WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "ai_conversations_update_own" ON public.ai_conversations FOR UPDATE USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "ai_conversations_delete_own" ON public.ai_conversations FOR DELETE USING (user_id = (select auth.uid()));

CREATE POLICY "ai_messages_select_own" ON public.ai_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = (select auth.uid()))
);
CREATE POLICY "ai_messages_insert_own" ON public.ai_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = (select auth.uid()))
);

-- ==========================================
-- PHASE 10: FOREIGN KEY INDEXES
-- ==========================================
-- Adding safe indexes for foreign keys (using IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON public.student_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_student_profiles_college_id ON public.student_profiles(college_id);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_student_diaries_user_id ON public.student_diaries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_accounts_user_id ON public.diary_accounts(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON public.assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON public.assignments(subject_id);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON public.topics(subject_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_notes_user_id ON public.knowledge_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_user_id ON public.attendance_records(student_user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_uploads_uploaded_by ON public.attendance_uploads(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic_id ON public.flashcards(topic_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_user_id ON public.timetable(user_id);

-- ============================================================
-- SUPABASE PRODUCTION DATABASE — FINAL SAFE HARDENING
-- ============================================================

-- ==========================================
-- PHASE 2 & 3: PROFILE RLS TARGET
-- ==========================================
DO $$ 
BEGIN
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
  DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.student_profiles;
  DROP POLICY IF EXISTS "profiles_insert_own" ON public.student_profiles;
  DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.student_profiles;
END $$;

CREATE POLICY "profiles_select_own_or_admin" ON public.student_profiles AS PERMISSIVE FOR SELECT TO authenticated USING (
  user_id = (select auth.uid()) OR public.is_staff()
);
CREATE POLICY "profiles_insert_own" ON public.student_profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "profiles_update_own_or_admin" ON public.student_profiles AS PERMISSIVE FOR UPDATE TO authenticated USING (
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
  DROP POLICY IF EXISTS "settings_select_own" ON public.user_settings;
  DROP POLICY IF EXISTS "settings_insert_own" ON public.user_settings;
  DROP POLICY IF EXISTS "settings_update_own" ON public.user_settings;
  DROP POLICY IF EXISTS "settings_delete_own" ON public.user_settings;
END $$;

CREATE POLICY "settings_select_own" ON public.user_settings AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "settings_insert_own" ON public.user_settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "settings_update_own" ON public.user_settings AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "settings_delete_own" ON public.user_settings AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

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
  DROP POLICY IF EXISTS "diary_select_own" ON public.student_diaries;
  DROP POLICY IF EXISTS "diary_insert_own" ON public.student_diaries;
  DROP POLICY IF EXISTS "diary_update_own" ON public.student_diaries;
  DROP POLICY IF EXISTS "diary_delete_own" ON public.student_diaries;
END $$;

CREATE POLICY "diary_select_own" ON public.student_diaries AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "diary_insert_own" ON public.student_diaries AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "diary_update_own" ON public.student_diaries AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "diary_delete_own" ON public.student_diaries AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

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
  DROP POLICY IF EXISTS "diary_accounts_select_own" ON public.diary_accounts;
  DROP POLICY IF EXISTS "diary_accounts_insert_own" ON public.diary_accounts;
  DROP POLICY IF EXISTS "diary_accounts_update_own" ON public.diary_accounts;
  DROP POLICY IF EXISTS "diary_accounts_delete_own" ON public.diary_accounts;
END $$;

CREATE POLICY "diary_accounts_select_own" ON public.diary_accounts AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "diary_accounts_insert_own" ON public.diary_accounts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "diary_accounts_update_own" ON public.diary_accounts AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "diary_accounts_delete_own" ON public.diary_accounts AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

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
  DROP POLICY IF EXISTS "ai_conversations_select_own" ON public.ai_conversations;
  DROP POLICY IF EXISTS "ai_conversations_insert_own" ON public.ai_conversations;
  DROP POLICY IF EXISTS "ai_conversations_update_own" ON public.ai_conversations;
  DROP POLICY IF EXISTS "ai_conversations_delete_own" ON public.ai_conversations;

  DROP POLICY IF EXISTS "Users can insert messages into their conversations" ON public.ai_messages;
  DROP POLICY IF EXISTS "Users can read messages from their conversations" ON public.ai_messages;
  DROP POLICY IF EXISTS "ai_messages_select_own" ON public.ai_messages;
  DROP POLICY IF EXISTS "ai_messages_insert_own" ON public.ai_messages;
END $$;

CREATE POLICY "ai_conversations_select_own" ON public.ai_conversations AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "ai_conversations_insert_own" ON public.ai_conversations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "ai_conversations_update_own" ON public.ai_conversations AS PERMISSIVE FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "ai_conversations_delete_own" ON public.ai_conversations AS PERMISSIVE FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

CREATE POLICY "ai_messages_select_own" ON public.ai_messages AS PERMISSIVE FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = (select auth.uid()))
);
CREATE POLICY "ai_messages_insert_own" ON public.ai_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.ai_conversations WHERE id = ai_messages.conversation_id AND user_id = (select auth.uid()))
);

-- ==========================================
-- PHASE 10: FOREIGN KEY INDEXES
-- ==========================================
-- Safely create indexes ONLY if the table exists AND no equivalent index exists.
-- Explicitly removed invalid `college_id` index.

CREATE OR REPLACE FUNCTION public.safe_create_index(table_name text, column_name text, index_name text)
RETURNS void AS $$
BEGIN
    -- Check if table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = safe_create_index.table_name
    ) THEN
        -- Check if column exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = safe_create_index.table_name 
            AND column_name = safe_create_index.column_name
        ) THEN
            -- Check if any index already starts with this column
            IF NOT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE tablename = safe_create_index.table_name 
                AND indexdef LIKE '%(' || safe_create_index.column_name || '%'
            ) THEN
                EXECUTE 'CREATE INDEX ' || index_name || ' ON public.' || table_name || '(' || column_name || ')';
            END IF;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  PERFORM public.safe_create_index('ai_messages', 'conversation_id', 'idx_ai_messages_conversation_id');
  PERFORM public.safe_create_index('assignments', 'subject_id', 'idx_assignments_subject_id');
  PERFORM public.safe_create_index('topics', 'subject_id', 'idx_topics_subject_id');
  PERFORM public.safe_create_index('attendance_records', 'student_user_id', 'idx_attendance_records_student_user_id');
  PERFORM public.safe_create_index('attendance_uploads', 'uploaded_by', 'idx_attendance_uploads_uploaded_by');
  PERFORM public.safe_create_index('flashcards', 'topic_id', 'idx_flashcards_topic_id');
END $$;

DROP FUNCTION IF EXISTS public.safe_create_index(text, text, text);

-- Migration: 017_external_learning_api_hardening.sql

-- 1. HARDEN api_cache

-- Drop the insecure public policy
DROP POLICY IF EXISTS "Backend can access cache" ON public.api_cache;

-- Create useful indexes for api_cache
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at ON public.api_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_api_cache_provider ON public.api_cache (provider);

-- 2. HARDEN learning_resources

-- Drop the bad unique constraint
ALTER TABLE public.learning_resources DROP CONSTRAINT IF EXISTS learning_resources_provider_external_id_key;

-- Add the correct unique constraint per user
ALTER TABLE public.learning_resources ADD CONSTRAINT learning_resources_user_provider_external_unique UNIQUE (user_id, provider, external_id);

-- Create indexes for learning_resources
CREATE INDEX IF NOT EXISTS idx_learning_resources_user_id ON public.learning_resources (user_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_provider ON public.learning_resources (provider);
CREATE INDEX IF NOT EXISTS idx_learning_resources_user_provider ON public.learning_resources (user_id, provider);

-- 3. FIX RLS POLICIES FOR learning_resources to use (select auth.uid())

DROP POLICY IF EXISTS "Users can read own resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Users can create own resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Users can update own resources" ON public.learning_resources;
DROP POLICY IF EXISTS "Users can delete own resources" ON public.learning_resources;

CREATE POLICY "Users can read own learning resources"
ON public.learning_resources
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own learning resources"
ON public.learning_resources
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own learning resources"
ON public.learning_resources
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own learning resources"
ON public.learning_resources
FOR DELETE
TO authenticated
USING ((select auth.uid()) = user_id);

-- 4. ADD updated_at TRIGGER

CREATE OR REPLACE FUNCTION public.update_learning_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_learning_resources_updated_at ON public.learning_resources;
CREATE TRIGGER trg_learning_resources_updated_at
BEFORE UPDATE ON public.learning_resources
FOR EACH ROW
EXECUTE FUNCTION public.update_learning_resources_updated_at();

-- 5. ATTENDANCE RLS HARDENING

DROP POLICY IF EXISTS "Users can insert their own attendance" ON public.attendance_records;
CREATE POLICY "Users can insert their own attendance"
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = student_id);

DROP POLICY IF EXISTS "Users can view their own attendance" ON public.attendance_records;
CREATE POLICY "Users can view their own attendance"
ON public.attendance_records
FOR SELECT
TO authenticated
USING ((select auth.uid()) = student_id OR (select auth.uid()) IN (SELECT id FROM public.student_profiles WHERE role = 'admin'));

-- 6. INDEXES

CREATE INDEX IF NOT EXISTS idx_flashcards_topic_id ON public.flashcards (topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON public.flashcards (user_id);

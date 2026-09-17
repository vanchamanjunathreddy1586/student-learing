-- Migration: 018_real_lesson_system.sql

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;
-- Create tracking tables for user-uploaded lessons and their exact reading progress

-- 1. Create storage bucket for learning materials if it doesn't exist
-- Note: Storage buckets are usually created via Supabase Dashboard or API, but we insert the record if we can.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('learning_materials', 'learning_materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for learning_materials
-- (Using IF NOT EXISTS where possible or catching errors via Supabase dashboard in practice)
-- CREATE POLICY "Users can upload own materials" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'learning_materials' AND (select auth.uid()) = owner);
-- CREATE POLICY "Users can view own materials" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'learning_materials' AND (select auth.uid()) = owner);
-- CREATE POLICY "Users can delete own materials" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'learning_materials' AND (select auth.uid()) = owner);

-- 2. Modify existing learning_materials table safely
-- Existing columns: id, user_id, subject_id, title, file_url, file_type, extracted_text, summary, created_at

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_materials' AND column_name = 'file_name') THEN
        ALTER TABLE public.learning_materials ADD COLUMN file_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_materials' AND column_name = 'file_size') THEN
        ALTER TABLE public.learning_materials ADD COLUMN file_size BIGINT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_materials' AND column_name = 'total_pages') THEN
        ALTER TABLE public.learning_materials ADD COLUMN total_pages INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'learning_materials' AND column_name = 'updated_at') THEN
        ALTER TABLE public.learning_materials ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Drop unique constraint that prevents same file from being uploaded if the user changes it (optional, but let's keep it safe)
-- The existing table might have unique constraints from previous migrations, let's just make sure user_id is indexed.
CREATE INDEX IF NOT EXISTS idx_learning_materials_user_id ON public.learning_materials(user_id);

-- Add updated_at trigger for learning_materials
DROP TRIGGER IF EXISTS trg_learning_materials_updated_at ON public.learning_materials;
CREATE TRIGGER trg_learning_materials_updated_at
BEFORE UPDATE ON public.learning_materials
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 3. Create learning_progress table
CREATE TABLE IF NOT EXISTS public.learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.learning_materials(id) ON DELETE CASCADE,
    current_page INTEGER DEFAULT 1,
    current_section TEXT,
    scroll_position NUMERIC DEFAULT 0,
    progress_percentage NUMERIC DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    last_opened_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_material_progress UNIQUE(user_id, material_id)
);

-- Indexes for learning_progress
CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON public.learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_material_id ON public.learning_progress(material_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_last_opened ON public.learning_progress(last_opened_at DESC);

-- Enable RLS on learning_progress
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

-- Progress Policies
DROP POLICY IF EXISTS "Users can read own progress" ON public.learning_progress;
CREATE POLICY "Users can read own progress"
ON public.learning_progress FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.learning_progress;
CREATE POLICY "Users can insert own progress"
ON public.learning_progress FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.learning_progress;
CREATE POLICY "Users can update own progress"
ON public.learning_progress FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own progress" ON public.learning_progress;
CREATE POLICY "Users can delete own progress"
ON public.learning_progress FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);

-- Add updated_at trigger for learning_progress
DROP TRIGGER IF EXISTS trg_learning_progress_updated_at ON public.learning_progress;
CREATE TRIGGER trg_learning_progress_updated_at
BEFORE UPDATE ON public.learning_progress
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

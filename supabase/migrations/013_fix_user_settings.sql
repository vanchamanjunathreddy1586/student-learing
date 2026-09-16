-- Fix user_settings schema as requested by user to support upsert with onConflict: 'user_id'

-- 1. Ensure the table exists with the exact columns requested
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text DEFAULT 'dark',
  accent_color text DEFAULT '#62e6e2',
  ui_density text DEFAULT 'comfortable',
  animations_enabled boolean DEFAULT true,
  effects_3d_enabled boolean DEFAULT true,
  reduced_motion boolean DEFAULT false,
  notifications jsonb DEFAULT '{
    "push": true,
    "email": true,
    "assignments": true,
    "quizzes": true,
    "study": true,
    "ai": true
  }'::jsonb,
  learning_preferences jsonb DEFAULT '{
    "study_goal": 45,
    "reminder_time": "18:00",
    "difficulty": "balanced",
    "default_mode": "guided"
  }'::jsonb,
  ai_preferences jsonb DEFAULT '{
    "default_provider": "demo",
    "default_model": "guided-tutor",
    "temperature": 0.7,
    "token_limit": 2048,
    "response_style": "concise",
    "language": "en",
    "system_prompt": "You are a patient, precise learning companion."
  }'::jsonb,
  enabled_tools jsonb DEFAULT '["ai-teacher","supabase-storage"]'::jsonb,
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- If the table existed previously and user_id was the PK, we need to alter it to have an 'id' column as PK.
-- But wait, modifying a PK is risky. Let's instead just ensure the missing columns exist, 
-- and ensure the UNIQUE constraint exists on user_id.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'id') THEN
        ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
        ALTER TABLE public.user_settings ADD COLUMN id uuid PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_settings' AND column_name = 'reduced_motion') THEN
        ALTER TABLE public.user_settings ADD COLUMN reduced_motion boolean DEFAULT false;
    END IF;
END $$;

-- 3. CRITICAL: UNIQUE(user_id) for upsert onConflict: 'user_id'
-- First safely remove it if it existed as something else, or just create it if not exists (Postgres 11+)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_key') THEN
    ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 4. & 5. Enable RLS & Policies
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

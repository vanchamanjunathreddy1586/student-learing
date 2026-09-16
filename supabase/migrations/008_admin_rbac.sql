-- 008_admin_rbac.sql

-- 1. Modify student_profiles
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student',
ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- 2. Colleges Table
CREATE TABLE IF NOT EXISTS public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Master Subjects Table
CREATE TABLE IF NOT EXISTS public.master_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Admin View for User Management
-- (To allow admins to see profiles and daily activity easily)
CREATE OR REPLACE VIEW public.admin_user_overview AS
SELECT 
  sp.id as profile_id,
  sp.user_id,
  sp.full_name,
  sp.email,
  sp.college,
  sp.role,
  sp.is_banned,
  sp.created_at,
  COALESCE(SUM(sda.study_minutes), 0) as total_study_minutes
FROM public.student_profiles sp
LEFT JOIN public.student_daily_activity sda ON sp.user_id = sda.user_id
GROUP BY sp.id, sp.user_id, sp.full_name, sp.email, sp.college, sp.role, sp.is_banned, sp.created_at;

-- 5. RLS Policies

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_subjects ENABLE ROW LEVEL SECURITY;

-- Colleges: Anyone can read, only admins can modify
CREATE POLICY "anyone can read colleges" ON public.colleges FOR SELECT USING (true);
CREATE POLICY "admins can insert colleges" ON public.colleges FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admins can update colleges" ON public.colleges FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Master Subjects: Anyone can read, only admins can modify
CREATE POLICY "anyone can read master subjects" ON public.master_subjects FOR SELECT USING (true);
CREATE POLICY "admins can insert master subjects" ON public.master_subjects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "admins can update master subjects" ON public.master_subjects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Student Profiles: Update existing policies to allow admins to manage all profiles
DROP POLICY IF EXISTS "students read own student profile" ON public.student_profiles;
CREATE POLICY "profiles are viewable by owner or admin" ON public.student_profiles FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "students update own student profile" ON public.student_profiles;
CREATE POLICY "profiles are updatable by owner or admin" ON public.student_profiles FOR UPDATE USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

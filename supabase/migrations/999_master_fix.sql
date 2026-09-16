-- ==========================================
-- MASTER FULL SQL FIX (IDEMPOTENT)
-- ==========================================

-- 1. Create Base Tables (If they don't exist)
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text,
  email text,
  year text,
  college text,
  profile_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_daily_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  activity_date date NOT NULL,
  study_minutes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS public.colleges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.master_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add New Columns (Safe to run multiple times)
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'student';
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- 3. Create Admin View
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

-- 4. Enable RLS everywhere
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_subjects ENABLE ROW LEVEL SECURITY;

-- 5. Wipe ALL old overlapping Policies
DROP POLICY IF EXISTS "profiles are viewable by owner or admin" ON public.student_profiles;
DROP POLICY IF EXISTS "profiles are updatable by owner or admin" ON public.student_profiles;
DROP POLICY IF EXISTS "students read own student profile" ON public.student_profiles;
DROP POLICY IF EXISTS "students update own student profile" ON public.student_profiles;

DROP POLICY IF EXISTS "anyone can read colleges" ON public.colleges;
DROP POLICY IF EXISTS "admins can insert colleges" ON public.colleges;
DROP POLICY IF EXISTS "admins can update colleges" ON public.colleges;
DROP POLICY IF EXISTS "admins and owners can insert colleges" ON public.colleges;
DROP POLICY IF EXISTS "admins and owners can update colleges" ON public.colleges;

DROP POLICY IF EXISTS "anyone can read master subjects" ON public.master_subjects;
DROP POLICY IF EXISTS "admins can insert master subjects" ON public.master_subjects;
DROP POLICY IF EXISTS "admins can update master subjects" ON public.master_subjects;
DROP POLICY IF EXISTS "admins and owners can insert master subjects" ON public.master_subjects;
DROP POLICY IF EXISTS "admins and owners can update master subjects" ON public.master_subjects;

-- 6. Create the Safe RLS Function (Stops the infinite loop)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.student_profiles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'lecturer')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Apply Safe Profiles Policies
CREATE POLICY "anyone can read profiles" ON public.student_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "profiles are updatable by owner or admin" ON public.student_profiles FOR UPDATE USING (user_id = auth.uid() OR public.is_staff());
CREATE POLICY "profiles are insertable" ON public.student_profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- 8. Apply Safe Colleges Policies
CREATE POLICY "anyone can read colleges" ON public.colleges FOR SELECT USING (true);
CREATE POLICY "admins and owners can insert colleges" ON public.colleges FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "admins and owners can update colleges" ON public.colleges FOR UPDATE USING (public.is_staff());

-- 9. Apply Safe Subject Policies
CREATE POLICY "anyone can read master subjects" ON public.master_subjects FOR SELECT USING (true);
CREATE POLICY "admins and owners can insert master subjects" ON public.master_subjects FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "admins and owners can update master subjects" ON public.master_subjects FOR UPDATE USING (public.is_staff());

-- 10. Fix Auth Trigger (Automatically creates profile on sign up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.student_profiles (user_id, email, full_name, profile_completed, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    false,
    CASE WHEN new.email = 'manjunathreddyvancha@gmail.com' THEN 'owner' ELSE 'student' END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

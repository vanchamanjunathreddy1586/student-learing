-- 009_owner_role.sql

-- 1. Ensure the owner role exists in RLS
-- Owner should have all admin privileges, so we update the policies to include 'owner'

DROP POLICY IF EXISTS "admins can insert colleges" ON public.colleges;
CREATE POLICY "admins and owners can insert colleges" ON public.colleges FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

DROP POLICY IF EXISTS "admins can update colleges" ON public.colleges;
CREATE POLICY "admins and owners can update colleges" ON public.colleges FOR UPDATE USING (EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

DROP POLICY IF EXISTS "admins can insert master subjects" ON public.master_subjects;
CREATE POLICY "admins and owners can insert master subjects" ON public.master_subjects FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

DROP POLICY IF EXISTS "admins can update master subjects" ON public.master_subjects;
CREATE POLICY "admins and owners can update master subjects" ON public.master_subjects FOR UPDATE USING (EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

DROP POLICY IF EXISTS "profiles are viewable by owner or admin" ON public.student_profiles;
CREATE POLICY "profiles are viewable by owner or admin" ON public.student_profiles FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

DROP POLICY IF EXISTS "profiles are updatable by owner or admin" ON public.student_profiles;
CREATE POLICY "profiles are updatable by owner or admin" ON public.student_profiles FOR UPDATE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.student_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'owner')));

-- 2. Trigger to automatically assign the 'owner' role to the specified email
CREATE OR REPLACE FUNCTION public.auto_assign_owner_role()
RETURNS trigger AS $$
BEGIN
  IF NEW.email = 'manjunathreddyvancha@gmail.com' THEN
    NEW.role := 'owner';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_created_assign_owner ON public.student_profiles;
CREATE TRIGGER on_profile_created_assign_owner
  BEFORE INSERT OR UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.auto_assign_owner_role();

-- 3. Update existing row just in case it already exists
UPDATE public.student_profiles 
SET role = 'owner' 
WHERE email = 'manjunathreddyvancha@gmail.com';

-- 012_admin_attendance.sql

-- 1. Modify student_profiles
ALTER TABLE public.student_profiles 
ADD COLUMN IF NOT EXISTS student_id text UNIQUE,
ADD COLUMN IF NOT EXISTS section text;

-- 2. Create Attendance Uploads Table (Audit log)
CREATE TABLE IF NOT EXISTS public.attendance_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  total_records integer NOT NULL DEFAULT 0,
  successful_records integer NOT NULL DEFAULT 0,
  failed_records integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  attendance_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Excused')),
  upload_id uuid REFERENCES public.attendance_uploads(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_user_id, subject_name, attendance_date) -- Prevent duplicates for same student, subject, and date
);

-- 4. Enable RLS
ALTER TABLE public.attendance_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Attendance Uploads (Admins only)
CREATE POLICY "Admins can view attendance uploads" 
ON public.attendance_uploads FOR SELECT 
USING (public.is_staff());

CREATE POLICY "Admins can insert attendance uploads" 
ON public.attendance_uploads FOR INSERT 
WITH CHECK (public.is_staff());

-- 6. Policies for Attendance Records
-- Admins can do everything
CREATE POLICY "Admins can manage all attendance records" 
ON public.attendance_records FOR ALL 
USING (public.is_staff()) 
WITH CHECK (public.is_staff());

-- Students can view only their own records
CREATE POLICY "Students can view their own attendance" 
ON public.attendance_records FOR SELECT 
USING (auth.uid() = student_user_id);

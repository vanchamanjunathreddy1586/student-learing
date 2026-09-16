-- Create diary_accounts table
CREATE TABLE IF NOT EXISTS public.diary_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    password_hash text NOT NULL,
    pin_hash text NOT NULL,
    failed_attempts integer DEFAULT 0,
    locked_until timestamptz NULL,
    last_login timestamptz NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diary_accounts ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "Users can view their own diary account" ON public.diary_accounts;
CREATE POLICY "Users can view their own diary account"
  ON public.diary_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert policy
DROP POLICY IF EXISTS "Users can insert their own diary account" ON public.diary_accounts;
CREATE POLICY "Users can insert their own diary account"
  ON public.diary_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update policy
DROP POLICY IF EXISTS "Users can update their own diary account" ON public.diary_accounts;
CREATE POLICY "Users can update their own diary account"
  ON public.diary_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Migration: 016_external_learning_apis.sql
-- Create learning resources and api cache tables

CREATE TABLE IF NOT EXISTS public.api_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    cache_key text NOT NULL,
    response jsonb NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(provider, cache_key)
);

CREATE TABLE IF NOT EXISTS public.learning_resources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    provider text NOT NULL,
    external_id text NOT NULL,
    resource_type text NOT NULL,
    title text,
    description text,
    author text,
    cover_url text,
    resource_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(provider, external_id)
);

-- Enable RLS
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_cache ENABLE ROW LEVEL SECURITY;

-- Policies for learning_resources
CREATE POLICY "Users can read own resources" ON public.learning_resources 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own resources" ON public.learning_resources 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resources" ON public.learning_resources 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own resources" ON public.learning_resources 
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for api_cache (Backend only, so no public access or limited read)
-- If the backend is making queries, it uses the service role key or its own logic.
-- To allow the authenticated user to read it if requested directly (though not recommended), we can restrict it.
-- We will just leave it restricted so only service_role can access it, or let anyone authenticated read it.
-- Let's just lock it down completely for client-side, the backend accesses it using its own connection.
-- Actually the backend uses the same uthenticate middleware which extracts the token. 
-- Wait, if backend uses supabase initialized with SUPABASE_ANON_KEY, RLS will block it if there's no policy!
-- No, backend supabase might be initialized with SUPABASE_SERVICE_ROLE_KEY if present, but usually we use anon.
-- Wait, in server/index.js, we use process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY.
-- So it acts as anon! Thus, we MUST allow anon or authenticated to select/insert cache.
-- Actually, the backend should probably bypass RLS for cache. Wait, does backend use anon key?
-- server/index.js creates a supabase client. But it doesn't pass the JWT token to the client it created globally!
-- So global supabase in server/index.js acts as an anonymous user!
CREATE POLICY "Backend can access cache" ON public.api_cache
    FOR ALL USING (true) WITH CHECK (true);

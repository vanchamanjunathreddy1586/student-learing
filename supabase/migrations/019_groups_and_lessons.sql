-- 019_groups_and_lessons.sql

-- 1. Modify study_groups
ALTER TABLE public.study_groups 
ADD COLUMN IF NOT EXISTS subject text,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cover_image text;

-- 2. Group Join Requests
CREATE TABLE IF NOT EXISTS public.group_join_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_group_join_requests_updated_at
BEFORE UPDATE ON public.group_join_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Policies for join requests
-- Users can see their own requests
CREATE POLICY "Users can see own join requests" ON public.group_join_requests 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Group admins can see requests for their groups
CREATE POLICY "Admins can see group requests" ON public.group_join_requests 
FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = group_id AND created_by = auth.uid())
);

-- Users can create requests for themselves
CREATE POLICY "Users can request to join" ON public.group_join_requests 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can update requests
CREATE POLICY "Admins can update requests" ON public.group_join_requests 
FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = group_id AND created_by = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = group_id AND created_by = auth.uid())
);

-- Users can delete their own pending requests
CREATE POLICY "Users can delete own requests" ON public.group_join_requests 
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Group Posts (Discussions)
CREATE TABLE IF NOT EXISTS public.group_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_group_posts_updated_at
BEFORE UPDATE ON public.group_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Policies for group posts
-- Group members can read posts
CREATE POLICY "Members can read posts" ON public.group_posts 
FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.group_posts.group_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = public.group_posts.group_id AND created_by = auth.uid())
);

-- Group members can create posts
CREATE POLICY "Members can create posts" ON public.group_posts 
FOR INSERT TO authenticated WITH CHECK (
    (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.group_posts.group_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = public.group_posts.group_id AND created_by = auth.uid()))
    AND auth.uid() = user_id
);

-- Users can delete own posts or admins can delete any
CREATE POLICY "Users can delete own posts or admins can delete" ON public.group_posts 
FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    OR
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = public.group_posts.group_id AND created_by = auth.uid())
);

-- 4. Group Materials (Sharing existing materials to a group)
CREATE TABLE IF NOT EXISTS public.group_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
    material_id uuid NOT NULL REFERENCES public.learning_materials(id) ON DELETE CASCADE,
    shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(group_id, material_id)
);

ALTER TABLE public.group_materials ENABLE ROW LEVEL SECURITY;

-- Group members can read group materials
CREATE POLICY "Members can read group materials" ON public.group_materials 
FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.group_materials.group_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = public.group_materials.group_id AND created_by = auth.uid())
);

-- Group members can share their own materials
CREATE POLICY "Members can share materials" ON public.group_materials 
FOR INSERT TO authenticated WITH CHECK (
    (EXISTS (SELECT 1 FROM public.group_members WHERE group_id = public.group_materials.group_id AND user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = public.group_materials.group_id AND created_by = auth.uid()))
    AND auth.uid() = shared_by
);

-- Sharers can unshare, admins can remove any
CREATE POLICY "Sharers or admins can remove materials" ON public.group_materials 
FOR DELETE TO authenticated USING (
    auth.uid() = shared_by
    OR
    EXISTS (SELECT 1 FROM public.study_groups WHERE id = public.group_materials.group_id AND created_by = auth.uid())
);

-- 5. Allow group members to read the actual learning_materials if shared to a group they are in
-- Note: learning_materials already has a policy "users can manage own materials". We need to ADD a select policy.
CREATE POLICY "Members can read shared learning_materials" ON public.learning_materials 
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.group_materials gm
        JOIN public.group_members gmem ON gmem.group_id = gm.group_id
        WHERE gm.material_id = public.learning_materials.id AND gmem.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.group_materials gm
        JOIN public.study_groups sg ON sg.id = gm.group_id
        WHERE gm.material_id = public.learning_materials.id AND sg.created_by = auth.uid()
    )
);

-- 6. Update study_groups policies for public groups
-- Currently in 006:
-- create policy "members can read group" on public.study_groups for select using (
--   exists (select 1 from public.group_members where group_id = id and user_id = auth.uid()) or created_by = auth.uid()
-- );
-- We need to DROP it and replace it so anyone can see public groups.
DROP POLICY IF EXISTS "members can read group" ON public.study_groups;
CREATE POLICY "anyone can read public groups or members can read private" ON public.study_groups 
FOR SELECT TO authenticated USING (
    is_public = true 
    OR created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.group_members WHERE group_id = id AND user_id = auth.uid())
);

-- Ensure group admins can update group info
CREATE POLICY "Admins can update group" ON public.study_groups 
FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

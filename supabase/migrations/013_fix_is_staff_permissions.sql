-- Fix for Profile Setup Upsert Failure
-- The UPSERT command requires evaluating the UPDATE policy, which relies on public.is_staff().
-- If the authenticated user does not have EXECUTE permission on this function, the UPSERT fails.

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_diary_owner(uuid) TO authenticated;

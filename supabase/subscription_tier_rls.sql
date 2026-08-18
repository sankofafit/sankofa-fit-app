-- Subscription tier defaults + RLS for profile updates (run in Supabase SQL Editor)

ALTER TABLE public.users
ALTER COLUMN subscription_tier SET DEFAULT 'free';

UPDATE public.users
SET subscription_tier = 'free'
WHERE subscription_tier IS NULL;

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

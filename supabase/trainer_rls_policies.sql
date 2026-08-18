-- Trainer dashboard: allow trainers to read/write their own row (including unapproved).
-- Run in Supabase SQL Editor.

ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers manage own profile" ON public.trainers;
DROP POLICY IF EXISTS "Trainers can manage own profile" ON public.trainers;
DROP POLICY IF EXISTS "Anyone can view approved trainers" ON public.trainers;
DROP POLICY IF EXISTS "Trainer can read own profile" ON public.trainers;
DROP POLICY IF EXISTS "Trainer can insert own profile" ON public.trainers;
DROP POLICY IF EXISTS "Trainer can update own profile" ON public.trainers;
DROP POLICY IF EXISTS "Admin can view all trainers" ON public.trainers;
DROP POLICY IF EXISTS "Admin can update all trainers" ON public.trainers;

CREATE POLICY "Trainer can read own profile"
ON public.trainers FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR
  (is_approved = true AND is_active = true)
);

CREATE POLICY "Trainer can insert own profile"
ON public.trainers FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Trainer can update own profile"
ON public.trainers FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Admin can view all trainers"
ON public.trainers FOR SELECT
TO authenticated
USING (
  auth.email() = 'samamponsah775@gmail.com'
);

CREATE POLICY "Admin can update all trainers"
ON public.trainers FOR UPDATE
TO authenticated
USING (
  auth.email() = 'samamponsah775@gmail.com'
);

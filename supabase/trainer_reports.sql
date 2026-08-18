-- Trainer reports (users report trainers to admin)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.trainer_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid REFERENCES public.trainers ON DELETE CASCADE,
  trainer_name text,
  reported_by uuid REFERENCES auth.users ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.trainer_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit reports" ON public.trainer_reports;
CREATE POLICY "Users can submit reports"
ON public.trainer_reports FOR INSERT
TO authenticated
WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Users can view own reports" ON public.trainer_reports;
CREATE POLICY "Users can view own reports"
ON public.trainer_reports FOR SELECT
TO authenticated
USING (reported_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view all reports" ON public.trainer_reports;
CREATE POLICY "Admins can view all reports"
ON public.trainer_reports FOR SELECT
TO authenticated
USING (public.is_sankofa_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.trainer_reports;
CREATE POLICY "Admins can update reports"
ON public.trainer_reports FOR UPDATE
TO authenticated
USING (public.is_sankofa_admin());

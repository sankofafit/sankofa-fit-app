-- Trainer subscription plans
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.trainer_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid REFERENCES public.trainers ON DELETE CASCADE,
  type text NOT NULL,
  sessions_per_week integer NOT NULL DEFAULT 1,
  price_ghs numeric NOT NULL,
  description text,
  duration_days integer NOT NULL DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.trainer_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active subscriptions" ON public.trainer_subscriptions;
CREATE POLICY "Anyone can view active subscriptions"
ON public.trainer_subscriptions FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "Trainers manage own subscriptions" ON public.trainer_subscriptions;
CREATE POLICY "Trainers manage own subscriptions"
ON public.trainer_subscriptions FOR ALL
TO authenticated
USING (
  trainer_id IN (
    SELECT id FROM public.trainers WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  trainer_id IN (
    SELECT id FROM public.trainers WHERE owner_id = auth.uid()
  )
);

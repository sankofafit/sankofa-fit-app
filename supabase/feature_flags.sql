CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by text
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feature flags" ON public.feature_flags;
CREATE POLICY "Anyone can read feature flags"
ON public.feature_flags FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can insert feature flags" ON public.feature_flags;
CREATE POLICY "Admin can insert feature flags"
ON public.feature_flags FOR INSERT
TO authenticated
WITH CHECK (
  auth.email() = 'samamponsah775@gmail.com'
  OR auth.email() LIKE '%@sankofafit.com'
);

DROP POLICY IF EXISTS "Admin can update feature flags" ON public.feature_flags;
CREATE POLICY "Admin can update feature flags"
ON public.feature_flags FOR UPDATE
TO authenticated
USING (
  auth.email() = 'samamponsah775@gmail.com'
  OR auth.email() LIKE '%@sankofafit.com'
)
WITH CHECK (
  auth.email() = 'samamponsah775@gmail.com'
  OR auth.email() LIKE '%@sankofafit.com'
);

-- Default flags (all enabled)
INSERT INTO public.feature_flags (key, enabled) VALUES
  ('gym_class_booking', true),
  ('trainer_session_booking', true),
  ('gym_membership', true),
  ('trainer_subscriptions', true),
  ('drop_in_booking', true),
  ('paystack_payments', true),
  ('pro_subscription', true),
  ('premium_subscription', true),
  ('trainer_chat', true),
  ('trainer_reviews', true),
  ('trainer_reports', true),
  ('gym_listings', true),
  ('trainer_listings', true),
  ('classes_today', true),
  ('workout_plans', true),
  ('meal_plans', true),
  ('step_counter', true),
  ('progress_tracking', true)
ON CONFLICT (key) DO NOTHING;

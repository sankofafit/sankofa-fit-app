-- Gym memberships + extra gym_bookings columns (Supabase SQL Editor)

ALTER TABLE public.gym_bookings
ADD COLUMN IF NOT EXISTS gym_name text,
ADD COLUMN IF NOT EXISTS class_time text,
ADD COLUMN IF NOT EXISTS trainer_name text,
ADD COLUMN IF NOT EXISTS booking_reference text;

CREATE TABLE IF NOT EXISTS public.gym_memberships (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  gym_name text,
  gym_id text,
  membership_type text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  amount_ghs numeric,
  paystack_reference text,
  status text DEFAULT 'active',
  membership_reference text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.gym_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memberships" ON public.gym_memberships;
DROP POLICY IF EXISTS "Users can insert own memberships" ON public.gym_memberships;

CREATE POLICY "Users can view own memberships"
  ON public.gym_memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memberships"
  ON public.gym_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

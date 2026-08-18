-- Run in Supabase SQL Editor (subscription + booking payments)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS paystack_reference text,
ADD COLUMN IF NOT EXISTS paystack_customer_code text,
ADD COLUMN IF NOT EXISTS subscription_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_end timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.gym_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  gym_id text,
  class_name text,
  booking_date timestamp with time zone,
  amount_ghs numeric,
  paystack_reference text,
  status text DEFAULT 'confirmed',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.trainer_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  trainer_id text,
  session_type text,
  session_date text,
  session_time text,
  amount_ghs numeric,
  paystack_reference text,
  status text DEFAULT 'confirmed',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.gym_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own gym bookings"
  ON public.gym_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own gym bookings"
  ON public.gym_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own trainer bookings"
  ON public.trainer_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trainer bookings"
  ON public.trainer_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

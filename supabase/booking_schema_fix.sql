-- Run in Supabase SQL Editor — booking columns + RLS

-- Add missing columns to gym_bookings
ALTER TABLE public.gym_bookings
ADD COLUMN IF NOT EXISTS class_time text,
ADD COLUMN IF NOT EXISTS trainer_name text,
ADD COLUMN IF NOT EXISTS booking_reference text,
ADD COLUMN IF NOT EXISTS gym_name text;

-- Add missing columns to trainer_bookings
ALTER TABLE public.trainer_bookings
ADD COLUMN IF NOT EXISTS booking_reference text,
ADD COLUMN IF NOT EXISTS trainer_name text;

-- Fix RLS policies for gym_bookings
DROP POLICY IF EXISTS "Users can insert own gym bookings" ON public.gym_bookings;
CREATE POLICY "Users can insert own gym bookings"
  ON public.gym_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own gym bookings" ON public.gym_bookings;
CREATE POLICY "Users can view own gym bookings"
  ON public.gym_bookings FOR SELECT
  USING (auth.uid() = user_id);

-- Fix RLS for trainer_bookings
DROP POLICY IF EXISTS "Users can insert own trainer bookings" ON public.trainer_bookings;
CREATE POLICY "Users can insert own trainer bookings"
  ON public.trainer_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own trainer bookings" ON public.trainer_bookings;
CREATE POLICY "Users can view own trainer bookings"
  ON public.trainer_bookings FOR SELECT
  USING (auth.uid() = user_id);

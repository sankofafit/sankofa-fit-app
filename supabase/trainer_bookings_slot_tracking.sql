-- Trainer booking slot tracking (run in Supabase SQL Editor)
-- Extends existing trainer_bookings; safe to re-run.

ALTER TABLE public.trainer_bookings
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.trainer_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_name text,
  ADD COLUMN IF NOT EXISTS session_duration_mins integer,
  ADD COLUMN IF NOT EXISTS session_format text DEFAULT 'in-person',
  ADD COLUMN IF NOT EXISTS booking_date date,
  ADD COLUMN IF NOT EXISTS booking_time text,
  ADD COLUMN IF NOT EXISTS booking_time_end text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

-- Backfill from legacy columns
UPDATE public.trainer_bookings
SET booking_date = session_date::date
WHERE booking_date IS NULL
  AND session_date IS NOT NULL
  AND session_date ~ '^\d{4}-\d{2}-\d{2}';

UPDATE public.trainer_bookings
SET booking_time = session_time
WHERE booking_time IS NULL AND session_time IS NOT NULL;

ALTER TABLE public.trainer_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trainer bookings" ON public.trainer_bookings;
DROP POLICY IF EXISTS "Users view own trainer bookings" ON public.trainer_bookings;
DROP POLICY IF EXISTS "View active trainer slots for booking" ON public.trainer_bookings;
DROP POLICY IF EXISTS "Users can insert own trainer bookings" ON public.trainer_bookings;
DROP POLICY IF EXISTS "Users can book trainers" ON public.trainer_bookings;
DROP POLICY IF EXISTS "Trainers can update bookings" ON public.trainer_bookings;

-- Slot overlap checks: any signed-in user can read active holds
CREATE POLICY "View active trainer slots for booking"
ON public.trainer_bookings FOR SELECT
TO authenticated
USING (status IN ('confirmed', 'pending'));

CREATE POLICY "Users view own trainer bookings"
ON public.trainer_bookings FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR trainer_id::text IN (
    SELECT id::text FROM public.trainers
    WHERE owner_id = auth.uid()
  )
  OR auth.email() = 'samamponsah775@gmail.com'
);

CREATE POLICY "Users can book trainers"
ON public.trainer_bookings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Trainers can update bookings"
ON public.trainer_bookings FOR UPDATE
TO authenticated
USING (
  trainer_id::text IN (
    SELECT id::text FROM public.trainers
    WHERE owner_id = auth.uid()
  )
  OR auth.email() = 'samamponsah775@gmail.com'
);

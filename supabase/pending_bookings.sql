-- Paid but not persisted — run in Supabase SQL Editor (safety net for support reconciliation)

CREATE TABLE IF NOT EXISTS public.pending_bookings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  booking_kind text NOT NULL,
  paystack_reference text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  error_code text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pending_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own pending bookings" ON public.pending_bookings;
DROP POLICY IF EXISTS "Users can view own pending bookings" ON public.pending_bookings;

CREATE POLICY "Users can insert own pending bookings"
  ON public.pending_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own pending bookings"
  ON public.pending_bookings FOR SELECT
  USING (auth.uid() = user_id);

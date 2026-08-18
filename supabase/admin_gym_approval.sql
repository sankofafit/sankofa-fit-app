-- Admin gym approval fields + activity log (run in Supabase SQL Editor)

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_id uuid,
  target_name text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated admin activity log" ON public.admin_activity_log;
CREATE POLICY "Authenticated admin activity log"
  ON public.admin_activity_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Realtime (enable in Database → Replication if tables not listed):
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.gyms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_bookings;

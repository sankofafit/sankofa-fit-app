CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid,
  actor_email text,
  actor_name text,
  actor_type text,
  action text NOT NULL,
  category text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  status text DEFAULT 'success',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads all logs" ON public.activity_logs;
CREATE POLICY "Admin reads all logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  auth.email() = 'samamponsah775@gmail.com'
);

DROP POLICY IF EXISTS "Anyone can write logs" ON public.activity_logs;
CREATE POLICY "Anyone can write logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_logs_created_at
ON public.activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_actor_type
ON public.activity_logs(actor_type);

CREATE INDEX IF NOT EXISTS idx_logs_category
ON public.activity_logs(category);

CREATE INDEX IF NOT EXISTS idx_logs_action
ON public.activity_logs(action);

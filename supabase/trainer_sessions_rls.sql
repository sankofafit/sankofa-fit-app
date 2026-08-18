-- Mobile app: read active session types for approved trainers (nested select on trainers).
-- Run in Supabase SQL Editor after trainer_sessions table exists.

ALTER TABLE public.trainer_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active trainer sessions" ON public.trainer_sessions;
DROP POLICY IF EXISTS "Trainer manages own sessions" ON public.trainer_sessions;

CREATE POLICY "Public read active trainer sessions"
ON public.trainer_sessions FOR SELECT
TO authenticated, anon
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM public.trainers t
    WHERE t.id = trainer_sessions.trainer_id
      AND t.is_approved = true
      AND t.is_active = true
  )
);

CREATE POLICY "Trainer manages own sessions"
ON public.trainer_sessions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainers t
    WHERE t.id = trainer_sessions.trainer_id
      AND t.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainers t
    WHERE t.id = trainer_sessions.trainer_id
      AND t.owner_id = auth.uid()
  )
);

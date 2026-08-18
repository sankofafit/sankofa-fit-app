-- Admin payout records (run in Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS public.payout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL,
  partner_type text NOT NULL CHECK (partner_type IN ('gym', 'trainer')),
  partner_name text,
  amount_ghs numeric NOT NULL DEFAULT 0,
  method text,
  momo_provider text,
  momo_number text,
  paystack_transfer_code text,
  status text DEFAULT 'completed',
  notes text,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_history_partner_idx
  ON public.payout_history (partner_id, partner_type);

-- Restrict to authenticated users; tighten with admin-only policies as needed
ALTER TABLE public.payout_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can manage payout_history" ON public.payout_history;
CREATE POLICY "Authenticated can manage payout_history"
  ON public.payout_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- subscription_end for auto-downgrade on expiry (run in Supabase SQL Editor)

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS subscription_end timestamp with time zone;

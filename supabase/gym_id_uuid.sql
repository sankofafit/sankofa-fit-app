-- Run in Supabase SQL Editor
-- Adds gym_id (uuid) to gym_bookings and gym_memberships.
-- If gym_id already exists as another type (e.g. text), drop or rename it first, or migrate separately.

ALTER TABLE public.gym_bookings
ADD COLUMN IF NOT EXISTS gym_id uuid;

ALTER TABLE public.gym_memberships
ADD COLUMN IF NOT EXISTS gym_id uuid;

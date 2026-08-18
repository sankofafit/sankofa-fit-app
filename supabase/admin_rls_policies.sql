-- Admin dashboard RLS (run in Supabase SQL Editor)
-- Lets authenticated Sankofa admins SELECT all rows on users + booking tables.
-- Pair with admin_user_metadata.sql so admin JWT includes is_admin.

CREATE OR REPLACE FUNCTION public.is_sankofa_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean, false)
    OR lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@sankofafit.com'
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'samamponsah775@gmail.com';
$$;

GRANT EXECUTE ON FUNCTION public.is_sankofa_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sankofa_admin() TO service_role;

-- ─── public.users ───
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_sankofa_admin());

-- ─── gym_bookings ───
DROP POLICY IF EXISTS "Admins can view all gym bookings" ON public.gym_bookings;
CREATE POLICY "Admins can view all gym bookings"
  ON public.gym_bookings
  FOR SELECT
  TO authenticated
  USING (public.is_sankofa_admin());

-- ─── trainer_bookings ───
DROP POLICY IF EXISTS "Admins can view all trainer bookings" ON public.trainer_bookings;
CREATE POLICY "Admins can view all trainer bookings"
  ON public.trainer_bookings
  FOR SELECT
  TO authenticated
  USING (public.is_sankofa_admin());

-- ─── gym_memberships ───
DROP POLICY IF EXISTS "Admins can view all gym memberships" ON public.gym_memberships;
CREATE POLICY "Admins can view all gym memberships"
  ON public.gym_memberships
  FOR SELECT
  TO authenticated
  USING (public.is_sankofa_admin());

-- ─── trainers (admin approve / list all) ───
DROP POLICY IF EXISTS "Admins can view all trainers" ON public.trainers;
CREATE POLICY "Admins can view all trainers"
  ON public.trainers
  FOR SELECT
  TO authenticated
  USING (public.is_sankofa_admin());

DROP POLICY IF EXISTS "Admins can update all trainers" ON public.trainers;
CREATE POLICY "Admins can update all trainers"
  ON public.trainers
  FOR UPDATE
  TO authenticated
  USING (public.is_sankofa_admin());

-- After running: sign out and sign in on the admin dashboard so the JWT is refreshed.

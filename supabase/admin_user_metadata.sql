-- Grant Sankofa Fit admin dashboard access via auth user metadata.
-- Run in Supabase SQL Editor (requires access to auth.users).
-- Then run supabase/admin_rls_policies.sql so RLS allows admins to read all users.
-- After both, sign out and sign in again so the JWT includes updated metadata.

UPDATE auth.users
SET
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb,
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'::jsonb
WHERE email = 'samamponsah775@gmail.com';

-- Additional admins: repeat for each email, or use @sankofafit.com (allowed in is_sankofa_admin()).

-- Revoke admin (if needed):
-- UPDATE auth.users
-- SET
--   raw_user_meta_data = raw_user_meta_data - 'is_admin',
--   raw_app_meta_data = raw_app_meta_data - 'is_admin'
-- WHERE email = 'someone@example.com';

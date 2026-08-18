-- Gym image uploads (Supabase Storage + optional gyms columns)
-- Run in Supabase SQL Editor after creating bucket or use INSERT below.

INSERT INTO storage.buckets (id, name, public)
VALUES ('gym-images', 'gym-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Anyone can view gym images" ON storage.objects;
CREATE POLICY "Anyone can view gym images"
ON storage.objects FOR SELECT
USING (bucket_id = 'gym-images');

DROP POLICY IF EXISTS "Gym owners can upload images" ON storage.objects;
CREATE POLICY "Gym owners can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gym-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Gym owners can delete own images" ON storage.objects;
CREATE POLICY "Gym owners can delete own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gym-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS cover_image_url text;

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.gyms
  ADD COLUMN IF NOT EXISTS maps_link text;

ALTER TABLE public.gym_classes
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';

ALTER TABLE public.gym_classes
  ADD COLUMN IF NOT EXISTS image_url text;

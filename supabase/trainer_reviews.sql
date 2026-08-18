-- Trainer reviews and ratings
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.trainer_reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid REFERENCES public.trainers ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  booking_id uuid REFERENCES public.trainer_bookings ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  user_name text,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (trainer_id, user_id, booking_id)
);

ALTER TABLE public.trainer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.trainer_reviews;
CREATE POLICY "Anyone can read reviews"
ON public.trainer_reviews FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can write reviews" ON public.trainer_reviews;
CREATE POLICY "Users can write reviews"
ON public.trainer_reviews FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own reviews" ON public.trainer_reviews;
CREATE POLICY "Users can update own reviews"
ON public.trainer_reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_trainer_rating()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.trainers
  SET
    rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::numeric, 1)
      FROM public.trainer_reviews r
      WHERE r.trainer_id = COALESCE(NEW.trainer_id, OLD.trainer_id)
    ), 0),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.trainer_reviews r
      WHERE r.trainer_id = COALESCE(NEW.trainer_id, OLD.trainer_id)
    )
  WHERE id = COALESCE(NEW.trainer_id, OLD.trainer_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_review_added ON public.trainer_reviews;
CREATE TRIGGER on_review_added
AFTER INSERT OR UPDATE OR DELETE ON public.trainer_reviews
FOR EACH ROW
EXECUTE FUNCTION update_trainer_rating();

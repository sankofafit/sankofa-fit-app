-- Trainer profile columns + rating backfill
-- Run in Supabase SQL Editor

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS experience_years integer DEFAULT 0;

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS rating numeric(3, 1) DEFAULT 0;

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS total_reviews integer DEFAULT 0;

-- Fix rating trigger so it can update trainers despite RLS
CREATE OR REPLACE FUNCTION public.update_trainer_rating()
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
EXECUTE FUNCTION public.update_trainer_rating();

-- Backfill ratings for trainers that already have reviews
UPDATE public.trainers t
SET
  rating = COALESCE((
    SELECT ROUND(AVG(r.rating)::numeric, 1)
    FROM public.trainer_reviews r
    WHERE r.trainer_id = t.id
  ), 0),
  total_reviews = (
    SELECT COUNT(*)
    FROM public.trainer_reviews r
    WHERE r.trainer_id = t.id
  )
WHERE id IN (
  SELECT DISTINCT trainer_id
  FROM public.trainer_reviews
);

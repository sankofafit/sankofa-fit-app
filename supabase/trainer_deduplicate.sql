-- Find duplicate trainer rows (same owner_id)
SELECT
  owner_id,
  COUNT(*) AS count,
  array_agg(id ORDER BY created_at) AS ids,
  array_agg(name ORDER BY created_at) AS names,
  array_agg(created_at ORDER BY created_at) AS dates
FROM public.trainers
GROUP BY owner_id
HAVING COUNT(*) > 1;

-- Remove duplicates: keep the best row per owner_id
-- (prefer latest updated_at, then latest created_at)
DELETE FROM public.trainers
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY owner_id
        ORDER BY
          updated_at DESC NULLS LAST,
          created_at DESC
      ) AS rn
    FROM public.trainers
    WHERE owner_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Prevent future duplicates (run after DELETE above succeeds)
CREATE UNIQUE INDEX IF NOT EXISTS trainers_owner_id_unique
  ON public.trainers (owner_id);

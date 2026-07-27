UPDATE "crosspost"."source_reels" AS sr
SET
  "status" = 'used',
  "updated_at" = NOW()
WHERE sr."id" IN (
  SELECT DISTINCT "source_reel_id" FROM "crosspost"."batch_items"
  WHERE "source_reel_id" IS NOT NULL
  UNION
  SELECT DISTINCT "source_reel_id" FROM "crosspost"."runs"
  WHERE "source_reel_id" IS NOT NULL
)
AND sr."status"::text NOT IN ('archived', 'rejected', 'failed');

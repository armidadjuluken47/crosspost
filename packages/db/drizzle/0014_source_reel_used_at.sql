ALTER TABLE "crosspost"."source_reels"
  ADD COLUMN IF NOT EXISTS "used_at" timestamptz;

UPDATE "crosspost"."source_reels" AS sr
SET "used_at" = COALESCE(sr."used_at", sr."updated_at", NOW())
WHERE sr."id" IN (
  SELECT DISTINCT "source_reel_id" FROM "crosspost"."batch_items"
  WHERE "source_reel_id" IS NOT NULL
  UNION
  SELECT DISTINCT "source_reel_id" FROM "crosspost"."runs"
  WHERE "source_reel_id" IS NOT NULL
);

UPDATE "crosspost"."source_reels"
SET "used_at" = COALESCE("used_at", "updated_at", NOW())
WHERE "status" = 'used' AND "used_at" IS NULL;

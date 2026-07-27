ALTER TABLE "crosspost"."creator_projects" ADD COLUMN IF NOT EXISTS "wants_captions" boolean DEFAULT false NOT NULL;
ALTER TABLE "crosspost"."creator_projects" ADD COLUMN IF NOT EXISTS "wants_hashtags" boolean DEFAULT false NOT NULL;

-- Backfill existing rows so their progress reflects what was actually produced.
UPDATE "crosspost"."creator_projects"
SET "wants_captions" = true
WHERE "caption" IS NOT NULL AND "caption" <> '';

UPDATE "crosspost"."creator_projects"
SET "wants_hashtags" = true
WHERE "hashtags" IS NOT NULL AND "hashtags" <> '';

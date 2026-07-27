-- Cross-platform source accounts / reels (Instagram | TikTok | YouTube)

ALTER TABLE "crosspost"."source_accounts"
  ADD COLUMN IF NOT EXISTS "platform" text DEFAULT 'instagram' NOT NULL;

ALTER TABLE "crosspost"."source_reels"
  ADD COLUMN IF NOT EXISTS "platform" text DEFAULT 'instagram' NOT NULL;

-- Allow same handle on different platforms
ALTER TABLE "crosspost"."source_accounts"
  DROP CONSTRAINT IF EXISTS "source_accounts_handle_unique";

ALTER TABLE "crosspost"."source_accounts"
  DROP CONSTRAINT IF EXISTS "source_accounts_handle_key";

CREATE UNIQUE INDEX IF NOT EXISTS "source_accounts_platform_handle_uidx"
  ON "crosspost"."source_accounts" ("platform", "handle");

CREATE INDEX IF NOT EXISTS "source_reels_platform_idx"
  ON "crosspost"."source_reels" ("platform");

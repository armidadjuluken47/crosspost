-- Instagram Reels publishing (Meta Graph / Professional accounts only).
DO $$ BEGIN
  ALTER TYPE "crosspost"."social_platform" ADD VALUE IF NOT EXISTS 'instagram';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

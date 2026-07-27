ALTER TABLE "crosspost"."creator_projects" ADD COLUMN IF NOT EXISTS "swap_tier" text DEFAULT 'quality' NOT NULL;

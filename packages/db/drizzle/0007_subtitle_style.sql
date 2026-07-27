ALTER TABLE "crosspost"."creator_projects" ADD COLUMN IF NOT EXISTS "subtitle_style" text DEFAULT 'minimal' NOT NULL;

ALTER TABLE "crosspost"."creator_projects" ADD COLUMN "srt_key" text;
ALTER TABLE "crosspost"."creator_projects" ADD COLUMN "thumbnail_key" text;
ALTER TABLE "crosspost"."creator_projects" ADD COLUMN "burned_video_key" text;
ALTER TABLE "crosspost"."creator_projects" ADD COLUMN "burn_subtitles" boolean DEFAULT false NOT NULL;

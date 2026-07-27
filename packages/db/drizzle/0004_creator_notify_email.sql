ALTER TABLE "crosspost"."creator_projects" ADD COLUMN "notify_email" text;
ALTER TABLE "crosspost"."creator_projects" ADD COLUMN "ready_notified_at" timestamp with time zone;

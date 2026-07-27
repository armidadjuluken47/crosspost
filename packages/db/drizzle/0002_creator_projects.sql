CREATE TYPE "crosspost"."project_status" AS ENUM('draft', 'processing', 'ready', 'failed');

CREATE TABLE "crosspost"."creator_projects" (
  "id" serial PRIMARY KEY NOT NULL,
  "public_id" text NOT NULL,
  "external_user_id" text NOT NULL,
  "title" text DEFAULT 'Untitled project' NOT NULL,
  "status" "crosspost"."project_status" DEFAULT 'draft' NOT NULL,
  "model_id" integer,
  "source_reel_id" integer,
  "run_id" integer,
  "source_video_key" text,
  "output_video_key" text,
  "transcript" jsonb,
  "caption" text,
  "hashtags" text,
  "hook_variants" jsonb,
  "rights_attested" boolean DEFAULT false NOT NULL,
  "error_message" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_projects_public_id_unique" UNIQUE("public_id")
);

ALTER TABLE "crosspost"."creator_projects" ADD CONSTRAINT "creator_projects_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "crosspost"."models"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "crosspost"."creator_projects" ADD CONSTRAINT "creator_projects_source_reel_id_source_reels_id_fk" FOREIGN KEY ("source_reel_id") REFERENCES "crosspost"."source_reels"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "crosspost"."creator_projects" ADD CONSTRAINT "creator_projects_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "crosspost"."runs"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "creator_projects_user_id_idx" ON "crosspost"."creator_projects" USING btree ("external_user_id");
CREATE INDEX "creator_projects_status_idx" ON "crosspost"."creator_projects" USING btree ("status");

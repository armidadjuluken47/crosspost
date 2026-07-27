CREATE SCHEMA IF NOT EXISTS "crosspost";
--> statement-breakpoint
CREATE TYPE "crosspost"."asset_type" AS ENUM('model_ref', 'source_mp4', 'source_first_frame', 'generated_image', 'normalized_image', 'generated_video', 'qc_artifact');--> statement-breakpoint
CREATE TYPE "crosspost"."batch_status" AS ENUM('draft', 'queued', 'running', 'paused', 'completed', 'completed_with_exceptions', 'cancelled');--> statement-breakpoint
CREATE TYPE "crosspost"."exception_status" AS ENUM('open', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "crosspost"."model_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "crosspost"."prompt_scope" AS ENUM('global', 'model', 'source_account');--> statement-breakpoint
CREATE TYPE "crosspost"."prompt_stage" AS ENUM('image_gen', 'video_gen');--> statement-breakpoint
CREATE TYPE "crosspost"."run_job_status" AS ENUM('queued', 'running', 'succeeded', 'retry_scheduled', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "crosspost"."run_status" AS ENUM('queued', 'started', 'image_gen', 'image_qc', 'video_gen', 'video_qc', 'delivering', 'delivered', 'exception', 'cancelled');--> statement-breakpoint
CREATE TYPE "crosspost"."source_account_status" AS ENUM('active', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "crosspost"."source_reel_status" AS ENUM('ingested', 'asset_ready', 'preview_ready', 'selected', 'rejected', 'failed', 'archived');--> statement-breakpoint
CREATE TYPE "crosspost"."stage_status" AS ENUM('pending', 'running', 'success', 'retry', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "crosspost"."assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_type" "crosspost"."asset_type" NOT NULL,
	"r2_key" text NOT NULL,
	"public_url" text,
	"mime_type" text,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"sha256" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_r2_key_unique" UNIQUE("r2_key")
);
--> statement-breakpoint
CREATE TABLE "crosspost"."audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."batch_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"source_reel_id" integer NOT NULL,
	"model_id" integer NOT NULL,
	"run_id" integer,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"status" "crosspost"."batch_status" DEFAULT 'draft' NOT NULL,
	"created_by" text,
	"operator_instruction" text,
	"settings_snapshot" jsonb,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"destination" text NOT NULL,
	"r2_key" text,
	"drive_path" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer,
	"batch_id" integer,
	"stage" text NOT NULL,
	"reason" text NOT NULL,
	"payload" jsonb,
	"status" "crosspost"."exception_status" DEFAULT 'open' NOT NULL,
	"resolution_action" text,
	"resolved_by" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."face_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"r2_key" text NOT NULL,
	"public_url" text,
	"ordinal" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."image_candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"ordinal" integer NOT NULL,
	"provider" text NOT NULL,
	"r2_key" text NOT NULL,
	"normalized_r2_key" text,
	"width" integer,
	"height" integer,
	"qc_payload" jsonb,
	"qc_passed" boolean DEFAULT false NOT NULL,
	"identity_score" integer,
	"ocr_score" integer,
	"composition_score" integer,
	"combined_score" integer,
	"is_winner" boolean DEFAULT false NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."models" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"status" "crosspost"."model_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "crosspost"."prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage" "crosspost"."prompt_stage" NOT NULL,
	"scope" "crosspost"."prompt_scope" DEFAULT 'global' NOT NULL,
	"scope_id" integer,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."provider_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"display_name" text NOT NULL,
	"stage" text NOT NULL,
	"wavespeed_model" text,
	"sort_order" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"is_premium_slot" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_configs_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "crosspost"."run_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "crosspost"."run_job_status" DEFAULT 'queued' NOT NULL,
	"source" text NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_by" text,
	"locked_until" timestamp with time zone,
	"run_id" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "run_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "crosspost"."runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_reel_id" integer,
	"model_id" integer,
	"batch_id" integer,
	"status" "crosspost"."run_status" DEFAULT 'queued' NOT NULL,
	"current_stage" text,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"total_latency_ms" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"exception_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."source_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"status" "crosspost"."source_account_status" DEFAULT 'active' NOT NULL,
	"apify_input_id" text,
	"last_scraped_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_accounts_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "crosspost"."source_reels" (
	"id" serial PRIMARY KEY NOT NULL,
	"shortcode" text NOT NULL,
	"source_account_id" integer NOT NULL,
	"reel_url" text NOT NULL,
	"caption" text,
	"view_count" integer,
	"like_count" integer,
	"comment_count" integer,
	"share_count" integer,
	"duration_seconds" integer,
	"posted_at" timestamp with time zone,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "crosspost"."source_reel_status" DEFAULT 'ingested' NOT NULL,
	"mp4_r2_key" text,
	"first_frame_r2_key" text,
	"width" integer,
	"height" integer,
	"rank_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "source_reels_shortcode_unique" UNIQUE("shortcode")
);
--> statement-breakpoint
CREATE TABLE "crosspost"."stage_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"stage" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"provider" text,
	"status" "crosspost"."stage_status" DEFAULT 'pending' NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"request_payload" jsonb,
	"response_payload" jsonb,
	"prompt_stage" "crosspost"."prompt_stage",
	"prompt_scope" "crosspost"."prompt_scope",
	"prompt_version" integer,
	"rendered_prompt" text,
	"output_r2_keys" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crosspost"."video_renders" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"provider" text NOT NULL,
	"r2_key" text NOT NULL,
	"mime_type" text DEFAULT 'video/mp4' NOT NULL,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"qc_payload" jsonb,
	"qc_passed" boolean DEFAULT false NOT NULL,
	"is_winner" boolean DEFAULT false NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crosspost"."batch_items" ADD CONSTRAINT "batch_items_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "crosspost"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."batch_items" ADD CONSTRAINT "batch_items_source_reel_id_source_reels_id_fk" FOREIGN KEY ("source_reel_id") REFERENCES "crosspost"."source_reels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."batch_items" ADD CONSTRAINT "batch_items_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "crosspost"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."batch_items" ADD CONSTRAINT "batch_items_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "crosspost"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."deliveries" ADD CONSTRAINT "deliveries_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "crosspost"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."exceptions" ADD CONSTRAINT "exceptions_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "crosspost"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."exceptions" ADD CONSTRAINT "exceptions_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "crosspost"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."face_references" ADD CONSTRAINT "face_references_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "crosspost"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."image_candidates" ADD CONSTRAINT "image_candidates_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "crosspost"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."run_jobs" ADD CONSTRAINT "run_jobs_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "crosspost"."runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."runs" ADD CONSTRAINT "runs_source_reel_id_source_reels_id_fk" FOREIGN KEY ("source_reel_id") REFERENCES "crosspost"."source_reels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."runs" ADD CONSTRAINT "runs_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "crosspost"."models"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."runs" ADD CONSTRAINT "runs_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "crosspost"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."source_reels" ADD CONSTRAINT "source_reels_source_account_id_source_accounts_id_fk" FOREIGN KEY ("source_account_id") REFERENCES "crosspost"."source_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."stage_runs" ADD CONSTRAINT "stage_runs_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "crosspost"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crosspost"."video_renders" ADD CONSTRAINT "video_renders_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "crosspost"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assets_asset_type_idx" ON "crosspost"."assets" USING btree ("asset_type");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "crosspost"."audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "batch_items_batch_id_idx" ON "crosspost"."batch_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "deliveries_run_id_idx" ON "crosspost"."deliveries" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "exceptions_status_idx" ON "crosspost"."exceptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "face_references_model_id_idx" ON "crosspost"."face_references" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "image_candidates_run_id_idx" ON "crosspost"."image_candidates" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prompts_stage_scope_version_idx" ON "crosspost"."prompts" USING btree ("stage","scope","scope_id","version");--> statement-breakpoint
CREATE INDEX "run_jobs_status_available_idx" ON "crosspost"."run_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "runs_batch_id_idx" ON "crosspost"."runs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "runs_status_idx" ON "crosspost"."runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "source_reels_account_id_idx" ON "crosspost"."source_reels" USING btree ("source_account_id");--> statement-breakpoint
CREATE INDEX "stage_runs_run_id_idx" ON "crosspost"."stage_runs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "video_renders_run_id_idx" ON "crosspost"."video_renders" USING btree ("run_id");
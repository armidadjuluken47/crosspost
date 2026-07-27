DO $$ BEGIN
  CREATE TYPE "crosspost"."social_platform" AS ENUM('youtube', 'tiktok');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "crosspost"."social_connection_status" AS ENUM('active', 'expired', 'revoked', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "crosspost"."social_post_status" AS ENUM('queued', 'running', 'posted', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "crosspost"."social_connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "public_id" text NOT NULL,
  "external_user_id" text NOT NULL,
  "workspace_id" integer,
  "platform" "crosspost"."social_platform" NOT NULL,
  "account_label" text DEFAULT '' NOT NULL,
  "account_ref" text NOT NULL,
  "access_token_enc" text NOT NULL,
  "refresh_token_enc" text,
  "scopes" text,
  "expires_at" timestamp with time zone,
  "status" "crosspost"."social_connection_status" DEFAULT 'active' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "social_connections_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "social_connections_workspace_id_creator_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "crosspost"."creator_workspaces"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "social_connections_user_idx" ON "crosspost"."social_connections" USING btree ("external_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "social_connections_user_platform_account_uidx" ON "crosspost"."social_connections" USING btree ("external_user_id", "platform", "account_ref");

CREATE TABLE IF NOT EXISTS "crosspost"."social_posts" (
  "id" serial PRIMARY KEY NOT NULL,
  "public_id" text NOT NULL,
  "project_id" integer NOT NULL,
  "connection_id" integer,
  "platform" "crosspost"."social_platform" NOT NULL,
  "status" "crosspost"."social_post_status" DEFAULT 'queued' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 3 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_by" text,
  "locked_until" timestamp with time zone,
  "title_snapshot" text,
  "caption_snapshot" text,
  "privacy" text DEFAULT 'private' NOT NULL,
  "remote_post_id" text,
  "remote_post_url" text,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "social_posts_public_id_unique" UNIQUE("public_id"),
  CONSTRAINT "social_posts_project_id_creator_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "crosspost"."creator_projects"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "social_posts_connection_id_social_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "crosspost"."social_connections"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX IF NOT EXISTS "social_posts_project_idx" ON "crosspost"."social_posts" USING btree ("project_id");
CREATE INDEX IF NOT EXISTS "social_posts_status_available_idx" ON "crosspost"."social_posts" USING btree ("status", "available_at");

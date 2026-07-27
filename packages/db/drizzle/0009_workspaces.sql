CREATE TYPE "crosspost"."workspace_member_role" AS ENUM('owner', 'admin', 'member');

CREATE TABLE "crosspost"."creator_workspaces" (
  "id" serial PRIMARY KEY NOT NULL,
  "public_id" text NOT NULL,
  "name" text NOT NULL,
  "owner_user_id" text NOT NULL,
  "is_personal" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_workspaces_public_id_unique" UNIQUE("public_id")
);

CREATE INDEX "creator_workspaces_owner_idx" ON "crosspost"."creator_workspaces" USING btree ("owner_user_id");

CREATE TABLE "crosspost"."creator_workspace_members" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "role" "crosspost"."workspace_member_role" DEFAULT 'member' NOT NULL,
  "email" text,
  "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_workspace_members_workspace_user_unique" UNIQUE("workspace_id", "user_id"),
  CONSTRAINT "creator_workspace_members_workspace_id_creator_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "crosspost"."creator_workspaces"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX "creator_workspace_members_user_idx" ON "crosspost"."creator_workspace_members" USING btree ("user_id");

ALTER TABLE "crosspost"."creator_projects" ADD COLUMN IF NOT EXISTS "workspace_id" integer;
ALTER TABLE "crosspost"."creator_projects" ADD CONSTRAINT "creator_projects_workspace_id_creator_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "crosspost"."creator_workspaces"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "creator_projects_workspace_id_idx" ON "crosspost"."creator_projects" USING btree ("workspace_id");

ALTER TABLE "crosspost"."creator_batches" ADD COLUMN IF NOT EXISTS "workspace_id" integer;
ALTER TABLE "crosspost"."creator_batches" ADD CONSTRAINT "creator_batches_workspace_id_creator_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "crosspost"."creator_workspaces"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "creator_batches_workspace_id_idx" ON "crosspost"."creator_batches" USING btree ("workspace_id");

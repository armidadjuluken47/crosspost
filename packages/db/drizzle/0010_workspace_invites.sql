CREATE TYPE "crosspost"."workspace_invite_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');

CREATE TABLE "crosspost"."creator_workspace_invites" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL,
  "email" text NOT NULL,
  "role" "crosspost"."workspace_member_role" DEFAULT 'member' NOT NULL,
  "token" text NOT NULL,
  "invited_by_user_id" text NOT NULL,
  "status" "crosspost"."workspace_invite_status" DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "accepted_user_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_workspace_invites_token_unique" UNIQUE("token"),
  CONSTRAINT "creator_workspace_invites_workspace_id_creator_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "crosspost"."creator_workspaces"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX "creator_workspace_invites_workspace_idx" ON "crosspost"."creator_workspace_invites" USING btree ("workspace_id");
CREATE INDEX "creator_workspace_invites_email_idx" ON "crosspost"."creator_workspace_invites" USING btree ("email");
CREATE INDEX "creator_workspace_invites_status_idx" ON "crosspost"."creator_workspace_invites" USING btree ("status");

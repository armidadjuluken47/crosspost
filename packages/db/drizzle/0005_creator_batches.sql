CREATE TYPE "crosspost"."creator_batch_status" AS ENUM('processing', 'ready', 'partial', 'failed');

CREATE TABLE "crosspost"."creator_batches" (
  "id" serial PRIMARY KEY NOT NULL,
  "public_id" text NOT NULL,
  "external_user_id" text NOT NULL,
  "title" text DEFAULT 'Batch remix' NOT NULL,
  "status" "crosspost"."creator_batch_status" DEFAULT 'processing' NOT NULL,
  "item_count" integer DEFAULT 0 NOT NULL,
  "errors" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "creator_batches_public_id_unique" UNIQUE("public_id")
);

CREATE INDEX "creator_batches_user_id_idx" ON "crosspost"."creator_batches" USING btree ("external_user_id");
CREATE INDEX "creator_batches_status_idx" ON "crosspost"."creator_batches" USING btree ("status");

ALTER TABLE "crosspost"."creator_projects" ADD COLUMN "batch_id" integer;
ALTER TABLE "crosspost"."creator_projects" ADD CONSTRAINT "creator_projects_batch_id_creator_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "crosspost"."creator_batches"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "creator_projects_batch_id_idx" ON "crosspost"."creator_projects" USING btree ("batch_id");

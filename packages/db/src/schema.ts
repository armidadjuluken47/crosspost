import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const crosspost = pgSchema("crosspost");

export const modelStatusEnum = crosspost.enum("model_status", ["active", "paused", "archived"]);
export const sourceAccountStatusEnum = crosspost.enum("source_account_status", [
  "active",
  "paused",
  "archived",
]);
export const sourceReelStatusEnum = crosspost.enum("source_reel_status", [
  "ingested",
  "asset_ready",
  "preview_ready",
  "selected",
  "used",
  "rejected",
  "failed",
  "archived",
]);
export const promptStageEnum = crosspost.enum("prompt_stage", ["image_gen", "video_gen"]);
export const promptScopeEnum = crosspost.enum("prompt_scope", [
  "global",
  "model",
  "source_account",
]);
export const batchStatusEnum = crosspost.enum("batch_status", [
  "draft",
  "queued",
  "running",
  "paused",
  "completed",
  "completed_with_exceptions",
  "cancelled",
]);
export const runStatusEnum = crosspost.enum("run_status", [
  "queued",
  "started",
  "image_gen",
  "image_qc",
  "video_gen",
  "video_qc",
  "delivering",
  "delivered",
  "exception",
  "cancelled",
]);
export const stageStatusEnum = crosspost.enum("stage_status", [
  "pending",
  "running",
  "success",
  "retry",
  "failed",
  "skipped",
]);
export const projectStatusEnum = crosspost.enum("project_status", [
  "draft",
  "processing",
  "ready",
  "failed",
]);
export const creatorBatchStatusEnum = crosspost.enum("creator_batch_status", [
  "processing",
  "ready",
  "partial",
  "failed",
]);

export const workspaceMemberRoleEnum = crosspost.enum("workspace_member_role", [
  "owner",
  "admin",
  "member",
]);
export const workspaceInviteStatusEnum = crosspost.enum("workspace_invite_status", [
  "pending",
  "accepted",
  "revoked",
  "expired",
]);
export const runJobStatusEnum = crosspost.enum("run_job_status", [
  "queued",
  "running",
  "succeeded",
  "retry_scheduled",
  "failed",
  "cancelled",
]);
export const exceptionStatusEnum = crosspost.enum("exception_status", [
  "open",
  "resolved",
  "dismissed",
]);
export const assetTypeEnum = crosspost.enum("asset_type", [
  "model_ref",
  "source_mp4",
  "source_first_frame",
  "generated_image",
  "normalized_image",
  "generated_video",
  "qc_artifact",
]);
export const socialPlatformEnum = crosspost.enum("social_platform", [
  "youtube",
  "tiktok",
  "instagram",
]);
export const socialConnectionStatusEnum = crosspost.enum("social_connection_status", [
  "active",
  "expired",
  "revoked",
  "error",
]);
export const socialPostStatusEnum = crosspost.enum("social_post_status", [
  "queued",
  "running",
  "posted",
  "failed",
  "cancelled",
]);

export const models = crosspost.table("models", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  status: modelStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const faceReferences = crosspost.table(
  "face_references",
  {
    id: serial("id").primaryKey(),
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    publicUrl: text("public_url"),
    ordinal: integer("ordinal").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("face_references_model_id_idx").on(table.modelId)],
);

export const sourceAccounts = crosspost.table(
  "source_accounts",
  {
    id: serial("id").primaryKey(),
    handle: text("handle").notNull(),
    platform: text("platform").notNull().default("instagram"),
    status: sourceAccountStatusEnum("status").notNull().default("active"),
    apifyInputId: text("apify_input_id"),
    lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("source_accounts_platform_handle_uidx").on(table.platform, table.handle),
  ],
);

export const sourceReels = crosspost.table(
  "source_reels",
  {
    id: serial("id").primaryKey(),
    shortcode: text("shortcode").notNull().unique(),
    sourceAccountId: integer("source_account_id")
      .notNull()
      .references(() => sourceAccounts.id, { onDelete: "cascade" }),
    platform: text("platform").notNull().default("instagram"),
    reelUrl: text("reel_url").notNull(),
    caption: text("caption"),
    viewCount: integer("view_count"),
    likeCount: integer("like_count"),
    commentCount: integer("comment_count"),
    shareCount: integer("share_count"),
    durationSeconds: integer("duration_seconds"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
    status: sourceReelStatusEnum("status").notNull().default("ingested"),
    usedAt: timestamp("used_at", { withTimezone: true }),
    mp4R2Key: text("mp4_r2_key"),
    firstFrameR2Key: text("first_frame_r2_key"),
    width: integer("width"),
    height: integer("height"),
    rankPayload: jsonb("rank_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("source_reels_account_id_idx").on(table.sourceAccountId),
    index("source_reels_platform_idx").on(table.platform),
  ],
);

export const prompts = crosspost.table(
  "prompts",
  {
    id: serial("id").primaryKey(),
    stage: promptStageEnum("stage").notNull(),
    scope: promptScopeEnum("scope").notNull().default("global"),
    scopeId: integer("scope_id"),
    version: integer("version").notNull(),
    body: text("body").notNull(),
    active: boolean("active").notNull().default(false),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("prompts_stage_scope_version_idx").on(
      table.stage,
      table.scope,
      table.scopeId,
      table.version,
    ),
  ],
);

export const providerConfigs = crosspost.table("provider_configs", {
  id: serial("id").primaryKey(),
  providerId: text("provider_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  stage: text("stage").notNull(),
  wavespeedModel: text("wavespeed_model"),
  sortOrder: integer("sort_order").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  isPremiumSlot: boolean("is_premium_slot").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const engineSettings = crosspost.table("engine_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const batches = crosspost.table("batches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: batchStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by"),
  operatorInstruction: text("operator_instruction"),
  settingsSnapshot: jsonb("settings_snapshot"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const runs = crosspost.table(
  "runs",
  {
    id: serial("id").primaryKey(),
    sourceReelId: integer("source_reel_id").references(() => sourceReels.id),
    modelId: integer("model_id").references(() => models.id),
    batchId: integer("batch_id").references(() => batches.id),
    status: runStatusEnum("status").notNull().default("queued"),
    currentStage: text("current_stage"),
    costCents: integer("cost_cents").notNull().default(0),
    totalLatencyMs: integer("total_latency_ms").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    exceptionId: integer("exception_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("runs_batch_id_idx").on(table.batchId),
    index("runs_status_idx").on(table.status),
  ],
);

export const batchItems = crosspost.table(
  "batch_items",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    sourceReelId: integer("source_reel_id")
      .notNull()
      .references(() => sourceReels.id),
    modelId: integer("model_id")
      .notNull()
      .references(() => models.id),
    runId: integer("run_id").references(() => runs.id),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("batch_items_batch_id_idx").on(table.batchId)],
);

export const runJobs = crosspost.table(
  "run_jobs",
  {
    id: serial("id").primaryKey(),
    status: runJobStatusEnum("status").notNull().default("queued"),
    source: text("source").notNull(),
    payload: jsonb("payload").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    lockedBy: text("locked_by"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    runId: integer("run_id").references(() => runs.id),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("run_jobs_status_available_idx").on(table.status, table.availableAt),
  ],
);

export const stageRuns = crosspost.table(
  "stage_runs",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    attempt: integer("attempt").notNull().default(1),
    provider: text("provider"),
    status: stageStatusEnum("status").notNull().default("pending"),
    costCents: integer("cost_cents").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    requestPayload: jsonb("request_payload"),
    responsePayload: jsonb("response_payload"),
    promptStage: promptStageEnum("prompt_stage"),
    promptScope: promptScopeEnum("prompt_scope"),
    promptVersion: integer("prompt_version"),
    renderedPrompt: text("rendered_prompt"),
    outputR2Keys: jsonb("output_r2_keys"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("stage_runs_run_id_idx").on(table.runId)],
);

export const imageCandidates = crosspost.table(
  "image_candidates",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    provider: text("provider").notNull(),
    r2Key: text("r2_key").notNull(),
    normalizedR2Key: text("normalized_r2_key"),
    width: integer("width"),
    height: integer("height"),
    qcPayload: jsonb("qc_payload"),
    qcPassed: boolean("qc_passed").notNull().default(false),
    identityScore: integer("identity_score"),
    ocrScore: integer("ocr_score"),
    compositionScore: integer("composition_score"),
    combinedScore: integer("combined_score"),
    isWinner: boolean("is_winner").notNull().default(false),
    costCents: integer("cost_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("image_candidates_run_id_idx").on(table.runId)],
);

export const videoRenders = crosspost.table(
  "video_renders",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    r2Key: text("r2_key").notNull(),
    mimeType: text("mime_type").notNull().default("video/mp4"),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    qcPayload: jsonb("qc_payload"),
    qcPassed: boolean("qc_passed").notNull().default(false),
    isWinner: boolean("is_winner").notNull().default(false),
    costCents: integer("cost_cents").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("video_renders_run_id_idx").on(table.runId)],
);

export const exceptions = crosspost.table(
  "exceptions",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id").references(() => runs.id),
    batchId: integer("batch_id").references(() => batches.id),
    stage: text("stage").notNull(),
    reason: text("reason").notNull(),
    payload: jsonb("payload"),
    status: exceptionStatusEnum("status").notNull().default("open"),
    resolutionAction: text("resolution_action"),
    resolvedBy: text("resolved_by"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("exceptions_status_idx").on(table.status)],
);

export const auditLog = crosspost.table(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    actorUserId: text("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_log_created_at_idx").on(table.createdAt)],
);

export const assets = crosspost.table(
  "assets",
  {
    id: serial("id").primaryKey(),
    assetType: assetTypeEnum("asset_type").notNull(),
    r2Key: text("r2_key").notNull().unique(),
    publicUrl: text("public_url"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    width: integer("width"),
    height: integer("height"),
    durationSeconds: integer("duration_seconds"),
    sha256: text("sha256"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assets_asset_type_idx").on(table.assetType)],
);

export const deliveries = crosspost.table(
  "deliveries",
  {
    id: serial("id").primaryKey(),
    runId: integer("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    destination: text("destination").notNull(),
    r2Key: text("r2_key"),
    drivePath: text("drive_path"),
    status: text("status").notNull().default("pending"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("deliveries_run_id_idx").on(table.runId)],
);

export const creatorWorkspaces = crosspost.table(
  "creator_workspaces",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id").notNull(),
    isPersonal: boolean("is_personal").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("creator_workspaces_owner_idx").on(table.ownerUserId)],
);

export const creatorWorkspaceMembers = crosspost.table(
  "creator_workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => creatorWorkspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: workspaceMemberRoleEnum("role").notNull().default("member"),
    email: text("email"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("creator_workspace_members_user_idx").on(table.userId),
    uniqueIndex("creator_workspace_members_workspace_user_idx").on(
      table.workspaceId,
      table.userId,
    ),
  ],
);

export const creatorWorkspaceInvites = crosspost.table(
  "creator_workspace_invites",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => creatorWorkspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: workspaceMemberRoleEnum("role").notNull().default("member"),
    token: text("token").notNull().unique(),
    invitedByUserId: text("invited_by_user_id").notNull(),
    status: workspaceInviteStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedUserId: text("accepted_user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("creator_workspace_invites_workspace_idx").on(table.workspaceId),
    index("creator_workspace_invites_email_idx").on(table.email),
    index("creator_workspace_invites_status_idx").on(table.status),
  ],
);

export const creatorBatches = crosspost.table(
  "creator_batches",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    externalUserId: text("external_user_id").notNull(),
    workspaceId: integer("workspace_id").references(() => creatorWorkspaces.id),
    title: text("title").notNull().default("Batch remix"),
    status: creatorBatchStatusEnum("status").notNull().default("processing"),
    itemCount: integer("item_count").notNull().default(0),
    errors: jsonb("errors"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("creator_batches_user_id_idx").on(table.externalUserId),
    index("creator_batches_workspace_id_idx").on(table.workspaceId),
    index("creator_batches_status_idx").on(table.status),
  ],
);

export const creatorProjects = crosspost.table(
  "creator_projects",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    externalUserId: text("external_user_id").notNull(),
    workspaceId: integer("workspace_id").references(() => creatorWorkspaces.id),
    title: text("title").notNull().default("Untitled project"),
    status: projectStatusEnum("status").notNull().default("draft"),
    batchId: integer("batch_id").references(() => creatorBatches.id),
    modelId: integer("model_id").references(() => models.id),
    sourceReelId: integer("source_reel_id").references(() => sourceReels.id),
    runId: integer("run_id").references(() => runs.id),
    sourceVideoKey: text("source_video_key"),
    outputVideoKey: text("output_video_key"),
    srtKey: text("srt_key"),
    thumbnailKey: text("thumbnail_key"),
    burnedVideoKey: text("burned_video_key"),
    burnSubtitles: boolean("burn_subtitles").notNull().default(false),
    subtitleStyle: text("subtitle_style").notNull().default("minimal"),
    wantsCaptions: boolean("wants_captions").notNull().default(false),
    wantsHashtags: boolean("wants_hashtags").notNull().default(false),
    swapTier: text("swap_tier").notNull().default("quality"),
    notifyEmail: text("notify_email"),
    readyNotifiedAt: timestamp("ready_notified_at", { withTimezone: true }),
    transcript: jsonb("transcript"),
    caption: text("caption"),
    hashtags: text("hashtags"),
    hookVariants: jsonb("hook_variants"),
    platformVariants: jsonb("platform_variants"),
    rightsAttested: boolean("rights_attested").notNull().default(false),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("creator_projects_user_id_idx").on(table.externalUserId),
    index("creator_projects_workspace_id_idx").on(table.workspaceId),
    index("creator_projects_status_idx").on(table.status),
    index("creator_projects_batch_id_idx").on(table.batchId),
  ],
);

export const socialConnections = crosspost.table(
  "social_connections",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    externalUserId: text("external_user_id").notNull(),
    workspaceId: integer("workspace_id").references(() => creatorWorkspaces.id, {
      onDelete: "set null",
    }),
    platform: socialPlatformEnum("platform").notNull(),
    accountLabel: text("account_label").notNull().default(""),
    accountRef: text("account_ref").notNull(),
    accessTokenEnc: text("access_token_enc").notNull(),
    refreshTokenEnc: text("refresh_token_enc"),
    scopes: text("scopes"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    status: socialConnectionStatusEnum("status").notNull().default("active"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_connections_user_idx").on(table.externalUserId),
    uniqueIndex("social_connections_user_platform_account_uidx").on(
      table.externalUserId,
      table.platform,
      table.accountRef,
    ),
  ],
);

export const socialPosts = crosspost.table(
  "social_posts",
  {
    id: serial("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    projectId: integer("project_id")
      .notNull()
      .references(() => creatorProjects.id, { onDelete: "cascade" }),
    connectionId: integer("connection_id").references(() => socialConnections.id, {
      onDelete: "set null",
    }),
    platform: socialPlatformEnum("platform").notNull(),
    status: socialPostStatusEnum("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    lockedBy: text("locked_by"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    titleSnapshot: text("title_snapshot"),
    captionSnapshot: text("caption_snapshot"),
    privacy: text("privacy").notNull().default("private"),
    remotePostId: text("remote_post_id"),
    remotePostUrl: text("remote_post_url"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_posts_project_idx").on(table.projectId),
    index("social_posts_status_available_idx").on(table.status, table.availableAt),
  ],
);

export const schema = {
  models,
  faceReferences,
  sourceAccounts,
  sourceReels,
  prompts,
  providerConfigs,
  engineSettings,
  batches,
  batchItems,
  runs,
  runJobs,
  stageRuns,
  imageCandidates,
  videoRenders,
  exceptions,
  auditLog,
  assets,
  deliveries,
  creatorWorkspaces,
  creatorWorkspaceMembers,
  creatorWorkspaceInvites,
  creatorBatches,
  creatorProjects,
  socialConnections,
  socialPosts,
};

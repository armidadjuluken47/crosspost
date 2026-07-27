# AI Motion Video Engine - Build Plan And Acceptance Criteria

## 1. Delivery Principle

Build the full production workflow shape from the start.

Do not build only a manual upload tool. The core value is automated intake, registered identities, source preview/selection, batch generation, durable workers, provider fallbacks, QC, and exception handling.

Each phase below should leave the project in a runnable state.

## 2. Phase 0 - Project Setup

### Build

- Create a TypeScript monorepo or equivalent structured project.
- Add Next.js dashboard.
- Add Postgres and Drizzle.
- Add local development setup.
- Add environment variable validation.
- Add health endpoint.
- Add basic test runner.

### Acceptance Criteria

- Developer can run the app locally from a clean checkout.
- Database migrations apply cleanly.
- Health endpoint returns database, storage, ffmpeg, and provider readiness state.
- No provider API keys are required for pure local fixture mode.
- README explains local setup clearly.

## 3. Phase 1 - Database, Storage, And Audit Foundation

### Build

- Implement core schema:
  - models
  - face_references
  - source_accounts
  - source_reels
  - prompts
  - batches
  - batch_items
  - runs
  - run_jobs
  - stage_runs
  - image_candidates
  - video_renders
  - exceptions
  - audit_log
  - assets
- Implement R2 storage adapter.
- Implement local filesystem storage adapter for fixture/dev mode.
- Implement audit logging helper.

### Acceptance Criteria

- Every table has migration coverage.
- R2 upload/download works in live mode.
- Local storage works in fixture mode.
- Assets are stored with deterministic keys.
- Audit events are written for model creation, source intake, batch creation, run start, stage success/failure, retry, and exception resolution.

## 4. Phase 2 - Model Registry

### Build

- UI to create/edit registered models.
- Upload reference images.
- Store reference images in R2.
- Persist reference metadata in database.
- Validate image MIME type and size.
- Require at least 3 active references before generation.

### Acceptance Criteria

- Operator can create a model from the UI.
- Operator can upload at least 3 reference images.
- Uploaded references are visible in the UI.
- R2 keys are stored in the database.
- A model with fewer than 3 active references cannot be selected for generation.
- Deactivating a reference does not delete historical run traceability.

## 5. Phase 3 - Source Registry And Apify Intake

### Build

- UI to add/edit source Instagram accounts.
- Apify integration for approved handles.
- Deduplication by shortcode.
- Immediate source MP4 download.
- R2 storage for source MP4.
- ffmpeg first-frame extraction.
- R2 storage for first frame.
- Intake exceptions for missing/failed downloadable assets.

### Acceptance Criteria

- Operator can add a source account from the UI.
- Intake fetches reel candidates from Apify.
- Duplicate shortcodes are not imported twice.
- Downloaded source MP4s are stored in R2.
- First frames are extracted and stored in R2.
- Candidate source clips move to preview-ready status.
- If Apify returns no usable video asset, the UI shows a clear source exception.
- ffmpeg readiness is checked at startup/health.

## 6. Phase 4 - Source Preview And Selection

### Build

- Preview grid for candidate source reels.
- Playable video previews from R2.
- Display metadata: handle, shortcode, caption snippet, duration, posted date, metrics where available.
- Selection controls.
- Reject/archive controls.

### Acceptance Criteria

- Operator can watch a source video before generation.
- Operator can select one or more preview-ready reels.
- Operator can reject a source reel without deleting it.
- Selected reels are available in Batch Builder.
- A source reel with missing MP4 or first frame cannot be selected without an explicit warning/override.

## 7. Phase 5 - Prompt Operations

### Build

- Prompt table with immutable versions.
- UI to view active image/video prompts.
- UI to create a new prompt version.
- Activate/rollback prompt version.
- Prompt rendering helper.
- Stage runs store rendered prompt text and prompt metadata.

### Acceptance Criteria

- Image and video prompts are stored in the database.
- Editing a prompt creates a new version.
- Activating an older version works without deleting history.
- Every stage run records prompt stage, scope, version, and rendered text.
- Run Detail shows the rendered prompts used.

## 8. Phase 6 - WaveSpeed Image Generation Chain

### Build

- Typed WaveSpeed client.
- Provider config records for:
  - `wavespeed_nano_banana_pro`
  - `wavespeed_flux_kontext_max`
  - `wavespeed_seedream_v45`
- Image generation runner.
- Provider fallback logic.
- Provider error classification.
- Download provider outputs to R2.
- Image candidate records.
- 9:16 normalization with ffmpeg.

### Acceptance Criteria

- Image provider order is Nano Banana Pro, Flux Kontext Max, Seedream v4.5.
- Generation sends exactly 3 active model reference URLs plus the source first-frame URL.
- No image call sends more than 4 input image URLs unless the endpoint is reverified.
- If Nano fails with a retryable/provider issue, Flux is tried.
- If Flux fails, Seedream is tried.
- If all image providers fail, an image-generation exception is created.
- Generated output is stored in R2.
- Normalized 9:16 output is stored in R2.
- Image candidates are visible in Run Detail.
- Stage attempts show provider, prompt version, latency, request, response, and error where applicable.

## 9. Phase 7 - Image QC

### Build

- Basic deterministic checks:
  - asset exists
  - MIME type valid
  - dimensions/aspect ratio valid after normalization
- Add identity/composition/OCR checks as available.
- Select winning candidate.
- Store QC payload.
- Retry once if all candidates fail QC.
- Open exception after repeat QC failure.

### Acceptance Criteria

- A run cannot enter video generation without a winning normalized image.
- QC payload is visible in Run Detail.
- If every candidate fails QC, the system either retries once or opens an exception.
- The selected image is clearly marked as winner.

## 10. Phase 8 - WaveSpeed Kling Motion Video

### Build

- Typed WaveSpeed video client.
- Provider config for `wavespeed_kling_v3_standard`.
- Disabled config slot for `wavespeed_kling_v3_pro`.
- Video generation runner.
- Polling/webhook handling depending on WaveSpeed API shape.
- Download final video to R2.
- Video render record.

### Acceptance Criteria

- Video stage uses the winning generated first-frame image, not the original first frame.
- Video stage uses the original source MP4 as motion control/reference input.
- Video prompt version is recorded.
- Final video is downloaded to R2.
- Run Detail shows final video.
- Kling v3 Pro is visible as disabled or not visible, but never runs automatically.
- If video generation fails after allowed retries, a video-generation exception is created.

## 11. Phase 9 - Video QC

### Build

- Validate final video asset exists.
- Validate MIME type.
- Validate 9:16 dimensions.
- Validate playable MP4.
- Validate duration tolerance against source.
- Add sampled-frame checks as available.
- Store QC payload.

### Acceptance Criteria

- Corrupt, missing, non-vertical, or blank outputs do not auto-pass.
- QC results are visible in Run Detail.
- Passing videos are marked as winners.
- Failing videos create a video-QC exception after configured retry policy.

## 12. Phase 10 - Batch Builder And Queue Operations

### Build

- Batch Builder UI:
  - select source reels
  - select models
  - see run count
  - see estimated cost
  - add optional instruction
  - queue batch
- Batch state machine.
- Batch item records.
- Worker queue processing.
- Pause/resume.
- Retry failed items.
- Concurrency controls.

### Acceptance Criteria

- 5 selected source reels and 3 selected models create 15 run items.
- Batch progress updates in UI.
- Worker crash/interruption does not lose batch state.
- Completed run items are not duplicated on resume.
- Operator can retry failed items without rerunning successful items.
- Batch status becomes completed or completed_with_exceptions.

## 13. Phase 11 - Exception Center

### Build

- Central exception list.
- Filters by status, stage, provider, model, source reel, batch.
- Exception detail with payload.
- Actions:
  - retry stage
  - retry run
  - skip item
  - mark resolved
  - dismiss
- Audit events for all operator actions.

### Acceptance Criteria

- Every non-recoverable automation failure creates a visible exception.
- Exceptions contain enough context for a human to act.
- Resolving an exception updates run/batch state where appropriate.
- Dismissing an exception does not delete history.

## 14. Phase 12 - Delivery/Export

### Build

- Store final output in R2.
- Add optional delivery destination if confirmed:
  - Google Drive
  - Slack/Telegram
  - internal download page
- Delivery records.
- Delivery retry.

### Acceptance Criteria

- Delivered outputs have a durable R2 key.
- Delivery metadata is visible in Run Detail.
- Delivery failures create exceptions.
- Re-delivery is idempotent.

## 15. Phase 13 - Metrics, Cost, And Provider Operations

### Build

- Provider readiness panel.
- Run counts.
- Success/failure rates.
- Open exceptions.
- Cost per run.
- Cost per finished video.
- Provider latency.
- Provider fallback rate.
- QC pass rate by prompt version/provider/model.

### Acceptance Criteria

- Dashboard can answer what is running, what failed, what it cost, and what needs human attention.
- Provider order is visible.
- Disabled provider slots cannot run accidentally.
- Cost estimates appear before batch queueing.
- Cost actuals/estimates are recorded after provider calls.

## 16. Phase 14 - Production Hardening

### Build

- Authentication.
- Role-based access if needed.
- Rate limiting for expensive endpoints.
- Structured logging.
- Error monitoring.
- Backups for Postgres.
- R2 lifecycle/retention policy.
- Provider concurrency caps.
- Budget caps.
- Deployment docs.
- Runbook.

### Acceptance Criteria

- App can be deployed with documented environment variables.
- Worker can run continuously.
- Provider/API keys are not exposed to browser.
- A failed provider or missing API key does not crash the whole app.
- Daily cost/concurrency limits can be enforced.
- Production runbook explains common failures and fixes.

## 17. End-To-End Acceptance Test

This is the minimum full workflow that must pass.

1. Create a registered model with 3 reference images.
2. Add an approved source Instagram account.
3. Run Apify intake.
4. Confirm a source MP4 is stored in R2.
5. Confirm the exact first frame is extracted and stored in R2.
6. Preview the source video in the UI.
7. Select the source reel.
8. Select the registered model.
9. Queue a batch/run.
10. Confirm the image stage sends 3 model refs plus 1 source first frame.
11. Confirm WaveSpeed returns a generated image.
12. Confirm generated image is normalized to exact 9:16.
13. Confirm image QC selects a winner.
14. Confirm video generation uses the generated image and original source MP4.
15. Confirm final video is stored in R2.
16. Confirm final video appears in Run Detail.
17. Confirm prompts, provider attempts, costs, assets, QC, exceptions, and audit events are visible.

## 18. Production Readiness Checklist

Before considering the project production-ready:

- WaveSpeed API key verified.
- WaveSpeed model schemas verified live.
- WaveSpeed image provider order verified.
- WaveSpeed Kling v3 Standard verified live.
- Cloudflare R2 upload and public/signed URL access verified.
- Apify actor and dataset shape verified.
- ffmpeg binary verified in web and worker runtime.
- Postgres migrations verified on production database.
- Environment variables documented.
- Error monitoring active.
- Worker deployment active.
- Queue retry/resume tested.
- Batch retry/resume tested.
- Prompt rollback tested.
- At least 10 real source clips processed end to end.
- At least 3 registered models tested if available.
- Cost per successful output measured from real runs.
- Operator can recover from common exceptions without developer help.

## 19. What Good Looks Like

Good implementation feels boring operationally.

- The operator does not handle raw files for normal runs.
- Model references are registered once.
- Source clips are pulled and stored automatically.
- Generated images always feed video generation.
- The dashboard shows progress clearly.
- Failed stages are visible and retryable.
- Provider weirdness does not corrupt state.
- Batches can be paused, resumed, and retried.
- Historical runs remain explainable because prompts, payloads, assets, and provider responses are stored.


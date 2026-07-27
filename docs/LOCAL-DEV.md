# Local Development

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker, if running local Postgres

## Setup

```bash
pnpm install
cp .env.example .env
pnpm infra:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Launch Provider State

The launch image chain is:

```text
wavespeed_nano_banana_pro -> wavespeed_flux_kontext_max -> wavespeed_seedream_v45
```

The launch video provider is:

```text
wavespeed_kling_v3_standard
```

`wavespeed_kling_v3_pro` is seeded as a disabled premium WaveSpeed slot until pricing and
concurrency are verified. No non-WaveSpeed generation provider should be enabled in this scaffold.

## Demo Vertical Slice

With the dev server running:

```bash
curl -s -i -X POST http://127.0.0.1:3000/api/runs/demo
```

Expected result:

- `providerId` is `wavespeed_nano_banana_pro` when the first provider succeeds.
- `run.status` moves to `delivered` after fixture video QC succeeds.
- `stageRun.status`, `qcStageRun.status`, `videoStageRun.status`, and `videoQcStageRun.status` are `success`.
- `image.r2Key` points at a deterministic fixture output path.
- `video.r2Key` points at a deterministic fixture output path.
- `winnerCandidateId` is set.
- `delivery.drivePath` points at a deterministic fixture Drive path.

This demo runs in fixture mode unless `IMAGE_PROVIDER_MODE=api`, `WAVESPEED_API_KEY`, and
`WAVESPEED_API_BASE_URL` are configured.

## Create A Run

`POST /api/runs` accepts a structured source reel, model, and prompt payload:

```bash
curl -s -i -H 'content-type: application/json' \
  -d '{"sourceAccount":{"handle":"demo-source","followerCount":250000},"sourceReel":{"shortcode":"manual-demo-1","reelUrl":"https://www.instagram.com/reel/manual-demo-1/","postedAt":"2026-05-09T10:00:00.000Z","caption":"High movement outfit transition","viewCount":900000,"durationSeconds":7,"firstFrameR2Key":"fixtures/reels/manual-demo-1/first-frame.png"},"model":{"slug":"demo-model","displayName":"Demo Model"},"prompt":"Generate a photorealistic vertical fashion frame preserving the source pose, outfit flow, and face identity."}' \
  http://127.0.0.1:3000/api/runs
```

Expected result:

- HTTP `201`
- `run.status` is `delivered` in fixture mode
- `providerId` is `wavespeed_nano_banana_pro`
- `videoProviderId` is `wavespeed_kling_v3_standard`
- `delivery.drivePath` is present

The dashboard exposes the same flow in the Manual Run panel. The form submits to `POST /api/runs`
and refreshes recent runs from `GET /api/runs`.

Fixture output assets are written under `.amve-storage` by default. Override this with:

```bash
LOCAL_ASSET_STORAGE_DIR=/tmp/amve-assets pnpm dev
```

## Queue Mode

The manual run API accepts `executionMode`:

```json
{
  "executionMode": "inline"
}
```

or:

```json
{
  "executionMode": "queued"
}
```

Inline mode executes during the HTTP request and returns HTTP `201`. Queued mode returns HTTP `202`
with a job summary. In local fixture mode, process one queued job with:

```bash
curl -s -i -X POST http://127.0.0.1:3000/api/run-jobs/process-next
```

Recent jobs are available from:

```bash
curl -s -i http://127.0.0.1:3000/api/run-jobs
```

Failed jobs can be requeued for an operator retry:

```bash
curl -s -i -X POST -H 'content-type: application/json' \
  -d '{"id":1,"requestedBy":"local"}' \
  http://127.0.0.1:3000/api/run-jobs/retry
```

The dashboard Manual Run panel has the same Inline/Queue control. The Queue Operations panel can
refresh jobs, process the next queued job, and retry failed jobs.

## Dashboard Summary

The dashboard KPI strip is backed by:

```bash
curl -s -i http://127.0.0.1:3000/api/dashboard/summary
```

The response includes run totals, delivered runs, open exceptions, recent queue counts, total
deliveries, total fixture cost, and the most recent audit event. In local fallback mode this data is
in-memory; with `DATABASE_URL`, the summary reads from Postgres-backed repositories.

## Run Detail

Inspect one run across stages, generated candidates, video renders, deliveries, exceptions,
artifact availability, and run audit events:

```bash
curl -s -i http://127.0.0.1:3000/api/runs/1
```

The dashboard Run Detail panel exposes the same view for recent runs.

## Provider Readiness

Inspect provider order and live configuration readiness with:

```bash
curl -s -i http://127.0.0.1:3000/api/providers
```

Expected image provider order is `wavespeed_nano_banana_pro`,
`wavespeed_flux_kontext_max`, `wavespeed_seedream_v45`. Expected video provider order is
`wavespeed_kling_v3_standard`, with `wavespeed_kling_v3_pro` disabled until explicitly approved.

## Registered Source Intake

Register one or more source handles with:

```bash
curl -s -i -H 'content-type: application/json' \
  -d '{"handles":["fixture-source"],"requestedBy":"local"}' \
  http://127.0.0.1:3000/api/sources
```

With at least one active source and one active model with three reference photos, enqueue automated
intake across the registered source/model matrix:

```bash
curl -s -i -H 'content-type: application/json' \
  -d '{"maxReels":3,"requestedBy":"local"}' \
  http://127.0.0.1:3000/api/ingestion/registered
```

Expected result:

- HTTP `202` when Apify is configured
- `sourceCount` is the number of active registered sources
- `modelCount` is the number of active registered models with three or more reference photos
- `jobs` contains queued run jobs with source `ingestion`

The dashboard exposes this as Source Registry and Automated Intake.

Real registered intake requires:

```text
INGESTION_PROVIDER_MODE=api
APIFY_TOKEN=...
APIFY_INSTAGRAM_ACTOR_ID=...
```

or:

```text
INGESTION_PROVIDER_MODE=api
APIFY_TOKEN=...
APIFY_INSTAGRAM_TASK_ID=...
```

The live path downloads Apify video assets, stores the source MP4 in R2, stores a first-frame image
in R2, persists those R2 keys on `source_reels`, and only then queues model fan-out jobs. The app
uses its bundled `ffmpeg-static` binary for first-frame extraction; set `FFMPEG_PATH=/path/to/ffmpeg`
only if you deliberately want to override it.

## Diagnostic Fixture Ingestion

Create ranked fixture reel candidates and enqueue run jobs with:

```bash
curl -s -i -H 'content-type: application/json' \
  -d '{"sourceAccount":{"handle":"fixture-source","followerCount":250000},"model":{"slug":"demo-model","displayName":"Demo Model"},"prompt":"Generate a photorealistic vertical fashion frame preserving the source pose, outfit flow, and face identity.","maxReels":3,"requestedBy":"local"}' \
  http://127.0.0.1:3000/api/ingestion/fixture
```

Expected result:

- HTTP `202`
- `providerId` is `fixture_ingestion`
- `candidates` contains ranked reel shortcodes
- `jobs` contains queued run jobs with source `ingestion`

The dashboard only exposes this diagnostic panel when `ENABLE_DIAGNOSTIC_RUN_UI=true`.

## Exceptions

Open exceptions are available from:

```bash
curl -s -i http://127.0.0.1:3000/api/exceptions?status=open
```

Resolve or dismiss an exception with:

```bash
curl -s -i -X PATCH -H 'content-type: application/json' \
  -d '{"id":1,"status":"resolved","resolvedByUserId":"local","resolutionAction":"Resolved during local validation."}' \
  http://127.0.0.1:3000/api/exceptions
```

The dashboard Exception Center refreshes open exceptions and exposes Resolve/Dismiss actions.

## Audit Log

Recent audit events are available from:

```bash
curl -s -i http://127.0.0.1:3000/api/audit-log
```

Events are recorded for manual run creation, queued runs, registered intake, fixture ingestion,
queue processing, demo runs, and exception resolution. The dashboard Audit Log panel shows the most
recent events.

When `DATABASE_URL` is configured, queued runs are persisted to Postgres in `run_jobs`. Process one
durable queued job outside the web app with:

```bash
pnpm worker:run-once
```

Run a polling worker in development with:

```bash
pnpm worker:dev
```

# Environment Variables

## Required for Scaffold

- `DATABASE_URL`

## Image Stage

- `IMAGE_PROVIDER_MODE` defaults to fixture behavior until live transport is connected.
- `WAVESPEED_API_KEY` is required before live WaveSpeed image generation can run.
- `WAVESPEED_API_BASE_URL` defaults operationally to `https://api.wavespeed.ai`; set it explicitly
  in live mode so the readiness surface can verify configuration.
- `WAVESPEED_POLL_INTERVAL_MS`, `WAVESPEED_MAX_POLL_ATTEMPTS`, `WAVESPEED_VIDEO_MAX_POLL_ATTEMPTS`, and
  `WAVESPEED_REQUEST_TIMEOUT_MS` control WaveSpeed polling cadence, total task wait budget, and
  the per-request network timeout. Image tasks use `WAVESPEED_MAX_POLL_ATTEMPTS` (default `120` × 3s ≈ 6 min).
  Kling video uses `WAVESPEED_VIDEO_MAX_POLL_ATTEMPTS` (default `240` × 3s ≈ 12 min).
  `WAVESPEED_REQUEST_TIMEOUT_MS` defaults to `60000` when unset.
- `RUN_EXECUTION_MODE` may be set to `queued` to make manual run creation enqueue jobs by default.
- `WORKER_LOOP=true` runs the standalone worker as a polling process.
- `WORKER_POLL_INTERVAL_MS` controls worker idle polling and defaults to `5000`.
- `ASSET_STORAGE_MODE` defaults to `local`; set to `r2` only after live R2 transport is connected.
- `LOCAL_ASSET_STORAGE_DIR` controls fixture asset output and defaults to `.amve-storage`.
- `LOCAL_ASSET_PUBLIC_BASE_URL` can expose local fixture keys as URL strings in storage metadata.
- `R2_BUCKET_NAME` is required alongside the existing R2 credentials before R2 storage can be enabled.
- `VIDEO_PROVIDER_MODE` defaults to fixture behavior until live video transport is connected.
- `WAVESPEED_API_KEY` and `WAVESPEED_API_BASE_URL` are required before live WaveSpeed video generation can run.

The live WaveSpeed image response contract expected by the current normalized transport is:

```json
{
  "providerModel": "model-name",
  "costCents": 6,
  "generatedAt": "2026-05-08T00:00:00.000Z",
  "images": [
    {
      "ordinal": 1,
      "r2Key": "generated/model/shortcode/run/provider/candidate-1.png",
      "mimeType": "image/png",
      "width": 1080,
      "height": 1920
    }
  ]
}
```

The live WaveSpeed video response contract expected by the current normalized transport is:

```json
{
  "providerModel": "model-name",
  "costCents": 55,
  "generatedAt": "2026-05-09T00:00:00.000Z",
  "video": {
    "r2Key": "generated-videos/model/shortcode/run/provider/render-1.mp4",
    "mimeType": "video/mp4",
    "width": 1080,
    "height": 1920,
    "durationSeconds": 5
  }
}
```

## Required Before Real Vertical Slice

- `APIFY_TOKEN`
- `APIFY_WEBHOOK_SECRET`
- `INGESTION_PROVIDER_MODE`
- `APIFY_INSTAGRAM_ACTOR_ID` or `APIFY_INSTAGRAM_TASK_ID`
- `APIFY_INSTAGRAM_INPUT_TEMPLATE`
- `APIFY_SYNC_TIMEOUT_SECONDS`
- `FFMPEG_PATH` is optional. Registered intake uses the bundled `ffmpeg-static` binary by default
  to extract the exact first frame from each downloaded source MP4. Set this only if you want to
  force a specific system ffmpeg executable.
- `WAVESPEED_API_KEY`
- `WAVESPEED_API_BASE_URL`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY`
- `R2_SECRET_KEY`
- `R2_BUCKET_NAME`
- `DRIVE_SA_JSON_BASE64`
- `DRIVE_ROOT_FOLDER_ID`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

## Production hardening

- `DASHBOARD_PASSWORD` — Basic auth for dashboard + API (except `/api/health`). Use username `admin` or `amve`.
- `OPERATOR_PASSWORD` — optional restricted operator password. Login with username `operator` and this password. Operators can intake, queue runs, and resolve exceptions; admins retain prompt/model/batch controls.
- `DAILY_SPEND_CAP_CENTS` — blocks batch dispatch when estimated daily spend exceeds cap (0 = disabled)
- `REDIS_URL` — optional Redis connection string for distributed API rate limiting on the web service.
  When unset, rate limits fall back to in-memory counters (fine for single-instance dev).
- `WAVESPEED_MAX_CONCURRENT_JOBS` — max concurrent run jobs the worker will execute (default `2`).
  Additional queued jobs wait until a running job finishes.
- `SENTRY_DSN` — optional; enables error monitoring (web + worker)
- `SENTRY_ENVIRONMENT` — Sentry environment tag (default: `NODE_ENV`)
- `DRIVE_ROOT_FOLDER_ID` — Shared Drive ID (`0AN6qzR_YR3VeUk9PVA` for AMVE Deliveries)
- `DRIVE_SA_JSON_BASE64` — base64-encoded Google service account JSON
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — delivery and exception alerts

## Optional Future

- `WAVESPEED_WEBHOOK_PUBLIC_KEY_CACHE_TTL_MS`
- `WAVESPEED_WEBHOOK_URL`

## Apify Intake

`INGESTION_PROVIDER_MODE=api` makes registered intake use Apify and R2 asset capture. Use
`INGESTION_PROVIDER_MODE=fixture` only for diagnostics.

Configure either `APIFY_INSTAGRAM_ACTOR_ID` or `APIFY_INSTAGRAM_TASK_ID`. If the Actor needs a
custom input shape, set `APIFY_INSTAGRAM_INPUT_TEMPLATE` to a JSON object. The template supports:

- `{{handle}}`
- `{{sourceUrl}}`
- `{{reelsUrl}}`
- `{{maxReels}}`

Example:

```json
{"directUrls":["{{reelsUrl}}"],"resultsLimit":"{{maxReels}}","resultsType":"posts"}
```

Generation should stay WaveSpeed-only unless a later product decision deliberately reopens other
provider families.

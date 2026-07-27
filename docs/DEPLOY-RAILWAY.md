# Railway Deployment — AMVE

Deploy as **two services** from this monorepo, plus the existing Postgres service.

## 1. Postgres

Use Railway Postgres (already configured). Copy `DATABASE_URL` into both services below.

After deploy, run migrations once from your machine or a Railway one-off:

```bash
DATABASE_URL=... corepack pnpm db:migrate
DATABASE_URL=... corepack pnpm db:seed
```

## 2. Web service (`@amve/web`)

| Setting | Value |
|---------|--------|
| Root directory | `/` (repo root) |
| Build command | `corepack enable && corepack pnpm install && corepack pnpm --filter @amve/web build` |
| Start command | `corepack pnpm --filter @amve/web start` |

Set all env vars from `.env` (see `.env.example` + Oliver's Drive/Telegram values).

Recommended production toggles:

```env
NODE_ENV=production
ASSET_STORAGE_MODE=r2
RUN_EXECUTION_MODE=queued
WORKER_LOOP=true
DASHBOARD_PASSWORD=<choose-a-strong-password>
DAILY_SPEND_CAP_CENTS=50000
WAVESPEED_VIDEO_MAX_POLL_ATTEMPTS=240
```

Keep `IMAGE_PROVIDER_MODE=fixture` until Oliver approves live WaveSpeed spend.

**Sentry (optional):** set `SENTRY_DSN` and `SENTRY_ENVIRONMENT=production` on web + worker. Test with `POST /api/admin/sentry-test` (requires dashboard auth).

**ffmpeg:** `nixpacks.toml` installs system `ffmpeg` on both services. Optional override:

```env
FFMPEG_PATH=/usr/bin/ffmpeg
```

## 3. Worker service (`@amve/worker`)

| Setting | Value |
|---------|--------|
| Root directory | `/` |
| Build command | `corepack enable && corepack pnpm install && corepack pnpm --filter @amve/worker build` |
| Start command | `corepack pnpm --filter @amve/worker start` |

Use the **same env vars** as the web service. Ensure:

```env
WORKER_LOOP=true
```

## 4. Smoke test after deploy

```bash
curl -s https://<your-app>/api/health | jq
curl -u operator:<DASHBOARD_PASSWORD> -X POST https://<your-app>/api/runs/demo
curl -u operator:<DASHBOARD_PASSWORD> -X POST https://<your-app>/api/run-jobs/process-next
```

Check:
- `/api/health` shows `delivery: ok` and `telegram: ok`
- A delivered run uploads to **AMVE Deliveries** in Google Drive
- Telegram group receives alert

## 5. Local integration test (before deploy)

```bash
corepack pnpm --filter @amve/pipeline test-delivery
```

## 6. Security notes

- Never commit `.env` or `secrets/`
- Rotate Drive key / Telegram token if exposed
- `DASHBOARD_PASSWORD` protects all routes except `/api/health`

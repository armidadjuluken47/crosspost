# Deploy CrossPost AI to Railway

Three services from the GitHub repo `armidadjuluken47/crosspost`:

1. **Postgres** (Railway plugin)
2. **web** — Next.js (`@crosspost/web`)
3. **worker** — background jobs (`@crosspost/worker`)

`nixpacks.toml` at repo root installs **ffmpeg** on both web and worker.

## 1. Create the Railway project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `crosspost`
2. Railway may **auto-detect** `@crosspost/web` and `@crosspost/worker` from the pnpm monorepo — if so, rename them **web** and **worker**
3. If only one service is created, **Add Service** → same GitHub repo again for the second
4. Add **PostgreSQL** (Variables tab → `DATABASE_URL` is auto-created)

## 2. Web service (easy config)

Railway now uses **Railpack** by default (not Nixpacks). Without a config file it
mis-detects the pnpm monorepo and fails.

| Setting | Value |
|---------|--------|
| Root directory | `/` (repo root) |
| **Variable** | `RAILPACK_CONFIG_FILE` = `railpack.web.json` |

Optional fallback: Settings → Builder → **Nixpacks**, Config file = `/railway.web.toml`

**Watch paths** (optional, avoids rebuilds when worker changes):

```
/apps/web/**
/packages/**
/railway.web.toml
/nixpacks.toml
```

## 3. Worker service (easy config)

**Add a second service:** Project canvas → **+ New** → **GitHub Repo** → same `crosspost` repo.

| Setting | Value |
|---------|--------|
| Root directory | `/` |
| **Variable** | `RAILPACK_CONFIG_FILE` = `railpack.worker.json` |

**Watch paths** (optional):

```
/apps/worker/**
/packages/**
/railway.worker.toml
/nixpacks.toml
```

Use the **same environment variables** on web and worker.

## 4. Required production env vars

Copy from your local `.env` into **both** web + worker (Railway → service → Variables).

**Core**

```env
NODE_ENV=production
APP_BASE_URL=https://YOUR-WEB-SERVICE.up.railway.app
DATABASE_URL=${{Postgres.DATABASE_URL}}

RUN_EXECUTION_MODE=queued
WORKER_LOOP=true
ASSET_STORAGE_MODE=r2

IMAGE_PROVIDER_MODE=api
VIDEO_PROVIDER_MODE=api
CONTENT_AI_MODE=api
INGESTION_PROVIDER_MODE=api

WAVESPEED_API_KEY=...
OPENAI_API_KEY=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_BASE_URL=https://...

FIREBASE_SA_JSON_BASE64=...   # base64 of service-account.json
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...

RESEND_API_KEY=...
EMAIL_FROM=CrossPost <noreply@yourdomain.com>

DASHBOARD_PASSWORD=strong-password-here
SOCIAL_TOKEN_ENC_KEY=...
YOUTUBE_OAUTH_CLIENT_ID=...
YOUTUBE_OAUTH_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

Generate Firebase base64 locally:

```bash
base64 -w0 service-account.json
```

Generate social encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 5. After first deploy

From your machine (or Railway one-off shell):

```bash
DATABASE_URL="postgresql://..." corepack pnpm db:migrate
DATABASE_URL="postgresql://..." corepack pnpm db:seed
```

## 6. Post-deploy checklist

1. Set **APP_BASE_URL** to the public Railway URL (Settings → Networking → Generate domain)
2. Update OAuth redirect URIs:
   - Google: `{APP_BASE_URL}/api/creator/social/youtube/callback`
   - TikTok: `{APP_BASE_URL}/api/creator/social/tiktok/callback`
3. Firebase Console → Authentication → Settings → **Authorized domains** → add your Railway domain
4. Stripe → Webhooks → add `https://YOUR-APP/api/stripe/webhook`
5. Smoke test:
   ```bash
   curl -s https://YOUR-APP/api/health
   curl -s https://YOUR-APP/api/ship-readiness
   ```

## 7. Optional

- `SENTRY_DSN` + `SENTRY_ENVIRONMENT=production` on web + worker
- `DAILY_SPEND_CAP_CENTS=50000` to cap WaveSpeed spend
- `FFMPEG_PATH=/usr/bin/ffmpeg` (usually auto-detected via nixpacks)

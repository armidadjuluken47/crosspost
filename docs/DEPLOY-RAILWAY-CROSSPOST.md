# Deploy CrossPost AI to Railway

Same pattern as **AMVE** (`ai-motion-video-engine-developer-handover`): **two app services**
from one pnpm monorepo + **Postgres**.

## 1. Create the Railway project (get web + worker)

**Option A — Monorepo auto-detect (like AMVE)**

1. [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → `armidadjuluken47/crosspost`
3. Railway should detect the pnpm workspace and **stage two services**:
   - `@crosspost/web` → rename to **web**
   - `@crosspost/worker` → rename to **worker**

If you only see **one** service, use Option B.

**Option B — Manual second service**

1. Keep your existing **web** service
2. Project canvas → **+ New** → **GitHub Repo** → same `crosspost` repo
3. Rename the new one **worker**

## 2. Postgres

Project canvas → **+ New** → **Database** → **PostgreSQL**

Copy `DATABASE_URL` into **both** web and worker (or use `${{Postgres.DATABASE_URL}}`).

After first deploy:

```bash
DATABASE_URL="..." corepack pnpm db:migrate
DATABASE_URL="..." corepack pnpm db:seed
```

## 3. Web service (`@crosspost/web`)

| Setting | Value |
|---------|--------|
| Root directory | `/` (repo root) |
| **Builder** | **Nixpacks** (click to select — same as AMVE) |
| Build command | `corepack enable && corepack pnpm install && corepack pnpm --filter @crosspost/web build` |
| Start command | `corepack pnpm --filter @crosspost/web start` |

`nixpacks.toml` installs **ffmpeg** (same as AMVE).

## 4. Worker service (`@crosspost/worker`)

| Setting | Value |
|---------|--------|
| Root directory | `/` |
| **Builder** | **Nixpacks** |
| Build command | `corepack enable && corepack pnpm install && corepack pnpm --filter @crosspost/worker build` |
| Start command | `corepack pnpm --filter @crosspost/worker start` |

Use the **same env vars** as web. Ensure:

```env
WORKER_LOOP=true
RUN_EXECUTION_MODE=queued
```

## 5. Production env vars (web + worker)

```env
NODE_ENV=production
APP_BASE_URL=https://YOUR-WEB-DOMAIN.up.railway.app
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

FIREBASE_SA_JSON_BASE64=...   # base64 of service-account.json (not file path)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...

RESEND_API_KEY=...
EMAIL_FROM=CrossPost <noreply@yourdomain.com>

DASHBOARD_PASSWORD=strong-password
SOCIAL_TOKEN_ENC_KEY=...
YOUTUBE_OAUTH_CLIENT_ID=...
YOUTUBE_OAUTH_CLIENT_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
```

Generate Firebase base64:

```bash
base64 -w0 service-account.json
```

## 6. If Railpack is selected and build fails

Railway may default to **Railpack** on new projects. AMVE used **Nixpacks**.

Fix (pick one):

1. **Recommended:** Settings → **Builder** → select **Nixpacks** → paste build/start commands above → Redeploy
2. **Or** set variable `RAILPACK_CONFIG_FILE=railpack.web.json` (web) / `railpack.worker.json` (worker)

## 7. Post-deploy

1. **web** → Settings → Networking → **Generate Domain**
2. Set `APP_BASE_URL` on **both** services → redeploy
3. Firebase → Authorized domains → add Railway domain
4. Google/TikTok OAuth redirects → `{APP_BASE_URL}/api/creator/social/.../callback`
5. Stripe webhook → `https://YOUR-APP/api/stripe/webhook`
6. Smoke test:
   ```bash
   curl -s https://YOUR-APP/api/health
   curl -s https://YOUR-APP/api/ship-readiness
   ```

## 8. Final layout (same as AMVE)

```
Postgres
web     ← public domain, Nixpacks, @crosspost/web
worker  ← no public domain, Nixpacks, @crosspost/worker
```

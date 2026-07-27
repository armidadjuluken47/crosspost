# AMVE — Oliver Handoff (Day 7)

Internal dashboard for turning Instagram reels into 9:16 AI motion videos with registered model identities.

## What ships in v1

- **Dashboard** — Overview, Models, Sources, Prompts, Batch Builder, Queue, Exceptions, Audit, Run Detail
- **Pipeline** — Ingestion → image chain → video → QC → delivery (fixture or live providers)
- **Batch dispatch** — Queue runs by model + source reels with spend-cap guard
- **Google Drive delivery** — Final MP4 uploaded to `AMVE Deliveries` folder hierarchy
- **Telegram alerts** — Delivery success, exceptions, intake failures
- **Basic auth** — Set `DASHBOARD_PASSWORD` to protect dashboard + API (health endpoint exempt)
- **Login page** — `/login` sets a signed session cookie (no browser Basic Auth popup). **Sign out** in the sidebar footer.
- **RBAC (Day 11)** — Optional `OPERATOR_PASSWORD` for restricted operator login (username `operator`). Admin uses username `admin` or `amve` with `DASHBOARD_PASSWORD`.
- **Rate limits** — Batch dispatch, demo runs, account/registered intake

## Quick start (local)

```bash
corepack pnpm install
cp .env.example .env   # fill in values
corepack pnpm db:migrate && corepack pnpm db:seed
corepack pnpm dev        # http://localhost:3000
corepack pnpm worker:dev   # if RUN_EXECUTION_MODE=queued
```

Verify integrations:

```bash
corepack pnpm test:delivery   # Drive folder access + Telegram ping
curl -X POST http://localhost:3000/api/runs/demo   # fixture end-to-end run
```

## Production deploy

See [DEPLOY-RAILWAY.md](./DEPLOY-RAILWAY.md). Summary:

1. Railway Postgres (already provisioned)
2. **Web service** — `@amve/web`, same env as local
3. **Worker service** — `@amve/worker`, `WORKER_LOOP=true`
4. Run migrations once: `DATABASE_URL=... corepack pnpm db:migrate`

Recommended production env:

```env
NODE_ENV=production
ASSET_STORAGE_MODE=r2
RUN_EXECUTION_MODE=queued
WORKER_LOOP=true
DASHBOARD_PASSWORD=<strong-password>
OPERATOR_PASSWORD=<optional-operator-password>
REDIS_URL=<railway-redis-private-url>
WAVESPEED_MAX_CONCURRENT_JOBS=2
DAILY_SPEND_CAP_CENTS=50000
IMAGE_PROVIDER_MODE=api
VIDEO_PROVIDER_MODE=api
INGESTION_PROVIDER_MODE=api
```

## Live acceptance (Day 11)

- **10 reels delivered** to Google Drive (~$7 total live spend, ~70¢/clip)
- **3 models:** Hazel, Amber, Mia
- **Stress batch #7:** 15 runs (5 reels × 3 models) — may complete overnight

See [DAY-11-COMPLETION.md](./DAY-11-COMPLETION.md) for run table and Oliver sign-off message.

See [OLIVER-ACCESS.md](./OLIVER-ACCESS.md) for URL, Drive folder ID, and first-session steps.

**Presentation handover:** [SOFTWARE-HANDOVER.md](./SOFTWARE-HANDOVER.md)

## Demo checklist for Oliver

1. Open https://creatr-motion-engine-web-production.up.railway.app/login (or `/` → redirects)
2. Sign in — admin: `admin` + `DASHBOARD_PASSWORD`; operator: `operator` + `OPERATOR_PASSWORD`
3. Overview → confirm **Google Drive** and **Telegram** show `ok`
4. Models → confirm Hazel (or seeded model) has face references
5. Sources → preview grid loads; run account intake (fixture or Apify)
6. Batch Builder → create a small batch (1–2 reels)
7. Queue → jobs process (worker running)
8. Run Detail → stages complete; delivery shows Drive link or path
9. Google Drive → MP4 appears under `{modelSlug}/{shortcode}/`
10. Telegram group → delivery / exception alerts arrive

## Credentials Oliver provided

| Integration | Notes |
|-------------|--------|
| Google Drive SA | `amve-delivery@creatr-amve.iam.gserviceaccount.com` — **share `AMVE Deliveries` folder with this email (Editor)** |
| Drive folder | **AMVE Deliveries** Shared Drive — `DRIVE_ROOT_FOLDER_ID=0AN6qzR_YR3VeUk9PVA` (old My Drive folder `zz-RETIRED` — do not use) |
| Telegram | `@creatrcontentbot` → Creatr Content Engine group |

Store SA JSON as `DRIVE_SA_JSON_BASE64` (base64 of JSON file). Never commit `.env` or `secrets/`.

## Roles (Day 11)

| Role | Login | Can do | Cannot do |
|------|-------|--------|-----------|
| **Admin** | `admin` + `DASHBOARD_PASSWORD` | Everything — prompts, models, batches, settings | — |
| **Operator** | `operator` + `OPERATOR_PASSWORD` | View, intake, queue runs, exceptions, re-delivery | Activate prompts, deactivate refs, batch dispatch, demo/fixture |

If `OPERATOR_PASSWORD` is unset, only admin login works (backward compatible).

## Known limits / v1.1 backlog

- Custom domain optional — default Railway URL works
- 15-run stress batch — queue from Batch Builder when ready for overnight processing

## Support commands

```bash
corepack pnpm build && corepack pnpm test
corepack pnpm test:delivery
curl http://localhost:3000/api/health | jq
```

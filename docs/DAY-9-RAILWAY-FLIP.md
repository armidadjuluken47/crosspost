# Day 9 — Railway live mode flip

Production must run with live providers before acceptance reels. Update **both** Railway services (web + worker).

## 1. Set these variables on Railway (web + worker)

```env
INGESTION_PROVIDER_MODE=api
IMAGE_PROVIDER_MODE=api
VIDEO_PROVIDER_MODE=api
```

Keep existing values for `APIFY_TOKEN`, `WAVESPEED_API_KEY`, R2, Drive, worker loop, etc.

Redeploy both services after saving.

## 2. Verify health

```bash
curl -s https://creatr-motion-engine-web-production.up.railway.app/api/health | jq \
  '.components.ingestion, .components.imageGeneration, .components.videoGeneration'
```

Expected: each shows `"mode": "api"` and status `"ok"` (not `"degraded"` / `"fixture"`).

## 3. Live intake (one account first)

Dashboard → **Sources** → pick an account (e.g. `@mariedeeonline`) → **Run intake** (max 2–3 reels).

Or API:

```bash
curl -u amve:PASSWORD -X POST \
  'https://creatr-motion-engine-web-production.up.railway.app/api/sources/1/intake' \
  -H 'Content-Type: application/json' \
  -d '{"maxReels":3,"requestedBy":"day-9"}'
```

Confirm new reels have **real Instagram shortcodes** (not `fixture-*`) and preview thumbnails load.

## 4. First live run (single reel)

Batch Builder → Hazel × 1 real reel → dispatch **1 run**. Watch **Queue** until delivered.

Or local script (uses prod DB + your `.env` with api modes):

```bash
corepack pnpm day-9:live -- --handle mariedeeonline --max-reels 3 --intake-only
corepack pnpm day-9:live -- --handle mariedeeonline --run-only --reel-id REEL_ID
```

## 5. Acceptance reels 2–5

Repeat batch/queue for 4 more real reels. Log costs in a spreadsheet (run ID, stages, `costCents`, latency).

## Notes

- **Local dev** may fail downloading Instagram CDN videos (`ETIMEDOUT`). Intake on **Railway** usually works because the server network differs.
- **Spend cap:** `DAILY_SPEND_CAP_CENTS=50000` is set — oversized batches will be rejected.
- **Kling Pro** stays disabled in code; only Kling v3 Standard runs.

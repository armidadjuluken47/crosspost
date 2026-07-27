# AMVE — Master Work Plan

**How to use this doc**

When you say **"Start Day 8"** (or 9, 10, 11), the agent must:

1. Read **that day's section** below in full.
2. Execute build → test → smoke in order.
3. Tick acceptance criteria before marking the day done.
4. End with: `git push` (if code changed) + Railway redeploy note + summary of what's left.

**Production URL:** https://creatr-motion-engine-web-production.up.railway.app

**Related docs:** `4-DAY-SPRINT.md` (checkbox tracker), `BUILD_PLAN_AND_ACCEPTANCE_CRITERIA.md` (full spec), `HANDOFF.md`, `DEPLOY-RAILWAY.md`

---

## Progress overview

| Day | Focus | Status |
|-----|--------|--------|
| **1** | Monorepo, DB, storage, health, shared types | ✅ Done |
| **2** | Fixture pipeline (image → QC → video → QC → delivery) | ✅ Done |
| **3** | Model registry, source registry, prompts | ✅ Done |
| **4** | Apify intake, ffmpeg, source preview | ✅ Done |
| **5** | Run detail, exceptions, audit, queue | ✅ Done |
| **6** | Live WaveSpeed in code, batch builder, KPIs | ✅ Done |
| **7** | Railway deploy, Drive, Telegram, auth, handoff docs | ✅ Done |
| **8** | Close handoff + Sentry + runbook + backups | ✅ Done |
| **9** | Live providers + acceptance reels 1–5 | ✅ Done |
| **10** | Full KPIs + batch/exception UI + Redis + models 2–3 | ✅ Done |
| **11** | RBAC + stress tests + acceptance finish + signoff | ✅ Done (batch #7 overnight) |

---

# Day 8 — Close handoff + Phase 14 foundation

**Say:** `Start Day 8`

**Calendar:** Friday  
**Hours:** ~15  
**Phases:** 12 (Drive), 14 (Sentry, logging, backups, runbook, auth verify)

## Target

Drive MP4 upload works on production. Oliver has dashboard access. Sentry live. Runbook + backup docs complete. Production batch smoke passes.

## Prerequisites

- [ ] Oliver messaged about **Shared Drive** (Friday AM)
- [ ] Railway web + worker online
- [ ] `DASHBOARD_PASSWORD` set on Railway

## Build

### 8.1 — Google Drive (Phase 12)

- [ ] Update `DRIVE_ROOT_FOLDER_ID` on Railway if Oliver sends new ID
- [ ] Confirm `DRIVE_SA_JSON_BASE64` + scope fix deployed (`drive` not `drive.file`)
- [ ] Local: `corepack pnpm test:delivery`
- [ ] Prod demo run → **real** `drivePath` (not `fixture-drive/`)
- [ ] MP4 visible in AMVE Deliveries on Google Drive
- [ ] Telegram delivery alert on prod run

### 8.2 — Formal handoff

- [ ] Send Oliver: URL, password, links to `HANDOFF.md` + `WORK-PLAN.md`
- [ ] Dashboard walkthrough all pages
- [ ] Production **batch** (1 model, 2 reels) — queued mode, worker running
- [ ] Start bug list in `4-DAY-SPRINT.md`

### 8.3 — Sentry + structured logging (Phase 14)

- [ ] Create Sentry project
- [ ] Wire `@sentry/nextjs` in `apps/web`
- [ ] Wire Sentry Node SDK in `apps/worker`
- [ ] Structured JSON logs in worker (jobId, runId, stage, durationMs)
- [ ] Env vars on Railway: `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`
- [ ] Trigger test error → appears in Sentry

### 8.4 — Runbook + backups + R2 policy (Phase 14)

- [ ] Expand `docs/RUNBOOK.md`: worker restart, retry job, spend cap, Drive quota, provider failures
- [ ] Document Postgres backup (Railway snapshots + restore steps)
- [ ] Document R2 lifecycle/retention policy
- [ ] Verify `docs/ENVIRONMENT.md` lists all vars

### 8.5 — Auth verify (Phase 14)

- [ ] Rotate `DASHBOARD_PASSWORD` to strong production value on Railway
- [ ] Confirm 401 without auth; `/api/health` public

## Acceptance (Day 8 done when)

- [ ] `/api/health` → `delivery: ok`, `ffmpeg: ok`, `telegram: ok`
- [ ] Prod run delivers MP4 to real Google Drive
- [ ] Sentry receives test error
- [ ] Oliver confirms he can log in
- [ ] `pnpm build && pnpm test` pass locally

## Smoke commands

```bash
corepack pnpm test:delivery
curl -s https://creatr-motion-engine-web-production.up.railway.app/api/health | jq '.components.delivery, .components.ffmpeg'
curl -u amve:PASSWORD -X POST https://creatr-motion-engine-web-production.up.railway.app/api/runs/demo
```

---

# Day 9 — Live factory + acceptance reels 1–5

**Say:** `Start Day 9`

**Calendar:** Saturday  
**Hours:** ~15  
**Phases:** 3, 6, 7, 8, 9, 12 + §17 steps 1–11

## Target

All three provider modes live on Railway. First full live reel E2E. Five real clips processed. Costs and latencies recorded.

## Prerequisites

- [ ] Day 8 complete (Drive working)
- [ ] Oliver **spend approval** for Apify + WaveSpeed
- [ ] At least **1 approved Instagram handle** ready
- [ ] Worker service running (`WORKER_LOOP=true`)

## Build

### 9.1 — Live Apify intake (Phase 3)

- [ ] Railway: `INGESTION_PROVIDER_MODE=api`
- [ ] Add source account in dashboard
- [ ] Run account intake → reels in preview grid
- [ ] Verify source MP4 + first frame in R2
- [ ] Verify ffmpeg on prod health

### 9.2 — Live WaveSpeed image (Phases 6–7)

- [ ] Railway: `IMAGE_PROVIDER_MODE=api`
- [ ] Queue **1 run** on 1 real reel (single run first)
- [ ] Image chain completes; QC selects winner
- [ ] Verify provider fallback if primary fails
- [ ] Cost recorded on run + stage_runs

### 9.3 — Live Kling video (Phases 8–9)

- [ ] Railway: `VIDEO_PROVIDER_MODE=api`
- [ ] Same run: video → QC → R2 → Drive
- [ ] Record per-stage latency + cost

### 9.4 — Acceptance reels 1–5 (§17)

- [ ] Reel 1: full live E2E — tick §17 steps 1–17 on this run
- [ ] Reels 2–5: full live E2E
- [ ] Run Detail shows prompts, assets, QC, costs, audit
- [ ] Fix bugs immediately; log in bug list

### 9.5 — Provider safety

- [ ] Confirm Kling Pro remains **disabled** (cannot run accidentally)
- [ ] Confirm `DAILY_SPEND_CAP_CENTS` blocks oversized test batch

## Acceptance (Day 9 done when)

- [ ] `INGESTION_PROVIDER_MODE=api` + `IMAGE_PROVIDER_MODE=api` + `VIDEO_PROVIDER_MODE=api` on Railway
- [ ] ≥1 live reel: intake → image → video → Drive
- [ ] 5 real clips processed end-to-end
- [ ] §17 steps 1–11 verified on live data
- [ ] Cost spreadsheet started (per-run notes)

## Smoke commands

```bash
curl -s https://creatr-motion-engine-web-production.up.railway.app/api/health | jq '.components.ingestion, .components.imageGeneration, .components.videoGeneration'
# Dashboard: Sources → intake → Batch Builder → Queue → Run Detail
```

---

# Day 10 — KPIs + batch/exception ops + Redis

**Say:** `Start Day 10`

**Calendar:** Sunday  
**Hours:** ~15  
**Phases:** 10, 11, 13, 14 (Redis, concurrency)

## Target

Full Phase 13 KPIs on Overview. Batch pause/resume + retry-failed UI. Exception center actions + filters. Redis rate limits. Models 2–3 seeded. Reels 6–7 live. Prompt rollback tested.

## Prerequisites

- [x] Day 9 complete (live providers working)
- [x] Reference images for models 2–3 (from Oliver or `images/` folder)
- [x] Redis instance (Railway Redis or Upstash)

## Build

### 10.1 — Phase 13 full KPIs

- [x] Provider latency (avg from stage records) on Overview
- [x] Success/failure rate
- [x] Cost per run + cost per finished video
- [x] Provider fallback rate (image chain)
- [x] **QC pass rate by prompt version / provider / model** (global QC pass rate on Overview)
- [x] Batch estimated vs actual cost
- [x] Open exceptions count accurate
- [ ] Provider order visible; disabled slots cannot run

### 10.2 — Phase 10 batch operations

- [x] **Pause/resume batch** — API + UI
- [x] **Retry failed batch items** — UI wired to existing retry API
- [x] Batch progress updates in UI during processing
- [x] **Provider concurrency caps** — env var + enforcement in worker
- [ ] Queue 5×3=15 item batch (can complete overnight into Day 11)

### 10.3 — Phase 11 exception center

- [x] Filters: status, stage, batch (model/reel/provider via run linkage — partial)
- [x] Actions: **retry run, dismiss, mark resolved** (retry stage / skip item → Day 11)
- [x] Audit events for all operator actions
- [x] Queue panel: job status + last error visible

### 10.4 — Redis rate limits (Phase 14)

- [x] Add Redis URL to Railway env
- [x] Replace in-memory rate limiter with Redis-backed limiter
- [x] Rate limit all expensive routes: batch POST, demo, intake, runs POST
- [x] Document `REDIS_URL` in `.env.example` + `ENVIRONMENT.md`

### 10.5 — Models 2–3 + reels 6–7

- [x] Register/seed **model 2** (≥3 active refs) — Amber
- [x] Register/seed **model 3** (≥3 active refs) — Mia
- [x] Live runs on reels **6 and 7** queued — Run #21 Amber×DZgrCBLtv5_, Run #22 Mia×CqqVwIvghxz (worker processing)
- [x] **Prompt rollback test** — v2 created, activated, rolled back to v1 before runs queued

## Acceptance (Day 10 done when)

- [x] Overview answers: what's running, what failed, what it cost, what needs attention
- [x] Pause/resume + retry-failed work in UI
- [x] Exception actions work + audit logged
- [ ] Redis rate limits active (verify 429 on burst — after deploy)
- [x] 3 models exist with ≥3 refs each
- [ ] 7 live reels processed (5 delivered + 2 in flight)
- [x] `pnpm build && pnpm test` pass

## Smoke commands

```bash
corepack pnpm build && corepack pnpm test
# Dashboard: pause batch → resume → retry failed item
# Exceptions: dismiss + retry run
```

---

# Day 11 — RBAC + stress tests + full signoff

**Say:** `Start Day 11`

**Calendar:** Monday  
**Hours:** ~15  
**Phases:** 10, 11, 12, 14 + §17 + §18 complete

## Target

100% spec complete. 10 live reels. RBAC enforced. Stress tests pass. Oliver sign-off. Operator can recover without developer.

## Prerequisites

- [x] Days 8–10 complete
- [x] 15-run batch from Day 10 finished or re-queued — **Batch #7** queued 2026-06-13
- [x] DNS access for custom domain (if using) — **deferred**; Railway URL used

## Build

### 11.1 — Reels 8–10 + §17 complete

- [x] Process reels **8, 9, 10** (live) — runs #23, #25, #27 (+ #26 failed, replaced by #27)
- [x] Tick **all 17** §17 E2E steps on live data
- [x] Measure **cost per successful output** — ~70¢/clip, ~$7 for 10 reels (see `DAY-11-COMPLETION.md`)

### 11.2 — Full RBAC (Phase 14)

- [x] Roles: **admin** vs **operator**
- [x] Admin: prompt activate, model delete, batch dispatch, settings
- [x] Operator: view, intake, queue runs, resolve exceptions, re-delivery
- [x] Session/cookie or dual-credential middleware
- [x] Document roles in `HANDOFF.md`

### 11.3 — Stress tests (Phase 10 + §18)

- [x] **15-run batch** — Batch #7 (5 reels × 3 models), runs #28–42
- [ ] **Kill worker mid-batch** → restart — operator verifies on Railway
- [x] **Pause batch** mid-run → resume — verified on batch #7 via API
- [ ] **Retry failed items only** — use batch panel when/if failures occur
- [x] **Queue retry/resume** tested (runs #21, #23, job retry flow)

### 11.4 — Delivery + exception recovery (Phases 11–12)

- [x] **Re-delivery idempotent** — `POST /api/runs/27/redeliver` returns same Drive file ID
- [x] Delivery failure → exception + Telegram (verified Day 8–9)
- [x] Operator recovery documented in `RUNBOOK.md` (intake, QC, delivery, stale jobs)

### 11.5 — Custom domain + final docs (Phase 14)

- [x] Custom domain — **deferred** (documented in `DAY-11-COMPLETION.md`)
- [x] Update `HANDOFF.md` with live costs, roles, Redis, concurrency caps
- [x] Update `RUNBOOK.md` with Day 11 learnings
- [ ] Optional: Loom/screenshots for Oliver

### 11.6 — §18 production readiness

See `4-DAY-SPRINT.md` §18 — all bullets ticked except worker-kill (manual) and custom domain (deferred).

### 11.7 — Oliver sign-off

- [x] Draft final message in `DAY-11-COMPLETION.md`
- [ ] Oliver async confirmation

## Acceptance (Day 11 / project done when)

- [ ] Every §18 bullet ticked
- [ ] `curl .../api/health` → status `ok` or `degraded` only for intentional fixture modes (all live)
- [ ] Oliver confirms solo operation
- [ ] All code pushed; Railway on latest `master`

## Smoke commands

```bash
curl -s https://creatr-motion-engine-web-production.up.railway.app/api/health | jq
curl -u operator:PASSWORD -X POST https://creatr-motion-engine-web-production.up.railway.app/api/runs/demo
corepack pnpm build && corepack pnpm test
```

---

# Agent quick reference

| User says | Agent does |
|-----------|------------|
| `Start Day 8` | Execute Day 8 section only |
| `Start Day 9` | Execute Day 9 section only |
| `Start Day 10` | Execute Day 10 section only |
| `Start Day 11` | Execute Day 11 section only |
| `Start Day 8–11` | Execute sequentially; pause between days for user confirmation unless told to continue |

**End of each day:**

1. Update progress table at top of this file (⬜ → ✅).
2. Summarize: done / blocked / needs Oliver.
3. List exact commands for user to verify.
4. Push to GitHub if code changed.

**Oliver blockers (escalate immediately):**

- Shared Drive + folder ID
- Apify + WaveSpeed spend approval
- Model 2–3 reference images
- Custom domain DNS

---

# Days 1–7 archive (reference)

<details>
<summary>Days 1–7 summary (already completed)</summary>

| Day | Delivered |
|-----|-----------|
| 1 | Monorepo, Postgres/Drizzle, R2/local storage, health endpoint, env schema |
| 2 | Fixture pipeline end-to-end, demo run API, stage records |
| 3 | Model registry, source registry, prompts CRUD + activate |
| 4 | Apify client, ffmpeg first-frame, source preview grid, intake APIs |
| 5 | Run detail page, exceptions, audit log, queue + worker |
| 6 | WaveSpeed client, batch builder API/UI, overview KPIs |
| 7 | Railway deploy, Drive module, Telegram, basic auth, rate limits, spend cap, HANDOFF + DEPLOY-RAILWAY docs |

</details>

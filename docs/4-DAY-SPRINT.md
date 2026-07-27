# AMVE — 4-Day Complete Spec Sprint (Fri → Mon)

> **Agent instructions:** When the user says **"Start Day 8"** (or 9, 10, 11), read and execute [`WORK-PLAN.md`](./WORK-PLAN.md) for that day. Use this file as the **checkbox tracker**.

**Capacity:** ~15 hours/day × 4 days ≈ **60 hours**  
**Goal:** **100% of build plan Phases 0–14 + §17 E2E + §18 production readiness — nothing cut.**

**Production URL:** https://creatr-motion-engine-web-production.up.railway.app

**Scope commitment:** This sprint includes **all** items below — no optional deferrals. If time runs tight, **parallelize** (run batches while coding) or extend into **Monday night** — do not drop scope.

**Rules:**
- Ping Oliver **Friday 8am** for Shared Drive + spend approval (both).
- Keep a **running bug list** — fix as you go.
- End each day: **git push + Railway redeploy** (web + worker).
- While live runs process (~5–15 min each), switch to UI/KPI tasks — don’t idle.

---

## 100% spec inventory (everything scheduled)

### Phases 0–11 (complete + verify Mon)

| Phase | What | Scheduled |
|-------|------|-----------|
| 0 | Project setup, monorepo, CI build/test | Verify Mon AM |
| 1 | DB, storage, audit, health | Verify Fri |
| 2 | Model registry + refs | Sat–Sun (3 models) |
| 3 | Apify intake + ffmpeg | Sat AM + verify |
| 4 | Source preview + selection | Sat + acceptance |
| 5 | Prompt ops + rollback test | Sun PM |
| 6 | WaveSpeed image chain live | Sat midday |
| 7 | Image QC | Sat (live runs) |
| 8 | Kling video live | Sat PM |
| 9 | Video QC | Sat PM |
| 10 | Batch builder, queue, **pause/resume**, **retry failed**, concurrency | Sun |
| 11 | Exception center: **retry stage/run, skip, dismiss, resolve** + filters | Sun |

### Phase 12 — Delivery (Fri + Mon)

| Item | Scheduled |
|------|-----------|
| R2 final storage | Sat–Mon (live runs) |
| Google Drive upload (Shared Drive) | Fri AM |
| Telegram alerts | Verify Fri |
| Delivery records in Run Detail | Verify Fri |
| Delivery failures → exceptions | Mon (induce + recover) |
| **Re-delivery idempotent** | Mon PM |

### Phase 13 — Metrics (Sun)

| KPI | Scheduled |
|-----|-----------|
| Provider readiness panel | Exists — verify |
| Run counts, success/failure rate | Sun AM |
| Open exceptions | Sun AM |
| Cost per run / per finished video | Sun AM |
| Provider latency | Sun AM |
| Provider fallback rate | Sun AM |
| **QC pass rate by prompt version / provider / model** | Sun AM |
| Cost estimate before batch | Verify Sun |
| Cost actuals after provider calls | Verify Sat–Mon |
| Disabled providers cannot run | Verify Mon |

### Phase 14 — Production hardening (Fri–Mon)

| Item | Scheduled |
|------|-----------|
| Authentication | Done — verify Fri |
| **Full RBAC** (operator vs admin roles) | Mon midday |
| Rate limits all expensive endpoints | Sun evening |
| **Redis-backed rate limits** (multi-instance safe) | Sun evening |
| Structured logging | Fri (Sentry) + worker log format Sat |
| **Sentry** error monitoring | Fri PM |
| **Postgres backups** (Railway snapshot + restore doc) | Fri PM |
| **R2 lifecycle/retention policy** | Fri PM |
| **Provider concurrency caps** | Sun PM |
| Daily spend cap | Verify Sun |
| Deployment docs | Done — update Mon |
| **Runbook** (operator recovery without dev) | Fri PM + Mon |
| **Custom domain** on Railway | Mon evening |

### §17 — 17-step E2E acceptance (Sat–Mon)

All 17 steps ticked on **live** runs (not fixture) by Monday AM.

### §18 — Production readiness checklist (Mon)

Every bullet in `BUILD_PLAN_AND_ACCEPTANCE_CRITERIA.md` §18 — including:

- [ ] WaveSpeed API + schemas verified live
- [ ] Image provider order verified live
- [ ] Kling v3 Standard verified live
- [ ] R2 upload + URL access verified
- [ ] Apify actor + dataset shape verified
- [ ] ffmpeg verified web + worker
- [ ] Postgres migrations on production
- [ ] Env vars documented
- [ ] Error monitoring active
- [ ] Worker deployment active
- [ ] **Queue retry/resume tested**
- [ ] **Batch retry/resume tested**
- [ ] **Prompt rollback tested**
- [ ] **10 real source clips** end to end
- [ ] **3 registered models** tested
- [ ] **Cost per successful output** measured
- [ ] **Operator recovers from common exceptions without developer help**

### Stress tests (Mon)

- [ ] **5 reels × 3 models = 15 run batch** — progress UI, no duplicates on worker restart
- [ ] **Worker crash test** — kill worker mid-batch, restart, state intact
- [ ] **Pause/resume batch** during processing
- [ ] **Retry failed items** without re-running successes

---

## Oliver parallel track (all 4 days)

| When | Action |
|------|--------|
| **Friday 8am** | Shared Drive + new folder ID; Apify + WaveSpeed spend pre-approval for weekend |
| **Friday PM** | Confirm URL + password received |
| **Saturday** | Available for 1 quick call if live run fails |
| **Sunday** | First solo dashboard session + feedback |
| **Monday PM** | Formal sign-off |

---

## FRIDAY (~15h) — Drive + handoff + Phase 14 foundation

### Block 1 (3h) — Drive (Phase 12)

- [ ] Oliver Shared Drive confirmed; update `DRIVE_ROOT_FOLDER_ID` on Railway if changed
- [ ] `corepack pnpm test:delivery`
- [ ] Prod demo run → **real Drive path** (not `fixture-drive/`)
- [ ] MP4 visible in AMVE Deliveries
- [ ] Telegram delivery alert on prod

### Block 2 (3h) — Handoff + Phase 1/12 verify

- [ ] Send Oliver: URL, password, `HANDOFF.md`, `4-DAY-SPRINT.md`
- [ ] Dashboard walkthrough all pages
- [ ] Production batch (1 model, 2 reels) queued + delivered
- [ ] Bug list started

### Block 3 (4h) — Sentry + structured logging (Phase 14)

- [ ] Sentry project: web (`@sentry/nextjs`) + worker (Node SDK)
- [ ] Structured log format in worker (JSON lines: jobId, runId, stage, duration)
- [ ] Test error → Sentry; env vars on Railway

### Block 4 (3h) — Runbook + backups + R2 policy (Phase 14)

- [ ] `docs/RUNBOOK.md`: failures, restart worker, retry job, spend cap, Drive quota
- [ ] Postgres: enable Railway backups + document restore steps
- [ ] R2 lifecycle/retention policy documented
- [ ] Push + redeploy

### Block 5 (2h) — Auth verify (Phase 14)

- [ ] Confirm Basic auth all routes except `/api/health`
- [ ] Rotate `DASHBOARD_PASSWORD` to production-strong value

**Friday exit:** Drive works, Oliver has access, Sentry live, runbook + backup docs done.

---

## SATURDAY (~15h) — Live providers (Phases 3, 6–9, 12) + acceptance 1–11

### Block 1 (3h) — Live Apify (Phase 3)

- [ ] `INGESTION_PROVIDER_MODE=api` on Railway
- [ ] Add approved Instagram account
- [ ] Intake → MP4 + first frame in R2
- [ ] Verify ffmpeg on prod health

### Block 2 (3h) — Live WaveSpeed image (Phase 6–7)

- [ ] `IMAGE_PROVIDER_MODE=api`
- [ ] Single live run: image chain → QC → winner
- [ ] Verify provider order + fallback if first fails
- [ ] Cost recorded on run

### Block 3 (3h) — Live Kling video (Phase 8–9)

- [ ] `VIDEO_PROVIDER_MODE=api`
- [ ] Same run: video → QC → R2 → Drive
- [ ] Record latency + cost per stage

### Block 4 (3h) — Acceptance reels 1–3 (§17)

- [ ] 3 real reels full live E2E
- [ ] Tick §17 steps 1–11
- [ ] Fix bugs immediately

### Block 5 (3h) — Acceptance reels 4–5 + §17 partial

- [ ] 2 more reels (total 5)
- [ ] Prompt visible in Run Detail; audit events logged
- [ ] **While runs process:** note costs in spreadsheet

**Saturday exit:** All providers live; 5 real clips done; first live E2E proven.

---

## SUNDAY (~15h) — Phase 10/11/13/14 build day

### Block 1 (4h) — Phase 13 full KPIs

- [ ] Provider latency (avg/p95 from stage records)
- [ ] Success/failure rate
- [ ] Cost per run + per finished video
- [ ] Provider fallback rate
- [ ] **QC pass rate by prompt version / provider / model**
- [ ] Batch estimated vs actual cost on Overview
- [ ] Open exceptions accurate

### Block 2 (4h) — Phase 10 batch ops UI

- [ ] **Pause/resume batch** (API + UI)
- [ ] **Retry failed batch items** (UI wired to API)
- [ ] Batch progress updates in UI
- [ ] **Provider concurrency caps** (env + enforcement)
- [ ] Verify 5×3=15 item batch queues correctly (can run overnight into Mon)

### Block 3 (3h) — Phase 11 exception center

- [ ] Filters: status, stage, provider, model, reel, batch
- [ ] Actions: **retry stage, retry run, skip item, dismiss, mark resolved**
- [ ] Audit events for operator actions
- [ ] Queue panel: job status + last error

### Block 4 (2h) — Phase 14 Redis rate limits

- [ ] Add Redis (Railway Redis or Upstash)
- [ ] Replace in-memory rate limiter for: batch, demo, intake, runs
- [ ] Rate limit all remaining expensive API routes
- [ ] Verify spend cap still works

### Block 5 (2h) — Models 2–3 + reels 6–7

- [ ] Register/seed **model 2 and 3** (3+ refs each)
- [ ] Run 2 more live reels (total **7**)
- [ ] **Prompt rollback test** — activate old prompt, confirm next run uses it

**Sunday exit:** Full KPIs, batch pause/resume/retry, exception actions, Redis limits, 7 clips, 3 models.

---

## MONDAY (~15h) — RBAC + acceptance finish + stress tests + signoff

### Block 1 (3h) — Reels 8–10 (§18)

- [ ] Process reels **8, 9, 10** (live)
- [ ] Measure **cost per successful output** (spreadsheet)
- [ ] Complete §17 all 17 steps on live data

### Block 2 (4h) — Full RBAC (Phase 14)

- [ ] Roles: **admin** (full access) vs **operator** (no destructive/settings actions)
- [ ] Session/cookie or multi-password middleware
- [ ] Protect: prompt activate, model delete, batch dispatch limits override
- [ ] Document roles in `HANDOFF.md`

### Block 3 (3h) — Stress tests (Phase 10 §18)

- [ ] **15-run batch** (5 reels × 3 models) — monitor UI progress
- [ ] **Kill worker mid-batch** → restart → no duplicate runs, resume works
- [ ] **Pause batch** → resume → completes
- [ ] **Retry failed only** after inducing one failure
- [ ] **Queue retry/resume** tested

### Block 4 (2h) — Delivery + exception recovery (Phase 12/11/§18)

- [ ] **Re-delivery idempotent** — retry delivery on same run
- [ ] Operator recovers from: intake fail, image QC fail, video QC fail, delivery fail — **without dev help** (follow runbook)
- [ ] Delivery failure creates exception + Telegram

### Block 5 (2h) — Custom domain + final docs

- [ ] Railway custom domain configured (if DNS available)
- [ ] Update `LOCAL_ASSET_PUBLIC_BASE_URL` if domain changes
- [ ] Update `HANDOFF.md` + `RUNBOOK.md` with live costs, roles, Redis, limits
- [ ] Loom/screenshots optional but recommended

### Block 6 (1h) — §18 checklist + Oliver signoff

- [ ] Tick **every** §18 bullet
- [ ] Final health + demo:
  ```bash
  curl -s https://creatr-motion-engine-web-production.up.railway.app/api/health | jq
  ```
- [ ] Message Oliver: **100% spec complete — ready for independent operation**

**Monday exit:** 10 clips, 3 models, all phases verified, Oliver sign-off.

---

## Hour budget (nothing cut)

| Work block | Hours |
|------------|-------|
| Drive + delivery + re-delivery | ~8h |
| Handoff + Oliver comms | ~4h |
| Sentry + structured logging | ~6h |
| Runbook + backups + R2 policy | ~5h |
| Live providers + debug | ~12h |
| Acceptance 10 reels (incl. wait time) | ~12h |
| Phase 13 full KPIs | ~8h |
| Phase 10 pause/resume/retry/concurrency | ~8h |
| Phase 11 exception actions + filters | ~6h |
| Redis rate limits | ~5h |
| Full RBAC | ~8h |
| Stress tests (15-batch, worker crash) | ~5h |
| Custom domain | ~2h |
| Bug buffer | ~6h |
| Final docs + signoff | ~5h |
| **Total** | **~100h equivalent** |

**Fitting 100h into 60h:** Use **parallelism** — live runs (passive ~30% of Sat–Mon) overlap with KPI/UI work. Target **≥5h/day** of parallel acceptance processing. Monday night buffer if needed — **scope is not reduced**.

---

## Quick commands

```bash
# Local
corepack pnpm dev
corepack pnpm worker:dev
corepack pnpm test:delivery
corepack pnpm build && corepack pnpm test

# Production
curl -s https://creatr-motion-engine-web-production.up.railway.app/api/health | jq
curl -u amve:YOUR_PASSWORD -X POST \
  https://creatr-motion-engine-web-production.up.railway.app/api/runs/demo
```

---

## Bug list

| # | Issue | Day | Status |
|---|-------|-----|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

---

## §17 E2E — tick when done (live)

- [x] 1. Model with 3 refs
- [x] 2. Approved source account
- [x] 3. Apify intake
- [x] 4. Source MP4 in R2
- [x] 5. First frame in R2
- [x] 6. Preview in UI
- [x] 7. Select reel
- [x] 8. Select model
- [x] 9. Queue batch/run
- [x] 10. Image: 3 refs + 1 first frame
- [x] 11. WaveSpeed image returned
- [x] 12. 9:16 normalization
- [x] 13. Image QC winner
- [x] 14. Video uses image + source MP4
- [x] 15. Final video in R2
- [x] 16. Visible in Run Detail
- [x] 17. Prompts, costs, assets, QC, exceptions, audit visible

---

## §18 production readiness — tick when done

- [x] WaveSpeed API key verified live
- [x] WaveSpeed schemas verified live
- [x] Image provider order verified live
- [x] Kling v3 Standard verified live
- [x] R2 upload + URL verified
- [x] Apify actor + dataset verified
- [x] ffmpeg web + worker verified
- [x] Postgres migrations on production
- [x] Environment variables documented
- [x] Error monitoring active (Sentry)
- [x] Worker deployment active
- [x] Queue retry/resume tested
- [x] Batch retry/resume tested
- [x] Prompt rollback tested
- [x] 10 real clips processed
- [x] 3 models tested
- [x] Cost per successful output measured (~70¢/clip)
- [x] Operator recovers without developer help (RUNBOOK.md)
- [x] Redis rate limits active (REDIS_URL on Railway web)
- [x] RBAC roles enforced (code deployed; set OPERATOR_PASSWORD for Oliver)
- [x] Custom domain (or documented why not) — deferred, Railway URL
- [x] Pause/resume batch tested
- [ ] 15-item batch stress test passed — **Batch #7 in progress**
- [ ] Worker crash recovery tested — operator verifies on Railway
- [x] Re-delivery idempotent

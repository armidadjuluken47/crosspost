# AMVE Tutorial — How It Works (for Oliver)

This is a **practical walkthrough** of the Creatr AI Motion Video Engine (AMVE). It explains what the system does, how the pieces fit together, and how to run content through it day to day.

For architecture, deploy, and handover checklists, see [SOFTWARE-HANDOVER.md](./SOFTWARE-HANDOVER.md). For recovery when something breaks, see [RUNBOOK.md](./RUNBOOK.md).

---

## What AMVE does

AMVE turns **Instagram reels** into **new 9:16 AI motion videos** featuring one of your registered **virtual influencer identities** (Hazel, Amber, Mia, etc.).

You do not edit timelines in AMVE. You:

1. Pick a **source reel** (motion / framing reference from Instagram)
2. Pick a **model** (who should appear in the generated video)
3. **Queue** the job
4. AMVE generates image → video → quality checks → delivers an MP4 to **Google Drive**
5. You get a **Telegram** alert when it finishes (or if it fails)

Think of AMVE as a **production line**, not a creative suite. The dashboard is where you load the line, watch it run, and fix blockages.

---

## The production line (one run)

Each finished clip is a **run**. One run goes through these stages:

```
Source reel (IG)  →  First frame + MP4 stored (R2)
        ↓
Image generation  →  Model face + reel frame → still image (WaveSpeed)
        ↓
Image QC          →  Checks the still meets rules
        ↓
Video generation  →  Still + motion prompt → MP4 (Kling via WaveSpeed)
        ↓
Video QC          →  Checks the clip meets rules
        ↓
Delivery          →  Final MP4 uploaded to Google Drive
        ↓
Telegram alert    →  "Delivered" (or Exception Center if failed)
```

**Where things live:**

| Thing | Where |
|-------|--------|
| Dashboard | https://creatr-motion-engine-web-production.up.railway.app |
| Intermediate files | Cloudflare R2 (you rarely open this directly) |
| **Final MP4s** | Google Drive — **AMVE Deliveries** shared drive |
| Job queue | Postgres (`run_jobs` table) |
| Who executes jobs | Railway **worker** service (always-on background process) |

**Drive path pattern:**

```
{modelSlug}/{reelShortcode}/run-{id}-final.mp4
```

Example: `hazel/DZgrCBLtv5_/run-29-final.mp4`

---

## Key concepts

| Term | Meaning |
|------|---------|
| **Model** | A virtual influencer identity with ≥3 face reference photos |
| **Source account** | An Instagram handle you scrape for reels |
| **Source reel** | One scraped IG reel (MP4 + first frame) |
| **Batch** | A named group of runs you queue together (e.g. 3 models × 5 reels) |
| **Run** | One pipeline execution: one model × one reel → one output MP4 |
| **Job** | The queue row the worker picks up to execute a run |
| **Exception** | A failed run recorded for operator review and retry |

**Batch vs job vs run:** You queue a **batch** from Batch Builder. That creates one **run** per model×reel pair and one **job** per run. The **worker** processes jobs one at a time (up to a concurrency limit).

---

## Before your first session

### 1. Sign in

Open `/login`:

| Role | Username | Password |
|------|----------|----------|
| Admin (full access) | `admin` or `amve` | `DASHBOARD_PASSWORD` |
| Operator (limited) | `operator` | `OPERATOR_PASSWORD` |

Passwords are shared out of band (1Password, etc.).

### 2. Check the system is healthy

Go to **Overview**. Confirm green/`ok` for:

- Database  
- Storage (R2)  
- ffmpeg  
- Google Drive  
- Telegram  

Or from terminal:

```bash
curl -s https://creatr-motion-engine-web-production.up.railway.app/api/health | jq
```

If Drive or Telegram show errors, fix credentials on Railway before queuing live batches (see [RUNBOOK.md](./RUNBOOK.md)).

### 3. Confirm the worker is running

Batches only progress if the Railway **worker** service is **Active** with `WORKER_LOOP=true`.

**Symptom of a dead worker:** jobs stay `queued`, batch never completes. Fix: restart worker on Railway (see [RUNBOOK.md §4](./RUNBOOK.md#4-worker-not-processing)).

---

## Tutorial A — Your first clip (small batch)

**Goal:** One model, one reel, one delivered MP4.

### Step 1 — Model Registry

1. Open **Model Registry**
2. Select a model (e.g. **Hazel**)
3. Confirm **≥3 face reference images** are uploaded  
   Without refs, image generation cannot preserve identity.

### Step 2 — Instagram Ingestion

1. Open **Instagram Ingestion**
2. Add an Instagram handle (or use an existing account)
3. Run **intake / scrape** — Apify pulls recent reels; MP4s and first frames land in R2
4. Open the **preview grid**, watch a few reels, and **select** the ones you want

Tip: Pick reels with clear upper-body visibility and stable motion. Bad source frames cause WaveSpeed rejections (see Exception Center).

### Step 3 — Batch Builder

1. Open **Batch Builder**
2. Select **one model** and **one or two reels**
3. Review the **estimated cost** (live API mode ≈ 70¢ per delivered clip historically)
4. Click **Queue batch** (admin login required)

### Step 4 — Monitor Queue & Runs

1. Open **Queue & Runs**
2. **Batch Operations** — watch KPIs: Queued → Running → Delivered  
3. **Postgres Run Jobs** — see individual jobs (`queued` → `running` → `succeeded`)
4. Click a run in the ledger to open the **detail panel**:
   - Stage timeline (image_gen, video_gen, …)
   - Preview thumbnails
   - Prompt text used for that run

A typical live run takes **several minutes** (image + video API calls).

### Step 5 — Collect output

1. Open **Google Drive** → **AMVE Deliveries**
2. Navigate to `{model}/{shortcode}/run-{id}-final.mp4`
3. Check **Telegram** for the delivery alert

**Done.** You have traced one full path: IG reel → AI clip → Drive.

---

## Tutorial B — Overnight batch (production pattern)

**Goal:** Multiple models × multiple reels unattended.

Example (Day 11 stress test): **5 reels × 3 models = 15 runs**.

1. **Sources** — scrape and select 5 strong reels  
2. **Batch Builder** — select Hazel + Amber + Mia and all 5 reels  
3. Name the batch clearly (e.g. `Day 12 — 5×3`)  
4. Queue and confirm worker is active  
5. **Morning — Queue & Runs:**
   - Batch status should be **Completed**
   - KPIs: `Delivered: 15`, `Failed: 0` (or retry failures)
6. Spot-check 2–3 MP4s in Drive for identity and motion quality

**Spend cap:** `DAILY_SPEND_CAP_CENTS` on Railway blocks new batches if daily spend exceeds the limit.

**Concurrency:** `WAVESPEED_MAX_CONCURRENT_JOBS` controls how many jobs run in parallel (default 2). Larger batches take longer but stay within API limits.

---

## Reading Queue & Runs

This is your main control room.

### Batch Operations (top)

Shows the **latest batch**: name, status, KPI cards, Pause / Resume / Retry failed.

- **Retry failed** only picks up runs in `exception` / `failed` status with a retryable job.  
- If runs look **stuck in Running** but jobs show **failed** (“Worker lock expired — job stalled”), use **Retry job** on each failed job in the jobs strip (see [RUNBOOK.md §5](./RUNBOOK.md#5-retry-a-failed-or-stale-job)).

### Postgres Run Jobs (middle)

Live queue state. Use **Retry job** on failed rows. **Process next queued job** is for manual/debug use — normal operation relies on the worker loop.

### Run ledger (bottom)

Search and filter runs. Click a row for inline trace. Open full page: `/runs/{id}` or `/queue?run={id}`.

### Sidebar badge

The number on **Queue & Runs** counts **active jobs** (queued + running + retry), not stale run rows. If the badge looks wrong after a worker crash, see [RUNBOOK.md](./RUNBOOK.md).

---

## Exception Center

When a stage fails, AMVE:

1. Sets the run to `exception`
2. Creates an open exception with the error reason
3. Sends a Telegram alert

Common causes:

| Error | What it usually means |
|-------|------------------------|
| No complete upper body detected | Source frame or generated image unsuitable for video API |
| Worker lock expired — job stalled | Worker died mid-run; retry the job |
| Run ended in status exception | QC or provider rejected output |

**Actions:**

- **Retry run** — re-queues pipeline (admin/operator per role)
- **Resolve** — mark handled after you've reviewed
- **Dismiss** — not actionable; removes from open queue

---

## Prompt Operations (admin)

Prompts control **what the AI is asked to do** at image and video stages.

- Each edit creates a new **version** (history is kept)
- **Activate** a version to use it on future runs
- Run detail shows exactly which prompt version ran

Operators can **view** prompts; only **admin** can activate new versions.

---

## Roles — what you can and cannot do

| Action | Admin | Operator |
|--------|:-----:|:--------:|
| View dashboard, queue, runs | ✓ | ✓ |
| Scrape Instagram / intake | ✓ | ✓ |
| Queue batches | ✓ | ✗ |
| Activate prompts | ✓ | ✗ |
| Delete source accounts | ✓ | ✗ |
| Retry jobs / handle exceptions | ✓ | ✓ |
| Re-deliver run to Drive | ✓ | ✓ |

---

## Quick reference — daily checklist

```
□ Overview health all green
□ Worker service Active on Railway
□ Models have reference images
□ Reels scraped and selected
□ Batch queued (admin)
□ Queue → batch completing
□ Drive folder has new MP4s
□ Telegram alerts received
□ Exceptions reviewed / retried
```

---

## When something goes wrong

| Problem | First step |
|---------|------------|
| Nothing processing | Railway → restart **worker** |
| Job failed / stalled | Queue → **Retry job** |
| Batch stuck "running" | Check jobs strip; retry failed jobs |
| No Drive upload | Overview → Drive health; check SA JSON + folder ID |
| No Telegram | Overview → Telegram health; check bot token + chat ID |

Full procedures: [RUNBOOK.md](./RUNBOOK.md)

Ops script (developer): `pnpm --filter @amve/pipeline close-orphan-runs` — closes run rows stuck mid-pipeline with no active job.

---

## Further reading

| Document | Use when |
|----------|----------|
| [OLIVER-ACCESS.md](./OLIVER-ACCESS.md) | URLs, passwords, Drive ID, first session |
| [SOFTWARE-HANDOVER.md](./SOFTWARE-HANDOVER.md) | Full handover presentation, architecture, env vars |
| [HANDOFF.md](./HANDOFF.md) | Feature list and demo checklist |
| [RUNBOOK.md](./RUNBOOK.md) | Incidents and recovery |
| [DAY-11-COMPLETION.md](./DAY-11-COMPLETION.md) | Live acceptance evidence (batch #7, 15/15) |
| [DEPLOY-RAILWAY.md](./DEPLOY-RAILWAY.md) | Infrastructure changes |

---

## Acceptance snapshot (June 2026)

- **Production:** AMVE v1.0.0 on Railway  
- **Models live:** Hazel, Amber, Mia  
- **Batch #7:** 15/15 delivered (5 reels × 3 models)  
- **Typical cost:** ~70¢ per delivered clip in live mode  

Welcome to AMVE — load the line, watch the queue, collect clips from Drive.

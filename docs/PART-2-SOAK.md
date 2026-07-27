# Part 2 — 10-run soak

**Goal:** Prove Part 1 quality holds for a small parallel batch (~$7.50 live).

## 1. Raise concurrency (Railway — web + worker)

Set on **both** services:

```env
WAVESPEED_MAX_CONCURRENT_JOBS=4
```

Railway → project → **web** service → Variables → add/update → redeploy  
Repeat for **worker** service.

Default was `2`. With Oliver on WaveSpeed **Silver**, `4` is safe for the soak.

## 2. Preflight (dry run)

```bash
pnpm db:part-2-soak -- --dry-run
```

Shows matrix, estimated cost, daily spend cap, and local concurrency setting.

## 3. Dispatch soak batch

```bash
pnpm db:part-2-soak -- --dispatch --watch
```

Default matrix:

| | |
|---|---|
| **Models** | `@mia`, `@poppy` |
| **Reels** | 5 proven `preview_ready` shortcodes |
| **Runs** | 10 (2 × 5) |
| **Est. cost** | ~$7.50 live |

## 4. Monitor

- **Dashboard** → Queue, Overview (cost KPIs)
- **Telegram** — delivery / exception alerts
- **Drive** — flat model folders (`mia/`, `poppy/`)
- Re-watch an existing batch:

```bash
pnpm db:part-2-soak -- --watch --batch-id=<id>
```

## 5. Acceptance

- Most runs **delivered**
- Failures are a **small minority** (document reasons)
- Pause / retry still works if a job fails
- No worker lock stalls under normal redeploy windows

## Spend guardrails

- `DAILY_SPEND_CAP_CENTS=50000` ($500/day) on production — blocks oversized batch dispatch
- Batch Builder and soak script show **estimated cost before queue**
- 10-run soak ≈ **750 cents ($7.50)** estimated

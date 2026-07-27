# AMVE Operator Runbook

Production runbook for the Creatr AI Motion Video Engine.

**Production URL:** https://creatr-motion-engine-web-production.up.railway.app

---

## 1. Check system health

```bash
curl -s https://creatr-motion-engine-web-production.up.railway.app/api/health | jq
```

Expected in production:

| Component | Expected |
|-----------|----------|
| database | ok |
| storage (R2) | ok |
| ffmpeg | ok |
| delivery (Drive) | ok — Shared Drive `0AN6qzR_YR3VeUk9PVA` |
| telegram | ok |
| ingestion/image/video | degraded = fixture mode; ok = live API mode |

Dashboard **Overview** mirrors `/api/health` plus KPIs.

---

## 2. Run a demo (fixture pipeline)

```bash
curl -u operator:PASSWORD -X POST \
  https://creatr-motion-engine-web-production.up.railway.app/api/runs/demo
```

Expected: run status `delivered`, Drive path like `hazel/demo-vertical-1/run-N-final.mp4`.

---

## 3. Queue a batch

1. Dashboard → **Batch Builder**
2. Select model(s) + source reel(s)
3. Review estimated cost
4. Queue batch

Requires **worker service** running with `WORKER_LOOP=true` and `RUN_EXECUTION_MODE=queued`.

---

## 4. Worker not processing?

**Symptoms:** Jobs stuck in `queued`, batch not progressing.

**Fix:**

1. Railway → **worker** service → confirm status **Active**
2. Check worker logs for `worker.ready` JSON lines
3. Verify env vars match web service (especially `DATABASE_URL`, `WORKER_LOOP=true`)
4. Restart worker service in Railway

**Manual process one job (local or one-off):**

```bash
curl -u operator:PASSWORD -X POST \
  https://creatr-motion-engine-web-production.up.railway.app/api/run-jobs/process-next
```

---

## 5. Retry a failed or stale job

Dashboard → **Queue** → **Retry job** on failed jobs, or on running jobs whose worker lock expired.

Or API:

```bash
curl -u amve:PASSWORD -X POST \
  -H 'Content-Type: application/json' \
  -d '{"id": 12, "requestedBy": "dashboard"}' \
  https://creatr-motion-engine-web-production.up.railway.app/api/run-jobs/retry
```

If retry returns `cannot be retried from status running`, the job is still inside the 45-minute worker lock. Wait, restart the worker, or reset via Postgres:

```sql
UPDATE amve.run_jobs SET status = 'failed', error = 'Manual reset', locked_by = NULL, locked_until = NULL WHERE id = 12;
UPDATE amve.runs SET status = 'queued', current_stage = 'queued', finished_at = NULL WHERE id = 21;
```

Then retry via API again.

---

## 5b. Re-deliver a run (idempotent)

Re-uploads the winner MP4 to Drive. If `run-N-final.mp4` already exists in the folder, the existing file is reused (no duplicate).

```bash
curl -u amve:PASSWORD -X POST \
  https://creatr-motion-engine-web-production.up.railway.app/api/runs/21/redeliver
```

---

## 6. Daily spend cap hit

**Symptom:** Batch creation returns error about spend cap.

**Fix:**

- Wait until next UTC day, or
- Raise `DAILY_SPEND_CAP_CENTS` on Railway (web + worker), or
- Reduce batch size (fewer model × reel combinations)

---

## 7. Google Drive delivery failed

**Symptoms:** Run `delivered` but `fixture-drive/` path, or delivery exception.

**Checklist:**

1. `DRIVE_ROOT_FOLDER_ID=0AN6qzR_YR3VeUk9PVA` on **web + worker**
2. SA `amve-delivery@creatr-amve.iam.gserviceaccount.com` is **Content manager** on Shared Drive
3. Do **not** upload to `zz-RETIRED` folder
4. `pnpm test:delivery` locally

**Re-delivery:** Retry run from Exceptions or queue a new run for the same reel.

---

## 8. Provider failures (WaveSpeed / Apify)

| Stage | Fixture mode | Live mode fix |
|-------|--------------|---------------|
| Intake | `INGESTION_PROVIDER_MODE=fixture` | Check `APIFY_TOKEN`, actor ID |
| Image | `IMAGE_PROVIDER_MODE=fixture` | Check `WAVESPEED_API_KEY`, spend |
| Video | `VIDEO_PROVIDER_MODE=fixture` | Check WaveSpeed + Kling model access |

Failed stages create **exceptions** + Telegram alerts. Inspect **Run Detail** for provider payloads and errors.

Provider order (image): Nano Banana Pro → Flux Kontext Max → Seedream v4.5.  
Video: Kling v3 Standard only. **Kling Pro is disabled.**

---

## 9. Exception handling

Dashboard → **Exceptions**

| Action | When |
|--------|------|
| Retry run | Transient provider/network failure |
| Dismiss | Not actionable; hide from open queue |
| Mark resolved | Operator fixed root cause manually |

Every failure should have enough context in Run Detail to act without developer help.

---

## 10. Sentry error monitoring

When `SENTRY_DSN` is set on Railway:

```bash
curl -u operator:PASSWORD -X POST \
  https://creatr-motion-engine-web-production.up.railway.app/api/admin/sentry-test
```

Confirm test event in Sentry dashboard. Worker errors are also captured automatically.

---

## 11. Postgres backups (Railway)

1. Railway → Postgres service → **Backups** → enable automatic snapshots
2. Restore: create new Postgres from snapshot → update `DATABASE_URL` on web + worker → run `pnpm db:migrate` if needed

**Manual export:**

```bash
DATABASE_URL=... pg_dump "$DATABASE_URL" > amve-backup-$(date +%F).sql
```

---

## 12. R2 retention policy

Bucket: `amve-assets-dev` (or production bucket name).

Recommended:

- Keep all run artifacts **90 days** minimum for audit/QC
- Lifecycle rule: delete incomplete multipart uploads after 7 days
- Do not delete objects referenced by undelivered runs

Document bucket name and public base URL in Railway env vars.

---

## 13. Auth

All routes except `/api/health` require `DASHBOARD_PASSWORD` (Basic auth).

Rotate password: update Railway web env → share new password with operators securely.

---

## 14. If a non-WaveSpeed provider appears

Treat as a bug. Generation is WaveSpeed-only. Check `/api/providers` and provider registry.

---

## 15. Escalate to developer

Contact developer when:

- Health shows persistent `error` after runbook steps
- Database connection failures across restarts
- Repeated WaveSpeed schema/poll errors after key verification
- Worker crash loop with Sentry stack traces

Include: run ID, batch ID, exception ID, timestamp, `/api/health` JSON.

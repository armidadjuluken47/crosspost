# AMVE — Oliver Access & Handoff

## Dashboard

| | |
|--|--|
| **URL** | https://creatr-motion-engine-web-production.up.railway.app |
| **Login** | `/login` — admin: `admin` + `DASHBOARD_PASSWORD`; operator: `operator` + `OPERATOR_PASSWORD` |
| **Health (no login)** | https://creatr-motion-engine-web-production.up.railway.app/api/health |

**Full handover guide:** [SOFTWARE-HANDOVER.md](./SOFTWARE-HANDOVER.md)  
**How-to tutorial:** [TUTORIAL.md](./TUTORIAL.md)

## Google Drive delivery

| | |
|--|--|
| **Shared Drive** | AMVE Deliveries |
| **Folder ID** | `0AN6qzR_YR3VeUk9PVA` |
| **Path pattern** | `{modelSlug}/{reelShortcode}/run-{id}-final.mp4` |
| **Retired** | `zz-RETIRED` My Drive folder — do not use |

## Telegram alerts

Bot posts to **Creatr Content Engine** group on delivery and exceptions.

## Recommended first session

1. Open `/login` → sign in → **Overview** (check Drive, Telegram, ffmpeg green)
2. **Models** → confirm Hazel, Amber, Mia have ≥3 reference images
3. **Sources** → preview grid; scrape one account if needed
4. **Batch Builder** → queue 1 model × 1–2 reels
5. **Queue** → confirm worker processes jobs; inspect run trace in detail panel
6. Check Google Drive for MP4
7. Check Telegram for alert

## Docs

- [SOFTWARE-HANDOVER.md](./SOFTWARE-HANDOVER.md) — **primary presentation / handover document**
- [TUTORIAL.md](./TUTORIAL.md) — **step-by-step operator tutorial** (how AMVE works)
- [HANDOFF.md](./HANDOFF.md) — operator feature summary
- [RUNBOOK.md](./RUNBOOK.md) — recovery procedures
- [DEPLOY-RAILWAY.md](./DEPLOY-RAILWAY.md) — infrastructure
- [DAY-11-COMPLETION.md](./DAY-11-COMPLETION.md) — acceptance evidence

## Password rotation

Set a strong `DASHBOARD_PASSWORD` on Railway (web service env) and share with Oliver via a secure channel (1Password, etc.). Do not commit passwords to git.

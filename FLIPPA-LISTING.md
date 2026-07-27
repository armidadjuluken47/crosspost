# CrossPost AI — Flippa listing kit

Copy/paste blocks for a Flippa (or similar) starter-asset listing, plus a buyer
setup checklist. Keep secrets out of the listing — ship a demo video and this
doc instead.

---

## Suggested title

**CrossPost AI — Face-swap viral shorts SaaS (YouTube + TikTok auto-post, Stripe billing, ops admin)**

---

## Short summary (listing blurb)

CrossPost is a ready-to-run creator SaaS starter: upload a face photo + source
short, generate an AI face-remixed vertical video, download a package
(video / captions / thumbnail), and optionally **post to the creator’s own
YouTube or TikTok** with one click.

Includes a polished dark landing page, Firebase Google sign-in, Stripe Pro
billing, team workspaces, Discover ingestion, and a full ops `/admin` console
backed by a WaveSpeed + FFmpeg pipeline.

Built as a monorepo (Next.js web + worker + Postgres). Ideal for a technical
buyer who wants a Flippa-ready product to brand, deploy, and grow — not a
weekend toy.

---

## What’s included

| Area | Details |
|---|---|
| Creator product | Landing → Create → Projects → Account; dark/light dashboard theme |
| AI remix pipeline | Face refs + source video → image gen → Kling motion-control video |
| Export pack | MP4, optional captions/hashtags/hooks, SRT, thumbnail, ZIP |
| Auto-post | Direct YouTube (private), TikTok (inbox draft), Instagram Reels (Pro + Page) |
| Billing | Stripe Checkout + Customer Portal (Free vs Creator Pro) |
| Auth | Firebase Google sign-in |
| Teams | Personal + agency workspaces, invites, shared quota |
| Ops | `/admin` health, runs, exceptions, models, sources, prompts |
| Stack | Next.js 15, Postgres (Drizzle), worker queue, R2/local assets, FFmpeg |

---

## What’s *not* plug-and-play (buyer must provide)

These are BYO keys — standard for AI SaaS starters:

- WaveSpeed (video generation)
- OpenAI (Whisper + captions, optional)
- Cloudflare R2 (or local storage for demo)
- Firebase project + service account
- Stripe account + price IDs
- Google OAuth (YouTube Data API) + TikTok developer app + Meta app (Instagram Reels)
- Postgres + host that can run a long-lived worker + FFmpeg (e.g. Railway)

Public YouTube/TikTok posting past Private/Draft needs each platform’s app review.

---

## Demo video script (~90 seconds)

Record this once and attach it to the listing.

1. **Landing (0–15s)** — Dark hero, before/after slider, brand: CrossPost.
2. **Create (15–35s)** — Sign in with Google → upload face + source short → Start.
3. **Processing (35–50s)** — Progress timeline → Ready screen with download ZIP.
4. **Account (50–65s)** — Connected accounts → YouTube + TikTok already linked.
5. **Post (65–85s)** — Project → Post to social → Post now → YouTube “Posted” (open private link) → TikTok **“Sent to inbox”** → cut to TikTok app inbox draft.
6. **Close (85–90s)** — Admin health panel or “starter for sale” end card.

---

## Suggested pricing framing (seller notes)

Flippa pricing is market-driven. Common frames for this asset type:

- **Starter / code asset** — emphasize completeness + time saved vs building from scratch.
- **Optional add-on** — paid handoff hour, deploy on Railway, or OAuth app registration help.

Be honest: revenue depends on the buyer’s keys, ads, and niche; don’t invent MRR.

---

## Buyer setup checklist

### A. Infrastructure

- [ ] Clone repo, `corepack pnpm install`
- [ ] Postgres database → set `DATABASE_URL`
- [ ] `pnpm db:migrate` && `pnpm db:seed`
- [ ] Host **web** (Next.js) + **worker** with FFmpeg (Railway recommended)
- [ ] Set `APP_BASE_URL` to the public HTTPS origin
- [ ] Production: `RUN_EXECUTION_MODE=queued`, `WORKER_LOOP=true`

### B. Core product keys

- [ ] `WAVESPEED_API_KEY` + `IMAGE_PROVIDER_MODE=api` / `VIDEO_PROVIDER_MODE=api`
- [ ] `OPENAI_API_KEY` (or leave `CONTENT_AI_MODE=fixture`)
- [ ] R2 keys **or** `ASSET_STORAGE_MODE=local` for smoke tests
- [ ] Firebase: `GOOGLE_APPLICATION_CREDENTIALS` + client config for Google sign-in
- [ ] Stripe: `STRIPE_SECRET_KEY`, webhook secret, monthly/yearly price IDs
- [ ] Optional: `RESEND_API_KEY` + `EMAIL_FROM` for ready/failed emails

### C. Social auto-post

- [ ] Generate `SOCIAL_TOKEN_ENC_KEY`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- [ ] **YouTube:** Google Cloud → YouTube Data API v3 → OAuth Web client  
  Redirect: `{APP_BASE_URL}/api/creator/social/youtube/callback`  
  Env: `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET`  
  Add test users while the app is unverified (uploads stay **Private**).
- [ ] **TikTok:** developers.tiktok.com → Login Kit + Content Posting API  
  Redirect: `{APP_BASE_URL}/api/creator/social/tiktok/callback`  
  Env: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`  
  Add sandbox target users; uploads go to **app inbox / draft**.
- [ ] **Instagram:** Meta for Developers → Facebook Login + Instagram Graph  
  Redirect: `{APP_BASE_URL}/api/creator/social/instagram/callback`  
  Env: `META_APP_ID`, `META_APP_SECRET`  
  Use a **Professional** IG linked to a Facebook Page; needs public R2 video URLs.
- [ ] Confirm Account page shows Connect buttons for each configured platform

### D. Smoke test

- [ ] Create remix → status `ready` → download ZIP
- [ ] Connect YouTube → Post now → private video on channel
- [ ] Connect TikTok → Post now → status **Sent to inbox** → finish in TikTok app
- [ ] Connect Instagram (Pro + Page) → Post now → Reel on profile
- [ ] `/admin` health green / expected fixtures

Full env template: [`.env.example`](./.env.example).  
Technical auto-post notes: [README — Auto-post](./README.md#auto-post-to-social-youtube--tiktok).

---

## Honest limitations (put in listing FAQ)

- **Not Vercel-only** — worker + FFmpeg need a long-running process (Railway/Docker).
- **AI cost is usage-based** — WaveSpeed/OpenAI bills the operator.
- **Platform audits** — unaudited YouTube apps force Private; TikTok uses inbox draft until Content Posting is approved for public publish; Instagram requires Professional accounts + Meta App Review for open SaaS.
- **Scheduling / auto-on-ready / Stories** — not included (architecture allows adding publishers later).

---

## One-liner for social / tweet

> Selling CrossPost AI: face-swap shorts SaaS with Stripe, Firebase, Discover, and one-click YouTube + TikTok posting. Next.js monorepo + worker. Flippa starter — bring your own AI/API keys.

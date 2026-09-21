# CrossPost AI

AI-powered viral content repurposing platform — creator remix UI, ops admin, Stripe
billing, and direct YouTube + TikTok auto-post.

**Flippa / sale kit:** [FLIPPA-LISTING.md](./FLIPPA-LISTING.md) (listing copy, demo script, buyer checklist)  
**Product plan:** [../CROSSPOST-AI-PLAN.md](../CROSSPOST-AI-PLAN.md)

## Quick start

```bash
cd crosspost-ai
corepack pnpm install
cp .env.example .env
# Optional: create Postgres DB named `crosspost`
createdb crosspost 2>/dev/null || true
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

Open:

| URL | Purpose |
|---|---|
| http://127.0.0.1:3000/create | Creator UI shell (Phase 0) |
| http://127.0.0.1:3000/admin | Ops engine dashboard (AMVE) |
| http://127.0.0.1:3000/api/health | Health check |

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Next.js web app |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm db:migrate` | Apply Postgres migrations (`crosspost` schema) |
| `pnpm db:seed` | Seed providers, prompts, sample model |
| `pnpm worker:dev` | Background worker (when `RUN_EXECUTION_MODE=queued`) |

## Structure

```
crosspost-ai/
├── apps/web/           Next.js — creator UI + admin + API
├── apps/worker/        Background job processor
├── packages/db/        Drizzle schema (crosspost schema)
├── packages/pipeline/  Video engine (WaveSpeed, Apify, FFmpeg)
└── packages/shared/    Env validation, types
```

## Product status

- [x] Creator UI: landing, create, projects, account, discover, workspaces
- [x] Pipeline wired to creator flow (WaveSpeed + optional captions)
- [x] Firebase Google auth + Stripe billing
- [x] Ops admin at `/admin`
- [x] Auto-post: YouTube (private) + TikTok (inbox draft)
- [ ] Auto-post: Instagram Reels (coming soon — Meta Login / App Review)
- [ ] Production deploy (Railway) — see [docs/DEPLOY-RAILWAY-CROSSPOST.md](./docs/DEPLOY-RAILWAY-CROSSPOST.md)
- [ ] Facebook Page feed / Stories / scheduling / auto-post-on-ready (deferred)

## Local dev notes

- **Fixture mode** is available for providers — set `IMAGE_PROVIDER_MODE` /
  `VIDEO_PROVIDER_MODE` / `INGESTION_PROVIDER_MODE` to `fixture` for smoke tests without keys.
- Set `DASHBOARD_PASSWORD` to protect `/admin` and pipeline API routes.
- Leave `DASHBOARD_PASSWORD` empty for fully open local dev.
- For reliable queues in production: `RUN_EXECUTION_MODE=queued` + `pnpm worker:dev`.

## Auto-post to social (YouTube + TikTok; Instagram coming soon)

Creators can publish a finished (`ready`) project's video straight to their own
connected YouTube, TikTok, or Instagram accounts from the project page ("Post to social").
Connections are managed on the **Account** page. The feature is hidden until the
matching OAuth env vars are set.

### 1. Environment

Add to `.env` (see `.env.example`). All are optional; each platform's UI only
appears once its credentials **and** `SOCIAL_TOKEN_ENC_KEY` are present.

| Var | Purpose |
|---|---|
| `YOUTUBE_OAUTH_CLIENT_ID` / `YOUTUBE_OAUTH_CLIENT_SECRET` | Google OAuth client (YouTube Data API v3) |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | TikTok developer app |
| `META_APP_ID` / `META_APP_SECRET` | Meta app (Instagram Login / Instagram Graph for Reels) |
| `SOCIAL_TOKEN_ENC_KEY` | base64-encoded 32-byte key; encrypts OAuth tokens at rest (AES-256-GCM) and signs OAuth `state` |
| `APP_BASE_URL` | Used to build OAuth redirect URIs |

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. OAuth app setup

- **Google Cloud Console** → enable *YouTube Data API v3* → create an OAuth client
  (Web application). Add the redirect URI
  `{APP_BASE_URL}/api/creator/social/youtube/callback`. Scopes used:
  `youtube.upload`, `youtube.readonly`.
- **TikTok for Developers** → create an app, add the *Content Posting API* and
  *Login Kit* products. Add the redirect URI
  `{APP_BASE_URL}/api/creator/social/tiktok/callback`. Scopes used:
  `user.info.basic`, `video.upload`.
- **Meta for Developers** → create an app, add **Instagram** (API with Instagram Login).
  Redirect URI (Instagram → API setup → OAuth redirect URIs):
  `{APP_BASE_URL}/api/creator/social/instagram/callback`.
  Scopes: `instagram_business_basic`, `instagram_business_content_publish`.
  Account must be **Instagram Business** (Creator accounts cannot publish via API).
  Until App Review, only Meta testers/admins can connect.

### 3. Behaviour & defaults (compliance)

- **YouTube** uploads default to **Private** (`privacyStatus`), `selfDeclaredMadeForKids: false`.
  Unaudited apps are forced private by Google regardless of the selector. Once the
  app passes Google's audit, Unlisted/Public become effective.
- **TikTok** uploads land as a **draft in the creator's app inbox** (`FILE_UPLOAD`).
  The creator finishes the post and sets the required **AI-generated content** label
  in the TikTok app. In the product UI this shows as **Sent to inbox** (not a public
  profile post). This path works for unaudited apps and keeps the human in the loop.
- **Instagram** publishes a **Reel** via `graph.instagram.com`
  (`media_type=REELS` → poll → `media_publish`). Requires a **public HTTPS video URL**
  (R2). Personal/Creator IG accounts are not supported for API publish — Business only.
- OAuth tokens are stored **encrypted** (AES-256-GCM); the callback carries identity
  via an **HMAC-signed, short-lived `state`** rather than a session cookie.
- Publishing runs asynchronously. In `RUN_EXECUTION_MODE=queued` the worker
  processes posts (`processNextSocialPost`, one per tick, with lock + retry/backoff);
  in `inline` mode the API processes them best-effort in the background.

### 4. Deferred

Facebook Page feed, Stories, scheduling, auto-post-on-ready, per-workspace
shared connections, Instagram account picker (MVP uses the first linked IG),
and an aggregator adapter are out of scope for this phase.

## Original references

- Engine: `WORK/Ollie/ai-motion-video-engine-developer-handover/`
- Prototype: `WORK/swaptok/swaptok-clone/`

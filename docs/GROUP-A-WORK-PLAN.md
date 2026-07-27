# AMVE — Revisions & Scope Work Plan

**Status:** **Dev complete (Parts 1–3)** — **awaiting Emman UAT** (small runs for Part 2 + 3) → then **$3,000**  
**Source:** `changes/AMVE-Operator-Feedback-and-Requested-Changes.pdf` + operator screen recording  
**Baseline:** AMVE v1.0.0 in production (handover delivered)  
**Production:** https://creatr-motion-engine-web-production.up.railway.app

This plan follows Oliver’s **Part 1 / Part 2 / Part 3** structure. It is **one continuous project**, not a new build from scratch.

---

## Executive summary — what each part entails

| Block | Cost | ~Time | Goal |
|-------|------|-------|------|
| **Part 1a** | Goodwill ($0) | 2–3 days | Fix/complete what v1 should already have done — **signed off 17 Jun 2026** ✓ |
| **Part 1b** | In $3,000 | 7–9 days | **Main quality work** — match Switch’s image method — **signed off 18 Jun 2026** ✓ |
| **Part 1c** | In $3,000 | 3–4 days | Polish + edge cases + small new integrations — **signed off** ✓ |
| **Part 2** | In $3,000 | 2–3 days | Volume proof — **dev complete** ✓ (internal 10-run soak); Emman verifies with **2-run batch** |
| **Part 3** | In $3,000 | 5–7 days | Model picker in Engine Settings — **dev complete** ✓; Emman verifies with **small runs** |
| **UAT** | In $3,000 | 2–3 days | **Emman only** — combined Part 2 + 3 sign-off (small runs) → triggers **$3,000** |

**$3,000 is due after** Part 1 + 2 + 3 + UAT all pass.

### Part 1a — Quick fixes (goodwill)

Small completions on the existing build — no new features. Finishing what the original brief already asked for.

| Change | Today | After |
|--------|-------|-------|
| **Audio** | Final videos silent / wrong audio | Original reel audio on every delivery |
| **Prompts** | Hardcoded model names (e.g. Hazel) | Universal prompt by image position — works for any model |
| **Drive folders** | Nested `model/reel-name/run-10-final.mp4` | Flat `model/shortcode-run-10-final.mp4` — one folder per model |
| **Image chain** | Flux in fallback chain | Flux removed; NB Pro → Seedream (NB2 added in Part 1c) |
| **Motion** | Already from reel | Verified on live smoke test |

**Done when:** Deployed; one live run has correct audio, flat Drive path, universal prompt.

### Part 1b — Image labelling + 5-input method (core new build)

The **heart of Switch parity** — why face swaps look right in Switch and different in AMVE today.

**Emman’s Switch method (what we replicate):**

```
Image 1 → Face   (model ref photo 1)
Image 2 → Face   (model ref photo 2)
Image 3 → Face   (model ref photo 3)
Image 4 → Body   (source reel first frame)
Image 5 → Scenery (same first frame uploaded again)
```

The model’s **body photo is not used**. The first frame is sent **twice**. The prompt refers to images by **position**, not model name.

**What we build:**

- Pipeline sends **5 images in that order** to WaveSpeed (today: 4 images, no roles)
- Store **role labels** (Face / Body / Scenery) per run for audit
- Generate **4 image candidates** per call — Emman picks in **Drive**, not in AMVE
- **Run Detail** shows which image played which role
- **Locate + regenerate:** Queue → find weak delivery → retry that run
- Role mapping stored as **settings** (not hard-coded) for Part 3

**Done when:** Same reels through Switch and AMVE side by side; **≥8/10** as good or better; agreed batch usable-rate met.

**Sign-off:** Emman operator UAT complete; confirmed **5-input Nano Banana** run (#77) with 4 candidates — **18 Jun 2026**. Emman: quality **matches Switch** and **beats it slightly on framing**; **fully satisfied**. Oliver **approved** same day.

Finishing touches on Part 1 quality.

- **Nano Banana 2** — add `google/nano-banana-2/edit` as primary; chain NB2 → NB Pro → Seedream
- **Face-only reels** — auto-fall through chain before exception; Seedream as looser fallback; clearer operator errors (100% pass not guaranteed)
- **User-editable output settings** — 9:16 / resolution adjustable in UI without a deploy

**Done when:** NB2 live; face-forward reels fail less often; output settings adjustable from UI.

### Part 2 — Volume at scale

Same Part 1 quality, **several videos at once** — start with a **10-run pilot batch** (~$8), scale up later if needed.

- Raise `WAVESPEED_MAX_CONCURRENT_JOBS` (today: 2)
- Confirm no artificial batch-size cap
- **10-run soak test** (or agreed matrix) — measure failure rate
- Regression: pause worker, restart, retry — no duplicates / lost work
- Cost estimate + spend cap verified before dispatch

**Creatr:** Upgrade WaveSpeed account tier for parallel runs (their cost) — **Silver ✓ (Jun 2026)**.

**Done when:** Dev soak passed (batch #17, 9/10). **Emman:** queues **2-run batch**, confirms Drive delivery + regenerate.

### UAT — Emman sign-off (final gate)

**One session** after Part 2 + 3 deploy — Emman runs **small tests himself** (not reviewing dev soak batch).

- Part 2: **2-run batch** via Batch Builder (~$1.50) — cost estimate, parallel queue, flat Drive, regenerate
- Part 3: change models in **Engine Settings** → **1–2 test runs** — no developer
- Part 1 already signed off (1a–1c); re-check only if something regresses

**Done when:** Emman replies **Part 2 pass** + **Part 3 pass** → Oliver confirms → **$3,000 invoiced**.

**Checklist:** `docs/EMMAN-UAT-CHECKLIST.md`

### Part 3 — Settings model picker

Change AI models from the dashboard — no developer needed.

- Settings page listing WaveSpeed image + video models
- Any image model for image step, any video model for video step
- Part 1 defaults become **presets**, overridable in UI
- Choices in DB settings; adapter handles per-model API differences

**Done when:** Operator swaps model in Engine Settings, runs small test batch, no developer. **Dev complete** ✓ — **awaiting Emman sign-off**.

### Explicitly not building

| Not doing | Why |
|-----------|-----|
| In-app “pick best of 4” screen | QA in Google Drive |
| Switch private fallback models | Not on WaveSpeed; Seedream is fallback |
| Auto-posting | Deliver to Drive only |
| Copy every Switch toggle | Match output, not every UI control |

### Build order

```
Part 1a → Part 1b → Part 1c → Part 2 → Part 3 → Emman UAT (Part 2+3) → $3,000 paid
```

---

## 0. Commercial agreement (proposed to Creatr)

| Item | Terms |
|------|--------|
| **v1 handover** | Remaining **50%** — **paid** ✓ |
| **Part 1a** (in-scope fixes) | **Goodwill — $0** — **signed off 17 Jun 2026** ✓ |
| **Part 1b** (5-input + labelling) | In **$3,000** — **signed off 18 Jun 2026** ✓ |
| **All other new work** (Part 1b, 1c, Part 2, Part 3) | **$3,000 fixed**, **paid after** delivery and Creatr acceptance |
| **Build order** | Part 1 → Part 2 → Part 3 (per Creatr doc) |
| **QA** | In Google Drive; locate + regenerate in AMVE (no in-app multi-pick) |

**v1 closed.** Parts **1a–1c**, **2**, and **3** dev **complete** — **Emman UAT** is the only remaining gate before **$3,000**.

---

## 1. Principle (from Creatr)

> AMVE should be **at least as flexible as Switch App**. Nothing Switch leaves open should be locked down in code. Model choices and prompts should become **settings**, not hard-coded developer changes.

---

## 2. Scope split (Creatr document)

### In scope — completion of original brief

| Item | AMVE today | Work needed |
|------|------------|-------------|
| Keep original reel audio | `keep_original_sound: false` | **Fix** — set `true`, verify MP4 |
| Motion from source reel | `character_orientation: "video"` | **Verify** only |
| Editable universal prompt | Versioning exists; Hazel hardcoded in places | **Appendix B** + `{{model_display_name}}` |
| 9:16 output | Working | None |
| Flat Drive folder per model | `{model}/{shortcode}/…` nested | **Path change** |
| Provider chain reorder (drop Flux) | Flux is 2nd fallback | **Config** — NB Pro → Seedream |
| Batch reliability (resume, retry) | Built | Verify + document |
| Cost estimate + spend cap | Built | None |
| One video per reel + regenerate | Run history + retry exist | **Polish** locate/regenerate UX |
| Larger batches / concurrency | `WAVESPEED_MAX_CONCURRENT_JOBS=2` | **Tune** + soak test (Creatr pays WaveSpeed tier) |

### New work — included in $3,000 (paid after acceptance)

| Item | Why new | Block |
|------|---------|-------|
| **Image labelling + editable role slots** | Original brief: 4 fixed images, no labels. **Main new capability.** | Part 1b |
| **Nano Banana 2 integration** | Brief specified Nano Banana Pro; NB2 is separate WaveSpeed endpoint. | Part 1c |
| **Face-only reel handling** | Not in brief; provider-constrained tuning. | Part 1c |
| **User-editable output settings** | Brief fixed 9:16/resolution; making them UI-editable is new. | Part 1c |
| **Volume proof (concurrency + soak)** | Config + regression on existing batch system. | Part 2 |
| **Settings model picker (Part 3)** | Original brief: fixed chain. Self-serve any WaveSpeed model = new. | Part 3 |

### Explicitly out of scope (Creatr confirmed)

| Not doing | Why |
|-----------|-----|
| In-app “pick best of several” screen | **QA happens in Google Drive** |
| Switch private fallback models | Use WaveSpeed; Seedream = looser fallback |
| Auto-posting | Deliver to Drive only |
| Replicate Switch “Expression” / “enhance prompt” toggles | Match output, not every UI control |

---

## 3. Success criteria

### Part 1 — Quality (Switch parity)

**Done when:** Emman runs the **same reels** through Switch App and AMVE side by side and judges AMVE **as good or better** — and an agreed **batch usable-rate** is acceptable (not one lucky example).

1. Labelled 5-input method: images 1–3 Face, 4 Body, 5 Scenery (duplicate first frame).
2. Operator prompt (Appendix B) active, editable, no model name in template.
3. Original reel audio on delivered MP4s.
4. Motion driven from source reel.
5. Deliveries in **one folder per model** in AMVE Deliveries.
6. Face-forward reels handled as far as WaveSpeed allows (Seedream fallback for edge cases).

### Part 2 — Volume

**Done when:** A **pilot batch** (e.g. **10 runs**, ~$8) completes at Part 1 quality; failures are a small minority; team QAs comfortably in Drive.

1. Higher parallel job count (Creatr WaveSpeed tier).
2. No artificial batch-size cap in AMVE.
3. Resume / retry / clear exceptions after interruption.

### Part 3 — Model picker (separate phase)

**Done when:** Operator changes image or video model from **Settings**, runs a small test batch, **no developer involved**.

---

## 4. Timeline overview

| Block | Focus | Dev days (est.) | Intensive calendar |
|-------|--------|-----------------|-------------------|
| **0** | Sign-off + prep | 1 | Day 0 |
| **Part 1a** | In-scope fixes (audio, prompts, Drive, Flux) | 2–3 | Days 1–2 |
| **Part 1b** | NEW — labelling + 5-input pipeline | 7–9 | Days 3–6 |
| **Part 1c** | NEW small — NB2, face-only, editable output settings | 3–4 | Days 6–7 |
| **Part 2** | Volume proof (concurrency, internal soak) | 2–3 | **Done** ✓ (dev) |
| **Part 3** | Engine Settings model picker | 5–7 | **Done** ✓ (dev) |
| **UAT** | Emman — Part 2 + 3 small runs | 1–2 | **Current** |

| Plan | Calendar @ ~8h/day | Calendar @ 15h/day |
|------|-------------------|-------------------|
| **Part 1 + 2** (no Part 3) | ~2–2.5 weeks | **~8–10 days** + 2-day UAT buffer |
| **Full including Part 3** | ~3–4 weeks | **~12–14 days** |

---

## 5. Phase 0 — Sign-off and prep

### Creatr decisions

- [ ] Approve this work plan and **IN SCOPE vs NEW WORK** commercial split.
- [ ] Confirm **Appendix B prompts** as default presets.
- [ ] Confirm **flat Drive rule**: `{modelSlug}/{shortcode}-run-{id}-final.mp4` (no per-reel subfolders).
- [ ] Confirm **no in-app multi-pick** — QA in Drive; AMVE provides locate + regenerate only.
- [ ] Confirm **Part 3** timing (same engagement vs separate phase).
- [ ] Emman available for UAT sessions (mid-build + final).
- [x] Creatr provisions **higher WaveSpeed concurrency tier** before Part 2 soak test — **Silver (Jun 2026)**.

### Dev prep

- [ ] Branch: `phase-2/revisions` from `master`.
- [ ] Baseline smoke on production (health, one batch run).
- [ ] Document current exception rate on Emman’s test reel set.

---

## 6. Part 1a — In-scope completion (~2–3 days)

### Audio + motion (was A.6)

- [x] Set `keep_original_sound: true` in `packages/pipeline/src/providers/wavespeed/generate-video.ts`.
- [x] Confirm `character_orientation: "video"` unchanged.
- [x] Live run: listen-test delivered MP4 vs source reel — **confirmed by Emman, 17 Jun 2026**

**Acceptance:** Trending/source audio preserved; motion follows reel.

### Universal prompts (was A.3) — IN SCOPE

- [x] Activate Appendix B image + video prompt versions (`UNIVERSAL_*_PROMPT_V2`, `pnpm db:part-1a`).
- [x] Remove hardcoded model names from default prompt templates.
- [x] Prompt works by **image position** — no model name in template body.
- [x] Keep Prompt Operations versioning; operator prompt editable as saved preset.

### Flat Drive delivery (was A.4) — IN SCOPE

- [x] Change `deliver-run.ts`: upload to `{modelSlug}/` only.
- [x] Unique filename: `{shortcode}-run-{id}-final.mp4`.
- [ ] Verify re-delivery idempotency.
- [ ] Update handover docs path examples.

**Sign-off:** Emman confirmed Part 1a working; Oliver signed off **17 Jun 2026**.

### Provider chain reorder — IN SCOPE

- [x] Remove Flux Kontext Max from enabled chain (`enabled: false` in `providers.ts` + `db:part-1a`).
- [x] Default order: Nano Banana Pro → Seedream (NB2 added in Part 1c).

**Release:** Deploy to Railway after `pnpm build && pnpm test`. Emman smoke: 1 model × 1 reel.

---

## 7. Part 1b — Image labelling + 5-input method (~7–9 days) — NEW WORK

**Core quality item.** Original brief specified 4 images with no role labels; this is the substantive new build.

### Pipeline

- [x] Canonical URL order: 3× Face, Body, Scenery (duplicate first frame).
- [x] Update `execute-run.ts` + `generate-image.ts` (5 labeled inputs).
- [x] Store role metadata on `stage_runs` via `labeled_inputs` in request payload.
- [x] Generate **4 image candidates** per run (2× Nano Banana `edit-multi` calls, `num_images: 2` each — API max per request).

### Prompts

- [ ] Appendix B image prompt as active `image_gen` version.
- [ ] Note: prompt text says “fifth = clothing”; operator labels slot **Scenery** (covers clothing/background).

### UI (transparency, not Switch clone)

- [x] Run Detail: show input role list per run (incl. batched Nano Banana payloads).
- [x] Run Detail: image candidate grid (4 on NB; 1 on Seedream fallback with note).
- [x] **Locate + regenerate:** Regenerate reel button + Queue link for weak deliveries.
- [x] Store default role mapping as **settings** (`DEFAULT_IMAGE_INPUT_SLOTS` in shared).

**Acceptance:** Side-by-side with Switch on agreed reels — **signed off by Emman, 18 Jun 2026**. Quality **matches or beats** Switch (Emman); **Oliver approved** same day.

**Reference run:** #77 — `wavespeed_nano_banana_pro`, 5 labeled inputs (Face ×3, Body, Scenery), 4 candidates, delivered.

**Sign-off:** Emman confirmed production runs, Run Detail roles/candidates, side-by-side comparison, regenerate, and output quality vs Switch — **18 Jun 2026**. Oliver **approved** Part 1b.

---

## 8. Part 1c — Small new items (~3–4 days) — NEW WORK

### Nano Banana 2

- [x] Add `google/nano-banana-2/edit` to provider registry as **primary** image default.
- [x] Fallback chain: NB2 → NB Pro → Seedream.
- [x] Cost/latency logged per stage (`stage_runs` + `providerAttempts` in response payload).

### Face-only reels

- [x] Classify WaveSpeed content-rejection errors.
- [x] Fall through provider chain before exception.
- [x] Clearer exception copy for operators.
- [ ] Acknowledge: **100% pass not guaranteed**; Seedream = looser fallback; measure residual gap.

### User-editable output settings (small)

- [x] Expose aspect ratio / resolution defaults in **Output Settings** page (9:16, 1k/2k/4k).

---

## 9. Part 2 — Volume at scale (~2–3 days) — mostly IN SCOPE

**Goal:** Same Part 1 quality, many videos at once.

- [x] Raise `WAVESPEED_MAX_CONCURRENT_JOBS` (and Railway worker resources if needed).
- [x] Confirm **no hard batch-size cap** in Batch Builder / API.
- [x] Run **10-run soak test** (batch #17, 9/10 delivered, ~$7.19).
- [x] Verify pause/resume/retry after worker restart (regression — run #86 lock stall documented).
- [x] Cost estimate before queue + daily spend cap verified before dispatch.

**Creatr responsibility:** Higher WaveSpeed tier / account limits for parallel runs.

**Acceptance (dev):** Internal 10-run soak batch #17 — 9/10 delivered, ~$7.19. **Emman acceptance:** own **2-run batch** (see §17).

**Not in scope:** In-app QC gallery — team uses Drive.

---

## 10. Part 3 — Settings model picker (~5–7 days) — NEW WORK (included in $3,000)

**Dev complete** — deployed to production (`Engine Settings` in sidebar).

- [x] Settings page: list WaveSpeed image + video models (from registry).
- [x] Per-stage selection: image chain order + video model dropdown.
- [x] Part 1 defaults (NB2 → NB Pro → Seedream, Kling Std) as **preset**, overridable in UI.
- [x] Store choices in DB (`provider_configs`) — not code deploys.
- [x] Per-model adapters unchanged (existing WaveSpeed clients).

**Acceptance (Emman):** Change models in Settings → **1–2 test runs** → no developer. See §17.

**Build note (from Creatr):** Part 1 stored model choice as **settings** early — Part 3 was a picker, not a rewrite.

---

## 11. Build order

```
Phase 0     Sign-off + commercial alignment
    ↓
Part 1a     Audio, prompts, Drive, Flux removal     (~2–3 days)
    ↓
Part 1b     Labelling + 5-input pipeline            (~7–9 days)  DONE ✓
    ↓
Part 1c     NB2, face-only, output settings        DONE ✓
    ↓
Part 2      Concurrency + internal soak               DONE ✓ (dev)
    ↓
Part 3      Engine Settings model picker              DONE ✓ (dev)
    ↓
UAT         Emman — small runs (Part 2 + 3)          ← **current**
    ↓
Acceptance  Emman + Oliver sign-off → $3,000 invoiced
```

### Execution schedule (~12–14 intensive days @ 15 h/day)

| Day | Focus | Gate |
|-----|--------|------|
| 0 | Creatr sign-off + v1 remaining 50% settled | **Done** ✓ |
| 1 | Part 1a — audio, prompts, Drive, Flux → deploy | Goodwill — **current** |
| 2 | Part 1a finish + start Part 1b pipeline | **Done** ✓ |
| 3–4 | Part 1b — 5-input + operator prompts | **Done** ✓ |
| 5 | Part 1b — live test matrix with Emman reels | **Done** ✓ (18 Jun 2026) |
| 6 | Part 1c — NB2 + face-only fallbacks | **Done** ✓ |
| 7 | Part 2 — concurrency + internal soak (batch #17) | **Done** ✓ |
| 8–10 | Part 3 — Engine Settings model picker → deploy | **Done** ✓ |
| 11+ | **Emman UAT** — Part 2 + 3 small runs | **Current** |
| — | Oliver confirms → invoice | **$3,000 due** |

---

## 12. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Oliver labels labelling “in scope” in Part 1 but “new” on page 5 | Use **his scope summary**; agree payment for Part 1b |
| WaveSpeed rejects face-only / revealing content | Seedream fallback; measure gap; operator reel selection |
| 5 inputs less stable than 4 | A/B test; configurable fallback to 4 |
| Soak batch fails | Tune concurrency; Creatr tier; document limits; retry with agreed matrix |
| 15 h/day burnout | 8-day = delivery; 10-day = acceptance |
| Part 3 scope creep | Fixed $3,000 covers doc scope only; change requests quoted separately |
| $3,000 paid after delivery | Creatr delays UAT → agree acceptance window in writing |

---

## 13. Effort and pricing summary

| Block | Classification | Dev days | Charge |
|-------|----------------|----------|--------|
| Part 1a | In scope (goodwill) | 2–3 | **$0** |
| Part 1b | New work | 7–9 | Included |
| Part 1c | New work | 3–4 | Included |
| Part 2 | Mostly in scope | 2–3 | Included |
| Part 3 | New work | 5–7 | Included |
| UAT | Shared | 2–3 | Included |
| **Total new work** | | **~17–23 days** | **$3,000** (paid after acceptance) |
| **v1 remaining** | Original engagement | — | **Paid** ✓ |

---

## 14. References

| Document | Location |
|----------|----------|
| Creatr revisions PDF (current) | `changes/AMVE-Operator-Feedback-and-Requested-Changes.pdf` |
| Operator recording | `changes/video.mp4` |
| Original brief | `docs/START_HERE_PROJECT_BRIEF.md` |
| Acceptance criteria | `docs/BUILD_PLAN_AND_ACCEPTANCE_CRITERIA.md` |
| v1 handover | `docs/SOFTWARE-HANDOVER.md` |
| Operator tutorial | `docs/TUTORIAL.md` |
| Emman UAT checklist | `docs/EMMAN-UAT-CHECKLIST.md` |
| Part 2 soak (internal) | `docs/PART-2-SOAK.md` |

---

## 15. Acceptance checklist (triggers $3,000)

- [x] Part 1b: 5-input Nano Banana pipeline; Run Detail roles + candidates; regenerate (run #77)
- [x] Part 1b quality: AMVE **matches or beats** Switch — Emman fully satisfied; **Oliver approved** (**18 Jun 2026**)
- [x] Part 1c: NB2, face-only fallbacks, editable output settings *(signed off)*
- [x] Part 1a: Original audio on delivered MP4s; flat Drive folder per model *(signed off 17 Jun 2026)*
- [x] Part 2 (dev): internal soak — 9/10 delivered (batch #17, ~$7.19)
- [ ] Part 2 (Emman): **2-run batch** — cost estimate, queue, Drive, regenerate
- [x] Part 3 (dev): Engine Settings model picker deployed
- [ ] Part 3 (Emman): change models in Settings → **1–2 test runs** without developer

---

## 16. Next steps

1. ~~**Creatr:** Settle **v1 remaining 50%**.~~ **Done.**
2. ~~**Dev:** Parts **1a–1c** — signed off by Emman / Oliver.~~
3. ~~**Creatr:** WaveSpeed **Silver** tier.~~ **Done.**
4. ~~**Dev:** Part **2** + Part **3** — built, deployed, production live.~~
5. **Emman:** UAT — **small runs** for Part 2 + 3 (§17 below; full list in `docs/EMMAN-UAT-CHECKLIST.md`).
6. **Oliver:** Confirm sign-off → **$3,000 invoiced**.

---

## 17. Emman UAT — Part 2 + 3 (small runs)

**Production:** https://creatr-motion-engine-web-production.up.railway.app  
Emman queues **his own runs** — not reviewing the dev soak batch.

### Part 2 — Volume (2-run batch)

1. **Batch Builder** — **1 model × 2 reels** (or 2 × 1) → confirm **estimated cost before dispatch** (~$1.50) → queue.
2. **Queue** — both jobs finish; **2+ parallel** observed is a pass.
3. **Drive** — both MP4s in flat model folder; **original reel audio**.
4. **Regenerate** — retry one run from Run Detail if needed.
5. Reply **Part 2 pass / fail** (note run IDs if fail).

### Part 3 — Engine Settings (1–2 runs)

1. **Engine Settings** — change image chain order or toggle a fallback → **Save** → refresh → **persists**.
2. Queue **1 run** → **Run Detail** shows Settings chain (or fallback).
3. Revert to **NB2 → NB Pro → Seedream** + **Kling Standard** → **1 more run** → delivers.
4. Reply **Part 3 pass / fail**.

**Triggers $3,000:** Emman **Part 2 pass** + **Part 3 pass** + Oliver confirms.

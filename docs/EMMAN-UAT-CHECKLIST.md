# Emman UAT Checklist — Final Sign-off (Part 1 + 2 + 3)

**Production:** https://creatr-motion-engine-web-production.up.railway.app  
**QA location:** Google Drive → **AMVE Deliveries** (flat folder per model)  
**When:** Emman runs **small tests** for Part 2 + 3 (Parts 1a–1c already signed off)

Sign each section **Pass / Fail / Notes**. Project acceptance (and **$3,000**) requires **Pass** on all critical items.

---

## Before you start

- [ ] Dashboard login works
- [ ] Telegram alerts are reaching the team channel
- [ ] You have 3–5 **test reels** marked **selected** in Sources (mix of easy + one face-forward if available)
- [ ] You have **2 models** with 3+ face refs each (e.g. Mia, Poppy)

---

## Part 1 — Quality (already signed off — quick regression)

### Image pipeline (5-input method)

- [ ] Run **1 new manual/batch run** with a model that has 3+ refs
- [ ] **Run Detail** shows **5 labeled inputs**: Face ×3, Body, Scenery
- [ ] **Nano Banana 2** appears as primary image provider when it succeeds
- [ ] **4 image candidates** when NB2/NB Pro succeeds (1 candidate if Seedream fallback only)
- [ ] Side-by-side with **Switch**: face/body swap quality **matches or beats** Switch on same reel

### Audio & delivery

- [ ] Delivered MP4 has **original reel audio** (not silent)
- [ ] Drive path is **flat**: `model/shortcode-run-XX-final.mp4` (one folder per model)
- [ ] **Regenerate** from Run Detail works on a run you want to redo

### Output settings (Part 1c)

- [ ] **Settings** → change aspect ratio or resolution → **Save** → refresh → settings **persist**
- [ ] New run respects saved output defaults

### Edge cases

- [ ] Face-forward / sensitive reel: AMVE **falls through to Seedream** with a **clear error** in Exception Center if NB blocks (100% pass not expected)

---

## Part 2 — Volume (small batch you run)

1. **Batch Builder** — **1 model × 2 reels** (2 runs total). Confirm **estimated cost before dispatch** (~$1.50) → queue.
2. **Queue** — both jobs finish (2+ running at once is a pass).
3. **Drive** — both MP4s in flat model folder; original reel audio.
4. **Regenerate** — retry one run from Run Detail if needed.
5. Reply **Part 2 pass / fail**.

## Part 3 — Engine Settings (small runs)

1. **Engine Settings** — change chain order → **Save** → refresh → persists.
2. Queue **1 run** → Run Detail shows your Settings chain.
3. Revert defaults → **1 more run** → delivers.
4. Reply **Part 3 pass / fail**.

---

## Side-by-side usable rate (Creatr acceptance)

Pick **10–15 agreed test reels** (same set you use for Switch):

| # | Reel | Switch usable? | AMVE usable? | Notes |
|---|------|----------------|--------------|-------|
| 1 | | | | |
| 2 | | | | |
| … | | | | |

- [ ] **Usable rate** on AMVE is **equal to or better than** Switch on the same reels
- [ ] Team is comfortable **QAing in Drive** (no in-app gallery needed)

---

## Sign-off

| Role | Name | Date | Part 1+2+3 accepted? |
|------|------|------|----------------------|
| Operator | Emman | | ☐ Part 2 pass ☐ Part 3 pass |
| Creatr | Oliver | | ☐ Yes ☐ No |

**Notes / blockers:**

---

## If something fails

1. Note **Run ID** + **Exception ID** (Exception Center)
2. Screenshot Run Detail (input roles + provider chain)
3. Send to dev — do **not** block on a single reel content rejection if Seedream fallback behaved correctly

**Not in scope for this UAT:** In-app pick-best-of-4 gallery, auto-posting, Switch private models.

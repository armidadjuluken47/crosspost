# Developer Handover Pack

This folder contains the handover documents for the Creatr AI Motion Video Engine (AMVE).

## For Oliver — start here

1. **[SOFTWARE-HANDOVER.md](SOFTWARE-HANDOVER.md)** — **Primary handover document** for the source code presentation: architecture, dashboard guide, workflows, infrastructure, acceptance evidence, and handover checklist.

2. **[TUTORIAL.md](TUTORIAL.md)** — **Operator tutorial for Oliver:** plain-language explanation of how AMVE works, first-clip walkthrough, overnight batches, queue/exceptions, daily checklist.

3. **[OLIVER-ACCESS.md](OLIVER-ACCESS.md)** — Quick access card (URL, login, Drive, first session).

4. **[HANDOFF.md](HANDOFF.md)** — Operator feature summary and demo checklist.

5. **[RUNBOOK.md](RUNBOOK.md)** — Recovery procedures when something goes wrong.

---

## For developers — technical depth

Read these in order when extending the codebase:

1. [START_HERE_PROJECT_BRIEF.md](START_HERE_PROJECT_BRIEF.md) — Product context, workflow, locked decisions.

2. [FROM_SCRATCH_TECHNICAL_SPEC.md](FROM_SCRATCH_TECHNICAL_SPEC.md) — Architecture, data model, providers, queues, QC, retries.

3. [BUILD_PLAN_AND_ACCEPTANCE_CRITERIA.md](BUILD_PLAN_AND_ACCEPTANCE_CRITERIA.md) — Phases and acceptance criteria.

4. [ENVIRONMENT.md](ENVIRONMENT.md) — All environment variables.

5. [LOCAL-DEV.md](LOCAL-DEV.md) — Local setup and smoke tests.

6. [DEPLOY-RAILWAY.md](DEPLOY-RAILWAY.md) — Production deployment.

---

## Phase 2 — revisions (current)

- **[GROUP-A-WORK-PLAN.md](GROUP-A-WORK-PLAN.md)** — Revisions work plan (Part 1 / 2 / 3, commercial terms, day-by-day schedule)
- Source: `changes/AMVE-Operator-Feedback-and-Requested-Changes.pdf`

---

## Sprint history (completed)

- [WORK-PLAN.md](WORK-PLAN.md) — Days 1–11 build log
- [4-DAY-SPRINT.md](4-DAY-SPRINT.md) — Finish sprint checklist
- [DAY-11-COMPLETION.md](DAY-11-COMPLETION.md) — Live acceptance evidence (10 reels)

---

## Baseline decisions

- Internal production engine, not a public SaaS product.
- Automated high-volume content generation from registered model identities + Instagram sources.
- Generation is WaveSpeed-only unless Oliver explicitly changes that decision.
- Operators manage the full lifecycle from one dashboard: models, intake, batch, queue, exceptions, delivery.

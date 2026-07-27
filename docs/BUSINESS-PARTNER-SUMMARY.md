# AI Motion Video Engine - Business Partner Summary

## What We Are Building

We are building an internal AI content production engine for Creatr. The system turns selected Instagram source reels into model-preserving AI motion videos using a repeatable, high-volume workflow.

The core idea is to replace the current manual assistant process with software that can:

- Register AI models and store their reference images.
- Pull candidate Instagram reels from approved source accounts.
- Let an operator preview and select source videos before generation.
- Extract and store the exact first frame from the chosen source video.
- Generate a new first-frame image using the registered model identity while preserving the source video composition.
- Use that generated image and the original source video to create a motion-controlled video.
- Track every run, provider attempt, asset, exception, and delivery.

## Purpose

The purpose is to scale a content workflow that is currently too manual.

Instead of repeatedly uploading files, copying prompts, tracking outputs by hand, and manually coordinating model images/source videos, the platform is designed to centralize the whole process:

- Source discovery
- Model reference storage
- Prompt management
- Image generation
- Motion video generation
- Quality control
- Asset storage
- Run history
- Exception handling
- Delivery tracking

This gives us a controlled production system rather than a collection of one-off manual AI generation tasks.

## Overall Project Goal

The overall goal is to create a production-ready internal tool that can generate large volumes of model-specific vertical AI videos from proven Instagram source content.

The target workflow is:

1. Add source Instagram accounts.
2. Add registered models with reference photos.
3. Pull recent/high-potential reels automatically.
4. Preview the source videos in the UI.
5. Select the videos we want to use.
6. Queue generation across selected model(s).
7. Generate the model-preserving first frame.
8. Generate the final motion video.
9. QC the output.
10. Deliver/export the finished assets.

The system should eventually support batch production, where multiple selected source videos can be processed across multiple registered models with minimal operator input.

## Current Product Direction

The active generation stack is WaveSpeed-only.

Current provider order:

1. WaveSpeed Nano Banana Pro - image generation
2. WaveSpeed Flux Kontext Max - image fallback
3. WaveSpeed Seedream v4.5 - image fallback
4. WaveSpeed Kling v3 Standard - video generation

WaveSpeed Kling Pro is kept as a disabled premium slot until pricing, concurrency, latency, and quality are verified.

We are not currently using Gemini, LaoZhang, Switch, fal.ai, Replicate, or other generation providers in the active build.

## Key Components

### Operator Dashboard

The browser UI is the control center. It includes panels for:

- Provider status
- Model Registry
- Source Registry
- Automated Intake
- Prompt Operations
- Queue Operations
- Run History
- Run Detail
- Exception Center
- Audit Log

### Model Registry

The model registry lets us create a model profile and upload/store reference images for that model. These images are stored in Cloudflare R2 and reused automatically during generation.

This avoids manually uploading the same model photos for every run.

### Source Registry And Automated Intake

The source registry stores Instagram accounts we want to pull content from.

Automated intake uses Apify to discover reels, downloads source video assets, stores the MP4 in R2, extracts the first frame with ffmpeg, stores that first frame in R2, and shows preview cards in the UI.

The operator can watch the videos before selecting which ones become generation inputs.

### Prompt Operations

Prompts are stored and versioned in the database.

The image prompt controls how the generated first frame should preserve:

- Source pose
- Source body position
- Camera framing
- Background
- Clothing
- Lighting
- Visible text
- Registered model identity

The video prompt controls how the generated image should be animated using the original source video as motion control.

### Pipeline And Worker Queue

Runs can be queued and processed by a worker flow.

Each run records:

- Stage attempts
- Provider used
- Prompt version
- Request payload
- Response payload
- Output assets
- Exceptions
- Audit events

This gives traceability when a provider fails, a prompt needs tuning, or an output needs retrying.

### Asset Storage

Cloudflare R2 is used for durable asset storage.

Stored assets include:

- Model reference images
- Source MP4s
- Extracted first frames
- Generated image candidates
- Generated videos

### Quality And Format Handling

The pipeline enforces vertical 9:16 output requirements.

Recent fixes added:

- A four-image input limit for WaveSpeed image calls.
- Nano aspect-ratio handling based on WaveSpeed API constraints.
- Automatic generated-image normalization to exact 9:16 before video generation.
- ffmpeg-based first-frame extraction and image normalization.

## Technical Stack

- Next.js: operator dashboard and API routes
- React: dashboard UI
- TypeScript: application and pipeline logic
- pnpm monorepo: project/package management
- Postgres: persistent database
- Drizzle ORM: database schema and queries
- Cloudflare R2: source and generated asset storage
- Apify: Instagram source discovery and reel asset capture
- WaveSpeed: image and video generation providers
- ffmpeg-static: first-frame extraction and image normalization
- Vitest: automated tests
- ESLint/TypeScript checks: code validation

## Current Build Status

The system currently has:

- A working dashboard.
- R2 asset storage configured.
- A model registry that stores reference images.
- Source registry and Apify-backed intake.
- Source video preview and selection.
- Source MP4 storage in R2.
- Exact first-frame extraction from downloaded source videos.
- Versioned image/video prompt management.
- WaveSpeed image provider fallback chain.
- WaveSpeed video provider wiring.
- Queue processing.
- Run detail and audit trail.
- Exception tracking.

The current focus is stabilizing the live end-to-end path from selected source video to generated image to motion video.

## Next Build Priorities

1. Complete a stable live end-to-end run using selected preview videos.
2. Improve batch controls so selected videos can be processed across one or more registered models.
3. Improve prompt controls and prompt presets for different content styles.
4. Add stronger QC review views for source video, first frame, generated image, and final video.
5. Add better retry controls for failed stages.
6. Harden delivery/export workflows.
7. Add production-grade monitoring, cost tracking, and concurrency controls.

## Strategic Value

This project gives Creatr a proprietary internal production system for repeatable AI video creation.

The value is not just generating one video. The value is building a controlled content engine that can scale:

- More source accounts
- More models
- More video volume
- Better prompt consistency
- Better asset traceability
- Faster iteration
- Lower manual workload
- Higher output throughput

The end product should feel like an internal content factory: source content comes in, model-specific motion videos come out, and the team can monitor, correct, and scale the process from one dashboard.

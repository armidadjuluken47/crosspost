# AI Motion Video Engine - Project Brief

## 1. Project In One Sentence

Build an internal AI content-production engine that takes selected Instagram reels from approved source accounts and regenerates them as vertical 9:16 motion videos starring Creatr's registered model identities, using an automated WaveSpeed-based generation pipeline with durable storage, batch controls, quality checks, retries, and a full audit trail.

## 2. Why This Exists

Creatr currently has a manual assistant-led workflow for producing AI motion videos. The manual process is useful but does not scale because a human must repeatedly coordinate source clips, first frames, model reference images, prompts, generation tools, output checks, and file storage.

The desired product replaces that repeated manual orchestration with software.

The system should let the team:

- Register a model identity once.
- Store that model's reference images once.
- Register approved Instagram source accounts once.
- Pull candidate reels automatically.
- Preview and select source clips in the UI.
- Generate a model-preserving first frame.
- Use that generated first frame plus the original source video to create the final motion video.
- Run quality checks.
- Store every artifact.
- Track every stage, prompt, provider response, cost, exception, and delivery.
- Process many selected clips across many registered models with minimal operator input.

The strategic goal is a controlled internal content factory. Source videos come in, model-specific motion videos come out, and operators only intervene for selection, batch setup, quality review, or exceptions.

## 3. What We Are Building

This is a browser-based internal dashboard plus backend worker pipeline.

The first production version must include:

- Model Registry
- Source Account Registry
- Automated Instagram intake through Apify
- Source video preview and selection
- Cloudflare R2 asset storage
- Exact first-frame extraction with ffmpeg
- Versioned prompts for image and video generation
- WaveSpeed image generation provider chain
- Generated image normalization to exact 9:16
- WaveSpeed Kling motion-video generation
- Queue-based run processing
- Batch processing controls
- Run history and run detail views
- Exception center
- Audit log
- Provider status and readiness checks
- Quality-control checks for image and video outputs

This is not meant to be a nicer manual upload UI. Manual upload can exist as a fallback/debug tool, but the primary workflow must be automated intake, registry selection, batch execution, and exception handling.

## 4. The Real-World Workflow Being Automated

The current manual workflow can be described as:

1. A human finds or receives a short-form vertical Instagram reel that is suitable as a motion reference.
2. The human identifies which Creatr model/brand identity should appear in the generated version.
3. The human gathers the model reference images.
4. The human extracts or uses the first frame of the source video.
5. The human prompts an image-generation tool to recreate the first frame with the registered model identity.
6. The human checks whether the generated image keeps the same pose, framing, outfit, text, background, and composition.
7. The human uses that generated image and the original source video as inputs to a motion-video tool.
8. The human waits for the motion video.
9. The human checks whether the output is vertical 9:16, usable, identity-preserving, and close to the original motion.
10. The human stores or delivers the finished asset.

The software must automate steps 3 through 10 as much as possible and make step 1/source selection and exception handling efficient.

## 5. Primary Users

### Operator

The operator uses the dashboard day to day.

They must be able to:

- Add and manage registered model identities.
- Upload and manage reference images for each model.
- Add and manage approved Instagram source accounts.
- Run or schedule source intake.
- Watch source video previews.
- Select source clips for generation.
- Select one or more registered models.
- Queue a batch.
- See live run status.
- Retry failed stages.
- Resolve exceptions.
- Inspect outputs.

### Project Owner

The project owner cares about:

- Output quality.
- Throughput.
- Cost per final video.
- Failure rates.
- Provider reliability.
- Prompt performance over time.
- Whether the engine is actually replacing manual work.

### Developer/Engineer

The developer owns:

- Correct implementation.
- Durable state.
- Provider integration.
- Prompt/versioning infrastructure.
- Batch/resume behaviour.
- Failure handling.
- Observability.
- Safe production operations.

## 6. Key Terms

| Term | Meaning |
|---|---|
| Source account | An approved Instagram account that the system is allowed to pull candidate reels from. |
| Source reel / source clip | An Instagram reel used as the motion and composition reference. |
| Registered model / brand identity | A Creatr model identity stored in the system with name, slug, notes, and reference images. |
| Reference image | A model identity image stored in R2 and reused automatically during generation. |
| Source MP4 | The downloaded source video stored in R2. |
| First frame | The exact first frame extracted from the source MP4 using ffmpeg. |
| Generated first frame | The AI-generated image that should preserve the source first frame's composition while replacing identity with the registered model. |
| Motion video | The final generated vertical video created from the generated first frame and original source video. |
| Run | One attempt to generate output for one selected source reel and one selected model. |
| Batch | A set of runs created from multiple selected source reels and one or more selected models. |
| Stage run | One provider/stage attempt inside a run, such as image generation or video generation. |
| Exception | A visible item requiring operator attention because automation could not safely continue. |
| Prompt version | An immutable prompt template version used by a run stage and saved with the run record. |

## 7. Locked Technology Decisions

These are current decisions and should be treated as source of truth unless Oliver explicitly changes them.

| Area | Decision |
|---|---|
| App/dashboard | Next.js, React, TypeScript |
| Database | Postgres |
| ORM | Drizzle ORM |
| Storage | Cloudflare R2 |
| Instagram intake | Apify |
| First-frame extraction | ffmpeg through ffmpeg-static or equivalent bundled binary |
| Image generation | WaveSpeed only |
| Video generation | WaveSpeed only |
| Primary image model | WaveSpeed Nano Banana Pro |
| Image fallback 1 | WaveSpeed Flux Kontext Max |
| Image fallback 2 | WaveSpeed Seedream v4.5 |
| Motion-video model | WaveSpeed Kling v3 Standard |
| Disabled future video slot | WaveSpeed Kling v3 Pro |
| Prompt storage | Versioned database prompts |
| Orchestration | Durable worker queue with persisted jobs/stage state |
| Asset URLs | Provider-downloadable public or signed R2 URLs |

No Gemini/Vertex, LaoZhang, Switch, fal.ai, Replicate, or other generation provider should be part of the active generation path unless Oliver reopens that decision. QC may use non-generation AI/vision tools if approved, but the generation path is WaveSpeed-only.

## 8. Required Provider Order

Image generation provider chain:

1. `wavespeed_nano_banana_pro`
   - WaveSpeed model: `google/nano-banana-pro/edit-multi`
2. `wavespeed_flux_kontext_max`
   - WaveSpeed model: `wavespeed-ai/flux-kontext-max/multi`
3. `wavespeed_seedream_v45`
   - WaveSpeed model: `bytedance/seedream-v4.5/edit`

Video generation provider:

1. `wavespeed_kling_v3_standard`
   - WaveSpeed model: `kwaivgi/kling-v3.0-std/motion-control`

Disabled future/premium slot:

- `wavespeed_kling_v3_pro`
  - WaveSpeed model: `kwaivgi/kling-v3.0-pro/motion-control`
  - Must not run automatically until pricing, access, concurrency, latency, and quality are verified.

## 9. End-To-End Product Flow

### Step 1: Create model identity

The operator creates a registered model in the UI.

Required fields:

- Display name
- Slug
- Status
- Notes, optional
- At least 3 active reference images

The backend uploads reference images to R2 and stores their R2 keys in the database. These images are reused automatically by the generation pipeline. The operator should not need to upload model images again for each run.

### Step 2: Register source accounts

The operator adds approved Instagram handles in the Source Registry.

The system stores:

- Handle
- Status
- Last scrape time
- Apify metadata
- Optional notes or account constraints

### Step 3: Pull candidate reels

The operator starts intake or the system runs it on a schedule.

Apify should fetch recent reels from active source accounts. The app must dedupe by shortcode so the same reel is not imported repeatedly.

### Step 4: Store source assets

For each candidate reel, the backend should:

- Download the source MP4 immediately before Instagram CDN URLs expire.
- Store the MP4 in R2.
- Extract the exact first frame using ffmpeg.
- Store the first-frame image in R2.
- Persist metadata, source URL, R2 keys, duration, dimensions where available, and intake status.

### Step 5: Preview and select source clips

The operator must be able to watch candidate reels in the UI before generating anything.

This is important because not every scraped reel is suitable. The operator should select the clips to use, then select one or more registered models to process against those clips.

### Step 6: Create batch

A batch is created from:

- Selected source reels
- Selected registered model identities
- Optional operator instruction
- Prompt versions
- Provider configuration snapshot

For every source reel and every selected model, the system creates one run.

Example:

- 5 selected reels
- 3 selected models
- 15 runs

### Step 7: Generate first-frame image

For each run, the image stage should send WaveSpeed the correct input images:

1. Model reference image 1
2. Model reference image 2
3. Model reference image 3
4. Exact source first frame

Critical constraint: WaveSpeed image calls should use a maximum of 4 input image URLs. Do not send repeated source frames or more than 3 model references unless the specific WaveSpeed endpoint has been reverified.

The generated image must preserve:

- Source pose
- Source body angle
- Source hand position
- Source camera angle
- Source crop
- Source composition
- Source clothing
- Source background
- Source lighting
- Source visible text

It should replace only:

- Person identity, using the registered model reference images.

### Step 8: Normalize generated image

The generated image must be normalized to exact 9:16 before video generation.

Provider outputs may not be exactly 9:16 even when the prompt asks for it. The pipeline must verify dimensions and crop/pad/resize deterministically.

Known WaveSpeed issue:

- Nano Banana Pro may not accept `aspect_ratio: 9:16`.
- If using Nano Banana Pro, submit a supported ratio such as `2:3` if required by WaveSpeed, then normalize the output to exact 9:16.

### Step 9: Generate motion video

The video generation stage uses:

- The winning generated first-frame image.
- The original source MP4.
- The versioned video prompt.
- WaveSpeed Kling v3 Standard.

The output must:

- Remain vertical 9:16 for the full video.
- Preserve the generated model identity.
- Follow source movement, timing, framing, camera motion, and body motion.
- Preserve original audio if supported by the provider path.
- Preserve visible text as much as possible.
- Avoid introducing extra people, objects, logos, or text.

### Step 10: QC, store, and surface outcome

The system stores generated videos in R2 and records:

- Provider
- Prompt version
- Request payload
- Response payload
- Cost estimate/actual
- Latency
- Dimensions
- Duration
- QC result
- Exception if failed

The operator can inspect final outputs, retry failed stages, or resolve exceptions.

## 10. Prompting Is A Core Product Feature

Prompting is not an afterthought. It directly controls whether the generated first frame is usable for motion-video generation.

The system must include a Prompt Operations area where prompts are:

- Stored in the database.
- Versioned immutably.
- Scoped globally first, with optional model-specific overrides later.
- Previewable before use.
- Attached to every run/stage.
- Rollback-capable.

Every generated artifact must be traceable to:

- Prompt stage
- Prompt scope
- Prompt version
- Rendered prompt text
- Operator instruction, if any
- Provider used
- Provider settings

### Current image prompt baseline

```text
Create a photorealistic 9:16 vertical source frame for the registered model.

Input image order:
1. Registered model identity reference: face, hair, skin tone, and likeness.
2. Registered model identity reference: face, hair, skin tone, and likeness.
3. Registered model identity reference: face, hair, skin tone, and likeness.
4. Exact source first frame from Instagram reel {{source_reel_shortcode}}: body, clothing, background, framing, lighting, camera angle, pose, and visible text reference.

Rules:
- Replace only the person identity with {{model_display_name}}.
- Preserve the exact pose, body angle, hand position, camera angle, crop, and composition from image 4.
- Preserve the clothing, background, lighting, visible objects, and on-screen text from image 4.
- Do not remove, rewrite, blur, translate, or reposition any text.
- Use the hair colour, hair style, skin tone, and facial likeness from images 1-3.
- Do not add tattoos, logos, jewellery, props, people, or extra text.
- Output must be a vertical 9:16 image suitable as the starting frame for motion-control video.
{{run_instruction_block}}
```

### Current video prompt baseline

```text
Animate the supplied generated character image using the source Instagram video as motion control.

Rules:
- Preserve the generated character identity exactly.
- Follow the source video movement, timing, framing, camera motion, and body motion.
- Keep the original audio.
- Preserve visible text exactly; do not remove, rewrite, blur, translate, or reposition it.
- Keep the outfit, background, lighting, and composition consistent with the supplied generated image.
- Output must remain vertical 9:16 for the full video.
- Do not introduce new people, objects, logos, or text.
{{run_instruction_block}}
```

## 11. UI Requirements

The UI should feel like an internal operations dashboard, not a landing page.

Required views/panels:

- Provider Operations
- Model Registry
- Source Registry
- Automated Intake
- Source Preview and Selection
- Batch Builder
- Prompt Operations
- Queue Operations
- Run History
- Run Detail
- Exception Center
- Audit Log
- Metrics/Cost Overview

The primary operator path should be:

1. Open dashboard.
2. Confirm providers/storage/database are healthy.
3. Add or choose a model.
4. Pull candidate reels.
5. Watch previews.
6. Select source reels.
7. Select model identities.
8. Queue batch.
9. Monitor progress.
10. Review outputs/exceptions.

## 12. Non-Goals For The First Build

Do not spend the first build on:

- Public SaaS/multi-tenant billing.
- Automatic posting to Instagram/TikTok.
- A marketing site.
- Manual-only upload workflows as the primary path.
- Non-WaveSpeed generation providers.
- Overcomplicated approval workflows.
- Mobile-first consumer UX.
- A custom media editor.

Manual upload/debug tools are acceptable only as support features.

## 13. Success Criteria

The project is successful when:

- A non-technical operator can create model identities and source accounts from the UI.
- The system can pull real source reels through Apify.
- Source videos can be previewed before generation.
- A selected source reel and selected model can be queued without manual file handling.
- The image stage uses model refs plus the exact source first frame.
- The generated image becomes the input to video generation.
- The final video is vertical 9:16.
- Failures are visible and retryable.
- Every artifact is stored in R2.
- Every run has a complete audit trail.
- The same pipeline can process batches across multiple selected source clips and multiple selected models.

## 14. Open Questions To Confirm Before Production

These are not assumptions. They are items the developer should confirm with Oliver before production launch if they are not already provided.

1. Which source Instagram handles are approved for day-one intake?
2. Which registered models should be available on day one, and how many reference images does each have?
3. What exact QC threshold should define an acceptable first-frame identity match and final-video quality pass?
4. Where should final outputs be delivered after R2 storage: R2 only, Google Drive, Slack/Telegram notification, or another destination?
5. What daily budget/concurrency cap should be enforced for WaveSpeed?
6. Should operator accounts require full authentication from day one or can local/internal auth be used during early build?


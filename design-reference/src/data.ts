/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Model, SourceAccount, SourceReel, PromptTemplate, SystemException, AuditLog, ProviderStatus, Run } from './types';

// Standard high-quality AI/Instagram style portrait photos for model reference simulation
export const initialModels: Model[] = [
  {
    id: 'm-1',
    name: 'Hazel',
    slug: 'hazel',
    description: 'Lead virtual lifestyle influencer, specializing in high-fashion and urban aesthetics.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300',
    createdAt: '2026-05-15T08:00:00Z',
    faceReferences: [
      {
        id: 'fr-1',
        modelId: 'm-1',
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-15T08:05:00Z'
      },
      {
        id: 'fr-2',
        modelId: 'm-1',
        imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-15T08:06:00Z'
      },
      {
        id: 'fr-3',
        modelId: 'm-1',
        imageUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-15T08:07:00Z'
      }
    ]
  },
  {
    id: 'm-2',
    name: 'Elena Rostova',
    slug: 'elena-rostova',
    description: 'European casual athleisure model, focused on morning routines and fitness aesthetics.',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300&h=300',
    createdAt: '2026-05-20T10:30:00Z',
    faceReferences: [
      {
        id: 'fr-4',
        modelId: 'm-2',
        imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-20T10:32:00Z'
      },
      {
        id: 'fr-5',
        modelId: 'm-2',
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-20T10:33:00Z'
      },
      {
        id: 'fr-6',
        modelId: 'm-2',
        imageUrl: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-20T10:34:00Z'
      }
    ]
  },
  {
    id: 'm-3',
    name: 'Sofia Lopez',
    slug: 'sofia-lopez',
    description: 'Summer travel and swimwear model, tropical environments.',
    avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=300&h=300',
    createdAt: '2026-05-28T14:15:00Z',
    faceReferences: [
      {
        id: 'fr-7',
        modelId: 'm-3',
        imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-28T14:18:00Z'
      },
      {
        id: 'fr-8',
        modelId: 'm-3',
        imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-28T14:19:00Z'
      },
      {
        id: 'fr-9',
        modelId: 'm-3',
        imageUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600&h=800',
        dimensions: '1080x1440',
        status: 'active',
        createdAt: '2026-05-28T14:20:00Z'
      }
    ]
  }
];

// 17 approved Instagram handles from ig.txt
export const initialSourceAccounts: SourceAccount[] = [
  { id: 'sa-1', handle: 'mariedeeonline', url: 'https://instagram.com/mariedeeonline/reels/', isActive: true, lastScrapedAt: '2026-06-09T08:12:00Z', status: 'idle', reelsCount: 6 },
  { id: 'sa-2', handle: 'vaniafernandes', url: 'https://instagram.com/vaniafernandes/reels/', isActive: true, lastScrapedAt: '2026-06-09T07:44:00Z', status: 'idle', reelsCount: 4 },
  { id: 'sa-3', handle: 'ab61e', url: 'https://instagram.com/ab61e/reels/', isActive: true, lastScrapedAt: '2026-06-09T06:10:00Z', status: 'idle', reelsCount: 3 },
  { id: 'sa-4', handle: 'lillyfunasia', url: 'https://instagram.com/lillyfunasia/reels/', isActive: true, lastScrapedAt: '2026-06-08T22:30:00Z', status: 'idle', reelsCount: 5 },
  { id: 'sa-5', handle: 'mimisskate', url: 'https://instagram.com/mimisskate/reels/', isActive: false, lastScrapedAt: '2026-06-07T14:15:00Z', status: 'idle', reelsCount: 2 },
  { id: 'sa-6', handle: 'penelopebarbiegirl', url: 'https://instagram.com/penelopebarbiegirl/reels/', isActive: true, lastScrapedAt: '2026-06-09T05:22:00Z', status: 'idle', reelsCount: 4 },
  { id: 'sa-7', handle: 'daisymaylilly', url: 'https://instagram.com/daisymaylilly/reels/', isActive: true, lastScrapedAt: '2026-06-09T04:10:00Z', status: 'idle', reelsCount: 3 },
  { id: 'sa-8', handle: 'vanessavioletxoxo', url: 'https://instagram.com/vanessavioletxoxo/reels/', isActive: true, lastScrapedAt: '2026-06-09T01:14:00Z', status: 'idle', reelsCount: 5 },
  { id: 'sa-9', handle: 'lillybunsxo', url: 'https://instagram.com/lillybunsxo/reels/', isActive: true, lastScrapedAt: '2026-06-08T23:45:00Z', status: 'idle', reelsCount: 3 },
  { id: 'sa-10', handle: 'itsemilyblack', url: 'https://instagram.com/itsemilyblack/reels/', isActive: true, lastScrapedAt: '2026-06-09T09:02:00Z', status: 'idle', reelsCount: 7 },
  { id: 'sa-11', handle: 'theskimaskgirl', url: 'https://instagram.com/theskimaskgirl/reels/', isActive: true, lastScrapedAt: '2026-06-09T08:50:00Z', status: 'idle', reelsCount: 4 },
  { id: 'sa-12', handle: 'mckinleyrichardson', url: 'https://instagram.com/mckinleyrichardson/reels/', isActive: true, lastScrapedAt: '2026-06-09T03:30:00Z', status: 'idle', reelsCount: 6 },
  { id: 'sa-13', handle: 'mollybcollinsx', url: 'https://instagram.com/mollybcollinsx/reels/', isActive: false, lastScrapedAt: 'Never', status: 'idle', reelsCount: 0 },
  { id: 'sa-14', handle: 'realcamillaara', url: 'https://instagram.com/realcamillaara/reels/', isActive: true, lastScrapedAt: '2026-06-09T02:11:00Z', status: 'idle', reelsCount: 4 },
  { id: 'sa-15', handle: 'chelseagisele_', url: 'https://instagram.com/chelseagisele_/reels/', isActive: true, lastScrapedAt: '2026-06-08T18:24:00Z', status: 'idle', reelsCount: 5 },
  { id: 'sa-16', handle: 'txreemarie', url: 'https://instagram.com/txreemarie/reels/', isActive: true, lastScrapedAt: '2026-06-09T08:00:00Z', status: 'idle', reelsCount: 3 },
  { id: 'sa-17', handle: 'xxandieellexx', url: 'https://instagram.com/xxandieellexx/reels/', isActive: false, lastScrapedAt: 'Never', status: 'idle', reelsCount: 0 }
];

// Sample source reels loaded into R2 for selection preview
export const initialSourceReels: SourceReel[] = [
  {
    id: 'r-1',
    accountId: 'sa-1',
    accountHandle: 'mariedeeonline',
    shortcode: 'C-vX8vOJy5L',
    title: 'Marie Dee Office Walkthrough',
    caption: 'Going to the conference room in my favorite fall trousers 🍁 #officefashion #outfitideas',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-walking-in-a-hallway-40156-large.mp4',
    firstFrameUrl: 'https://images.unsplash.com/photo-1481824429379-07aa5e5b0739?auto=format&fit=crop&q=80&w=600&h=1067',
    duration: 12,
    viewsCount: 145200,
    isSelected: true,
    status: 'selected',
    createdAt: '2026-06-09T08:12:00Z'
  },
  {
    id: 'r-2',
    accountId: 'sa-1',
    accountHandle: 'mariedeeonline',
    shortcode: 'C_f92xLAa92',
    title: 'Desk setup check-in',
    caption: 'A clean desk = a clean mind. Rate my setup 🖥️ #desksetup #copylife #workhard',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-working-at-a-stylish-table-40157-large.mp4',
    firstFrameUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=600&h=1067',
    duration: 9,
    viewsCount: 89400,
    isSelected: false,
    status: 'pending',
    createdAt: '2026-06-09T08:12:00Z'
  },
  {
    id: 'r-3',
    accountId: 'sa-2',
    accountHandle: 'vaniafernandes',
    shortcode: 'D9Yx7B1p_vA',
    title: 'Vania Retro Diner Outfit',
    caption: 'Styling these retro high-waist jeans for brunch! What do we think? 🍔🍒 #vintagefashion #retrostyle #summerlook',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-in-retro-clothes-standing-in-front-of-diner-41908-large.mp4',
    firstFrameUrl: 'https://images.unsplash.com/photo-1616150638538-ffb0679a3fc4?auto=format&fit=crop&q=80&w=600&h=1067',
    duration: 15,
    viewsCount: 211000,
    isSelected: true,
    status: 'selected',
    createdAt: '2026-06-09T07:44:00Z'
  },
  {
    id: 'r-4',
    accountId: 'sa-2',
    accountHandle: 'vaniafernandes',
    shortcode: 'D6KlPyXv01z',
    title: 'Evening Sunset Walk',
    caption: 'Chambery golden hour hits different 🌅✨ #goldenhour #summerdresses #naturewalk',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-running-in-the-countryside-41911-large.mp4',
    firstFrameUrl: 'https://images.unsplash.com/photo-1498843053639-170ff2122f35?auto=format&fit=crop&q=80&w=600&h=1067',
    duration: 8,
    viewsCount: 64200,
    isSelected: false,
    status: 'pending',
    createdAt: '2026-06-09T07:44:00Z'
  },
  {
    id: 'r-5',
    accountId: 'sa-4',
    accountHandle: 'lillyfunasia',
    shortcode: 'C_nS7xYyX82',
    title: 'Lilly Coffee Run Athletic Look',
    caption: 'Quick athleisure styling for the ultimate lazy coffee runs ☕👟 #casualfits #comfylook #streetstyle',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-with-take-away-coffee-walking-around-outdoor-41315-large.mp4',
    firstFrameUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600&h=1067',
    duration: 14,
    viewsCount: 345000,
    isSelected: true,
    status: 'selected',
    createdAt: '2026-06-08T22:30:00Z'
  },
  {
    id: 'r-6',
    accountId: 'sa-10',
    accountHandle: 'itsemilyblack',
    shortcode: 'C_wW9vPq02k',
    title: 'Emily Neon Streetwear',
    caption: 'Neon details are making a comeback. Yes or No? ⚡🖤 #neonlook #cyberpunktheme #fitcheck',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-beautiful-woman-with-neon-lights-in-rainy-night-34448-large.mp4',
    firstFrameUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&q=80&w=600&h=1067',
    duration: 11,
    viewsCount: 412000,
    isSelected: false,
    status: 'pending',
    createdAt: '2026-06-09T09:02:00Z'
  },
  {
    id: 'r-7',
    accountId: 'sa-11',
    accountHandle: 'theskimaskgirl',
    shortcode: 'D_mP9pWxxY1',
    title: 'Ski Mask Girl Leather Outfit',
    caption: 'Challenging conventional style boundaries today 🧥🕶️ #leatherjacket #mysterioustheme #darkfashion',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashionable-woman-posing-with-shadows-and-goggles-42663-large.mp4',
    firstFrameUrl: 'https://images.unsplash.com/photo-1542272201-b1cae67414cc?auto=format&fit=crop&q=80&w=600&h=1067',
    duration: 13,
    viewsCount: 512000,
    isSelected: false,
    status: 'pending',
    createdAt: '2026-06-09T08:50:00Z'
  }
];

// Implemented default Prompts with correct variable placeholders
export const initialPromptTemplates: PromptTemplate[] = [
  {
    id: 'p-1',
    name: 'High-Fidelity Outfit Preserving Face Swap (Image)',
    version: '1.2.0',
    type: 'image',
    template: 'Generate a model-preserving high resolution portrait photo of the virtual influencer model model_display_name (whose likeness is defined by the provided references), completely matching the pose, outfit, structural background, and perspective composition of the provided source frame source_reel_shortcode. Maintain the exact clothing, fabric lines, lighting conditions, and environment details. Modify only the facial features, skin tone, hair color/style, and structural identity markers to look exactly like the target model model_display_name.',
    isActive: true,
    variables: ['model_display_name', 'source_reel_shortcode'],
    createdAt: '2026-06-01T12:00:00Z'
  },
  {
    id: 'p-2',
    name: 'WaveSpeed Kling Motion Control Orchestrator (Video)',
    version: '3.1.5',
    type: 'video',
    template: 'Using WaveSpeed Kling v3 Standard, animate the custom model-preserving start frame to perfectly replicate the dynamic actions, walks, and micro-movements of the original source video source_reel_shortcode. Respect the outfit drape, motion velocity curves, natural hair physics, and camera zoom tracks. Maintain consistent facial fidelity for model_display_name across the entire timeline without sliding, structural distortion, or artifacting.',
    isActive: true,
    variables: ['model_display_name', 'source_reel_shortcode'],
    createdAt: '2026-06-01T12:05:00Z'
  }
];

// Seed Exceptions for simulated center view
export const initialExceptions: SystemException[] = [
  {
    id: 'exc-1',
    runId: 'run-998',
    runDetails: 'Model: Sofia Lopez | Reel: C_wW9vPq02k',
    stage: 'image_qc',
    code: 'LOW_FACE_SIMILARITY',
    message: 'Face resemblance score returned 0.67 (threshold is 0.85). Visual analysis shows facial features blend between Sofia Lopez and Emily Black.',
    state: 'open',
    createdAt: '2026-06-09T08:33:00Z'
  },
  {
    id: 'exc-2',
    runId: 'run-999',
    runDetails: 'Model: Hazel | Reel: D_mP9pWxxY1',
    stage: 'video_qc',
    code: 'TEMPORAL_FLICKERING',
    message: 'Kling v3 renders detected high levels of temporal noise / structural warping on frames 120-145 around the jacket seams.',
    state: 'open',
    createdAt: '2026-06-09T09:10:00Z'
  }
];

// Core audit trail logs
export const initialAuditLogs: AuditLog[] = [
  { id: 'al-1', action: 'MODEL_REGISTERED', details: 'Added new model Hazel with 3 face references uploaded to R2.', operator: 'hassankirwa47@gmail.com', createdAt: '2026-06-09T07:15:00Z' },
  { id: 'al-2', action: 'APIFY_SCRAPE_TRIGGERED', details: 'Manual scrape for handles @mariedeeonline and @vaniafernandes completed successfully.', operator: 'hassankirwa47@gmail.com', createdAt: '2026-06-09T07:44:00Z' },
  { id: 'al-3', action: 'PROMPT_VERSION_ACTIVATED', details: 'Image Prompt template "High-Fidelity Outfit Preserving Face Swap" updated to v1.2.0.', operator: 'hassankirwa47@gmail.com', createdAt: '2026-06-09T08:00:00Z' },
  { id: 'al-4', action: 'EXCEPTION_DISMISSED', details: 'Exception exc-002 on run-912 dismissed. Output evaluated as acceptable by quality supervisor.', operator: 'hassankirwa47@gmail.com', createdAt: '2026-06-09T08:30:00Z' }
];

// Active Provider status gauges
export const initialProviders: ProviderStatus[] = [
  { name: 'Nano Banana Pro', type: 'image', provider: 'google/nano-banana-pro/edit-multi', status: 'active', latency: 4500, costPerRun: 0.15 },
  { name: 'Flux Kontext Max', type: 'image', provider: 'wavespeed-ai/flux-kontext-max/multi', status: 'active', latency: 6200, costPerRun: 0.35 },
  { name: 'Seedream v4.5', type: 'image', provider: 'bytedance/seedream-v4.5/edit', status: 'active', latency: 8500, costPerRun: 0.50 },
  { name: 'Kling v3 Standard', type: 'video', provider: 'kwaivgi/kling-v3.0-std/motion-control', status: 'active', latency: 18200, costPerRun: 1.20 },
  { name: 'Apify Instagram Intake', type: 'intake', provider: 'apify~instagram-reel-scraper', status: 'active', latency: 12000, costPerRun: 0.05 },
  { name: 'Cloudflare R2 Bucket', type: 'storage', provider: 'amve-assets', status: 'active', latency: 120, costPerRun: 0.001 },
  { name: 'PostgreSQL Database', type: 'database', provider: 'railway-db', status: 'active', latency: 45, costPerRun: 0.00 }
];

// Past Completed Dashboard Runs for reference
export const initialRuns: Run[] = [
  {
    id: 'run-101',
    batchId: 'b-52',
    batchName: 'Batch_04_H_Marie_Dee',
    modelId: 'm-1',
    modelName: 'Hazel',
    modelSlug: 'hazel',
    reelId: 'r-1',
    reelShortcode: 'C-vX8vOJy5L',
    reelTitle: 'Marie Dee Office Walkthrough',
    reelVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-walking-in-a-hallway-40156-large.mp4',
    reelFirstFrameUrl: 'https://images.unsplash.com/photo-1481824429379-07aa5e5b0739?auto=format&fit=crop&q=80&w=600&h=1067',
    imagePromptVersionIdString: 'p-1 (v1.2.0)',
    videoPromptVersionIdString: 'p-2 (v3.1.5)',
    state: 'delivered',
    cost: 1.40,
    imageCandidateUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=1067',
    videoRenderUrl: 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-running-in-the-countryside-41911-large.mp4', // Simulating output video
    createdAt: '2026-06-09T08:15:00Z',
    finishedAt: '2026-06-09T08:16:30Z',
    stages: [
      { stage: 'queued', status: 'completed', message: 'Triggered from Batch Builder.' },
      { stage: 'image_gen', status: 'completed', message: 'Successfully generated using Nano Banana Pro.' },
      { stage: 'image_qc', status: 'completed', message: 'Passed. 9:16 aspect confirmation. Identity score: 0.92.' },
      { stage: 'video_gen', status: 'completed', message: 'Successfully rendered by WaveSpeed Kling v3 Standard.' },
      { stage: 'video_qc', status: 'completed', message: 'Passed. Duration matches source. Aspect check passed.' },
      { stage: 'delivered', status: 'completed', message: 'Saved to Cloudflare R2 bucket: amve-assets/delivered/C-vX8vOJy5L_hazel.mp4' }
    ]
  },
  {
    id: 'run-102',
    batchId: 'b-52',
    batchName: 'Batch_04_H_Marie_Dee',
    modelId: 'm-2',
    modelName: 'Elena Rostova',
    modelSlug: 'elena-rostova',
    reelId: 'r-1',
    reelShortcode: 'C-vX8vOJy5L',
    reelTitle: 'Marie Dee Office Walkthrough',
    reelVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-walking-in-a-hallway-40156-large.mp4',
    reelFirstFrameUrl: 'https://images.unsplash.com/photo-1481824429379-07aa5e5b0739?auto=format&fit=crop&q=80&w=600&h=1067',
    imagePromptVersionIdString: 'p-1 (v1.2.0)',
    videoPromptVersionIdString: 'p-2 (v3.1.5)',
    state: 'delivered',
    cost: 1.60,
    imageCandidateUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600&h=1067',
    videoRenderUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-walking-in-a-hallway-40156-large.mp4',
    createdAt: '2026-06-09T08:15:10Z',
    finishedAt: '2026-06-09T08:17:15Z',
    stages: [
      { stage: 'queued', status: 'completed', message: 'Triggered from Batch Builder.' },
      { stage: 'image_gen', status: 'completed', message: 'Fallback Nano Banana failed with timeout (504). Succeeded using Flux Kontext Max fallback chain.' },
      { stage: 'image_qc', status: 'completed', message: 'Passed. Identity resemblance: 0.88.' },
      { stage: 'video_gen', status: 'completed', message: 'Rendered successfully by Kling v3 Standard.' },
      { stage: 'video_qc', status: 'completed', message: 'Passed. Visual consistency score: 0.91.' },
      { stage: 'delivered', status: 'completed', message: 'Delivered to R2 storage.' }
    ]
  }
];

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Model {
  id: string;
  name: string;
  slug: string;
  description: string;
  avatarUrl: string;
  createdAt: string;
  faceReferences: FaceReference[];
}

export interface FaceReference {
  id: string;
  modelId: string;
  imageUrl: string;
  dimensions: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface SourceAccount {
  id: string;
  handle: string;
  url: string;
  isActive: boolean;
  lastScrapedAt: string;
  status: 'idle' | 'scraping' | 'failed';
  reelsCount: number;
}

export interface SourceReel {
  id: string;
  accountId: string;
  accountHandle: string;
  shortcode: string;
  title: string;
  caption: string;
  videoUrl: string;
  firstFrameUrl: string;
  duration: number; // seconds
  viewsCount: number;
  isSelected: boolean;
  status: 'pending' | 'selected' | 'archived';
  createdAt: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  version: string;
  type: 'image' | 'video';
  template: string;
  isActive: boolean;
  variables: string[];
  createdAt: string;
}

export interface Batch {
  id: string;
  name: string;
  runCount: number;
  estimatedCost: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'failed';
  createdAt: string;
}

export type RunState =
  | 'queued'
  | 'image_gen'
  | 'image_qc'
  | 'video_gen'
  | 'video_qc'
  | 'delivered'
  | 'failed';

export interface RunStageLog {
  stage: RunState;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  finishedAt?: string;
  message?: string;
}

export interface Run {
  id: string;
  batchId?: string;
  batchName?: string;
  modelId: string;
  modelName: string;
  modelSlug: string;
  reelId: string;
  reelShortcode: string;
  reelTitle: string;
  reelVideoUrl: string;
  reelFirstFrameUrl: string;
  imagePromptVersionIdString: string;
  videoPromptVersionIdString: string;
  state: RunState;
  cost: number;
  errorMsg?: string;
  stages: RunStageLog[];
  imageCandidateUrl?: string;
  videoRenderUrl?: string;
  createdAt: string;
  finishedAt?: string;
}

export interface SystemException {
  id: string;
  runId: string;
  runDetails: string;
  stage: RunState;
  code: string;
  message: string;
  state: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  details: string;
  operator: string;
  createdAt: string;
}

export interface ProviderStatus {
  name: string;
  type: 'image' | 'video' | 'intake' | 'storage' | 'database';
  provider: string; // "WaveSpeed Nano Banana Pro", "WaveSpeed Kling v3 Standard", "Apify", "Cloudflare R2"
  status: 'active' | 'degraded' | 'disabled' | 'offline';
  latency: number; // ms
  costPerRun: number;
}

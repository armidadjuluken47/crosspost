/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Layers,
  Users,
  Instagram,
  DollarSign,
  Play,
  Check,
  AlertTriangle,
  Lock,
  ArrowRight,
  Info
} from 'lucide-react';
import { Model, SourceReel, Run, RunState } from '../types';

interface BatchBuilderProps {
  models: Model[];
  reels: SourceReel[];
  setReels: (reels: SourceReel[]) => void;
  onDispatchBatch: (runs: Run[]) => void;
  setActiveTab: (tab: string) => void;
  onAddAuditLog: (action: string, details: string) => void;
}

export default function BatchBuilder({
  models,
  reels,
  setReels,
  onDispatchBatch,
  setActiveTab,
  onAddAuditLog
}: BatchBuilderProps) {
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const selectedReels = reels.filter(r => r.status === 'selected');

  // Multi-select helpers
  const toggleModelId = (id: string, meetingRefs: boolean) => {
    if (!meetingRefs) return; // locked
    if (selectedModelIds.includes(id)) {
      setSelectedModelIds(selectedModelIds.filter(mId => mId !== id));
    } else {
      setSelectedModelIds([...selectedModelIds, id]);
    }
  };

  const handleSelectAllModels = () => {
    // Select all that meet reference count >= 3
    const meetCriteriaIds = models
      .filter(m => m.faceReferences.length >= 3)
      .map(m => m.id);
    
    if (selectedModelIds.length === meetCriteriaIds.length) {
      setSelectedModelIds([]);
    } else {
      setSelectedModelIds(meetCriteriaIds);
    }
  };

  const handleCreateBatch = () => {
    if (selectedModelIds.length === 0 || selectedReels.length === 0) return;

    const newRuns: Run[] = [];
    const batchName = `Batch_${Math.random().toString(36).substring(2, 6).toUpperCase()}_${new Date().toLocaleDateString().replace(/\//g, '-')}`;

    selectedModelIds.forEach((mId) => {
      const model = models.find(m => m.id === mId)!;
      selectedReels.forEach((reel) => {
        const runId = `run-${Math.floor(100 + Math.random() * 900)}`;
        
        // Setup incremental stages log matching run lifetime
        const stages = [
          { stage: 'queued' as RunState, status: 'running' as const, message: 'Constructed. Placed in Postgres jobs queue.' },
          { stage: 'image_gen' as RunState, status: 'pending' as const, message: 'Awaiting first-frame model-preserving pass.' },
          { stage: 'image_qc' as RunState, status: 'pending' as const, message: 'Pending aspect ratios and fidelity audits.' },
          { stage: 'video_gen' as RunState, status: 'pending' as const, message: 'Awaiting Kling v3 temporal animation render.' },
          { stage: 'video_qc' as RunState, status: 'pending' as const, message: 'Pending video playability/duration check.' },
          { stage: 'delivered' as RunState, status: 'pending' as const, message: 'Pending Cloudflare R2 object deliver.' }
        ];

        newRuns.push({
          id: runId,
          batchId: `b-${Date.now().toString().slice(-4)}`,
          batchName,
          modelId: model.id,
          modelName: model.name,
          modelSlug: model.slug,
          reelId: reel.id,
          reelShortcode: reel.shortcode,
          reelTitle: reel.title,
          reelVideoUrl: reel.videoUrl,
          reelFirstFrameUrl: reel.firstFrameUrl,
          imagePromptVersionIdString: 'p-1 (v1.2.0)',
          videoPromptVersionIdString: 'p-2 (v3.1.5)',
          state: 'queued',
          cost: 1.40, // Base standard forecast per run
          stages,
          createdAt: new Date().toISOString()
        });
      });
    });

    onDispatchBatch(newRuns);
    onAddAuditLog('BATCH_CREATED', `Dispatched batch matrix "${batchName}" containing ${newRuns.length} runs (${selectedModelIds.length} models × ${selectedReels.length} reels).`);

    // Reset selected reels states
    setReels(reels.map(r => r.status === 'selected' ? { ...r, status: 'pending', isSelected: false } : r));
    setSelectedModelIds([]);
    setActiveTab('queue'); // navigate to runs list
  };

  // Calculations
  const numModels = selectedModelIds.length;
  const numReels = selectedReels.length;
  const numRuns = numModels * numReels;
  const estimatedCost = numRuns * 1.55; // standard average aggregate pricing
  return (
    <div id="batch-builder-tab" className="p-8 space-y-8 flex-1 overflow-y-auto">
      
      {/* Title */}
      <div>
        <h2 className="font-display font-medium text-lg text-[#FAF7F2] uppercase tracking-wide">Factory Batch Constructor</h2>
        <p className="text-xs text-[#8C7D6C] font-sans mt-1">Define cross-combinations of model visual identities and Instagram content reels to run simultaneously.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Step 1: Model Selection (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-creatr-border pb-3">
            <div className="flex items-center space-x-2.5">
              <Users className="w-4.5 h-4.5 text-creatr-pink" />
              <span className="text-xs font-mono font-bold text-[#FAF7F2] uppercase tracking-wider">Step 1: Choose Model Identities ({models.length})</span>
            </div>
            <button
              id="btn-batch-select-all-models"
              type="button"
              onClick={handleSelectAllModels}
              className="text-[10px] font-mono text-creatr-pink hover:underline font-bold uppercase cursor-pointer"
            >
              Toggle Verified
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {models.map((m) => {
              const refCount = m.faceReferences.length;
              const meetsCriteria = refCount >= 3;
              const selected = selectedModelIds.includes(m.id);

              return (
                <div
                  id={`batch-model-${m.slug}`}
                  key={m.id}
                  onClick={() => toggleModelId(m.id, meetsCriteria)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between select-none ${
                    !meetsCriteria
                      ? 'bg-[#120F0D]/40 border-creatr-border/40 opacity-40 cursor-not-allowed'
                      : selected
                      ? 'bg-[#1D1714] border-creatr-pink/50 ring-1 ring-creatr-pink/20 cursor-pointer shadow-md'
                      : 'bg-[#120F0D] border-creatr-border hover:bg-[#1E1916]/50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 truncate mr-2">
                    <img
                      referrerPolicy="no-referrer"
                      src={m.avatarUrl}
                      alt={m.name}
                      className="w-10 h-10 rounded-xl object-cover border border-creatr-border"
                    />
                    <div className="truncate">
                      <div className="text-xs font-sans font-bold text-[#FAF7F2] leading-tight">{m.name}</div>
                      <span className="text-[10px] font-mono text-[#8C7D6C] font-semibold">@{m.slug}</span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {meetsCriteria ? (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                        selected
                          ? 'bg-creatr-pink border-creatr-pink'
                          : 'bg-transparent border-creatr-border'
                      }`}>
                        {selected && <Check className="w-3 h-3 text-[#0C0A09] stroke-[3]" />}
                      </div>
                    ) : (
                      <Lock className="w-4 h-4 text-neutral-600" title="Locked: Upload min 3 references" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Reels Selected (2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-creatr-border pb-3">
            <div className="flex items-center space-x-2.5">
              <Instagram className="w-4.5 h-4.5 text-creatr-pink" />
              <span className="text-xs font-mono font-bold text-[#FAF7F2] uppercase tracking-wider">Step 2: Selected Source Reels ({selectedReels.length})</span>
            </div>
            {selectedReels.length === 0 && (
              <span className="text-[10px] font-mono text-amber-500 font-bold uppercase">Needs input reels</span>
            )}
          </div>

          {selectedReels.length === 0 ? (
            <div className="p-8 border border-dashed border-creatr-border rounded-2xl text-center bg-[#120F0D]/20 space-y-2">
              <Info className="w-5 h-5 text-[#8C7D6C] mx-auto" />
              <span className="text-xs text-[#C7BDB3] font-sans block font-semibold uppercase tracking-wider">No source reels currently selected</span>
              <p className="text-[10.5px] text-[#8C7D6C] max-w-xs mx-auto leading-relaxed">
                Navigate to <b>Instagram Ingestion</b> first, view reels, and toggle <b>Select for Batch</b> on candidate items.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('sources')}
                className="mt-2 text-xs font-mono text-creatr-pink underline hover:text-[#FAF7F2] font-bold cursor-pointer"
              >
                Go to Ingest Queue →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1">
              {selectedReels.map((r) => (
                <div key={r.id} className="p-2 bg-[#120F0D] border border-creatr-border rounded-xl flex items-center space-x-2.5 truncate">
                  <img
                    referrerPolicy="no-referrer"
                    src={r.firstFrameUrl}
                    className="w-8 h-10 object-cover rounded border border-creatr-border"
                    alt="Poster frame"
                  />
                  <div className="truncate">
                    <span className="text-[10px] font-mono font-bold text-[#C7BDB3] block">@{r.accountHandle}</span>
                    <span className="text-[9px] font-mono text-[#8C7D6C] font-semibold">{r.shortcode}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calculator Summarizations panel (Full span: 4 columns) */}
        <div className="lg:col-span-4 bg-[#120F0D] border border-creatr-border p-6 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-md">
          <div className="space-y-4 max-w-xl">
            <h3 className="font-display font-bold text-[10px] text-[#8C7D6C] uppercase tracking-widest leading-none">Multiplex Cost & Compute Forecast</h3>
            
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-1.5">
              <div>
                <span className="text-[10px] font-mono text-[#8C7D6C] block uppercase font-bold">Multiplier</span>
                <span className="text-lg font-mono font-bold text-[#FAF7F2]">{numReels} reels × {numModels} models</span>
              </div>
              
              <div className="hidden md:block">
                <ArrowRight className="w-5 h-5 text-creatr-border" />
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#8C7D6C] block uppercase font-bold">Total Executions</span>
                <span className="text-lg font-mono font-bold text-creatr-pink">{numRuns} generation runs</span>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#8C7D6C] block uppercase font-bold">Total Est. Cost</span>
                <span className="text-lg font-mono font-bold text-[#FAF7F2]">${estimatedCost.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[10.5px] text-[#8C7D6C] leading-relaxed font-sans pt-1">
              Estimated costs include 1st-frame Nano Banana Pro generation ($0.15) or Flux fallbacks, 9:16 aspect resize overhead, WaveSpeed Kling v3 Standard animation ($1.20), storage, and R2 metadata operations.
            </p>
          </div>

          <div className="shrink-0 self-start md:self-auto pt-2 sm:pt-0">
            <button
              id="btn-dispatch-batch"
              disabled={numRuns === 0}
              onClick={handleCreateBatch}
              className="px-6 py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-extrabold uppercase tracking-wider text-[#0C0A09] transition-all flex items-center space-x-2.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#0C0A09] fill-current" />
              <span>Deploy Batch queue</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

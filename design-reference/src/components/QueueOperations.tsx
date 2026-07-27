/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Video,
  Layers,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCw,
  Search,
  SlidersHorizontal,
  FileText,
  Terminal,
  Play,
  Check,
  Zap,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { Run, RunState } from '../types';

interface QueueOperationsProps {
  runs: Run[];
  setRuns: (runs: Run[]) => void;
  onSimulateQueueProcess: () => void;
  activeQueueCount: number;
  onAddAuditLog: (action: string, details: string) => void;
  onInjectException: (runId: string, runDetails: string, stage: RunState, code: string, message: string) => void;
}

export default function QueueOperations({
  runs,
  setRuns,
  onSimulateQueueProcess,
  activeQueueCount,
  onAddAuditLog,
  onInjectException
}: QueueOperationsProps) {
  const [selectedRun, setSelectedRun] = useState<Run | null>(runs[0] || null);
  const [activeFilerState, setActiveFilterState] = useState<string>('all');
  const [runSearchQuery, setRunSearchQuery] = useState('');

  const filteredRuns = runs.filter(r => {
    const matchSearch =
      r.modelName.toLowerCase().includes(runSearchQuery.toLowerCase()) ||
      r.reelShortcode.toLowerCase().includes(runSearchQuery.toLowerCase()) ||
      (r.batchName && r.batchName.toLowerCase().includes(runSearchQuery.toLowerCase()));

    const matchState =
      activeFilerState === 'all'
        ? true
        : activeFilerState === 'active'
        ? r.state !== 'delivered' && r.state !== 'failed'
        : activeFilerState === 'delivered'
        ? r.state === 'delivered'
        : r.state === 'failed';

    return matchSearch && matchState;
  });

  const getStatusStyle = (state: RunState) => {
    switch (state) {
      case 'delivered':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold';
      case 'queued':
        return 'bg-slate-900 text-slate-400 border border-slate-800';
      default:
        return 'bg-creatr-pink/10 text-creatr-pink border border-creatr-pink/20 animate-pulse';
    }
  };

  const retryFailedRun = (run: Run) => {
    onAddAuditLog('RUN_RETRY', `Operator triggered retry on run ${run.id}. Resetting queue state.`);
    
    const resetStages = run.stages.map(s => {
      if (s.stage === 'queued') {
        return { ...s, status: 'running' as const, message: 'Operator retried. Re-placed in priority jobs pool.' };
      }
      return { ...s, status: 'pending' as const, message: `Pending retry processing.` };
    });

    const updated = runs.map(r => {
      if (r.id === run.id) {
        return {
          ...r,
          state: 'queued' as RunState,
          errorMsg: undefined,
          stages: resetStages
        };
      }
      return r;
    });

    setRuns(updated);
    
    // Auto sync selected run representation
    const fresh = updated.find(r => r.id === run.id)!;
    setSelectedRun(fresh);
  };

  return (
    <div id="queue-runs-tab" className="p-8 flex-1 flex flex-col lg:flex-row gap-8 lg:h-screen lg:max-h-screen lg:overflow-hidden overflow-y-auto">
      
      {/* Run Grid List (Left side - takes 3/5 width) */}
      <div className="w-full lg:w-3/5 flex flex-col space-y-5 h-full overflow-hidden shrink-0 lg:pb-16">
        
        {/* Title and stats Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
          <div>
            <h2 className="font-display font-medium text-lg text-[#FAF7F2] uppercase tracking-wide">Jobs Queue & Execution Ledger</h2>
            <p className="text-xs text-[#8C7D6C] font-sans mt-1">Real-time status tracking across combination matrix stages.</p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            {activeQueueCount > 0 && (
              <button
                id="btn-process-queue"
                onClick={onSimulateQueueProcess}
                className="flex items-center space-x-2 px-4 py-2 bg-[#121B15] border border-emerald-500/20 text-emerald-400 hover:bg-[#1A261E] rounded-full text-xs font-bold font-mono uppercase transition-all cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Process Active Jobs</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters control Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 bg-[#120F0D] p-3 rounded-2xl border border-creatr-border">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8C7D6C]" />
            <input
              id="search-runs-input"
              type="text"
              placeholder="Search by model, shortcode, or batch..."
              value={runSearchQuery}
              onChange={(e) => setRunSearchQuery(e.target.value)}
              className="bg-[#171412] border border-creatr-border text-[#FAF7F2] placeholder-[#8C7D6C]/50 rounded-xl text-xs pl-9 pr-3 py-2 w-full focus:outline-none focus:border-creatr-pink/40"
            />
          </div>

          <div className="flex items-center space-x-1.5 self-start sm:self-auto">
            {['all', 'active', 'delivered', 'failed'].map((f) => (
              <button
                id={`run-filter-${f}`}
                key={f}
                onClick={() => setActiveFilterState(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase border tracking-wider transition-all select-none cursor-pointer ${
                  activeFilerState === f
                    ? 'bg-creatr-pink text-[#0C0A09] border-[#f487b7] font-bold'
                    : 'text-[#8C7D6C] hover:text-[#FAF7F2] border-transparent bg-transparent'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Scroll List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-24 lg:pb-8">
          {filteredRuns.length === 0 ? (
            <div className="p-16 border border-dashed border-creatr-border text-center rounded-2xl bg-[#120F0D]/25">
              <History className="w-7 h-7 text-[#8C7D6C] mx-auto mb-2" />
              <span className="text-xs text-[#8C7D6C] font-sans font-medium">No system runs matching criteria</span>
            </div>
          ) : (
            filteredRuns.map((run) => {
              const isSelected = selectedRun?.id === run.id;
              return (
                <div
                  id={`run-row-${run.id}`}
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group ${
                    isSelected
                      ? 'bg-[#1D1714] border-creatr-pink/50 shadow-lg ring-1 ring-creatr-pink/10'
                      : 'bg-[#120F0D] border-creatr-border/40 hover:bg-[#1E1916]/40 hover:border-creatr-pink/20'
                  }`}
                >
                  <div className="flex items-start space-x-4 mr-2 truncate">
                    <img
                      referrerPolicy="no-referrer"
                      src={run.reelFirstFrameUrl}
                      className="w-8 h-12 object-cover rounded-lg border border-creatr-border transition-transform shrink-0"
                      alt="reel reference frame"
                    />
                    <div className="truncate space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-sans font-bold text-[#FAF7F2]">{run.modelName}</span>
                        <span className="text-[10px] text-[#8C7D6C] font-bold">•</span>
                        <span className="text-[10px] font-mono text-[#C7BDB3]">@{run.modelSlug}</span>
                      </div>
                      <div className="text-[11px] font-sans text-[#C7BDB3] truncate">
                        Reel: <span className="font-bold text-[#FAF7F2]">{run.reelShortcode}</span> — {run.reelTitle}
                      </div>
                      {run.batchName && (
                        <div className="text-[10px] font-mono text-[#8C7D6C] font-semibold">
                          Batch: {run.batchName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end">
                    <div className="text-right sm:block hidden">
                      <span className="text-xs font-mono text-[#FAF7F2] block font-bold">${run.cost.toFixed(2)}</span>
                      <span className="text-[9px] font-mono text-[#8C7D6C] leading-none block font-bold uppercase">Est. Cost</span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase ${getStatusStyle(run.state)}`}>
                      {run.state === 'image_gen' && 'Image Gen'}
                      {run.state === 'image_qc' && 'Image QC'}
                      {run.state === 'video_gen' && 'Video Gen'}
                      {run.state === 'video_qc' && 'Video QC'}
                      {run.state !== 'image_gen' && run.state !== 'image_qc' && run.state !== 'video_gen' && run.state !== 'video_qc' && run.state}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Run Details Side Panel View (Right side - takes 2/5 width) */}
      <div className="w-full lg:w-2/5 lg:border-l border-creatr-border lg:pl-8 h-full flex flex-col overflow-hidden pb-16 lg:pb-0">
        {selectedRun ? (
          <div id="details-panel" className="flex-1 flex flex-col space-y-5 h-full overflow-hidden">
            
            {/* Header Details */}
            <div className="border-b border-creatr-border pb-4 shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#8C7D6C] block font-bold uppercase">Execution Trace Run ID {selectedRun.id}</span>
                <span className="text-[10px] font-mono text-[#8C7D6C] font-bold">{new Date(selectedRun.createdAt).toLocaleTimeString()}</span>
              </div>
              <h3 className="text-xs font-sans font-bold text-[#FAF7F2] tracking-wide leading-tight uppercase">
                {selectedRun.modelName} (identity) × {selectedRun.reelShortcode} (motion source)
              </h3>
              {selectedRun.errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-sans rounded-xl">
                  <b>Fatal Error:</b> {selectedRun.errorMsg}
                </div>
              )}
            </div>

            {/* Scrollable details view */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4">
              
              {/* Stages flow logs */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Workflow State Monitor</span>
                <div className="space-y-4 pt-1">
                  {selectedRun.stages.map((stg, i) => {
                    const isRunningState = selectedRun.state === stg.stage;
                    const isCompletedState =
                      selectedRun.state === 'delivered' ||
                      (selectedRun.state === 'failed' && i < selectedRun.stages.findIndex(s => s.stage === selectedRun.state)) ||
                      (selectedRun.state !== 'failed' && i < selectedRun.stages.findIndex(s => s.stage === selectedRun.state));
                    const isFailedState = selectedRun.state === 'failed' && isRunningState;

                    return (
                      <div id={`stage-node-${stg.stage}`} key={i} className="flex items-start space-x-3.5 relative">
                        {/* Connecting tracking lines */}
                        {i < selectedRun.stages.length - 1 && (
                          <div className={`absolute left-[7px] top-4 w-[1px] h-10 ${
                            isCompletedState ? 'bg-[#f487b7]/40' : 'bg-creatr-border/40'
                          }`} />
                        )}

                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-colors ${
                          isCompletedState
                            ? 'bg-[rgba(244,135,183,1)] border-[rgba(244,135,183,1)] shadow shadow-creatr-pink/40'
                            : isFailedState
                            ? 'bg-rose-500 border-rose-500 animate-pulse'
                            : isRunningState
                            ? 'bg-transparent border-creatr-pink animate-pulse'
                            : 'bg-transparent border-creatr-border'
                        }`}>
                          {isCompletedState && <Check className="w-2.5 h-2.5 text-[#0C0A09] stroke-[3.5]" />}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[11px] font-mono uppercase font-bold ${
                              isRunningState
                                ? 'text-creatr-pink'
                                : isFailedState
                                ? 'text-rose-450'
                                : isCompletedState
                                ? 'text-[#C7BDB3]'
                                : 'text-[#8C7D6C]'
                            }`}>
                              {stg.stage === 'queued' && 'Constructed'}
                              {stg.stage === 'image_gen' && 'WaveSpeed Image Generation'}
                              {stg.stage === 'image_qc' && 'Image QC Verification'}
                              {stg.stage === 'video_gen' && 'Kling Motion Generation'}
                              {stg.stage === 'video_qc' && 'Video QC Verification'}
                              {stg.stage === 'delivered' && 'Delivered to Cloudflare R2'}
                            </span>
                          </div>
                          <p className={`text-[10px] font-sans leading-relaxed ${
                            isRunningState || isFailedState ? 'text-[#FAF7F2]' : 'text-[#8C7D6C]'
                          }`}>
                            {isRunningState && !isFailedState ? 'Executing stage tasks now...' : stg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Renders previews */}
              {(selectedRun.imageCandidateUrl || selectedRun.videoRenderUrl) && (
                <div className="space-y-3 pt-3 border-t border-creatr-border pb-3">
                  <span className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Generated Artifact Assets</span>
                  <div className="grid grid-cols-2 gap-4">
                    {/* First frame portrait candidate */}
                    {selectedRun.imageCandidateUrl && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-[#8C7D6C] block leading-none font-bold uppercase">1st Frame Identity Swap</span>
                        <div className="aspect-[3/4] rounded-xl border border-creatr-border p-1 relative overflow-hidden bg-black">
                          <img
                            referrerPolicy="no-referrer"
                            src={selectedRun.imageCandidateUrl}
                            className="w-full h-full object-cover rounded-lg"
                            alt="portrait swap face"
                          />
                        </div>
                      </div>
                    )}

                    {/* Final video check slider */}
                    {selectedRun.videoRenderUrl && selectedRun.state === 'delivered' && (
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-[#8C7D6C] block leading-none font-bold uppercase">Final Motion Video</span>
                        <div className="aspect-[3/4] rounded-xl border border-creatr-border p-1 relative overflow-hidden bg-black">
                          <video
                            referrerPolicy="no-referrer"
                            src={selectedRun.videoRenderUrl}
                            autoPlay
                            loop
                            muted
                            controls
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Immutable Variable Prompt tracing */}
              <div className="space-y-3 pt-3 border-t border-creatr-border">
                <span className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Active Prompt Payload Trace</span>
                <div className="p-4 bg-[#171412] rounded-xl space-y-2.5 border border-creatr-border font-mono text-[9px] leading-relaxed text-[#C7BDB3]">
                  <div>
                    <span className="text-[#8C7D6C] block font-bold">IMAGE_GEN_PROMPT: {selectedRun.imagePromptVersionIdString}</span>
                    <span className="text-[#C7BDB3] block mt-1 leading-relaxed">
                      "Generate a model-preserving portrait photo of <b className="text-[#FAF7F2] font-bold">{selectedRun.modelName}</b>, matching pose/outfits of <b className="text-[#FAF7F2] font-bold">{selectedRun.reelShortcode}</b>..."
                    </span>
                  </div>
                  <div className="border-t border-creatr-border pt-2.5">
                    <span className="text-[#8C7D6C] block font-bold">VIDEO_GEN_PROMPT: {selectedRun.videoPromptVersionIdString}</span>
                    <span className="text-[#C7BDB3] block mt-1 leading-relaxed">
                      "Using Kling v3 Standard, animate starting frame references of <b className="text-[#FAF7F2] font-bold">{selectedRun.modelName}</b> based on <b className="text-[#FAF7F2] font-bold">{selectedRun.reelShortcode}</b>..."
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Error Actions in footer */}
            {selectedRun.state === 'failed' && (
              <div className="pt-3 border-t border-creatr-border shrink-0 flex items-center space-x-3.5">
                <button
                  id="btn-retry-failed-run"
                  onClick={() => retryFailedRun(selectedRun)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-creatr-pink to-[#F29ABF] text-[#0C0A09] text-xs font-bold font-mono tracking-wider leading-none uppercase rounded-full hover:opacity-90 shadow-md shadow-creatr-pink/10 hover:shadow-creatr-pink/20 transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Re-Trigger Job Registry</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8C7D6C] p-12">
            <FileText className="w-8 h-8 opacity-40 mb-2" />
            <span className="text-xs font-sans">Select a trace run to audit specifications</span>
          </div>
        )}
      </div>

    </div>
  );
}

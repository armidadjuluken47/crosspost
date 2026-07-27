/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  AlertTriangle,
  RotateCw,
  CheckCircle,
  Terminal,
  ShieldAlert,
  Search
} from 'lucide-react';
import { SystemException, Run, RunState } from '../types';

interface ExceptionCenterProps {
  exceptions: SystemException[];
  setExceptions: (exceptions: SystemException[]) => void;
  runs: Run[];
  setRuns: (runs: Run[]) => void;
  onAddAuditLog: (action: string, details: string) => void;
}

export default function ExceptionCenter({
  exceptions,
  setExceptions,
  runs,
  setRuns,
  onAddAuditLog
}: ExceptionCenterProps) {
  const [selectedExcId, setSelectedExcId] = useState<string | null>(exceptions[0]?.id || null);
  const [exceptionsFilterTab, setExceptionsFilterTab] = useState<'open' | 'resolved' | 'dismissed'>('open');
  const [excSearchTerm, setExcSearchTerm] = useState('');

  const selectedExc = exceptions.find(e => e.id === selectedExcId);

  const filteredExceptions = exceptions.filter(e => {
    const matchStatus = e.state === exceptionsFilterTab;
    const matchSearch =
      e.code.toLowerCase().includes(excSearchTerm.toLowerCase()) ||
      e.message.toLowerCase().includes(excSearchTerm.toLowerCase()) ||
      e.runDetails.toLowerCase().includes(excSearchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  // Action: Retry stage
  const handleRetryExceptionStage = (exc: SystemException) => {
    onAddAuditLog('EXCEPTION_RETRID', `Operator triggered stage retry on exception ${exc.id} (${exc.code})`);
    
    // Find associated run and reset state to before the failed stage
    const updatedRuns = runs.map(r => {
      if (r.id === exc.runId) {
        // Reset the failing stage
        const resetStages = r.stages.map(s => {
          if (s.stage === exc.stage) {
            return { ...s, status: 'running' as const, message: 'Operator retried stage after exception resolution.' };
          }
          if (s.stage === 'delivered' || s.stage === 'failed') {
            return { ...s, status: 'pending' as const };
          }
          return s;
        });

        return {
          ...r,
          state: exc.stage, // drop back to this stage
          errorMsg: undefined,
          stages: resetStages
        };
      }
      return r;
    });

    setRuns(updatedRuns);

    // Resolve exception state
    setExceptions(exceptions.map(e => {
      if (e.id === exc.id) {
        return { ...e, state: 'resolved' as const };
      }
      return e;
    }));
  };

  // Action: Dismiss & Bypass (Accept Output)
  const handleDismissBypassException = (exc: SystemException) => {
    onAddAuditLog('EXCEPTION_BYPASS', `Operator dismissed exception ${exc.id} (${exc.code}). Force-delivering artifact anyway.`);
    
    // Force setassociated run to delivered in database
    const updatedRuns = runs.map(r => {
      if (r.id === exc.runId) {
        const deliveredStages = r.stages.map(s => {
          if (s.stage === 'delivered') {
            return { ...s, status: 'completed' as const, message: 'Delivered bypass override.' };
          }
          return { ...s, status: 'completed' as const };
        });

        return {
          ...r,
          state: 'delivered' as RunState,
          errorMsg: undefined,
          stages: deliveredStages,
          imageCandidateUrl: r.imageCandidateUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=1067',
          videoRenderUrl: r.videoRenderUrl || 'https://assets.mixkit.co/videos/preview/mixkit-young-woman-running-in-the-countryside-41911-large.mp4',
          finishedAt: new Date().toISOString()
        };
      }
      return r;
    });

    setRuns(updatedRuns);

    // Mark exception as dismissed
    setExceptions(exceptions.map(e => {
      if (e.id === exc.id) {
        return { ...e, state: 'dismissed' as const };
      }
      return e;
    }));
  };

  return (
    <div id="exceptions-tab" className="p-4 md:p-8 flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 h-screen max-h-screen overflow-hidden bg-[#070505]/40">
      
      {/* Exceptions List (3/5 width) */}
      <div className="w-full lg:w-3/5 flex flex-col space-y-4 h-full overflow-hidden shrink-0">
        
        {/* Title */}
        <div className="shrink-0">
          <h2 className="font-display font-bold text-lg lg:text-xl text-[#FAF7F2] tracking-wide uppercase">System Exception Center</h2>
          <p className="text-[10px] text-[#8C7D6C] font-mono leading-none tracking-wide mt-1 uppercase">Audit log of system checks failures and Quality Control threshold offsets.</p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 bg-[#120F0D]/40 p-3 rounded-2xl border border-creatr-border">
          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8C7D6C]" />
            <input
              id="search-exceptions"
              type="text"
              placeholder="Search by code, model..."
              value={excSearchTerm}
              onChange={(e) => setExcSearchTerm(e.target.value)}
              className="bg-[#120F0D] border border-creatr-border/60 rounded-xl text-xs pl-9 pr-3 py-2 w-full text-[#FAF7F2] placeholder-[#8C7D6C]/70 focus:outline-none focus:border-creatr-pink/40"
            />
          </div>

          <div className="flex items-center space-x-1.5 self-start sm:self-auto">
            {(['open', 'resolved', 'dismissed'] as const).map((tab) => (
              <button
                id={`exc-tab-filter-${tab}`}
                key={tab}
                onClick={() => setExceptionsFilterTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-mono uppercase border tracking-wider transition-all select-none cursor-pointer ${
                  exceptionsFilterTab === tab
                    ? 'bg-[#1D1714] text-creatr-pink border-creatr-pink/25 font-bold'
                    : 'text-[#8C7D6C] hover:text-[#FAF7F2] border-transparent bg-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Exceptions Ledger list scroll */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-16 lg:pb-8">
          {filteredExceptions.length === 0 ? (
            <div className="p-16 border border-dashed border-creatr-border text-center rounded-2xl bg-[#120F0D]/25">
              <ShieldAlert className="w-7 h-7 text-[#8C7D6C] mx-auto mb-2" />
              <span className="text-xs text-[#8C7D6C] font-sans font-medium">No exceptions matching filtering</span>
            </div>
          ) : (
            filteredExceptions.map((exc) => {
              const isSelected = selectedExcId === exc.id;
              return (
                <div
                  id={`exc-row-${exc.id}`}
                  key={exc.id}
                  onClick={() => setSelectedExcId(exc.id)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all space-y-2.5 ${
                    isSelected
                      ? 'bg-[#1D1714] border-creatr-pink/50 shadow-lg ring-1 ring-creatr-pink/10'
                      : 'bg-[#120F0D] border-creatr-border/40 hover:bg-[#1E1916]/40 hover:border-creatr-pink/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-[#f487b7]">{exc.code}</span>
                        <span className="text-[10px] text-[#8C7D6C] font-bold">•</span>
                        <span className="text-[10px] font-mono text-[#FAF7F2]">Run: {exc.runId}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8C7D6C] mt-1 block leading-none font-bold uppercase">{exc.runDetails}</span>
                    </div>

                    <span className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase rounded-lg border tracking-wider ${
                      exc.state === 'open'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : exc.state === 'resolved'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10'
                        : 'bg-creatr-border/40 text-[#8C7D6C] border-creatr-border'
                    }`}>
                      {exc.state}
                    </span>
                  </div>

                  <p className="text-[10.5px] font-sans text-[#C7BDB3] leading-relaxed pr-2 line-clamp-2">
                    {exc.message}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Detail Slide Over View (2/5 width) */}
      <div className="w-full lg:w-2/5 lg:border-l border-creatr-border lg:pl-8 h-full flex flex-col overflow-hidden pb-16 lg:pb-0">
        {selectedExc ? (
          <div id="exc-details-panel" className="flex-1 flex flex-col space-y-5 h-full overflow-hidden">
            
            <div className="border-b border-creatr-border pb-4 shrink-0 space-y-1">
              <span className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-widest block font-bold">Exceptions Auditor</span>
              <h3 className="text-xs font-mono font-bold text-creatr-pink">{selectedExc.code}</h3>
              <div className="text-[10.5px] font-mono text-[#8C7D6C] font-semibold">{selectedExc.runDetails} (Run {selectedExc.runId})</div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
              
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Error telemetry description</span>
                <p className="text-[11.5px] font-sans text-rose-400 leading-relaxed p-3.5 bg-rose-500/5 border border-rose-500/10 rounded-2xl">
                  {selectedExc.message}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Failure Point (Stage)</span>
                <div className="p-3.5 bg-[#120F0D] border border-creatr-border rounded-xl font-mono text-xs uppercase text-[#C7BDB3] font-bold leading-none">
                  {selectedExc.stage}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-creatr-pink/10 bg-[#1D1714]/20 space-y-2.5">
                <span className="text-xs font-display font-bold text-creatr-pink flex items-center space-x-1 uppercase">
                  <Terminal className="w-3.5 h-3.5 text-creatr-gold" />
                  <span>Operator Manual Override Instructions</span>
                </span>
                <p className="text-[10px] text-[#C7BDB3] leading-relaxed font-sans font-medium">
                  The QC engine detected an outlier. You can either <b>Re-trigger Job</b> which pulls fallback SDK weights or <b>Bypass Auditing</b> to override rules and deliver the video artifact to the R2 delivery directory anyway if the visual output is verified as acceptable.
                </p>
              </div>

            </div>

            {/* Actions overlay footer */}
            {selectedExc.state === 'open' && (
              <div className="pt-3 border-t border-creatr-border shrink-0 grid grid-cols-2 gap-3.5">
                <button
                  id="btn-exc-retry-stage"
                  onClick={() => handleRetryExceptionStage(selectedExc)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-[#120F0D] hover:bg-[#1C1815] border border-creatr-border text-[10px] font-mono font-bold uppercase text-[#FAF7F2] rounded-full transition-all cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-creatr-gold animate-none" />
                  <span>Re-Trigger Job</span>
                </button>
                <button
                  id="btn-exc-dismiss-bypass"
                  onClick={() => handleDismissBypassException(selectedExc)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-gradient-to-r from-creatr-pink to-[#F29ABF] text-[10px] font-mono font-bold uppercase text-[#0C0A09] rounded-full transition-all cursor-pointer shadow-md shadow-creatr-pink/10"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Bypass Rules</span>
                </button>
              </div>
            )}

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8C7D6C] p-12">
            <ShieldAlert className="w-8 h-8 opacity-40 mb-2" />
            <span className="text-xs font-sans">Select a ledger Exception to initiate corrective flow</span>
          </div>
        )}
      </div>

    </div>
  );
}

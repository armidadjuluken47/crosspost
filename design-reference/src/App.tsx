/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import ModelRegistry from './components/ModelRegistry';
import SourceRegistry from './components/SourceRegistry';
import BatchBuilder from './components/BatchBuilder';
import QueueOperations from './components/QueueOperations';
import PromptOperations from './components/PromptOperations';
import ExceptionCenter from './components/ExceptionCenter';
import AuditLogView from './components/AuditLogView';

import {
  initialModels,
  initialSourceAccounts,
  initialSourceReels,
  initialPromptTemplates,
  initialExceptions,
  initialAuditLogs,
  initialRuns,
  initialProviders
} from './data';
import { Model, SourceAccount, SourceReel, PromptTemplate, SystemException, AuditLog, Run, RunState, RunStageLog, ProviderStatus } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isOpenOnMobile, setIsOpenOnMobile] = useState<boolean>(false);

  // Core Persistent States loaded from localStorage or seeded from data.ts
  const [models, setModels] = useState<Model[]>(() => {
    const saved = localStorage.getItem('amve_models');
    return saved ? JSON.parse(saved) : initialModels;
  });

  const [accounts, setAccounts] = useState<SourceAccount[]>(() => {
    const saved = localStorage.getItem('amve_accounts');
    return saved ? JSON.parse(saved) : initialSourceAccounts;
  });

  const [reels, setReels] = useState<SourceReel[]>(() => {
    const saved = localStorage.getItem('amve_reels');
    return saved ? JSON.parse(saved) : initialSourceReels;
  });

  const [templates, setTemplates] = useState<PromptTemplate[]>(() => {
    const saved = localStorage.getItem('amve_templates');
    return saved ? JSON.parse(saved) : initialPromptTemplates;
  });

  const [exceptions, setExceptions] = useState<SystemException[]>(() => {
    const saved = localStorage.getItem('amve_exceptions');
    return saved ? JSON.parse(saved) : initialExceptions;
  });

  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('amve_logs');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  const [runs, setRuns] = useState<Run[]>(() => {
    const saved = localStorage.getItem('amve_runs');
    return saved ? JSON.parse(saved) : initialRuns;
  });

  const [providers, setProviders] = useState<ProviderStatus[]>(() => {
    const saved = localStorage.getItem('amve_providers');
    return saved ? JSON.parse(saved) : initialProviders;
  });

  // Local state persistence
  useEffect(() => {
    localStorage.setItem('amve_models', JSON.stringify(models));
  }, [models]);

  useEffect(() => {
    localStorage.setItem('amve_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('amve_reels', JSON.stringify(reels));
  }, [reels]);

  useEffect(() => {
    localStorage.setItem('amve_templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('amve_exceptions', JSON.stringify(exceptions));
  }, [exceptions]);

  useEffect(() => {
    localStorage.setItem('amve_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('amve_runs', JSON.stringify(runs));
  }, [runs]);

  useEffect(() => {
    localStorage.setItem('amve_providers', JSON.stringify(providers));
  }, [providers]);

  // Operational system health
  const getSystemStatus = (): 'healthy' | 'degraded' | 'offline' => {
    const statuses = providers.map(p => p.status);
    if (statuses.includes('offline')) return 'degraded';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  };

  const systemStatus = getSystemStatus();

  // Helper insideApp Audit Logging
  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `al-${Date.now()}`,
      action,
      details,
      operator: 'hassankirwa47@gmail.com',
      createdAt: new Date().toISOString()
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Dispatch a Batch multiplier
  const handleDispatchBatch = (newRuns: Run[]) => {
    setRuns(prev => [...newRuns, ...prev]);
  };

  // Inject exceptions for simulation feedback
  const handleInjectException = (
    runId: string,
    runDetails: string,
    stage: RunState,
    code: string,
    message: string
  ) => {
    const excId = `exc-${Date.now()}`;
    const newExc: SystemException = {
      id: excId,
      runId,
      runDetails,
      stage,
      code,
      message,
      state: 'open',
      createdAt: new Date().toISOString()
    };
    setExceptions(prev => [newExc, ...prev]);
    addAuditLog('EXCEPTION_GENERATED', `QC alert: run ${runId} flagged at stage [${stage}] with code: ${code}. Exception exc-${excId} opened.`);
  };

  // Derive active items processing in the background queue
  const activeQueueRuns = runs.filter(
    r => r.state !== 'delivered' && r.state !== 'failed'
  );
  const activeQueueCount = activeQueueRuns.length;

  // BACKGROUND DAEMON STEPS: automatically consumes the queued list after brief intervals
  useEffect(() => {
    if (activeQueueCount === 0) return;

    const timer = setTimeout(() => {
      // Pick the first active run to advance
      const targetRun = activeQueueRuns[activeQueueRuns.length - 1]; // process FIFO
      
      const currentStageIndex = targetRun.stages.findIndex(s => s.stage === targetRun.state);
      
      if (currentStageIndex === -1) return;

      const nextStageIndex = currentStageIndex + 1;
      const totalStages = targetRun.stages.length;

      const updatedRuns = runs.map(r => {
        if (r.id === targetRun.id) {
          // Check for simulated failure probabilities during Image QC or Video QC
          const isQuCheckImage = targetRun.state === 'image_gen';
          const isQuCheckVideo = targetRun.state === 'video_gen';
          
          // Randomly trigger exception codes to mimic production checks
          const failsImageQC = isQuCheckImage && Math.random() < 0.12;
          const failsVideoQC = isQuCheckVideo && Math.random() < 0.08;

          if (failsImageQC) {
            const errorMsg = 'Low similarity resemblance rating (similarity calculation index: 0.61; threshold: 0.82)';
            const updatedStages = r.stages.map(s => {
              if (s.stage === 'image_qc') {
                return { ...s, status: 'failed' as const, message: errorMsg };
              }
              return s;
            });

            // Delay injection slightly to avoid race triggers
            setTimeout(() => {
              handleInjectException(
                targetRun.id,
                `Model: ${targetRun.modelName} | Reel: ${targetRun.reelShortcode}`,
                'image_qc',
                'LOW_FACE_SIMILARITY',
                'Similarity calculation index returned 0.61. Profile facial references mismatch target alignment outlines.'
              );
            }, 100);

            return {
              ...r,
              state: 'failed' as RunState,
              errorMsg,
              stages: updatedStages,
              finishedAt: new Date().toISOString()
            };
          }

          if (failsVideoQC) {
            const errorMsg = 'Kling motion artifact: high frequency temporal noise flickering on chest elements';
            const updatedStages = r.stages.map(s => {
              if (s.stage === 'video_qc') {
                return { ...s, status: 'failed' as const, message: errorMsg };
              }
              return s;
            });

            setTimeout(() => {
              handleInjectException(
                targetRun.id,
                `Model: ${targetRun.modelName} | Reel: ${targetRun.reelShortcode}`,
                'video_qc',
                'TEMPORAL_FLICKERING',
                'Temporal layout flickering check failed on block segment 90-120. Jacket fabrics warping bounds outlines.'
              );
            }, 100);

            return {
              ...r,
              state: 'failed' as RunState,
              errorMsg,
              stages: updatedStages,
              finishedAt: new Date().toISOString()
            };
          }

          // Regular successful progression
          if (nextStageIndex < totalStages) {
            const nextStage = r.stages[nextStageIndex];
            
            // Advance state
            const updatedStages = r.stages.map((s, idx) => {
              if (idx === currentStageIndex) {
                return { ...s, status: 'completed' as const, message: `Completed mapping successfully.` };
              }
              if (idx === nextStageIndex) {
                let msg = 'Executing underlying SDK pipelines...';
                if (nextStage.stage === 'image_gen') msg = 'Applying WaveSpeed Nano Banana Pro face mapping...';
                if (nextStage.stage === 'image_qc') msg = 'Auditing resolution, layout matrices, and OCR...';
                if (nextStage.stage === 'video_gen') msg = 'Calling WaveSpeed Kling v3 Standard motion-control timeline...';
                if (nextStage.stage === 'video_qc') msg = 'Auditing playability indices and duration match...';
                if (nextStage.stage === 'delivered') msg = 'Uploading final vertical MP4 video to Cloudflare R2...';
                
                return { ...s, status: 'running' as const, message: msg };
              }
              return s;
            });

            // Assign simulated candidate resources at correct stages
            const imageCandidateUrl = nextStage.stage === 'image_qc' || nextStage.stage === 'video_gen' || nextStage.stage === 'video_qc' || nextStage.stage === 'delivered'
              ? targetRun.imageCandidateUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=1067'
              : undefined;

            const videoRenderUrl = nextStage.stage === 'video_qc' || nextStage.stage === 'delivered'
              ? targetRun.videoRenderUrl || 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-walking-in-a-hallway-40156-large.mp4'
              : undefined;

            return {
              ...r,
              state: nextStage.stage,
              imageCandidateUrl,
              videoRenderUrl,
              stages: updatedStages,
              finishedAt: nextStage.stage === 'delivered' ? new Date().toISOString() : undefined
            };
          }
        }
        return r;
      });

      setRuns(updatedRuns);
    }, 4000);

    return () => clearTimeout(timer);
  }, [activeQueueCount, runs]);

  // Command: simulates manual ingestion of a single reel for testing
  const triggerDemoSingleRun = () => {
    const randomShortcode = `C_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const runId = `run-${Math.floor(100 + Math.random() * 900)}`;

    const demoRun: Run = {
      id: runId,
      modelId: 'm-1',
      modelName: 'Hazel',
      modelSlug: 'hazel',
      reelId: 'r-1',
      reelShortcode: randomShortcode,
      reelTitle: 'Single manual reel test (Demo)',
      reelVideoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-walking-in-a-hallway-40156-large.mp4',
      reelFirstFrameUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=1067',
      imagePromptVersionIdString: 'p-1 (v1.2.0)',
      videoPromptVersionIdString: 'p-2 (v3.1.5)',
      state: 'queued',
      cost: 1.55,
      stages: [
        { stage: 'queued', status: 'running', message: 'Manual supervisor bypass. Enqueued to priority process pool.' },
        { stage: 'image_gen', status: 'pending', message: 'First frame extraction and background matching pending.' },
        { stage: 'image_qc', status: 'pending', message: 'Pending aspect ratio and structural likeness checks.' },
        { stage: 'video_gen', status: 'pending', message: 'Timeline temporal interpolation pending.' },
        { stage: 'video_qc', status: 'pending', message: 'Checks pending.' },
        { stage: 'delivered', status: 'pending', message: 'R2 delivery check pending.' }
      ],
      createdAt: new Date().toISOString()
    };

    setRuns(prev => [demoRun, ...prev]);
    addAuditLog('DEMO_RUN_CREATED', `Demonstration run ${runId} dispatched for Hazel using shortcode ${randomShortcode}.`);
    setActiveTab('queue'); // redirect
  };

  // Commands: simulated scrape of ALL accounts
  const triggerScrapeAllAccounts = () => {
    addAuditLog('MASS_SCRAPE_TRIGGERED', `Began batch scrape operations across active accounts.`);
    
    // Pick an active handle and execute simulation
    const activeHandles = accounts.filter(a => a.isActive);
    if (activeHandles.length === 0) return;

    // Simulate scraping first 3 accounts to keep lists lively
    activeHandles.slice(0, 3).forEach((acc, idx) => {
      setTimeout(() => {
        const short = `C_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const newReel: SourceReel = {
          id: `r-scraped-${Date.now()}-${idx}`,
          accountId: acc.id,
          accountHandle: acc.handle,
          shortcode: short,
          title: `Daily walk check @${acc.handle}`,
          caption: `Styling favorite active look! Link is in bio 🍁 #ootdfall #fashionstyles #casualwalks`,
          videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-walking-in-a-hallway-40156-large.mp4',
          firstFrameUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600&h=1067',
          duration: 10,
          viewsCount: Math.round(5000 + Math.random() * 95000),
          isSelected: false,
          status: 'pending',
          createdAt: new Date().toISOString()
        };

        setReels(prev => [newReel, ...prev]);
        setAccounts(prevAccs => prevAccs.map(a => a.id === acc.id ? { ...a, lastScrapedAt: new Date().toISOString(), reelsCount: a.reelsCount + 1 } : a));
      }, idx * 1000);
    });
  };

  return (
    <div id="app-root-container" className="flex flex-col lg:flex-row h-screen w-screen bg-[#0A0807] font-sans text-[#E2D6C9] overflow-hidden leading-normal">
      {/* Mobile Top Header */}
      <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-[#0C0A09] border-b border-[#26211C] shrink-0 text-[#FAF7F2]">
        <div className="flex items-center space-x-3">
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <svg className="absolute inset-0 w-full h-full text-creatr-pink animate-pulse" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="45" cy="50" r="32" stroke="currentColor" strokeWidth="4" className="opacity-80" />
            </svg>
            <span className="font-display font-black text-[7px] tracking-tight text-[#FAF7F2] relative z-10 select-none">C</span>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-[#FAF7F2] tracking-wider text-xs uppercase leading-none">
              CREATR
            </h1>
            <span className="text-[8px] font-mono font-bold text-[#8C7D6C] tracking-wide uppercase mt-0.5 block leading-none">
              AI MOTION
            </span>
          </div>
        </div>

        <button 
          id="btn-mobile-menu"
          onClick={() => setIsOpenOnMobile(true)}
          className="p-2 px-3.5 rounded-xl border border-creatr-border hover:bg-[#1D1714] text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
        >
          Menu
        </button>
      </div>

      {/* Sidebar Core left panel Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openExceptionsCount={exceptions.filter(e => e.state === 'open').length}
        activeQueueCount={activeQueueCount}
        systemStatus={systemStatus}
        isOpenOnMobile={isOpenOnMobile}
        setIsOpenOnMobile={setIsOpenOnMobile}
      />

      {/* Main Tab content router */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900/5">
        {activeTab === 'overview' && (
          <DashboardOverview
            runs={runs}
            exceptions={exceptions}
            providers={providers}
            setProviders={setProviders}
            onSimulateIntake={triggerScrapeAllAccounts}
            onSimulateQueueProcess={() => {}} // interval runs automatically
            activeQueueCount={activeQueueCount}
            triggerDemoRun={triggerDemoSingleRun}
          />
        )}

        {activeTab === 'models' && (
          <ModelRegistry
            models={models}
            setModels={setModels}
            onAddAuditLog={addAuditLog}
          />
        )}

        {activeTab === 'sources' && (
          <SourceRegistry
            accounts={accounts}
            setAccounts={setAccounts}
            reels={reels}
            setReels={setReels}
            onAddAuditLog={addAuditLog}
          />
        )}

        {activeTab === 'batch' && (
          <BatchBuilder
            models={models}
            reels={reels}
            setReels={setReels}
            onDispatchBatch={handleDispatchBatch}
            setActiveTab={setActiveTab}
            onAddAuditLog={addAuditLog}
          />
        )}

        {activeTab === 'queue' && (
          <QueueOperations
            runs={runs}
            setRuns={setRuns}
            onSimulateQueueProcess={() => {}} // runs automatically on hook intervals
            activeQueueCount={activeQueueCount}
            onAddAuditLog={addAuditLog}
            onInjectException={handleInjectException}
          />
        )}

        {activeTab === 'prompts' && (
          <PromptOperations
            templates={templates}
            setTemplates={setTemplates}
            onAddAuditLog={addAuditLog}
          />
        )}

        {activeTab === 'exceptions' && (
          <ExceptionCenter
            exceptions={exceptions}
            setExceptions={setExceptions}
            runs={runs}
            setRuns={setRuns}
            onAddAuditLog={addAuditLog}
          />
        )}

        {activeTab === 'audit' && <AuditLogView logs={logs} />}
      </main>
    </div>
  );
}

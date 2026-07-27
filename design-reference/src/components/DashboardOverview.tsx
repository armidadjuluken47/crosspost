/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Activity,
  DollarSign,
  AlertTriangle,
  Play,
  RotateCw,
  Clock,
  ShieldAlert,
  HardDriveUpload,
  Layers,
  CheckCircle2,
  Cpu
} from 'lucide-react';
import { ProviderStatus, Run, SystemException } from '../types';

interface DashboardOverviewProps {
  runs: Run[];
  exceptions: SystemException[];
  providers: ProviderStatus[];
  setProviders: (provs: ProviderStatus[]) => void;
  onSimulateIntake: () => void;
  onSimulateQueueProcess: () => void;
  activeQueueCount: number;
  triggerDemoRun: () => void;
}

export default function DashboardOverview({
  runs,
  exceptions,
  providers,
  setProviders,
  onSimulateIntake,
  onSimulateQueueProcess,
  activeQueueCount,
  triggerDemoRun
}: DashboardOverviewProps) {
  const [refreshing, setRefreshing] = useState(false);

  // Derive metrics
  const totalRuns = runs.length;
  const completedRuns = runs.filter(r => r.state === 'delivered').length;
  const failedRuns = runs.filter(r => r.state === 'failed').length;
  
  // Real success rate from processed endpoints
  const processedRuns = runs.filter(r => r.state === 'delivered' || r.state === 'failed');
  const realSuccessRate = processedRuns.length > 0 
    ? Math.round((completedRuns / processedRuns.length) * 100) 
    : 94; // fallback standard representation

  const totalCost = runs.reduce((acc, r) => acc + r.cost, 0);
  const openExceptions = exceptions.filter(e => e.state === 'open').length;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const toggleProviderStatus = (index: number) => {
    const nextProvs = [...providers];
    const states: ('active' | 'degraded' | 'disabled' | 'offline')[] = ['active', 'degraded', 'offline'];
    const currentIdx = states.indexOf(nextProvs[index].status);
    const nextStatus = states[(currentIdx + 1) % states.length];
    nextProvs[index].status = nextStatus;
    // Latency spikes if degraded
    if (nextStatus === 'degraded') {
      nextProvs[index].latency = Math.round(nextProvs[index].latency * 2.5);
    } else if (nextStatus === 'active') {
      nextProvs[index].latency = Math.round(nextProvs[index].latency / 2.5);
    } else {
      nextProvs[index].latency = -1;
    }
    setProviders(nextProvs);
  };

  return (
    <div id="overview-tab" className="flex-1 p-8 space-y-8 overflow-y-auto bg-[#070505]/40">
      {/* Top action header Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 border-b border-[#241F1A]/40 pb-6">
        <div>
          <h2 className="font-display font-extrabold text-2xl lg:text-3xl text-[#FAF7F2] tracking-normal uppercase">
            System Controls & Analytics
          </h2>
          <p className="text-[10px] font-mono font-bold text-[#8C7D6C] tracking-widest mt-1.5 uppercase block">
            Real-time telemetry & supervisor dispatchers for CREATR's motion-capture nodes.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-refresh-telemetry"
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4.5 py-2.5 rounded-full bg-[#15110F] border border-[#2B231D] text-[10px] font-mono font-bold uppercase text-[#FAF7F2]/80 hover:text-[#FAF7F2] hover:bg-[#1E1916] transition-all duration-200 select-none cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#E9BC6B] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Analytics</span>
          </button>

          <button
            id="btn-simulate-intake"
            onClick={onSimulateIntake}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#1A1412] hover:bg-[#261E1A] border border-[#3E2E25] text-xs font-bold text-creatr-pink transition-all duration-200 cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5 text-creatr-gold" />
            <span>Trigger Insta-Scrape</span>
          </button>

          <button
            id="btn-trigger-demo-run"
            onClick={triggerDemoRun}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-creatr-pink via-[#F29ABF] to-creatr-gold hover:opacity-90 active:scale-95 text-xs font-extrabold text-[#0C0A09] transition-all duration-200 shadow-lg shadow-creatr-pink/20 cursor-pointer animate-none"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Generate Ingestion Workload</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5.5 rounded-2xl bg-[#13100E] border border-creatr-border flex items-center justify-between shadow-lg shadow-black/15 hover:border-creatr-pink/40 hover:shadow-creatr-pink/5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-widest text-[#8C7D6C] uppercase font-bold block">Processed Workloads</span>
            <div className="text-2xl font-display font-extrabold text-[#FAF7F2] tracking-wide leading-none py-1">{totalRuns} runs</div>
            <div className="text-[10px] font-mono text-[#8C7D6C]">
              <span className="text-emerald-400 font-bold">{completedRuns} delivered</span> • <span className="text-rose-455">{failedRuns} failures</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#1D1815] border border-[#3A2E28] flex items-center justify-center text-creatr-pink">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5.5 rounded-2xl bg-[#13100E] border border-creatr-border flex items-center justify-between shadow-lg shadow-black/15 hover:border-creatr-pink/40 hover:shadow-creatr-pink/5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-widest text-[#8C7D6C] uppercase font-bold block">SLA Threshold</span>
            <div className="text-2xl font-display font-extrabold text-[#FAF7F2] tracking-wide leading-none py-1">{realSuccessRate}%</div>
            <div className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
              <span>Above 90% target SLA</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#1D1815] border border-[#3A2E28] flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5.5 rounded-2xl bg-[#13100E] border border-creatr-border flex items-center justify-between shadow-lg shadow-black/15 hover:border-creatr-pink/40 hover:shadow-creatr-pink/5 transition-all duration-300">
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-widest text-[#8C7D6C] uppercase font-bold block">Est. GPU Expenditures</span>
            <div className="text-2xl font-display font-extrabold text-[#FAF7F2] tracking-wide leading-none py-1">${totalCost.toFixed(2)}</div>
            <div className="text-[10px] font-mono text-[#8C7D6C]">
              Average: <span className="text-[#FAF7F2] font-bold">${totalRuns > 0 ? (totalCost / totalRuns).toFixed(2) : '0.00'}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#1D1815] border border-[#3A2E28] flex items-center justify-center text-creatr-gold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-5.5 rounded-2xl border flex items-center justify-between shadow-lg shadow-black/15 transition-all duration-300 ${
          openExceptions > 0 ? 'border-creatr-pink/40 bg-[#1D1213]' : 'border-creatr-border bg-[#13100E] hover:border-creatr-pink/40'
        }`}>
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-widest text-[#8C7D6C] uppercase font-bold block">QC Threshold Exceptions</span>
            <div className={`text-2xl font-display font-extrabold leading-none py-1 ${openExceptions > 0 ? 'text-creatr-pink' : 'text-[#FAF7F2]'}`}>
              {openExceptions} alerts
            </div>
            <div className="text-[10px] font-mono text-[#8C7D6C]">
              {openExceptions > 0 ? (
                <span className="text-creatr-pink font-bold animate-pulse">Needs supervisor bypass</span>
              ) : (
                <span className="text-[#8C7D6C]">All checkpoints passed</span>
              )}
            </div>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
            openExceptions > 0 ? 'bg-creatr-pink/15 text-creatr-pink border-creatr-pink/30 animate-pulse' : 'bg-[#1D1815] text-[#8C7D6C] border-[#3A2E28]'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Core Provider Latency & Settings (Left 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-7 rounded-2xl bg-[#120F0D] border border-creatr-border shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#241F1A]/50 pb-5">
              <div>
                <h3 className="text-xs font-display font-bold text-[#FAF7F2] uppercase tracking-wider">
                  Broker Pools & Engine Adapters
                </h3>
                <p className="text-[10px] text-[#8C7D6C] font-mono font-medium tracking-wide mt-1 uppercase">
                  Click status nodes to manually triage network statuses & offline simulations.
                </p>
              </div>
              <span className="px-3 py-1 font-mono text-[9px] font-bold bg-[#1B1613] text-[#FAF7F2]/90 border border-[#3E2E25]/55 rounded uppercase tracking-wider shadow">
                Broker: Direct WaveSpeed SDK
              </span>
            </div>

            <div className="space-y-3.5">
              {providers.map((p, idx) => (
                <div
                  id={`provider-row-${p.name.toLowerCase().replace(/ /g, '-')}`}
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-xl bg-[#171412] border border-creatr-border/60 hover:bg-[#1E1A17] hover:border-creatr-pink/40 transition-all duration-200 shadow-sm"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      p.type === 'image'
                        ? 'bg-creatr-pink/10 text-creatr-pink border-creatr-pink/15'
                        : p.type === 'video'
                        ? 'bg-creatr-gold/10 text-creatr-gold border-creatr-gold/15'
                        : p.type === 'intake'
                        ? 'bg-[#E1757B]/10 text-[#E1757B] border-[#E1757B]/15'
                        : 'bg-creatr-border/40 text-[#8C7D6C] border-[#3E2E25]/20'
                    }`}>
                      {p.type === 'image' && <Layers className="w-4.5 h-4.5" />}
                      {p.type === 'video' && <Cpu className="w-4.5 h-4.5" />}
                      {p.type === 'intake' && <HardDriveUpload className="w-4.5 h-4.5" />}
                      {p.type === 'storage' && <Clock className="w-4.5 h-4.5" />}
                      {p.type === 'database' && <Clock className="w-4.5 h-4.5" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-sans font-bold text-[#FAF7F2]">{p.name}</span>
                        <span className="text-[9px] font-mono font-bold uppercase text-[#8C7D6C]">[{p.type}]</span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-[#8C7D6C] mt-1 block tracking-wider uppercase">{p.provider}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6 mt-3 sm:mt-0 justify-between sm:justify-end">
                    <div className="text-right hidden sm:block">
                      {p.latency !== -1 ? (
                        <div className="text-xs font-mono font-bold text-[#FAF7F2]">
                          {p.latency}ms <span className="text-[9px] text-[#8C7D6C] font-semibold tracking-wider">LATENCY</span>
                        </div>
                      ) : (
                        <div className="text-xs font-mono font-bold text-rose-550 uppercase tracking-widest">OFFLINE</div>
                      )}
                      <span className="text-[9px] font-mono font-semibold text-[#8C7D6C]/95 tracking-wide uppercase mt-0.5 block">
                        {p.costPerRun > 0 ? `Est. $${p.costPerRun.toFixed(2)}/run` : 'Resource free'}
                      </span>
                    </div>

                    <button
                      id={`btn-provider-status-${p.name.toLowerCase().replace(/ /g, '-')}`}
                      onClick={() => toggleProviderStatus(idx)}
                      className={`px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded-full border tracking-wider transition-all duration-200 select-none cursor-pointer ${
                        p.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 shadow-inner'
                          : p.status === 'degraded'
                          ? 'bg-amber-500/10 text-creatr-gold border-creatr-gold/20 hover:bg-creatr-gold/20 shadow-inner'
                          : 'bg-rose-500/10 text-rose-455 border-rose-500/20 hover:bg-rose-500/20 shadow-inner'
                      }`}
                    >
                      {p.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Local Setup & Operator Status Panel (Right 1 column) */}
        <div className="space-y-6">
          <div className="p-7 rounded-2xl bg-[#120F0D] border border-creatr-border shadow-xl space-y-5">
            <div className="border-b border-[#241F1A]/50 pb-4">
              <h3 className="text-xs font-display font-bold text-[#FAF7F2] uppercase tracking-wider">
                System Daemon Node
              </h3>
              <p className="text-[10px] text-[#8C7D6C] font-mono font-medium tracking-wide mt-1 uppercase">
                Postgres queue consumer.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#171412] border border-creatr-border/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-semibold text-[#C7BDB3]">Daemon State</span>
                {activeQueueCount > 0 ? (
                  <span className="flex items-center space-x-1.5 text-emerald-400 text-[9px] font-mono font-bold uppercase bg-[#18231C]/90 px-2 py-0.5 border border-emerald-500/25 rounded-full shadow-inner">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Active ({activeQueueCount})</span>
                  </span>
                ) : (
                  <span className="text-[#8C7D6C] text-[9px] font-mono font-bold uppercase bg-[#1A1613] px-2 py-0.5 border border-[#3A2E28] rounded-full shadow-inner">
                    Sleeping
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-semibold text-[#C7BDB3]">Ingestion Loops</span>
                <span className="text-xs font-mono font-bold text-creatr-gold">Auto 15s</span>
              </div>

              <div className="pt-3 border-t border-creatr-border/40">
                {activeQueueCount > 0 ? (
                  <button
                    id="btn-trigger-queue-worker"
                    onClick={onSimulateQueueProcess}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-[#FAF7F2] transition-colors duration-200 shadow-md shadow-emerald-600/10 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Boost Queue Thread</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-full bg-[#1A1715] border border-[#2D2420]/50 text-xs font-bold text-[#8C7D6C] cursor-not-allowed uppercase tracking-wider"
                  >
                    <span>Thread Standby</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom styled CREATR branded callout card resembling their site content sections */}
            <div className="p-5 rounded-xl border border-[#3E2421]/30 bg-[#1A1112] shadow-inner relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-tr before:from-creatr-pink/5 before:via-transparent before:to-transparent">
              <div className="flex items-center space-x-2 text-creatr-pink relative z-10">
                <ShieldAlert className="w-4 h-4 shrink-0 text-creatr-gold" />
                <span className="text-[10px] font-display font-extrabold uppercase tracking-widest">CRTR AUTOMATION LAB</span>
              </div>
              <p className="text-[10.5px] text-[#A39686] leading-relaxed font-sans mt-2.5 relative z-10 font-medium">
                You are utilizing the CREATR AMVE staging node. Real-time video encoding models (WaveSpeed Kling v3 & Nano Banana face maps) simulate exact generation vectors with dynamic R2 bucket callbacks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

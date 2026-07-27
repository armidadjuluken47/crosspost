/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Video,
  Layers,
  Users,
  Instagram,
  FileCode,
  AlertTriangle,
  History,
  Activity,
  HeartPulse,
  LogOut,
  FolderSync
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openExceptionsCount: number;
  activeQueueCount: number;
  systemStatus: 'healthy' | 'degraded' | 'offline';
  isOpenOnMobile: boolean;
  setIsOpenOnMobile: (open: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  openExceptionsCount,
  activeQueueCount,
  systemStatus,
  isOpenOnMobile,
  setIsOpenOnMobile
}: SidebarProps) {
  const menuItems = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'models', name: 'Model Registry', icon: Users },
    { id: 'sources', name: 'Instagram Ingestion', icon: Instagram },
    { id: 'prompts', name: 'Prompt Operations', icon: FileCode },
    { id: 'batch', name: 'Batch Builder', icon: Layers },
    {
      id: 'queue',
      name: 'Queue & Runs',
      icon: Video,
      badge: activeQueueCount > 0 ? activeQueueCount : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    },
    {
      id: 'exceptions',
      name: 'Exception Center',
      icon: AlertTriangle,
      badge: openExceptionsCount > 0 ? openExceptionsCount : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold animate-pulse'
    },
    { id: 'audit', name: 'System Audit Logs', icon: History }
  ];

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpenOnMobile && (
        <div 
          className="fixed inset-0 bg-black/70 z-35 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpenOnMobile(false)}
        />
      )}

      <div 
        id="app-sidebar" 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0C0A09] border-r border-[#26211C] flex flex-col h-screen transition-transform duration-300 lg:translate-x-0 lg:sticky lg:top-0 shrink-0 ${
          isOpenOnMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-creatr-border/60 flex items-center justify-between bg-[#0B0908]">
          <div className="flex items-center space-x-3">
            {/* Custom SVG CREATR Dual-Ring Logo */}
            <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
              <svg className="absolute inset-0 w-full h-full text-creatr-pink" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="45" cy="50" r="32" stroke="currentColor" strokeWidth="2.5" className="opacity-80" />
                <circle cx="55" cy="50" r="32" stroke="var(--color-creatr-gold)" strokeWidth="2.5" className="opacity-90 animate-pulse" />
              </svg>
              <span className="font-display font-extrabold text-[10px] tracking-tight text-[#FAF7F2] relative z-10 select-none">CREATR</span>
            </div>
            <div>
              <h1 className="font-display font-extrabold text-[#FAF7F2] tracking-widest text-[#FAF7F2] text-sm uppercase leading-none">
                CREATR
              </h1>
              <span className="text-[9px] font-mono font-bold text-[#8C7D6C] tracking-widest uppercase mt-1 block leading-none">
                AI MOTION
              </span>
            </div>
          </div>

          <button 
            type="button"
            className="lg:hidden px-2.5 py-1.5 rounded-lg border border-creatr-border text-[#8C7D6C] hover:text-[#FAF7F2] text-[10px] font-bold uppercase transition-all"
            onClick={() => setIsOpenOnMobile(false)}
          >
            ✕
          </button>
        </div>

        {/* Nav List */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <div className="px-3 mb-2.5 text-[9px] font-mono font-bold text-[#8C7D6C]/70 tracking-widest uppercase">
            OPERATOR CORE
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                 id={`sidebar-tab-${item.id}`}
                 key={item.id}
                 onClick={() => {
                   setActiveTab(item.id);
                   setIsOpenOnMobile(false);
                 }}
                 className={`w-full flex items-center justify-between px-3.5 py-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group cursor-pointer ${
                   isActive
                     ? 'bg-gradient-to-r from-creatr-pink/15 via-creatr-gold/5 to-transparent text-creatr-pink border-l-2 border-creatr-pink shadow-inner shadow-black/40'
                     : 'text-[#C7BDB3] hover:text-[#FAF7F2] hover:bg-[#1C1815]/60'
                 }`}
               >
                 <div className="flex items-center space-x-3">
                   <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? 'text-creatr-pink' : 'text-[#8C7D6C] group-hover:text-[#FAF7F2]'}`} />
                   <span className="font-sans">{item.name}</span>
                 </div>
                 {item.badge !== undefined && (
                   <span className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded-full leading-none ${
                     isActive ? 'bg-creatr-pink/20 text-[#FAF7F2] border border-creatr-pink/30' : item.badgeColor
                   }`}>
                     {item.badge}
                   </span>
                 )}
              </button>
            );
          })}
        </nav>

      {/* System Status Indicator Footer */}
      <div className="p-4 border-t border-[#26211C]/50 bg-[#090807]">
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#151210] rounded-xl border border-[#2B231D]">
          <div className="flex items-center space-x-2.5">
            <HeartPulse className="w-4 h-4 text-[#8C7D6C]" />
            <span className="text-[10px] font-sans font-semibold text-[#C7BDB3]">Pipeline</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              systemStatus === 'healthy'
                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                : systemStatus === 'degraded'
                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
            }`} />
            <span className="text-[10px] font-mono font-bold capitalize text-[#FAF7F2] select-none">
              {systemStatus}
            </span>
          </div>
        </div>

        <div className="mt-4 px-3 flex items-center justify-between text-[10px] font-mono text-[#8C7D6C]">
          <span>STAGING ENGINE</span>
          <span className="text-[#A39686]">v1.2.0-STG</span>
        </div>
      </div>
    </div>
    </>
  );
}

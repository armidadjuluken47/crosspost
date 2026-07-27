/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Instagram,
  RefreshCw,
  Search,
  Check,
  Eye,
  Archive,
  Download,
  Terminal,
  Play,
  PlayCircle,
  X,
  Plus,
  Tv
} from 'lucide-react';
import { SourceAccount, SourceReel } from '../types';

interface SourceRegistryProps {
  accounts: SourceAccount[];
  setAccounts: (accounts: SourceAccount[]) => void;
  reels: SourceReel[];
  setReels: (reels: SourceReel[]) => void;
  onAddAuditLog: (action: string, details: string) => void;
}

export default function SourceRegistry({
  accounts,
  setAccounts,
  reels,
  setReels,
  onAddAuditLog
}: SourceRegistryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAccountFilter, setActiveAccountFilter] = useState<string | null>(null);
  const [reelStatusFilter, setReelStatusFilter] = useState<'all' | 'pending' | 'selected' | 'archived'>('all');
  
  // Scrape Simulator Console States
  const [scrapingAccount, setScrapingAccount] = useState<SourceAccount | null>(null);
  const [scrapeConsoleLogs, setScrapeConsoleLogs] = useState<string[]>([]);
  const [addingNewAccount, setAddingNewAccount] = useState(false);
  const [newHandleInput, setNewHandleInput] = useState('');

  // Video Preview Modal
  const [playReel, setPlayReel] = useState<SourceReel | null>(null);

  const filteredAccounts = accounts.filter(
    a => a.handle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReels = reels.filter(r => {
    const matchAccount = !activeAccountFilter || r.accountHandle === activeAccountFilter;
    const matchStatus =
      reelStatusFilter === 'all'
        ? true
        : reelStatusFilter === 'pending'
        ? r.status === 'pending'
        : reelStatusFilter === 'selected'
        ? r.status === 'selected'
        : r.status === 'archived';
    return matchAccount && matchStatus;
  });

  const handleToggleAccountActive = (id: string) => {
    const updated = accounts.map(a => {
      if (a.id === id) {
        onAddAuditLog('SOURCE_ACCOUNT_TOGGLED', `Instagram account @${a.handle} set to ${!a.isActive ? 'ACTIVE' : 'INACTIVE'}`);
        return { ...a, isActive: !a.isActive };
      }
      return a;
    });
    setAccounts(updated);
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHandleInput) return;
    
    const cleanHandle = newHandleInput.trim().replace('@', '');
    if (accounts.some(a => a.handle.toLowerCase() === cleanHandle.toLowerCase())) {
      alert(`Handle @${cleanHandle} is already registered.`);
      return;
    }

    const nextAccount: SourceAccount = {
      id: `sa-${Date.now()}`,
      handle: cleanHandle,
      url: `https://instagram.com/${cleanHandle}/reels/`,
      isActive: true,
      lastScrapedAt: 'Never',
      status: 'idle',
      reelsCount: 0
    };

    setAccounts([nextAccount, ...accounts]);
    onAddAuditLog('SOURCE_ACCOUNT_ADDED', `Registered @${cleanHandle} in approved source list.`);
    setNewHandleInput('');
    setAddingNewAccount(false);
  };

  // Trigger simulated Apify sync
  const triggerScrapeSimulate = (account: SourceAccount) => {
    if (scrapingAccount) return; // ignore concurrent scrapes
    setScrapingAccount(account);
    setScrapeConsoleLogs([]);

    const handle = account.handle;
    const logs = [
      `[APIFY-SDK]: Initializing Apify Client connection for Actor: apify/instagram-reel-scraper...`,
      `[APIFY-SDK]: Launching chromium session to page: https://instagram.com/${handle}/reels/`,
      `[APIFY-SDK]: Scrape session authenticated. Injecting DOM scrolling handlers...`,
      `[APIFY-SDK]: Scrolling... Loaded 12 initial DOM cards. Scraped metadata for 6 posts...`,
      `[IMPACT-ANALYZER]: Deduplication check: cross-referencing shortcodes with Postgres schema...`
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setScrapeConsoleLogs(prev => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        // Scrape completes. Inject 2 new simulated Reels in Pending list
        const shortcode1 = `C_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const shortcode2 = `D_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const newReels: SourceReel[] = [
          {
            id: `r-scraped-${Date.now()}-1`,
            accountId: account.id,
            accountHandle: account.handle,
            shortcode: shortcode1,
            title: `${account.handle} Outfit walk`,
            caption: `Enjoying this gorgeous afternoon look! #streetstyle #influencerfits #summerootd`,
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fashion-woman-walking-in-a-hallway-40156-large.mp4',
            firstFrameUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600&h=1067',
            duration: 11,
            viewsCount: Math.round(9000 + Math.random() * 80000),
            isSelected: false,
            status: 'pending',
            createdAt: new Date().toISOString()
          },
          {
            id: `r-scraped-${Date.now()}-2`,
            accountId: account.id,
            accountHandle: account.handle,
            shortcode: shortcode2,
            title: `${account.handle} Sunset cafe check`,
            caption: `Sunset with vanilla latte hits differently. Tap on link in bio ✨☕ #aesthetic #influencervibe`,
            videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-with-take-away-coffee-walking-around-outdoor-41315-large.mp4',
            firstFrameUrl: 'https://images.unsplash.com/photo-1498843053639-170ff2122f35?auto=format&fit=crop&q=80&w=600&h=1067',
            duration: 14,
            viewsCount: Math.round(1500 + Math.random() * 30000),
            isSelected: false,
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        ];

        setReels([...newReels, ...reels]);
        
        // Update Account
        setAccounts(accounts.map(a => {
          if (a.id === account.id) {
            return {
              ...a,
              lastScrapedAt: new Date().toISOString(),
              reelsCount: a.reelsCount + 2
            };
          }
          return a;
        }));

        setScrapeConsoleLogs(prev => [
          ...prev,
          `[FFMPEG-EXTRACTOR]: Extracting start-frame MP4 index as Poster Frame...`,
          `[FFMPEG-EXTRACTOR]: Successfully saved Poster frame to Cloudflare R2: amve-assets/first_frame/${shortcode1}.jpg`,
          `[FFMPEG-EXTRACTOR]: Successfully saved Poster frame to Cloudflare R2: amve-assets/first_frame/${shortcode2}.jpg`,
          `[APIFY-SDK]: Finished Scraping. Extracted 2 new UNIQUE reels. Saved to database. Status: 200 OK.`
        ]);

        onAddAuditLog('APIFY_SCRAPE_TRIGGERED', `Scraped @${account.handle} and discovered 2 new reels. poster frames extracted with ffmpeg and stored.`);
        
        setTimeout(() => {
          setScrapingAccount(null);
        }, 1500);
      }
    }, 600);
  };

  const changeReelStatus = (id: string, nextStatus: 'pending' | 'selected' | 'archived') => {
    setReels(reels.map(r => {
      if (r.id === id) {
        onAddAuditLog('REEL_STATUS_UPDATED', `Reel ${r.shortcode} set to status: ${nextStatus.toUpperCase()}`);
        return {
          ...r,
          status: nextStatus,
          isSelected: nextStatus === 'selected'
        };
      }
      return r;
    }));
  };

  return (
    <div id="sources-tab" className="p-8 space-y-8 flex-1 overflow-y-auto">
         {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-medium text-xl text-[#FAF7F2] tracking-tight">Instagram Ingest Panel (Apify Hub)</h2>
          <p className="text-xs text-[#8C7D6C] font-sans mt-0.5">Automated Apify scraping, first-frame extraction via ffmpeg-static, and R2 synchronization.</p>
        </div>
        <div className="flex items-center space-x-3 self-end sm:self-auto">
          {addingNewAccount ? (
            <form onSubmit={handleAddAccount} className="flex items-center space-x-2 bg-[#171412] border border-creatr-border rounded-xl p-1">
              <input
                id="input-new-ig-handle"
                type="text"
                required
                autoFocus
                value={newHandleInput}
                onChange={(e) => setNewHandleInput(e.target.value)}
                placeholder="ig_handle"
                className="bg-transparent border-none text-xs font-mono text-[#FAF7F2] placeholder-[#8C7D6C]/50 focus:outline-none w-32 px-2"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-creatr-pink hover:bg-creatr-pink/90 text-[#0C0A09] font-sans font-bold text-[10px] rounded-lg cursor-pointer transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAddingNewAccount(false)}
                className="text-[#8C7D6C] hover:text-[#FAF7F2] p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              id="btn-show-add-ig-account"
              onClick={() => setAddingNewAccount(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#15110F] border border-creatr-border hover:bg-[#1E1916] rounded-full text-xs font-bold font-mono uppercase text-[#C7BDB3] hover:text-[#FAF7F2] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-creatr-pink" />
              <span>Register Account</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Approved Handles List (1 column) */}
        <div className="lg:col-span-1 bg-[#120F0D] p-5 rounded-2xl border border-creatr-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#8C7D6C] uppercase tracking-widest font-bold">Approved Sources ({accounts.length})</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#8C7D6C]" />
              <input
                id="search-ig-sources"
                type="text"
                placeholder="Search handles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 bg-[#171412] border border-creatr-border text-[#FAF7F2] placeholder-[#8C7D6C]/50 rounded-lg text-[11px] focus:outline-none focus:border-creatr-pink/40"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-[440px] overflow-y-auto pr-1">
            {filteredAccounts.map((a) => {
              const isActiveClass = a.isActive
                ? 'opacity-100'
                : 'opacity-50 hover:opacity-85 text-[#8C7D6C]';
              const isSelectedSourceFilter = activeAccountFilter === a.handle;

              return (
                <div
                  id={`source-row-${a.handle}`}
                  key={a.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs tracking-wide transition-all ${
                    isSelectedSourceFilter
                      ? 'bg-[#1D1714] border-creatr-border shadow-md ring-1 ring-creatr-pink/30'
                      : 'bg-transparent border-transparent hover:bg-[#1E1916]/50'
                  } ${isActiveClass}`}
                >
                  <div
                    onClick={() => setActiveAccountFilter(isSelectedSourceFilter ? null : a.handle)}
                    className="flex items-center space-x-2.5 cursor-pointer truncate mr-1.5 flex-1"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-creatr-border" />
                    <div className="truncate">
                      <div className="font-semibold text-[#FAF7F2]">@{a.handle}</div>
                      <span className="text-[10px] font-mono text-[#8C7D6C] block leading-none mt-1">
                        {a.reelsCount} reels scraped
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5 shrink-0">
                    <button
                      id={`btn-scrape-account-${a.handle}`}
                      disabled={!a.isActive || scrapingAccount !== null}
                      onClick={() => triggerScrapeSimulate(a)}
                      className="p-1.5 rounded bg-[#171412] hover:bg-[#201B18] text-creatr-pink border border-creatr-border transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button
                      id={`btn-toggle-active-account-${a.handle}`}
                      onClick={() => handleToggleAccountActive(a.id)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono leading-none border transition-all cursor-pointer ${
                        a.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/10'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/10'
                      }`}
                    >
                      {a.isActive ? 'Active' : 'Muted'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Scraper Output Monitor & Reels Grid (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* SCRAPING LIVE CONSOLE MONITOR */}
          {scrapingAccount && (
            <div id="scrape-console-overlay animate-fadeIn" className="bg-[#120F0D] p-5 rounded-2xl border border-creatr-border shadow-lg space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-[#2B231D] pb-2.5">
                <div className="flex items-center space-x-2 text-creatr-pink text-xs">
                  <Terminal className="w-4 h-4" />
                  <span className="font-bold">LIVE APIFY DAEMON OUT: Scrape @{scrapingAccount.handle}</span>
                </div>
                <span className="text-[10px] text-[#8C7D6C] animate-pulse font-bold tracking-wider uppercase">SCRAPING DUPES_SYNC_EXECUTE...</span>
              </div>
              <div className="bg-[#171412] rounded-lg p-3.5 text-[10px] text-slate-400 leading-relaxed max-h-48 overflow-y-auto space-y-1">
                {scrapeConsoleLogs.map((log, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className="text-creatr-border font-bold select-none">[{i+1}]</span>
                    <span className="text-[#C7BDB3]">{log}</span>
                  </div>
                ))}
                {scrapeConsoleLogs.length < 8 && (
                  <div className="inline-block animate-pulse text-creatr-pink">▍</div>
                )}
              </div>
            </div>
          )}

          {/* REELS PREVIEW GALLERY */}
          <div className="p-6 rounded-2xl bg-[#120F0D] border border-creatr-border space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-creatr-border pb-4 gap-4">
              <div>
                <h3 className="text-xs font-display font-bold text-[#FAF7F2] uppercase tracking-wider">Scraped Reels Queue</h3>
                {activeAccountFilter && (
                  <span className="text-xs text-creatr-pink font-mono mt-1 block">
                    Source filter: @{activeAccountFilter}{' '}
                    <button onClick={() => setActiveAccountFilter(null)} className="text-rose-500 underline ml-1 text-[10px] cursor-pointer inline-block">
                      Clear filter
                    </button>
                  </span>
                )}
              </div>

              {/* Status filter toggles */}
              <div className="flex items-center space-x-1.5 self-start sm:self-auto bg-[#171412] border border-creatr-border rounded-xl p-1">
                {(['all', 'pending', 'selected', 'archived'] as const).map((filter) => (
                  <button
                    id={`filter-reels-${filter}`}
                    key={filter}
                    onClick={() => setReelStatusFilter(filter)}
                    className={`px-3 py-1 text-[10px] uppercase font-mono font-bold rounded-lg transition-all duration-150 cursor-pointer ${
                      reelStatusFilter === filter
                        ? 'bg-creatr-pink text-[#0C0A09]'
                        : 'text-[#8C7D6C] hover:text-[#FAF7F2]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredReels.length === 0 ? (
              <div className="p-16 text-center border border-dashed border-creatr-border rounded-2xl bg-[#120F0D]/40">
                <Instagram className="w-8 h-8 text-[#8C7D6C] mx-auto mb-2.5" />
                <span className="text-xs text-[#8C7D6C] font-sans font-medium">No matching reels in R2 repository</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {filteredReels.map((reel) => (
                  <div id={`reel-card-${reel.shortcode}`} key={reel.id} className="rounded-2xl border border-creatr-border bg-[#15110F] overflow-hidden hover:border-creatr-pink/40 transition-all flex flex-col">
                    {/* Poster frame image with trigger hover play sign */}
                    <div className="aspect-[3/4] relative overflow-hidden group bg-black">
                      <img
                        referrerPolicy="no-referrer"
                        src={reel.firstFrameUrl}
                        alt="Reel frame capture"
                        className="w-full h-full object-cover pr-0 group-hover:scale-[1.03] transition-transform"
                      />
                      
                      {/* Metric widgets overlay */}
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-[#0C0A09]/80 text-[10px] font-mono text-[#FAF7F2] uppercase border border-white/5 font-bold">
                        {reel.duration}s
                      </span>

                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-[#0C0A09]/80 text-[10px] font-mono text-[#FAF7F2]/80 border border-white/5 font-bold">
                        {reel.viewsCount >= 1005 ? `${(reel.viewsCount/1000).toFixed(0)}k views` : `${reel.viewsCount} views`}
                      </span>

                      {/* Play action icon overlay */}
                      <div
                        onClick={() => setPlayReel(reel)}
                        className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-creatr-pink"
                      >
                        <PlayCircle className="w-10 h-10 drop-shadow-lg scale-90 group-hover:scale-100 transition-transform" />
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="p-3.5 space-y-1.5 flex-grow-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-mono font-bold text-creatr-pink">@{reel.accountHandle}</span>
                        <span className="text-[10px] font-mono text-[#8C7D6C] font-bold uppercase">{reel.shortcode}</span>
                      </div>
                      <p className="text-[11px] text-[#C7BDB3] font-sans leading-relaxed line-clamp-2" title={reel.caption}>
                        {reel.caption}
                      </p>
                    </div>

                    {/* Operational decision buttons */}
                    <div className="p-3 border-t border-creatr-border flex items-center justify-between gap-1.5 bg-[#1B1613]">
                      {reel.status === 'selected' ? (
                        <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-[#121B15] border border-emerald-500/20 text-emerald-400 text-[9px] rounded-lg font-mono font-bold uppercase w-full justify-center">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Queue Active</span>
                        </div>
                      ) : (
                        <button
                          id={`btn-select-reel-${reel.shortcode}`}
                          onClick={() => changeReelStatus(reel.id, 'selected')}
                          className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#14100E] border border-creatr-border hover:border-creatr-pink/30 hover:bg-[#1E1916] text-[10px] font-bold font-mono uppercase text-creatr-pink transition-all w-full leading-none cursor-pointer"
                        >
                          <span>Select</span>
                        </button>
                      )}

                      {reel.status !== 'archived' ? (
                        <button
                          id={`btn-archive-reel-${reel.shortcode}`}
                          onClick={() => changeReelStatus(reel.id, 'archived')}
                          title="Archive"
                          className="p-1.5 rounded-lg bg-[#1D1714] border border-creatr-border hover:border-creatr-pink/30 text-[#8C7D6C] hover:text-[#FAF7F2] transition-colors cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          id={`btn-unarchive-reel-${reel.shortcode}`}
                          onClick={() => changeReelStatus(reel.id, 'pending')}
                          title="Restore"
                          className="p-1.5 rounded-lg bg-[#1D1714] border border-creatr-border hover:border-creatr-pink/30 text-[#8C7D6C] hover:text-[#FAF7F2] transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REEL VIDEO PLAYER MODAL WINDOW SIMULATION */}
      {playReel && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#120F0D] border border-creatr-border max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl relative">
            
            {/* Modal header details */}
            <div className="p-4 border-b border-creatr-border flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-creatr-pink">@{playReel.accountHandle}</span>
                <span className="text-[10px] font-mono text-[#8C7D6C] block font-bold uppercase mt-0.5">Shortcode: {playReel.shortcode}</span>
              </div>
              <button
                id="close-player-modal"
                onClick={() => setPlayReel(null)}
                className="p-1.5 rounded-full bg-[#171412] hover:bg-[#1E1916] border border-creatr-border text-[#C7BDB3] hover:text-[#FAF7F2] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Canvas view */}
            <div className="aspect-[9/16] bg-black relative flex items-center justify-center">
              <video
                referrerPolicy="no-referrer"
                src={playReel.videoUrl}
                autoPlay
                controls
                loop
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Caption in footer info */}
            <div className="p-4 bg-[#0F0D0B] text-[#C7BDB3] text-xs font-sans leading-relaxed border-t border-creatr-border">
              {playReel.caption}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

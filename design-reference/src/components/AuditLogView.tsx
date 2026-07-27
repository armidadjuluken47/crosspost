/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { History, Shield, Search } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export default function AuditLogView({ logs }: AuditLogViewProps) {
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const filteredLogs = logs.filter(
    l =>
      l.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.details.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.operator.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  return (
    <div id="audit-log-tab" className="p-4 md:p-8 flex-1 flex flex-col space-y-6 h-screen max-h-screen overflow-hidden bg-[#070505]/40">
      
      {/* Title Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-lg lg:text-xl text-[#FAF7F2] uppercase tracking-wide">System Audit Log Trace</h2>
          <p className="text-[10px] text-[#8C7D6C] font-mono leading-none tracking-wide mt-1 uppercase">Immutable supervisor audit trail ledger recording internal human pipeline decisions.</p>
        </div>
        <div className="self-start sm:self-auto flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-[#120F0D] border border-creatr-border text-[9px] font-mono font-bold text-[#C7BDB3] tracking-wider uppercase">
          <Shield className="w-3.5 h-3.5 text-creatr-pink" />
          <span>FIPS COMPLIANT CONSOLE</span>
        </div>
      </div>

      {/* Filter and Search actions */}
      <div className="shrink-0 p-3 bg-[#120F0D]/40 border border-creatr-border/60 rounded-xl max-w-sm relative">
        <Search className="absolute left-6 top-5 w-3.5 h-3.5 text-[#8C7D6C]" />
        <input
          id="search-audit-logs"
          type="text"
          placeholder="Filter audit actions..."
          value={logSearchQuery}
          onChange={(e) => setLogSearchQuery(e.target.value)}
          className="bg-[#120F0D] border border-creatr-border/60 rounded-lg text-xs pl-9 pr-3 py-2 w-full text-[#FAF7F2] placeholder-[#8C7D6C]/70 focus:outline-none focus:border-creatr-pink/40"
        />
      </div>

      {/* Audit Logs list Table style */}
      <div className="flex-1 overflow-y-auto border border-creatr-border/40 bg-[#0C0A09] rounded-2xl overflow-hidden shadow-xl flex flex-col">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-12 text-left text-[10px] font-mono uppercase tracking-widest text-[#8C7D6C] font-bold border-b border-creatr-border bg-[#120F0D] px-6 py-4">
          <div className="col-span-3">Timestamp</div>
          <div className="col-span-3">Action Signature</div>
          <div className="col-span-4">Audit Trace Message</div>
          <div className="col-span-2 text-right">Supervisor</div>
        </div>

        <div className="divide-y divide-creatr-border/40 overflow-y-auto flex-1 pb-24 md:pb-8">
          {filteredLogs.length === 0 ? (
            <div className="p-16 text-center text-[#8C7D6C]">
              <History className="w-8 h-8 opacity-40 mx-auto mb-2" />
              <span className="text-xs font-sans">No trace signatures available</span>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                id={`audit-row-${log.id}`} 
                key={log.id} 
                className="px-6 py-4 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-0 text-xs font-sans text-[#C7BDB3] hover:bg-[#1C1815]/30 transition-all"
              >
                {/* Timestamp */}
                <div className="md:col-span-3 font-mono text-[#8C7D6C] text-[10px] flex items-center col-span-12 font-bold uppercase">
                  <span className="md:hidden text-[9px] text-[#8C7D6C]/50 mr-2 uppercase block font-bold">Time:</span>
                  {new Date(log.createdAt).toLocaleString()}
                </div>
                
                {/* Action Signature */}
                <div className="md:col-span-3 flex items-center pr-2 col-span-12">
                  <span className="md:hidden text-[9px] text-[#8C7D6C]/50 mr-2 uppercase block font-bold">Action:</span>
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-[#1E1714] border border-creatr-pink/20 text-creatr-pink uppercase leading-none font-bold">
                    {log.action}
                  </span>
                </div>

                {/* Details */}
                <div className="md:col-span-4 text-[#FAF7F2] font-medium leading-relaxed flex items-center pr-4 col-span-12 py-1 md:py-0">
                  <span className="md:hidden text-[9px] text-[#8C7D6C]/50 mr-2 uppercase block font-bold">Details:</span>
                  {log.details}
                </div>

                {/* Operator */}
                <div className="md:col-span-2 font-mono text-[10.5px] text-[#8C7D6C] flex items-center md:justify-end col-span-12 truncate font-semibold" title={log.operator}>
                  <span className="md:hidden text-[9px] text-[#8C7D6C]/50 mr-2 uppercase block font-bold">Operator:</span>
                  {log.operator}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

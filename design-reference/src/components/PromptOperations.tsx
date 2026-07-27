/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileCode,
  CheckCircle,
  Plus,
  Play,
  RotateCw,
  Sparkles,
  Info,
  Layers,
  Activity,
  Check
} from 'lucide-react';
import { PromptTemplate } from '../types';

interface PromptOperationsProps {
  templates: PromptTemplate[];
  setTemplates: (templates: PromptTemplate[]) => void;
  onAddAuditLog: (action: string, details: string) => void;
}

export default function PromptOperations({
  templates,
  setTemplates,
  onAddAuditLog
}: PromptOperationsProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(templates[0] || null);
  const [addingPrompt, setAddingPrompt] = useState(false);

  // Compile Dynamic variables preview test states
  const [testModel, setTestModel] = useState('Hazel');
  const [testReel, setTestReel] = useState('C-vX8vOJy5L');
  const [testInst, setTestInst] = useState('Keep background office cabinets unaltered.');

  // Form State
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptType, setNewPromptType] = useState<'image' | 'video'>('image');
  const [newPromptVersion, setNewPromptVersion] = useState('1.0.0');
  const [newPromptTemplate, setNewPromptTemplate] = useState('');

  const substituteVariables = (text: string) => {
    return text
      .replace(/model_display_name|{{model_display_name}}/g, testModel)
      .replace(/source_reel_shortcode|{{source_reel_shortcode}}/g, testReel)
      .replace(/run_instruction_block|{{run_instruction_block}}/g, testInst);
  };

  const handleSetActiveTemplate = (id: string, type: 'image' | 'video') => {
    const updated = templates.map(t => {
      if (t.type === type) {
        // Toggle active, ensuring all other of same type turn off
        return {
          ...t,
          isActive: t.id === id
        };
      }
      return t;
    });

    setTemplates(updated);
    
    // Auto sync selected template
    const fresh = updated.find(t => t.id === id)!;
    setSelectedTemplate(fresh);

    onAddAuditLog('PROMPT_ACTIVATED', `Activated baseline version ${fresh.version} of "${fresh.name}" for ${type} generation pipeline.`);
  };

  const handleCreatePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptName || !newPromptTemplate) return;

    const nextId = `p-${Date.now()}`;
    const nextPrompt: PromptTemplate = {
      id: nextId,
      name: newPromptName,
      type: newPromptType,
      version: newPromptVersion,
      template: newPromptTemplate,
      isActive: false, // standards defaults as draft
      variables: ['model_display_name', 'source_reel_shortcode'],
      createdAt: new Date().toISOString()
    };

    setTemplates([...templates, nextPrompt]);
    setSelectedTemplate(nextPrompt);
    onAddAuditLog('PROMPT_REGISTERED', `Added draft prompt version ${newPromptVersion} of "${newPromptName}".`);

    // reset Form
    setNewPromptName('');
    setNewPromptVersion('1.0.0');
    setNewPromptTemplate('');
    setAddingPrompt(false);
  };

  return (
    <div id="prompts-tab" className="p-8 space-y-8 flex-1 flex flex-col lg:flex-row gap-8 h-screen max-h-screen overflow-hidden">
      
      {/* Sidebar List (2/5 width) */}
      <div className="w-full lg:w-2/5 flex flex-col space-y-4 h-full overflow-hidden shrink-0">
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[#FAF7F2] font-display font-medium text-xs uppercase tracking-wider">
            <FileCode className="w-4 h-4 text-creatr-pink" />
            <span>Formula Templates</span>
          </div>
          <button
            id="btn-create-prompt-template"
            onClick={() => setAddingPrompt(true)}
            className="p-1 px-3 text-[10.5px] font-mono font-bold uppercase hover:text-[#FAF7F2] rounded-full bg-[#15110F] border border-creatr-border text-[#C7BDB3] hover:bg-[#1E1916] transition-all cursor-pointer"
          >
            + Create Draft
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-16">
          {templates.map((t) => {
            const isSelected = selectedTemplate?.id === t.id;
            return (
              <div
                id={`prompt-row-${t.id}`}
                key={t.id}
                onClick={() => { setSelectedTemplate(t); setAddingPrompt(false); }}
                className={`p-4 rounded-xl border text-left cursor-pointer transition-all space-y-3 ${
                  isSelected
                    ? 'bg-[#1D1714] border-creatr-border shadow-lg ring-1 ring-creatr-pink/20'
                    : 'bg-[#120F0D] border-creatr-border/40 hover:bg-[#1E1916]/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-sans font-bold text-[#FAF7F2] leading-tight pr-2">{t.name}</h4>
                    <span className="text-[10px] font-mono text-[#8C7D6C] block mt-1 uppercase font-semibold">SemVer: {t.version} • {t.type} stage</span>
                  </div>

                  {t.isActive ? (
                    <span className="shrink-0 px-2.5 py-0.5 text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold uppercase tracking-wider">
                      ACTIVE
                    </span>
                  ) : (
                    <button
                      id={`btn-activate-prompt-${t.id}`}
                      onClick={(e) => { e.stopPropagation(); handleSetActiveTemplate(t.id, t.type); }}
                      className="shrink-0 px-2 py-0.5 text-[9px] font-mono bg-[#14100E] text-[#8C7D6C] hover:text-[#FAF7F2] border border-creatr-border hover:border-creatr-pink/30 rounded transition-all cursor-pointer"
                    >
                      ACTIVATE
                    </button>
                  )}
                </div>
                <p className="text-[10px] font-mono text-[#C7BDB3] leading-relaxed max-h-16 overflow-hidden line-clamp-2">
                  {t.template}
                </p>
              </div>
            );
          })}
        </div>
      </div>      {/* Editor & Compiler Area (3/5 width) */}
      <div className="w-full lg:w-3/5 lg:border-l border-creatr-border lg:pl-8 h-full flex flex-col overflow-hidden pb-16 lg:pb-0">
        
        {addingPrompt ? (
          /* NEW PROMPT FORM */
          <form id="create-prompt-form" onSubmit={handleCreatePrompt} className="flex-1 flex flex-col space-y-5 h-full overflow-hidden">
            <div className="border-b border-creatr-border pb-3 shrink-0 flex items-center justify-between">
              <h3 className="font-display font-medium text-sm text-[#FAF7F2]">Draft Prompt Template Formula</h3>
              <button
                type="button"
                onClick={() => setAddingPrompt(false)}
                className="text-[#8C7D6C] hover:text-[#FAF7F2] text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider font-bold">Template Name</label>
                  <input
                    id="prompt-input-name"
                    type="text"
                    required
                    placeholder="e.g. Hyper-Detail Wardrobe Transfer"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#171412] border border-creatr-border rounded-xl text-xs font-sans text-[#FAF7F2] placeholder-[#8C7D6C]/50 focus:outline-none focus:border-creatr-pink focus:ring-1 focus:ring-creatr-pink/20 transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider font-bold">Pipeline Stage</label>
                    <select
                      id="prompt-input-type"
                      value={newPromptType}
                      onChange={(e) => setNewPromptType(e.target.value as 'image' | 'video')}
                      className="w-full px-3 py-2 bg-[#171412] border border-creatr-border rounded-xl text-xs font-sans text-[#FAF7F2] focus:outline-none focus:border-creatr-pink focus:ring-1 focus:ring-creatr-pink/20 cursor-pointer"
                    >
                      <option value="image">Image (First Frame)</option>
                      <option value="video">Video (Kling)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider font-bold">SemVer</label>
                    <input
                      id="prompt-input-version"
                      type="text"
                      required
                      placeholder="e.g. 1.0.0"
                      value={newPromptVersion}
                      onChange={(e) => setNewPromptVersion(e.target.value)}
                      className="w-full px-4 py-2 bg-[#171412] border border-creatr-border rounded-xl text-xs font-mono text-[#FAF7F2] focus:outline-none focus:border-creatr-pink focus:ring-1 focus:ring-creatr-pink/20 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col min-h-36">
                <label className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider font-bold">Template Content</label>
                <textarea
                  id="prompt-input-template"
                  required
                  rows={6}
                  value={newPromptTemplate}
                  onChange={(e) => setNewPromptTemplate(e.target.value)}
                  placeholder="Use variables for dynamic substitution, eg: model_display_name, source_reel_shortcode..."
                  className="w-full px-4 py-3 bg-[#171412] border border-creatr-border rounded-xl text-xs font-mono text-[#FAF7F2] placeholder-[#8C7D6C]/50 focus:outline-none focus:border-creatr-pink focus:ring-1 focus:ring-creatr-pink/20 resize-none flex-1 transition-all"
                />
              </div>

              <div className="p-3 bg-[#171412] border border-creatr-border rounded-xl text-[11px] font-sans text-[#8C7D6C] leading-relaxed">
                <b>Variable Guidelines:</b> Templates automatically declare compiler variables <code>model_display_name</code> and <code>source_reel_shortcode</code>. They will resolve dynamic outputs during queue run claims.
              </div>
            </div>

            <div className="pt-3 border-t border-creatr-border shrink-0 flex justify-end space-x-3">
              <button
                type="submit"
                disabled={!newPromptName || !newPromptTemplate}
                className="px-5 py-2.5 bg-gradient-to-r from-creatr-pink to-[#F29ABF] disabled:opacity-50 text-xs font-extrabold text-[#0C0A09] rounded-full transition-all duration-200 shadow-md shadow-creatr-pink/15 cursor-pointer"
              >
                Save Draft Formula
              </button>
            </div>
          </form>
        ) : selectedTemplate ? (
          /* TEMPLATE PREVIEW & VARIABLE COMPILER COMPILATION */
          <div id="prompt-compiler-view" className="flex-1 flex flex-col space-y-4 h-full overflow-hidden">
            
            {/* Header Details */}
            <div className="border-b border-creatr-border pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-sans font-bold text-[#FAF7F2]">{selectedTemplate.name}</h3>
                <span className={`px-2.5 py-1 text-[9px] font-mono rounded-full font-bold uppercase ${
                  selectedTemplate.isActive ? 'bg-creatr-pink/15 text-creatr-pink border border-creatr-pink/20' : 'bg-[#15110F] text-[#8C7D6C] border border-creatr-border'
                }`}>
                  Status: {selectedTemplate.isActive ? 'Baseline Active' : 'Draft'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#8C7D6C] mt-2 block font-bold uppercase tracking-wider">Semantic version: {selectedTemplate.version} • Pipeline Stage: {selectedTemplate.type}</span>
            </div>

            {/* View compiler splits */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4">
              
              {/* Draft content */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Standard Formula</span>
                <div className="p-4 bg-[#171412] border border-creatr-border rounded-2xl font-mono text-[10.5px] text-[#C7BDB3] leading-relaxed">
                  {selectedTemplate.template}
                </div>
              </div>

              {/* Playground compile settings */}
              <div className="space-y-3 pt-3 border-t border-creatr-border">
                <div className="flex items-center space-x-2 text-creatr-pink">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-wider block font-bold">Live Substitution Compiler</span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-[#8C7D6C] leading-none uppercase font-bold">Model Name (model_display_name)</span>
                    <input
                      id="test-model"
                      type="text"
                      value={testModel}
                      onChange={(e) => setTestModel(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#171412] border border-creatr-border text-xs rounded-lg text-[#FAF7F2] focus:outline-none focus:border-creatr-pink/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-mono text-[#8C7D6C] leading-none uppercase font-bold">Reel shortcode (source_reel_shortcode)</span>
                    <input
                      id="test-reel"
                      type="text"
                      value={testReel}
                      onChange={(e) => setTestReel(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#171412] border border-creatr-border text-xs rounded-lg text-[#FAF7F2] focus:outline-none focus:border-creatr-pink/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-[#8C7D6C] leading-none uppercase block font-bold">Rendered Output Payload Preview</span>
                  <div className="p-4 bg-creatr-pink/5 border border-creatr-pink/20 rounded-2xl font-mono text-[10.5px] text-creatr-pink leading-relaxed">
                    {substituteVariables(selectedTemplate.template)}
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#8C7D6C]">
            <Info className="w-8 h-8 opacity-40 mb-2" />
            <span className="text-xs font-sans">Select a baseline template to view metadata context</span>
          </div>
        )}

      </div>
    </div>
  );
}

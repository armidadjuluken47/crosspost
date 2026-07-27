/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Image,
  CloudUpload,
  UserCheck,
  Lock,
  X,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Model, FaceReference } from '../types';

interface ModelRegistryProps {
  models: Model[];
  setModels: (models: Model[]) => void;
  onAddAuditLog: (action: string, details: string) => void;
}

export default function ModelRegistry({ models, setModels, onAddAuditLog }: ModelRegistryProps) {
  const [addingModel, setAddingModel] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(models[0] || null);

  // New Model Form State
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [temporaryRefs, setTemporaryRefs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto set slug when typing name
  const handleNameChange = (val: string) => {
    setNewName(val);
    if (!newSlug || newSlug === val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) {
      setNewSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  // Preset face portrait lists so the user has quick sample items to load if they don't upload personal files
  const portraitPresets = [
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600&h=800',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600&h=800',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800',
    'https://images.unsplash.com/photo-1504257400762-ff369161a24d?auto=format&fit=crop&q=80&w=600&h=800',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600&h=800'
  ];

  const handlePresetSelect = (url: string) => {
    if (temporaryRefs.includes(url)) {
      setTemporaryRefs(temporaryRefs.filter(r => r !== url));
    } else {
      setTemporaryRefs([...temporaryRefs, url]);
    }
  };

  const handleFileUploadSimulated = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Create a local object URL to render
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const fileUrl = URL.createObjectURL(e.target.files[i]);
        urls.push(fileUrl);
      }
      setTemporaryRefs([...temporaryRefs, ...urls]);
    }
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newSlug) return;

    const avatarImage = newAvatar || temporaryRefs[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300&h=300';
    const modelId = `m-${Date.now()}`;

    // Map face references
    const faceReferences: FaceReference[] = temporaryRefs.map((url, i) => ({
      id: `fr-${Date.now()}-${i}`,
      modelId,
      imageUrl: url,
      dimensions: '1080x1440',
      status: 'active',
      createdAt: new Date().toISOString()
    }));

    const nextModel: Model = {
      id: modelId,
      name: newName,
      slug: newSlug,
      description: newDesc,
      avatarUrl: avatarImage,
      createdAt: new Date().toISOString(),
      faceReferences
    };

    const updated = [nextModel, ...models];
    setModels(updated);
    setSelectedModel(nextModel);
    onAddAuditLog('MODEL_REGISTERED', `Added model ${newName} with ${faceReferences.length} uploaded face reference photos.`);

    // reset Form state
    setNewName('');
    setNewSlug('');
    setNewDesc('');
    setNewAvatar('');
    setTemporaryRefs([]);
    setAddingModel(false);
  };

  const deleteReference = (refId: string) => {
    if (!selectedModel) return;

    const updatedRefs = selectedModel.faceReferences.filter(r => r.id !== refId);
    const updatedModel = { ...selectedModel, faceReferences: updatedRefs };

    const updatedModels = models.map(m => m.id === selectedModel.id ? updatedModel : m);
    setModels(updatedModels);
    setSelectedModel(updatedModel);
    onAddAuditLog('MODEL_REFERENCE_REMOVED', `Removed face reference ${refId} from model ${selectedModel.name}.`);
  };

  const uploadToActiveModel = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedModel || !e.target.files) return;

    const fileUrls: string[] = [];
    for (let i = 0; i < e.target.files.length; i++) {
      fileUrls.push(URL.createObjectURL(e.target.files[i]));
    }

    const nextRefs: FaceReference[] = fileUrls.map((url, i) => ({
      id: `fr-add-${Date.now()}-${i}`,
      modelId: selectedModel.id,
      imageUrl: url,
      dimensions: '1080x1440',
      status: 'active',
      createdAt: new Date().toISOString()
    }));

    const updatedModel = {
      ...selectedModel,
      faceReferences: [...selectedModel.faceReferences, ...nextRefs]
    };

    const updatedModels = models.map(m => m.id === selectedModel.id ? updatedModel : m);
    setModels(updatedModels);
    setSelectedModel(updatedModel);
    onAddAuditLog('MODEL_REFERENCE_ADDED', `Injected ${nextRefs.length} face reference images to model ${selectedModel.name}.`);
  };

  return (
    <div id="models-tab" className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 overflow-y-auto">
      
      {/* Sidebar Model List (1 column) */}
      <div className="lg:col-span-1 bg-[#120F0D] rounded-2xl border border-[#2B231D] p-5 space-y-5 h-fit shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#FAF7F2] font-display font-medium text-xs uppercase tracking-wider">
            <Users className="w-4 h-4 text-[#FF9E85]" />
            <span>Identity Index</span>
          </div>
          <button
            id="register-model-btn"
            onClick={() => setAddingModel(true)}
            className="p-1.5 rounded-full bg-[#3E2421]/45 hover:bg-[#3E2421]/70 text-[#FF9E85] border border-[#5E1E22]/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {models.map((m) => {
            const isSelected = selectedModel?.id === m.id;
            const refCount = m.faceReferences.length;
            const meetsCriteria = refCount >= 3;

            return (
              <button
                id={`model-item-${m.slug}`}
                key={m.id}
                onClick={() => { setSelectedModel(m); setAddingModel(false); }}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-[#1D1714] border border-[#3E2421] shadow-lg ring-1 ring-[#FF9E85]/20'
                    : 'bg-transparent border border-transparent hover:bg-[#1E1916]/65 text-[#C7BDB3]'
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <img
                    referrerPolicy="no-referrer"
                    src={m.avatarUrl}
                    alt={m.name}
                    className="w-9 h-9 rounded-lg border border-[#2B231D]/80 object-cover"
                  />
                  <div className="truncate">
                    <div className="text-xs font-sans font-bold text-[#FAF7F2] leading-tight">{m.name}</div>
                    <span className="text-[10px] font-mono text-[#8C7D6C]">@{m.slug}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded-full inline-block ${
                    meetsCriteria
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-[#2E2015] text-[#E9BC6B] border border-[#E9BC6B]/20 font-bold'
                  }`}>
                    {refCount} refs {meetsCriteria ? '✓' : '⚠️'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main content Area (3 columns) */}
      <div className="lg:col-span-3 space-y-6">
        
        {/* ADD MODEL FORM */}
        {addingModel ? (
          <form id="add-model-form" onSubmit={handleSaveModel} className="p-6 rounded-2xl bg-[#120F0D] border border-creatr-border space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-creatr-border pb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-creatr-pink" />
                <h3 className="font-display font-medium text-base text-[#FAF7F2]">Register New Model Identity</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddingModel(false)}
                className="text-[#8C7D6C] hover:text-[#FAF7F2] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Display Name</label>
                <input
                  id="model-input-name"
                  type="text"
                  required
                  placeholder="e.g. Rachel Sterling"
                  value={newName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2 bg-[#171412] border border-creatr-border rounded-xl text-xs font-sans text-[#FAF7F2] placeholder-[#8C7D6C]/50 focus:outline-none focus:border-creatr-pink focus:ring-1 focus:ring-creatr-pink/20 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Model Slug</label>
                <input
                  id="model-input-slug"
                  type="text"
                  required
                  placeholder="e.g. rachel-sterling"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="w-full px-4 py-2 bg-[#171412] border border-creatr-border rounded-xl text-xs font-mono text-[#FAF7F2]/90 focus:outline-none focus:border-creatr-pink focus:ring-1 focus:ring-creatr-pink/20 transition-all duration-200"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[11px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Description & Style Notes</label>
                <textarea
                  id="model-input-desc"
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Atmosphere, outfit preferences, and target lifestyle topics..."
                  className="w-full px-4 py-2 bg-[#171412] border border-creatr-border rounded-xl text-xs font-sans text-[#FAF7F2] placeholder-[#8C7D6C]/50 focus:outline-none focus:border-creatr-pink focus:ring-1 focus:ring-creatr-pink/20 transition-all duration-200 resize-none"
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#8C7D6C] uppercase tracking-wider block font-bold">Face Portraits references (Min 3 required)</span>
                  <span className="text-[10px] font-mono text-creatr-pink font-semibold">{temporaryRefs.length} Selected</span>
                </div>

                {/* Simulated drag area or click */}
                <div
                  id="drop-area-face-refs"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border border-dashed border-creatr-border hover:border-creatr-pink/40 bg-[#161311]/50 hover:bg-creatr-pink/5 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                >
                  <CloudUpload className="w-7 h-7 text-[#8C7D6C] mb-2.5 group-hover:text-creatr-pink transition-colors" />
                  <span className="text-xs font-bold text-[#C7BDB3]">Click to upload face references from computer</span>
                  <span className="text-[10px] text-[#8C7D6C] font-mono mt-1">Accepts JPG/PNG, portrait crop preferred</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUploadSimulated}
                    className="hidden"
                  />
                </div>

                {/* Quick select Preset Portraits */}
                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-mono text-[#8C7D6C] block font-bold">Or select fast portrait mock items for quick testing:</span>
                  <div className="flex flex-wrap gap-2.5">
                    {portraitPresets.map((preset, idx) => {
                      const selected = temporaryRefs.includes(preset);
                      return (
                        <div
                          key={idx}
                          onClick={() => handlePresetSelect(preset)}
                          className={`w-14 h-16 rounded-lg relative overflow-hidden border cursor-pointer group transition-all shrink-0 ${
                            selected ? 'border-creatr-pink ring-2 ring-creatr-pink/30' : 'border-[#2B231D]'
                          }`}
                        >
                          <img
                            referrerPolicy="no-referrer"
                            src={preset}
                            alt="Preset suggestion"
                            className="w-full h-full object-cover pr-0 group-hover:scale-105 transition-all"
                          />
                          {selected && (
                            <div className="absolute inset-0 bg-creatr-pink/20 flex items-center justify-center">
                              <UserCheck className="w-5 h-5 text-creatr-pink bg-[#0A0807]/90 rounded p-0.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Render Selected Image references view */}
                {temporaryRefs.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3.5 pt-3 border-t border-creatr-border">
                    {temporaryRefs.map((url, i) => (
                      <div key={i} className="aspect-[3/4] rounded-lg relative overflow-hidden border border-creatr-border bg-[#171412] group">
                        <img
                          referrerPolicy="no-referrer"
                          src={url}
                          alt="Uploaded Portrait preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setTemporaryRefs(temporaryRefs.filter((_, idx) => idx !== i)); }}
                          className="absolute top-1 right-1 p-0.5 rounded bg-rose-500/95 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-creatr-border">
              <button
                type="button"
                onClick={() => setAddingModel(false)}
                className="px-4 py-2 rounded-full bg-[#15110F] hover:bg-[#1E1916] border border-creatr-border text-xs text-[#C7BDB3] font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newName === '' || newSlug === ''}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-creatr-pink to-[#F29ABF] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-extrabold text-[#0C0A09] transition-all duration-200 shadow-lg shadow-creatr-pink/15 cursor-pointer"
              >
                Save Identity
              </button>
            </div>
          </form>
        ) : selectedModel ? (
          /* SELECTED MODEL DETAILS VIEW */
          <div id="model-details-view" className="p-6 rounded-2xl bg-[#120F0D] border border-creatr-border space-y-6 shadow-xl">
            
            {/* Model Profile header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-5 border-b border-creatr-border">
              <div className="flex items-center space-x-4">
                <img
                  referrerPolicy="no-referrer"
                  src={selectedModel.avatarUrl}
                  alt={selectedModel.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-creatr-border"
                />
                <div>
                  <h3 className="text-lg font-display font-bold text-[#FAF7F2] leading-none">{selectedModel.name}</h3>
                  <div className="text-xs font-mono text-[#8C7D6C] mt-2 font-bold uppercase tracking-wider">Slug ID: @{selectedModel.slug}</div>
                  <p className="text-xs text-[#C7BDB3] font-sans mt-2 max-w-xl leading-relaxed">{selectedModel.description || "No specific stylistic parameters defined yet."}</p>
                </div>
              </div>

              {/* Validation Guard status banner */}
              <div className="shrink-0">
                {selectedModel.faceReferences.length >= 3 ? (
                  <div className="px-3.5 py-2.5 rounded-xl border bg-[#121B15] border-emerald-500/20 flex items-center space-x-2.5 shadow-inner">
                    <UserCheck className="w-4.5 h-4.5 text-emerald-400" />
                    <div>
                      <span className="text-xs font-sans font-bold text-emerald-400 block leading-tight uppercase tracking-wider">Registry Active</span>
                      <span className="text-[9px] text-[#8C7D6C] font-mono mt-0.5 block uppercase font-semibold">Ready for generation</span>
                    </div>
                  </div>
                ) : (
                  <div className="px-3.5 py-2.5 rounded-xl border bg-creatr-pink/5 border-creatr-pink/20 flex items-center space-x-2.5 shadow-inner">
                    <Lock className="w-4.5 h-4.5 text-creatr-pink animate-pulse" />
                    <div>
                      <span className="text-xs font-sans font-bold text-creatr-pink block leading-tight uppercase tracking-wider">Locked (Needs 3 refs)</span>
                      <span className="text-[9px] text-[#8C7D6C] font-mono mt-0.5 block uppercase font-semibold">Staged from rendering</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Portraits References List */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="text-xs font-mono text-[#FAF7F2] uppercase tracking-widest block font-bold">Face Reference Maps ({selectedModel.faceReferences.length})</h4>
                  <p className="text-[10.5px] text-[#8C7D6C] mt-0.5 font-sans leading-relaxed">Exactly 3 reference images mapped to WaveSpeed in fallback prompt sequence.</p>
                </div>

                <button
                  id="model-upload-more-refs-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#15110F] border border-creatr-border hover:bg-[#1C1815] text-[10.5px] font-mono font-bold uppercase text-[#C7BDB3] hover:text-[#FAF7F2] transition-colors duration-200 select-none cursor-pointer"
                >
                  <CloudUpload className="w-3.5 h-3.5 text-creatr-pink" />
                  <span>Add Reference</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={uploadToActiveModel}
                    className="hidden"
                  />
                </button>
              </div>

              {selectedModel.faceReferences.length === 0 ? (
                <div className="p-12 border border-dashed border-creatr-border text-center rounded-2xl bg-[#120F0D]/40">
                  <Image className="w-8 h-8 text-[#8C7D6C] mx-auto mb-2" />
                  <span className="text-xs text-[#8C7D6C] font-sans font-medium">No references matching this model slug</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4.5">
                  {selectedModel.faceReferences.map((ref) => (
                    <div id={`ref-card-${ref.id}`} key={ref.id} className="aspect-[3/4] rounded-xl relative overflow-hidden bg-[#171412] border border-creatr-border hover:border-creatr-pink/40 transition-all duration-200 group">
                      <img
                        referrerPolicy="no-referrer"
                        src={ref.imageUrl}
                        alt="Face Reference"
                        className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                      
                      {/* Hover stats overlays */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A0807] via-[#0A0807]/50 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#FAF7F2] font-semibold">{ref.dimensions}</span>
                        <button
                          id={`btn-delete-ref-${ref.id}`}
                          onClick={() => deleteReference(ref.id)}
                          className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-16 text-center border border-dashed border-creatr-border rounded-2xl bg-[#120F0D]">
            <Users className="w-8 h-8 text-[#8C7D6C] mx-auto mb-3" />
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-[#8C7D6C]">Registry Is Empty</h3>
          </div>
        )}
      </div>
    </div>
  );
}

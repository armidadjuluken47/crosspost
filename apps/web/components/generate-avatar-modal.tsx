"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useCreatorToast } from "./creator/creator-toast";

const STYLE_PRESETS = [
  { key: "selfie", label: "Selfie", desc: "Handheld vlog style" },
  { key: "photo", label: "Portrait Photo", desc: "Realistic modern photo" },
  { key: "studio", label: "Studio Shot", desc: "Professional background" },
  { key: "none", label: "Digital Art", desc: "Aesthetic illustration" },
] as const;

export function GenerateAvatarModal({
  isOpen,
  onClose,
  onSetGeneratedFace,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSetGeneratedFace: (imageUrl: string) => void;
}) {
  const { showToast } = useCreatorToast();

  if (!isOpen) return null;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-cp-ink/50 p-4 backdrop-blur-sm">
      <div className="animate-scale-up relative max-h-[90vh] w-full max-w-[500px] overflow-y-auto rounded-2xl border border-cp-line bg-cp-card p-6 shadow-xl md:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-2xl border border-cp-line bg-cp-bg text-cp-muted transition-colors hover:bg-black/5 hover:text-cp-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <span className="inline-flex items-center gap-1 rounded-2xl bg-cp-accent/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-cp-accent">
            <Sparkles className="h-2 w-2" /> AI Portrait Lab
          </span>
          <h3 className="cp-display mt-3 text-xl font-semibold tracking-tight text-cp-ink">
            Generate an AI avatar
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-cp-muted">
            Coming soon — for Phase 1, upload a real selfie for best face-swap results.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          {STYLE_PRESETS.map((preset) => (
            <div key={preset.key} className="cp-well p-3 text-left opacity-60">
              <p className="text-xs font-bold text-cp-ink">{preset.label}</p>
              <p className="text-[10px] text-cp-muted">{preset.desc}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled
          className="cp-btn mt-6 w-full opacity-55"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Generator not wired yet
        </button>

        <button
          type="button"
          onClick={() => {
            onSetGeneratedFace(
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
            );
            showToast("Sample avatar selected — still upload a photo file to generate.", "success");
            onClose();
          }}
          className="cp-btn cp-btn-ghost mt-3 w-full"
        >
          Use sample preview image
        </button>
      </div>
    </div>
  );
}

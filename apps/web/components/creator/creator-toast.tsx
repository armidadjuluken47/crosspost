"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Check, ShieldAlert, X } from "lucide-react";

type ToastType = "success" | "error";

type ToastState = { message: string; type: ToastType } | null;

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void;
} | null>(null);

export function CreatorToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div
          className={`fixed bottom-6 right-4 z-50 flex max-w-[calc(100vw-2rem)] animate-slide-up items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg sm:right-6 ${
            toast.type === "success"
              ? "border-cp-ink/20 bg-cp-ink text-cp-bg"
              : "border-cp-accent/40 bg-cp-accent text-white"
          }`}
        >
          {toast.type === "success" ? (
            <span className="rounded-xl bg-cp-success/25 p-1.5 text-emerald-300">
              <Check className="h-3.5 w-3.5" />
            </span>
          ) : (
            <span className="rounded-xl bg-white/20 p-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/60 transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useCreatorToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useCreatorToast must be used within CreatorToastProvider");
  }
  return context;
}

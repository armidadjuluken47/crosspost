"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  function select(next: Theme) {
    setTheme(next);
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {!compact ? (
        <span className="block text-center font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Appearance
        </span>
      ) : null}
      <div className="flex justify-center gap-2">
        <button
          type="button"
          className={theme === "lavender" ? "filter-chip filter-chip-active" : "filter-chip"}
          onClick={() => select("lavender")}
          aria-pressed={theme === "lavender"}
        >
          <Sun className="h-3.5 w-3.5" />
          Lavender
        </button>
        <button
          type="button"
          className={theme === "dark" ? "filter-chip filter-chip-active" : "filter-chip"}
          onClick={() => select("dark")}
          aria-pressed={theme === "dark"}
        >
          <Moon className="h-3.5 w-3.5" />
          Dark
        </button>
      </div>
    </div>
  );
}

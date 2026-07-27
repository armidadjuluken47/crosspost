"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "lavender" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
} | null>(null);

const STORAGE_KEY = "crosspost-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "lavender";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "lavender" ? stored : "lavender";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function toggleTheme() {
    setTheme(theme === "lavender" ? "dark" : "lavender");
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "crosspost_theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function persistChoice(next: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore (private mode, etc.).
  }
  // Cookie lets the server render the correct data-theme on first paint (no FOUC).
  document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function CreatorThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  /** Resolved from the theme cookie on the server; undefined when the user has no explicit choice yet. */
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? "light");
  // Whether the user has an explicit stored preference (vs. following the OS).
  const explicitRef = useRef<boolean>(initialTheme != null);

  useEffect(() => {
    if (explicitRef.current) return;

    // Migrate an older localStorage-only choice (from before the cookie existed).
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
    if (stored === "light" || stored === "dark") {
      explicitRef.current = true;
      setThemeState(stored);
      persistChoice(stored);
      return;
    }

    // No explicit choice — follow the OS preference and keep following live changes.
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      if (!explicitRef.current) setThemeState(mql.matches ? "dark" : "light");
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    explicitRef.current = true;
    setThemeState(next);
    persistChoice(next);
  }, []);

  const toggleTheme = useCallback(() => {
    explicitRef.current = true;
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      persistChoice(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useCreatorTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useCreatorTheme must be used within CreatorThemeProvider");
  }
  return ctx;
}

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-secondary"
      title={theme === "lavender" ? "Switch to dark mode" : "Switch to lavender mode"}
    >
      {theme === "lavender" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      <span>{theme === "lavender" ? "Dark" : "Lavender"}</span>
    </button>
  );
}

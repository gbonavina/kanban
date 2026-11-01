import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "kanban-theme";
const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)");

// The choice lives in this browser only: it's a display preference, not board data.
function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage: the toggle still works for this visit.
  }
}

/**
 * The current theme and a toggle. Until the user picks one, it follows the
 * system setting (and keeps following it if that changes).
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => savedTheme() ?? (systemDark().matches ? "dark" : "light"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const media = systemDark();
    const follow = () => savedTheme() === null && setTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    saveTheme(next);
    setTheme(next);
  }

  return { theme, toggle };
}

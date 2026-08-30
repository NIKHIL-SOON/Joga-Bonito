import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "mm-theme";
const TEXT_SCALE_KEY = "mm-text-scale";
const ThemeContext = createContext(null);

function getInitialTheme() {
  // Always defaults to light — dark mode is opt-in only via the toggle,
  // it never auto-follows the OS/browser's prefers-color-scheme setting.
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable — fall through to the light default
  }
  return "light";
}

function getInitialTextScale() {
  try {
    const stored = localStorage.getItem(TEXT_SCALE_KEY);
    if (stored === "large") return "large";
  } catch {
    // ignore
  }
  return "normal";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const [textScale, setTextScale] = useState(getInitialTextScale);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // best-effort persistence only
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("mm-large-text", textScale === "large");
    try {
      localStorage.setItem(TEXT_SCALE_KEY, textScale);
    } catch {
      // best-effort persistence only
    }
  }, [textScale]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const toggleTextScale = () => setTextScale((s) => (s === "large" ? "normal" : "large"));

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, textScale, setTextScale, toggleTextScale }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

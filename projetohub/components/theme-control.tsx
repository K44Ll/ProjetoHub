"use client";

import { useEffect, useSyncExternalStore } from "react";

const themes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "dark-oled", label: "Dark OLED" },
  { value: "neon", label: "Neon" },
  { value: "tokyo-lights", label: "Tokyo Lights" },
  { value: "black-green", label: "Black Green" },
  { value: "black-purple", label: "Black Purple" },
] as const;

type Theme = (typeof themes)[number]["value"];

const themeStorageKey = "projetohub-theme:v1";
const themeEvent = "projetohub-theme-change";

function isTheme(value: string | null): value is Theme {
  return themes.some((theme) => theme.value === value);
}

function getThemeSnapshot(): Theme {
  const savedTheme = window.localStorage.getItem(themeStorageKey);
  return isTheme(savedTheme) ? savedTheme : "light";
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener(themeEvent, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(themeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function ThemeControl() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => "light",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function handleThemeChange(nextTheme: Theme) {
    window.localStorage.setItem(themeStorageKey, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.dispatchEvent(new Event(themeEvent));
  }

  return (
    <label className="theme-control">
      <span className="sr-only">Escolher tema</span>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 9 9c0-.7-.08-1.39-.24-2.05a1 1 0 0 0-1.42-.65 4.15 4.15 0 0 1-5.64-5.64 1 1 0 0 0-.65-1.42A9.2 9.2 0 0 0 12 3Z" />
      </svg>
      <select
        value={theme}
        onChange={(event) => handleThemeChange(event.target.value as Theme)}
        aria-label="Escolher tema"
      >
        {themes.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg className="theme-chevron" viewBox="0 0 20 20" aria-hidden="true">
        <path d="m6 8 4 4 4-4" />
      </svg>
    </label>
  );
}

"use client";

/**
 * 使用者偏好（存在 localStorage，每台裝置各自保存）
 * API 金鑰沿用舊版的 gemini_api_key，升級後不必重新輸入
 */
import { useSyncExternalStore } from "react";
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL,
  type ImageSize,
  type ThinkingLevelName,
} from "@/lib/gemini/models";

export type ThemePreference = "light" | "dark" | "system";

export interface Preferences {
  apiKey: string;
  theme: ThemePreference;
  concurrency: number;
  imageModel: string;
  textModel: string;
  imageSize: ImageSize;
  thinkingLevel?: ThinkingLevelName;
}

const KEYS: Record<keyof Preferences, string> = {
  apiKey: "gemini_api_key",
  theme: "theme",
  concurrency: "pref_concurrency",
  imageModel: "pref_image_model",
  textModel: "pref_text_model",
  imageSize: "pref_image_size",
  thinkingLevel: "pref_thinking_level",
};

const DEFAULTS: Preferences = {
  apiKey: "",
  theme: "system",
  concurrency: 1,
  imageModel: DEFAULT_IMAGE_MODEL,
  textModel: DEFAULT_TEXT_MODEL,
  imageSize: "2K",
  thinkingLevel: undefined,
};

function read(): Preferences {
  if (typeof window === "undefined") return DEFAULTS;
  const get = (key: keyof Preferences) => {
    try {
      return localStorage.getItem(KEYS[key]);
    } catch {
      return null;
    }
  };
  const concurrency = Number(get("concurrency"));
  return {
    apiKey: get("apiKey") ?? "",
    theme: (get("theme") as ThemePreference) || DEFAULTS.theme,
    concurrency: Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 4 ? concurrency : DEFAULTS.concurrency,
    imageModel: get("imageModel") || DEFAULTS.imageModel,
    textModel: get("textModel") || DEFAULTS.textModel,
    imageSize: (get("imageSize") as ImageSize) || DEFAULTS.imageSize,
    thinkingLevel: (get("thinkingLevel") as ThinkingLevelName) || undefined,
  };
}

let snapshot: Preferences = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    snapshot = read();
    loaded = true;
  }
}

export function getPreferences(): Preferences {
  ensureLoaded();
  return snapshot;
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
  ensureLoaded();
  snapshot = { ...snapshot, [key]: value };
  try {
    if (value === undefined || value === "") localStorage.removeItem(KEYS[key]);
    else localStorage.setItem(KEYS[key], String(value));
  } catch {
    // 私密模式等情況寫不進去，只保留在記憶體
  }
  if (key === "theme") applyTheme(value as ThemePreference);
  for (const listener of listeners) listener();
}

export function applyTheme(theme: ThemePreference): void {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences, () => DEFAULTS);
}

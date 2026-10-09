"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import zhMessages from "@/locales/zh.json";
import enMessages from "@/locales/en.json";
import type { Locale } from "@/types";

export type { Locale };

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** 以點分隔的 key 取字串，{name} 會被 vars 取代 */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY = "locale";
const MESSAGES: Record<Locale, unknown> = { zh: zhMessages, en: enMessages };

function lookup(messages: unknown, path: string): string | undefined {
  let current: unknown = messages;
  for (const key of path.split(".")) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // ignore
  }
  return (navigator.language || "").startsWith("zh") ? "zh" : "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // SSR 一律先用中文渲染，掛載後再依偏好切換（不再整頁回傳 null）
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const detected = detectLocale();
    if (detected !== "zh") setLocaleState(detected);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-TW" : "en";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const raw = lookup(MESSAGES[locale], key) ?? lookup(MESSAGES.zh, key) ?? key;
      if (!vars) return raw;
      return raw.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within a LocaleProvider");
  return context;
}

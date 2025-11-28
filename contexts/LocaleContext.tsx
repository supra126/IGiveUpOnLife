"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import zhMessages from "@/locales/zh.json";
import enMessages from "@/locales/en.json";

export type Locale = "zh" | "en";

type Messages = typeof zhMessages;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string) => string;
  messages: Messages;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const STORAGE_KEY = "locale";

const messagesMap: Record<Locale, Messages> = {
  zh: zhMessages,
  en: enMessages,
};

/**
 * Detect user's preferred language from browser settings
 */
function detectBrowserLanguage(): Locale {
  if (typeof navigator === "undefined") return "en";

  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || "";

  // Check if it's any Chinese variant
  if (browserLang.startsWith("zh")) {
    return "zh";
  }

  return "en";
}

/**
 * Get nested value from object by dot-separated path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return key if path not found
    }
  }

  return typeof current === "string" ? current : path;
}

interface LocaleProviderProps {
  children: React.ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize locale on mount
  useEffect(() => {
    // Check localStorage first
    const storedLocale = localStorage.getItem(STORAGE_KEY) as Locale | null;

    if (storedLocale && (storedLocale === "zh" || storedLocale === "en")) {
      setLocaleState(storedLocale);
    } else {
      // Detect from browser if not stored
      const detectedLocale = detectBrowserLanguage();
      setLocaleState(detectedLocale);
    }

    setIsInitialized(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    const newLocale = locale === "zh" ? "en" : "zh";
    setLocale(newLocale);
  }, [locale, setLocale]);

  const messages = messagesMap[locale];

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(messages as unknown as Record<string, unknown>, key);
    },
    [messages]
  );

  // Prevent hydration mismatch by not rendering until initialized
  if (!isInitialized) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t, messages }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

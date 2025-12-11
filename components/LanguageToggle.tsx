"use client";

import React from "react";
import { useLocale } from "@/contexts/LocaleContext";

export const LanguageToggle: React.FC = () => {
  const { locale, toggleLocale, t } = useLocale();

  return (
    <button
      onClick={toggleLocale}
      className="text-gray-400 hover:text-white text-xs sm:text-sm font-bold transition-colors"
      title={locale === "zh" ? "Switch to English" : "切換至繁體中文"}
    >
      {t(`language.${locale}`)}
    </button>
  );
};

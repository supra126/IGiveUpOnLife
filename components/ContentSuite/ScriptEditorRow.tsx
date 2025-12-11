"use client";

import React from "react";
import { ContentSet, ArrangementStyle } from "@/types";
import { Spinner } from "@/components/Spinner";
import { getRatioColor } from "@/lib/ratio-utils";
import {
  getArrangementOptions,
  getCommercialPlaceholder,
} from "@/lib/arrangement-utils";

interface ScriptEditorRowProps {
  contentSet: ContentSet;
  onChange: (id: string, field: keyof ContentSet, value: string | ArrangementStyle) => void;
  onRegeneratePrompt: (id: string) => void;
  isRegenerating: boolean;
  t: (key: string) => string;
  locale: "zh" | "en";
}

export const ScriptEditorRow: React.FC<ScriptEditorRowProps> = React.memo(({
  contentSet,
  onChange,
  onRegeneratePrompt,
  isRegenerating,
  t,
  locale,
}) => {
  const ARRANGEMENT_OPTIONS = getArrangementOptions(locale);

  return (
    <div className="bg-[#1e1e24] border border-white/5 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${getRatioColor(contentSet.ratio)}`}
          >
            {t("contentSuite.plan")} {contentSet.set_number}
          </span>
        </div>
        <button
          onClick={() => onRegeneratePrompt(contentSet.id)}
          disabled={isRegenerating}
          className="text-xs px-2 py-1 bg-linear-to-r from-green-600 to-emerald-600 hover:opacity-90 text-white font-bold rounded-full transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          title={t("contentSuite.regeneratePrompt")}
        >
          {isRegenerating ? (
            <Spinner className="w-3 h-3" />
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </button>
      </div>

      <div className="space-y-3">
        {/* Title */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            {t("contentSuite.titleLabel")}
          </label>
          <textarea
            value={contentSet.title}
            onChange={(e) => onChange(contentSet.id, "title", e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none resize-none h-12"
          />
        </div>

        {/* Copy */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            {t("contentSuite.copyLabel")}
          </label>
          <textarea
            value={contentSet.copy}
            onChange={(e) => onChange(contentSet.id, "copy", e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none resize-none h-16"
          />
        </div>

        {/* 商業攝影專用：排列方式選擇 */}
        {contentSet.ratio === "1:1-commercial" && (
          <div>
            <label className="block text-xs text-amber-400 mb-1">
              {t("contentSuite.arrangement")}
            </label>
            <div className="grid grid-cols-5 gap-1">
              {ARRANGEMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onChange(contentSet.id, "arrangement_style", option.value)}
                  className={`px-1 py-1 text-[9px] rounded transition-all ${
                    (contentSet.arrangement_style || "single") === option.value
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-black/30 text-gray-400 hover:bg-amber-500/20 hover:text-amber-300 border border-white/10"
                  }`}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 構圖摘要 */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            {t("contentSuite.visualSummary")}
          </label>
          <textarea
            value={contentSet.visual_summary}
            onChange={(e) => onChange(contentSet.id, "visual_summary", e.target.value)}
            placeholder={
              contentSet.ratio === "1:1-commercial"
                ? getCommercialPlaceholder(contentSet.arrangement_style || "single", locale)
                : t("contentSuite.visualSummaryPlaceholder")
            }
            className={`w-full bg-black/30 border rounded px-2 py-1.5 text-xs focus:outline-none resize-none h-16 ${
              contentSet.ratio === "1:1-commercial"
                ? "border-amber-500/30 text-amber-200 focus:border-amber-500 placeholder:text-amber-500/50"
                : "border-white/10 text-gray-300 focus:border-blue-500 placeholder:text-gray-600"
            }`}
          />
        </div>

        {/* Visual Prompt */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            {t("contentSuite.visualPrompt")}
          </label>
          <textarea
            value={contentSet.visual_prompt_en}
            onChange={(e) => onChange(contentSet.id, "visual_prompt_en", e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none font-mono resize-none h-32"
          />
        </div>
      </div>
    </div>
  );
});

ScriptEditorRow.displayName = "ScriptEditorRow";

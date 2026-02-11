"use client";

import React from "react";
import { ImageRatio } from "@/types";

interface SizeCheckboxProps {
  ratio: ImageRatio;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name: string;
  ratioLabel: string;
  description: string;
  color: "blue" | "purple" | "pink" | "green" | "amber";
}

const colorClasses = {
  blue: {
    border: "border-blue-400/40",
    bg: "bg-blue-500/15",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
    checkbox: "bg-blue-400",
    text: "text-blue-100",
    accent: "text-blue-300",
    preview: "text-blue-400",
  },
  purple: {
    border: "border-purple-400/40",
    bg: "bg-purple-500/15",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    checkbox: "bg-purple-400",
    text: "text-purple-100",
    accent: "text-purple-300",
    preview: "text-purple-400",
  },
  pink: {
    border: "border-pink-400/40",
    bg: "bg-pink-500/15",
    glow: "shadow-[0_0_20px_rgba(236,72,153,0.15)]",
    checkbox: "bg-pink-400",
    text: "text-pink-100",
    accent: "text-pink-300",
    preview: "text-pink-400",
  },
  green: {
    border: "border-green-400/40",
    bg: "bg-green-500/15",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    checkbox: "bg-green-400",
    text: "text-green-100",
    accent: "text-green-300",
    preview: "text-green-400",
  },
  amber: {
    border: "border-amber-400/40",
    bg: "bg-amber-500/15",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    checkbox: "bg-amber-400",
    text: "text-amber-100",
    accent: "text-amber-300",
    preview: "text-amber-400",
  },
};

// Visual aspect ratio preview dimensions (relative sizing)
const ratioPreviewSize: Record<string, { w: number; h: number }> = {
  "1:1": { w: 28, h: 28 },
  "9:16": { w: 18, h: 32 },
  "4:5": { w: 22, h: 28 },
  "16:9": { w: 32, h: 18 },
  "1:1-commercial": { w: 28, h: 28 },
};

export const SizeCheckbox: React.FC<SizeCheckboxProps> = React.memo(({
  ratio,
  checked,
  onChange,
  name,
  ratioLabel,
  description,
  color,
}) => {
  const colors = colorClasses[color];
  const preview = ratioPreviewSize[ratio] || { w: 28, h: 28 };

  return (
    <label
      className={`
        relative cursor-pointer p-4 sm:p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-3 sm:gap-4 group h-40 sm:h-48
        ${checked
          ? `${colors.bg} ${colors.border} ${colors.glow} scale-[1.02]`
          : "bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5 hover:scale-[1.01]"
        }
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />

      {/* Selected indicator */}
      {checked && (
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3">
          <div className={`w-6 h-6 rounded-full ${colors.checkbox} flex items-center justify-center shadow-lg`}>
            <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Aspect ratio visual preview — larger */}
      <div
        className={`ratio-preview ${checked ? `ratio-preview-active ${colors.preview}` : "text-gray-600"} transition-transform group-hover:scale-110`}
        style={{ width: preview.w * 1.3, height: preview.h * 1.3 }}
      />

      <div className="text-center">
        <div className={`font-bold text-base sm:text-lg transition-colors ${checked ? colors.text : 'text-gray-300'}`}>
          {name}
        </div>
        <div className={`text-xs sm:text-sm font-mono mt-0.5 ${checked ? colors.accent : 'text-gray-500'}`}>
          {ratioLabel}
        </div>
        <div className={`text-[10px] sm:text-xs mt-1.5 ${checked ? colors.accent : 'text-gray-500'} opacity-70 hidden sm:block`}>
          {description}
        </div>
      </div>
    </label>
  );
});

SizeCheckbox.displayName = "SizeCheckbox";

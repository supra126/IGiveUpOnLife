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
  },
  purple: {
    border: "border-purple-400/40",
    bg: "bg-purple-500/15",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    checkbox: "bg-purple-400",
    text: "text-purple-100",
    accent: "text-purple-300",
  },
  pink: {
    border: "border-pink-400/40",
    bg: "bg-pink-500/15",
    glow: "shadow-[0_0_20px_rgba(236,72,153,0.15)]",
    checkbox: "bg-pink-400",
    text: "text-pink-100",
    accent: "text-pink-300",
  },
  green: {
    border: "border-green-400/40",
    bg: "bg-green-500/15",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    checkbox: "bg-green-400",
    text: "text-green-100",
    accent: "text-green-300",
  },
  amber: {
    border: "border-amber-400/40",
    bg: "bg-amber-500/15",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    checkbox: "bg-amber-400",
    text: "text-amber-100",
    accent: "text-amber-300",
  },
};

export const SizeCheckbox: React.FC<SizeCheckboxProps> = React.memo(({
  checked,
  onChange,
  name,
  ratioLabel,
  description,
  color,
}) => {
  const colors = colorClasses[color];

  return (
    <label
      className={`
        relative cursor-pointer p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-1.5 sm:gap-2 group h-28 sm:h-36
        ${checked
          ? `${colors.bg} ${colors.border} ${colors.glow}`
          : "bg-black/20 border-white/5 hover:border-white/20 hover:bg-white/5"
        }
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />

      {/* Selected indicator - checkmark instead of dot */}
      {checked && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <div className={`w-5 h-5 rounded-full ${colors.checkbox} flex items-center justify-center shadow-lg`}>
            <svg className="w-3 h-3 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      <div className="text-center">
        <div className={`font-bold text-sm sm:text-base transition-colors ${checked ? colors.text : 'text-gray-300'}`}>
          {name}
        </div>
        <div className={`text-[10px] sm:text-xs font-mono mt-0.5 ${checked ? colors.accent : 'text-gray-500'}`}>
          {ratioLabel}
        </div>
        <div className={`text-[9px] sm:text-[10px] mt-1 ${checked ? colors.accent : 'text-gray-500'} opacity-70`}>
          {description}
        </div>
      </div>
    </label>
  );
});

SizeCheckbox.displayName = "SizeCheckbox";

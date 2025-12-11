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
    border: "border-white/30",
    bg: "bg-white/10",
    glow: "",
    checkbox: "bg-white",
    text: "text-white",
  },
  purple: {
    border: "border-white/30",
    bg: "bg-white/10",
    glow: "",
    checkbox: "bg-white",
    text: "text-white",
  },
  pink: {
    border: "border-white/30",
    bg: "bg-white/10",
    glow: "",
    checkbox: "bg-white",
    text: "text-white",
  },
  green: {
    border: "border-white/30",
    bg: "bg-white/10",
    glow: "",
    checkbox: "bg-white",
    text: "text-white",
  },
  amber: {
    border: "border-white/30",
    bg: "bg-white/10",
    glow: "",
    checkbox: "bg-white",
    text: "text-white",
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
        relative cursor-pointer p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-2 sm:gap-3 group h-24 sm:h-32
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

      {/* Selected indicator */}
      {checked && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
          <div className={`w-2 h-2 rounded-full ${colors.checkbox} shadow-lg animate-pulse`}></div>
        </div>
      )}

      <div className="text-center">
        <div className={`font-bold text-sm sm:text-base transition-colors ${checked ? colors.text : 'text-gray-300'}`}>
          {name}
        </div>
        <div className="text-[10px] sm:text-xs opacity-60 font-mono mt-0.5">
          {ratioLabel}
        </div>
      </div>
    </label>
  );
});

SizeCheckbox.displayName = "SizeCheckbox";

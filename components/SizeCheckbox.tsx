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
    border: "border-blue-500",
    bg: "bg-blue-500/10",
    checkbox: "border-blue-500 bg-blue-500",
  },
  purple: {
    border: "border-purple-500",
    bg: "bg-purple-500/10",
    checkbox: "border-purple-500 bg-purple-500",
  },
  pink: {
    border: "border-pink-500",
    bg: "bg-pink-500/10",
    checkbox: "border-pink-500 bg-pink-500",
  },
  green: {
    border: "border-green-500",
    bg: "bg-green-500/10",
    checkbox: "border-green-500 bg-green-500",
  },
  amber: {
    border: "border-amber-500",
    bg: "bg-amber-500/10",
    checkbox: "border-amber-500 bg-amber-500",
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
      className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${
        checked
          ? `${colors.border} ${colors.bg}`
          : "border-white/10 bg-white/5 hover:border-white/20"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className="flex items-start gap-3">
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            checked ? colors.checkbox : "border-gray-500"
          }`}
        >
          {checked && (
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
        <div>
          <div className="font-bold text-white mb-1">{name}</div>
          <div className="text-xs text-gray-400">{ratioLabel}</div>
          <div className="text-xs text-gray-500 mt-1">{description}</div>
        </div>
      </div>
    </label>
  );
});

SizeCheckbox.displayName = "SizeCheckbox";

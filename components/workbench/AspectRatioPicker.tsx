"use client";

import React from "react";
import type { AspectRatio } from "@/lib/gemini/models";

const ORDER: AspectRatio[] = ["1:1", "4:5", "3:4", "2:3", "9:16", "5:4", "4:3", "3:2", "16:9", "21:9"];

interface Props {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  label: string;
  allowed?: readonly AspectRatio[];
}

/** 比例選擇：每個選項附上等比例的小框，直覺看出直橫 */
export function AspectRatioPicker({ value, onChange, label, allowed }: Props) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
      {ORDER.map((ratio) => {
        const [w, h] = ratio.split(":").map(Number);
        const scale = 16 / Math.max(w, h);
        const active = ratio === value;
        const disabled = allowed ? !allowed.includes(ratio) : false;
        return (
          <button
            key={ratio}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(ratio)}
            className={[
              "flex h-12 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border text-[10px] transition-colors disabled:opacity-35",
              active
                ? "border-accent bg-accent-soft text-fg"
                : "border-line text-fg-muted hover:border-line-strong hover:text-fg",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={`rounded-[2px] border ${active ? "border-accent" : "border-current"}`}
              style={{ width: w * scale, height: h * scale }}
            />
            <span className="font-mono">{ratio}</span>
          </button>
        );
      })}
    </div>
  );
}

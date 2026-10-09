"use client";

/**
 * 編輯器字型：開啟編輯器時才載入 Google Fonts，匯出前確認字型已就緒
 */
export interface EditorFont {
  family: string;
  label: string;
  weights: number[];
}

export const EDITOR_FONTS: EditorFont[] = [
  { family: "Noto Sans TC", label: "思源黑體", weights: [400, 500, 700, 900] },
  { family: "Noto Serif TC", label: "思源宋體", weights: [400, 700, 900] },
  { family: "LXGW WenKai TC", label: "霞鶩文楷", weights: [400, 700] },
  { family: "Huninn", label: "粉圓", weights: [400] },
  { family: "Chiron Sung HK", label: "昭源宋體", weights: [400, 700] },
  { family: "IBM Plex Sans", label: "IBM Plex Sans", weights: [400, 500, 700] },
];

export const DEFAULT_FONT = EDITOR_FONTS[0].family;

let linked = false;

export function ensureFontStylesheet(): void {
  if (linked || typeof document === "undefined") return;
  linked = true;
  const families = EDITOR_FONTS.map(
    (f) => `family=${encodeURIComponent(f.family).replace(/%20/g, "+")}:wght@${f.weights.join(";")}`
  ).join("&");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  document.head.appendChild(link);
}

export function nearestWeight(family: string, weight: number): number {
  const font = EDITOR_FONTS.find((f) => f.family === family);
  if (!font) return weight;
  return font.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best), font.weights[0]);
}

/** 只載入實際用到的字（Google Fonts 依 unicode-range 分片） */
export async function loadFontsFor(items: { family: string; weight: number; text: string }[]): Promise<boolean> {
  if (typeof document === "undefined" || !document.fonts) return true;
  ensureFontStylesheet();
  try {
    await Promise.all(
      items.map((item) => document.fonts.load(`${item.weight} 48px "${item.family}"`, item.text || "A"))
    );
    return true;
  } catch {
    return false;
  }
}

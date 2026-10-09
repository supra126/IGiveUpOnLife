/**
 * Gemini 模型註冊表
 *
 * 前後端共用（不可 import next/* 或讀 process.env 以外的 server-only 資源）。
 * 每個模型宣告它支援的尺寸 / 比例 / thinking level，UI 與 API 都用同一份資料做選項過濾。
 */

export const ASPECT_RATIOS = [
  "1:1",
  "4:5",
  "5:4",
  "3:4",
  "4:3",
  "2:3",
  "3:2",
  "9:16",
  "16:9",
  "21:9",
] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const IMAGE_SIZES = ["1K", "2K", "4K"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export const THINKING_LEVELS = ["minimal", "low", "medium", "high"] as const;
export type ThinkingLevelName = (typeof THINKING_LEVELS)[number];

export type ModelStability = "stable" | "preview";

export interface ImageModelSpec {
  id: string;
  label: string;
  /** i18n key 後綴：models.<descKey> */
  descKey: string;
  tier: "lite" | "standard" | "pro";
  sizes: readonly ImageSize[];
  defaultSize: ImageSize;
  aspectRatios: readonly AspectRatio[];
  maxRefImages: number;
  thinkingLevels?: readonly ThinkingLevelName[];
  stability: ModelStability;
}

export interface TextModelSpec {
  id: string;
  label: string;
  descKey: string;
  stability: ModelStability;
}

export const IMAGE_MODELS: readonly ImageModelSpec[] = [
  {
    id: "gemini-nano-banana-2.1",
    label: "Nano Banana 2.1",
    descKey: "nanoBanana21",
    tier: "standard",
    sizes: ["1K", "2K", "4K"],
    defaultSize: "2K",
    aspectRatios: ASPECT_RATIOS,
    maxRefImages: 14,
    thinkingLevels: ["minimal", "medium", "high"],
    stability: "stable",
  },
  {
    id: "gemini-3-pro-image",
    label: "Nano Banana Pro",
    descKey: "nanoBananaPro",
    tier: "pro",
    sizes: ["1K", "2K", "4K"],
    defaultSize: "2K",
    aspectRatios: ASPECT_RATIOS,
    maxRefImages: 14,
    stability: "stable",
  },
  {
    id: "gemini-3.1-flash-lite-image",
    label: "Nano Banana 2 Lite",
    descKey: "nanoBananaLite",
    tier: "lite",
    sizes: ["1K"],
    defaultSize: "1K",
    aspectRatios: ASPECT_RATIOS,
    maxRefImages: 3,
    thinkingLevels: ["minimal", "high"],
    stability: "stable",
  },
];

export const TEXT_MODELS: readonly TextModelSpec[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    descKey: "flash38",
    stability: "stable",
  },
  {
    id: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro",
    descKey: "pro31",
    stability: "preview",
  },
];

export const DEFAULT_IMAGE_MODEL = "gemini-nano-banana-2.1";
export const DEFAULT_TEXT_MODEL = "gemini-3.8-flash";

/**
 * 註冊表外的模型（例如用 env 指定的新模型）給一個寬鬆的 spec，
 * 讓 API 自己決定是否接受，不在前端擋掉。
 */
function fallbackImageSpec(id: string): ImageModelSpec {
  return {
    id,
    label: id,
    descKey: "custom",
    tier: "standard",
    sizes: IMAGE_SIZES,
    defaultSize: "2K",
    aspectRatios: ASPECT_RATIOS,
    maxRefImages: 3,
    stability: "preview",
  };
}

export function getImageModelSpec(id: string | undefined): ImageModelSpec {
  const target = id || DEFAULT_IMAGE_MODEL;
  return IMAGE_MODELS.find((m) => m.id === target) ?? fallbackImageSpec(target);
}

export function getTextModelSpec(id: string | undefined): TextModelSpec {
  const target = id || DEFAULT_TEXT_MODEL;
  return (
    TEXT_MODELS.find((m) => m.id === target) ?? {
      id: target,
      label: target,
      descKey: "custom",
      stability: "preview",
    }
  );
}

export function isAspectRatio(value: string): value is AspectRatio {
  return (ASPECT_RATIOS as readonly string[]).includes(value);
}

/**
 * 把使用者選的尺寸 / 比例 / thinking 收斂到模型支援的範圍
 */
export function clampImageOptions(
  spec: ImageModelSpec,
  options: { size?: ImageSize; aspectRatio?: AspectRatio; thinkingLevel?: ThinkingLevelName }
): { size: ImageSize; aspectRatio: AspectRatio; thinkingLevel?: ThinkingLevelName } {
  const size = options.size && spec.sizes.includes(options.size) ? options.size : spec.defaultSize;
  const aspectRatio =
    options.aspectRatio && spec.aspectRatios.includes(options.aspectRatio)
      ? options.aspectRatio
      : "1:1";
  const thinkingLevel =
    options.thinkingLevel && spec.thinkingLevels?.includes(options.thinkingLevel)
      ? options.thinkingLevel
      : undefined;
  return { size, aspectRatio, thinkingLevel };
}

/** 解析逗號分隔的白名單 env，空值代表不限制 */
export function parseModelAllowlist(value: string | undefined): string[] | null {
  if (!value || !value.trim()) return null;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

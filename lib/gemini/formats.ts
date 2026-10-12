/**
 * 完整企劃流程的輸出版型
 *
 * 版型（Format）和 API 的比例（AspectRatio）分開：
 * "1:1-commercial" 是「1:1 + 商業攝影規則」，不是一種比例。
 */
import type { AspectRatio } from "./models";
import type { ImageRatio } from "@/types";

export type FormatId = ImageRatio;

export interface FormatSpec {
  id: FormatId;
  aspectRatio: AspectRatio;
  /** 給規劃 prompt 用的尺寸描述 */
  promptRequirement: string;
  /** 生圖時額外附加的硬性規則 */
  imageAddon?: string;
}

const COMMERCIAL_RULE =
  "MANDATORY: CLEAN SOLID WHITE (#ffffff) OR LIGHT GRAY (#f6f6f6) BACKGROUND ONLY. NO colored backgrounds, NO gradients, NO props, NO plants, NO patterns. Professional studio lighting, sharp focus, commercial e-commerce product photography.";

export const FORMATS: Record<FormatId, FormatSpec> = {
  "1:1": {
    id: "1:1",
    aspectRatio: "1:1",
    promptRequirement: "Square 1:1, product centered",
  },
  "9:16": {
    id: "9:16",
    aspectRatio: "9:16",
    promptRequirement: "Vertical 9:16 mobile layout, product centered",
  },
  "4:5": {
    id: "4:5",
    aspectRatio: "4:5",
    promptRequirement: "Vertical 4:5 feed layout, product centered",
  },
  "16:9": {
    id: "16:9",
    aspectRatio: "16:9",
    promptRequirement: "Horizontal 16:9 banner, product centered",
  },
  "1:1-commercial": {
    id: "1:1-commercial",
    aspectRatio: "1:1",
    promptRequirement: `Square 1:1, ${COMMERCIAL_RULE} Product centered`,
    imageAddon: COMMERCIAL_RULE,
  },
};

export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

export function formatToAspectRatio(id: string | undefined): AspectRatio {
  return (id && FORMATS[id as FormatId]?.aspectRatio) || "1:1";
}

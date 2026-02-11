/**
 * Prompt templates for AI generation
 * Consolidated prompt components for visual generation
 */

import { ImageRatio } from "@/types";

/**
 * Product protection instruction (强化版)
 */
export const PRODUCT_PROTECTION_PROMPT =
  "CRITICAL: The product in the reference image is SACRED and MUST NOT be altered. Preserve EXACT packaging, colors, labels, text, shape. ONLY modify: background, lighting, props AROUND the product.";

/**
 * Negative prompt to avoid common issues
 */
export const NEGATIVE_PROMPT =
  "AVOID: distorted product, modified packaging, wrong text/labels, simplified Chinese, blurry details, unnatural proportions, extra watermarks, low quality.";

/**
 * Ratio requirements for visual prompts (simplified for token efficiency)
 */
export const RATIO_REQUIREMENTS: Record<ImageRatio, string> = {
  "1:1": "Square 1:1, product centered",
  "9:16": "Vertical 9:16 mobile layout, product centered",
  "4:5": "Vertical 4:5 IG optimized, product centered",
  "16:9": "Horizontal 16:9 banner, product centered",
  "1:1-commercial":
    "Square 1:1, CLEAN SOLID WHITE OR LIGHT GRAY BACKGROUND ONLY (#f6f6f6 or #ffffff), NO props, NO decorations, NO colored backgrounds, NO gradients, professional studio lighting, sharp focus, commercial e-commerce product photography, product centered",
};

/**
 * Aspect ratio descriptions for prompts
 */
export const ASPECT_RATIO_DESCRIPTIONS: Record<"1:1" | "9:16" | "4:5" | "16:9", string> = {
  "1:1": "1:1 square format",
  "9:16": "9:16 vertical format for mobile screens",
  "4:5": "4:5 vertical format optimized for Instagram",
  "16:9": "16:9 horizontal widescreen format",
};

/**
 * Font weight mapping for text overlay
 */
export const FONT_WEIGHT_MAP: Record<string, string> = {
  regular: "Regular (400)",
  medium: "Medium (500)",
  bold: "Bold (700)",
  black: "Black (900)",
};

/**
 * Generate visual prompt regeneration system prompt
 */
export function getVisualPromptSystemPrompt(
  titleZh: string,
  copyZh: string,
  ratio: ImageRatio,
  sizeLabel: string,
  visualSummaryZh?: string
): string {
  const ratioRequirement = RATIO_REQUIREMENTS[ratio];
  const visualSummarySection = visualSummaryZh
    ? `\n- 構圖摘要 (Visual Summary): ${visualSummaryZh}\n\n**重要：請務必根據「構圖摘要」的描述來生成視覺提示詞，這是使用者指定的視覺方向。**`
    : "";

  return `你是一位專業的視覺設計 Prompt 工程師。

你的任務是根據提供的「中文標題」、「中文文案」和「構圖摘要」，生成一個專業的英文視覺提示詞 (Visual Prompt)，用於 Gemini 3 Pro Image 生成圖片。

**輸入資訊：**
- 標題 (Title): ${titleZh}
- 文案 (Copy): ${copyZh}
- 圖片尺寸: ${ratio} (${sizeLabel})${visualSummarySection}

**核心要求：**
1. **產品保護（最重要）**：${PRODUCT_PROTECTION_PROMPT}
2. **只調整背景和氛圍**：根據標題、文案和構圖摘要調整「背景、光線、道具、氛圍」
3. 必須包含尺寸規範：${ratioRequirement}
4. ${visualSummaryZh ? "**構圖摘要優先級最高，必須完全遵循**" : ""}${ratio === "1:1-commercial" ? "\n5. **⚠️ 商業攝影硬性規則**：背景只能是純白(#ffffff)或淺灰(#f6f6f6)，禁止任何彩色/漸層/裝飾/道具/植物/圖案，只允許調整燈光角度和產品擺放" : ""}

**Prompt 寫作指南：**
- 開頭：${PRODUCT_PROTECTION_PROMPT}
- 尺寸：${ratioRequirement}
- 結尾：${NEGATIVE_PROMPT}
- Prompt 總長度控制在 100-150 英文字內
- 只輸出英文 Prompt 文字，不要包含任何其他說明

**範例格式：**
"${PRODUCT_PROTECTION_PROMPT} ${ratioRequirement}, [background], [lighting], [mood]. ${NEGATIVE_PROMPT}"`;
}

/**
 * Generate multi-product composition prompt addition (simplified)
 */
export function getMultiProductPrompt(): string {
  return " MULTI-PRODUCT: Place both products together naturally - primary centered, secondary complementing. Both maintain original appearance.";
}

/**
 * Generate brand logo placement prompt addition (simplified)
 */
export function getBrandLogoPrompt(): string {
  return " Place brand logo in corner subtly.";
}

/**
 * Generate text overlay prompt addition
 */
export function getTextOverlayPrompt(
  titleText: string,
  copyText: string,
  titleWeight: string = "bold",
  copyWeight: string = "regular"
): string {
  const titleWeightStr = FONT_WEIGHT_MAP[titleWeight] || "Bold (700)";
  const copyWeightStr = FONT_WEIGHT_MAP[copyWeight] || "Regular (400)";

  return `\n\n【TEXT OVERLAY - CRITICAL INSTRUCTIONS】
Overlay the following Traditional Chinese text on the image:
- Title: "${titleText}" (Font: Noto Sans TC ${titleWeightStr})
- Copy: "${copyText}" (Font: Noto Sans TC ${copyWeightStr})

CRITICAL TEXT RENDERING RULES:
1. Render EXACT characters as provided - do NOT approximate, substitute, or hallucinate any characters
2. Each Chinese character must be pixel-perfect with correct strokes
3. Use proper Traditional Chinese (繁體中文) character forms, NOT Simplified Chinese
4. Typography must be clean, sharp, and legible at 4K resolution
5. Position text with appropriate contrast against background
6. Maintain consistent character spacing and line height`;
}

/**
 * Generate reference-based image prompt based on similarity level
 * Includes product protection and negative prompts
 */
export function getReferenceBasedPrompt(
  similarity: number,
  aspectRatioDesc: string
): string {
  const basePrompt = PRODUCT_PROTECTION_PROMPT;

  let stylePrompt: string;
  if (similarity >= 70) {
    stylePrompt = `Match reference: composition, lighting, colors, background. ${aspectRatioDesc}.`;
  } else if (similarity >= 40) {
    stylePrompt = `Follow reference mood and colors, but create new composition. ${aspectRatioDesc}.`;
  } else {
    stylePrompt = `Loosely inspired by reference colors/atmosphere only. New creative composition. ${aspectRatioDesc}.`;
  }

  return `${basePrompt} ${stylePrompt} ${NEGATIVE_PROMPT}`;
}

/**
 * Prompt templates for AI generation
 */

import { ImageRatio } from "@/types";

/**
 * Ratio requirements for visual prompts
 */
export const RATIO_REQUIREMENTS: Record<ImageRatio, string> = {
  "1:1": "Square composition, 1:1 aspect ratio",
  "9:16": "Vertical composition, 9:16 aspect ratio, mobile screen layout",
  "4:5": "Vertical composition, 4:5 aspect ratio, Instagram feed optimized",
  "16:9":
    "Horizontal composition, 16:9 aspect ratio, widescreen layout, banner format",
  "1:1-commercial":
    "Professional commercial photography, square composition, 1:1 aspect ratio, CLEAN SOLID COLOR BACKGROUND (light gray #f6f6f6 or pure white #ffffff), NO props NO decorations NO distracting elements, studio lighting setup with soft diffused light, high-end DSLR camera quality (Canon EOS R5 or Sony A7R IV style), product as the ABSOLUTE focal point centered in frame, sharp focus on product details and texture, minimal harsh shadows, commercial e-commerce product photography aesthetic, high resolution, professional color grading, simple minimalist composition",
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
1. **必須保持產品原貌**：使用者會提供產品參考圖，生成的圖片必須「保留產品的完整外觀、包裝設計、顏色、形狀」，不可改變產品本身
2. **只調整背景和氛圍**：根據標題、文案和構圖摘要調整「背景、光線、道具、氛圍」，但產品本身必須維持原樣
3. 必須包含尺寸規範：${ratioRequirement}
4. ${visualSummaryZh ? "**最重要：構圖摘要中的指示優先級最高，必須完全遵循**" : ""}

**Prompt 寫作指南：**
- 在 Prompt 開頭加上：KEEP THE PRODUCT EXACTLY AS SHOWN IN THE REFERENCE IMAGE, DO NOT MODIFY THE PRODUCT ITSELF
- 使用 "product placement in center" 確保產品位置正確
- 描述背景、光線、氛圍時，明確說明「around the product」或「in the background」
- 使用專業的攝影和設計術語（英文）
- 只輸出英文 Prompt 文字，不要包含任何其他說明

**範例格式：**
"KEEP THE PRODUCT EXACTLY AS SHOWN IN THE REFERENCE IMAGE, DO NOT MODIFY THE PRODUCT ITSELF. ${ratioRequirement}, product placement in center, [background description], [lighting description around the product], [mood and atmosphere], [additional props or elements in the background]"`;
}

/**
 * Generate multi-product composition prompt addition
 */
export function getMultiProductPrompt(): string {
  return `\n\nIMPORTANT - MULTI-PRODUCT COMPOSITION: This image features TWO products that must appear together naturally in the same scene.
- PRIMARY PRODUCT (first image): Main focus, placed prominently in center or foreground
- SECONDARY PRODUCT (second image): Supporting element, placed naturally alongside, emerging from, or complementing the primary product
- Create a cohesive lifestyle/gift composition where both products appear together harmoniously
- Both products should maintain their original appearance and details
- The scene should tell a story of how these products relate to each other`;
}

/**
 * Generate brand logo placement prompt addition
 */
export function getBrandLogoPrompt(): string {
  return "\n\nIMPORTANT: Place the uploaded brand logo in one of the four corners (top-left, top-right, bottom-left, or bottom-right) in a subtle, non-intrusive way. The logo should be clearly visible but not dominate the composition.";
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
 */
export function getReferenceBasedPrompt(
  similarity: number,
  aspectRatioDesc: string
): string {
  if (similarity >= 70) {
    return `Create a professional product photography image very closely following the reference image. Match the composition, object placement, layout, lighting setup, color palette, background style, and overall aesthetic. Place the product from the product image as the main subject, maintaining its original appearance. Professional commercial photography quality, ${aspectRatioDesc}.`;
  } else if (similarity >= 40) {
    return `Create a professional product photography image moderately following the reference image. Match the lighting style, color palette, and overall mood, but feel free to create a different composition and object arrangement. Place the product from the product image as the main subject, maintaining its original appearance. Professional commercial photography quality, ${aspectRatioDesc}.`;
  } else {
    return `Create a professional product photography image loosely inspired by the reference image. ONLY take inspiration from the color tone and atmospheric feeling. DO NOT copy the composition, layout, or object placement. Create a completely new and creative composition with the product as the main subject. The product should maintain its original appearance. Professional commercial photography quality, ${aspectRatioDesc}.`;
  }
}

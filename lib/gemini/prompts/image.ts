/**
 * 生圖相關的共用 prompt 片段
 */
import { FORMATS, type FormatId } from "../formats";

export const PRODUCT_PROTECTION_PROMPT =
  "CRITICAL: The product in the product image is SACRED and MUST NOT be altered. Preserve EXACT packaging, colors, labels, printed text, logos, shape and proportions. ONLY design the background, lighting and props AROUND the product.";

export const NEGATIVE_PROMPT =
  "AVOID: distorted or redrawn product, modified packaging, wrong or invented text and labels, simplified Chinese, blurry details, unnatural proportions, added captions, watermarks, borders, low quality.";

export const NO_TEXT_RULE =
  "Do NOT add any headline, caption, typography, watermark or border to the image — text will be added later by a designer.";

export const MULTI_PRODUCT_PROMPT =
  "MULTI-PRODUCT: Place both products together naturally — the primary product prominent, the secondary product complementing it. Both keep their original appearance.";

/** 用 user content 包住使用者輸入，避免被當成系統指令 */
export function wrapUserInput(tag: string, text: string): string {
  return `<${tag}>\n${text.trim()}\n</${tag}>`;
}

/**
 * 完整企劃流程：以 content set 的 visual prompt 生成圖片
 */
export function buildCampaignImagePrompt(visualPrompt: string, formatId?: FormatId, hasSecondary = false): string {
  const format = formatId ? FORMATS[formatId] : undefined;
  const sections = [
    visualPrompt.includes("SACRED") ? "" : PRODUCT_PROTECTION_PROMPT,
    visualPrompt.trim(),
    format?.imageAddon ?? "",
    hasSecondary ? MULTI_PRODUCT_PROMPT : "",
    NO_TEXT_RULE,
    visualPrompt.includes("AVOID:") ? "" : NEGATIVE_PROMPT,
  ];
  return sections.filter(Boolean).join("\n\n");
}

/**
 * 重新生成 visual prompt 的系統指令（固定內容，使用者輸入放在 user content）
 */
export const VISUAL_PROMPT_SYSTEM = `You are a professional prompt engineer for a Gemini image model.

Write ONE English image prompt for a product marketing photo, based on the user's title, copy, size requirement and (optional) visual summary.

Rules:
1. Start with: "${PRODUCT_PROTECTION_PROMPT}"
2. Describe only background, lighting, props, mood and composition around the product.
3. Include the size requirement verbatim.
4. If a visual summary is given, it is the user's chosen direction and has the highest priority.
5. Never ask for text, captions or typography in the image.
6. End with: "${NEGATIVE_PROMPT}"
7. 100–150 words. Output the prompt text only, no explanations.`;

export function buildRegeneratePromptUserText(input: {
  title: string;
  copy: string;
  formatId: FormatId;
  visualSummary?: string;
}): string {
  const format = FORMATS[input.formatId];
  const lines = [
    `Title: ${input.title}`,
    `Copy: ${input.copy}`,
    `Size requirement: ${format.promptRequirement}`,
    input.visualSummary ? `Visual summary: ${input.visualSummary}` : "",
  ].filter(Boolean);
  return `${wrapUserInput("brief", lines.join("\n"))}\n\nWrite the image prompt now.`;
}

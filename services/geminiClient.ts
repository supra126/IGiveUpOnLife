/**
 * Gemini Client - Pure client-side API calls for static build
 *
 * This module is used when BUILD_MODE=static
 * All API calls are made directly from the browser
 * Requires user to provide their own API key
 */

import { GoogleGenAI } from "@google/genai";
import { getDirectorSystemPrompt, getContentPlannerSystemPrompt, Locale } from "@/prompts";
import {
  DirectorOutput,
  ContentPlan,
  MarketingRoute,
  ProductAnalysis,
  ImageRatio,
} from "@/types";
import {
  validateDirectorOutput,
  validateContentPlan,
} from "@/lib/schemas";
import { ZodError } from "zod";

// --- Server-side i18n for error messages ---

const errorMessages = {
  zh: {
    apiKeyInvalid: "API 金鑰無效或已過期。請檢查您的金鑰設定。",
    rateLimitExceeded: "請求過於頻繁，已達到 API 限制。請稍後再試。",
    networkError: "網路連線錯誤。請檢查您的網路連線後再試。",
    requestTimeout: "請求超時。請稍後再試，或嘗試生成較簡單的內容。",
    contentBlocked: "內容被安全過濾器阻擋。請嘗試調整您的輸入內容。",
    serviceUnavailable: "AI 服務暫時無法使用。請稍後再試。",
    apiKeyMissing: "請提供 API 金鑰",
    noResponse: "Gemini 沒有回應文字",
    invalidFormat: "AI 返回了無效的格式，且自動修復失敗。請再試一次。",
    planningFailed: "Gemini 規劃失敗",
    missingContentSets: "API 返回格式錯誤：缺少 content_sets 陣列",
    missingSelectedSizes: "API 返回格式錯誤：缺少 selected_sizes 陣列",
    noImageGenerated: "未生成圖片。",
    promptRegenerateFailed: "重新生成視覺提示詞失敗",
  },
  en: {
    apiKeyInvalid: "API key is invalid or expired. Please check your key settings.",
    rateLimitExceeded: "Too many requests. API limit reached. Please try again later.",
    networkError: "Network connection error. Please check your connection and try again.",
    requestTimeout: "Request timed out. Please try again later or try generating simpler content.",
    contentBlocked: "Content was blocked by safety filters. Please adjust your input.",
    serviceUnavailable: "AI service is temporarily unavailable. Please try again later.",
    apiKeyMissing: "Please provide an API key",
    noResponse: "Gemini returned no response",
    invalidFormat: "AI returned invalid format and auto-repair failed. Please try again.",
    planningFailed: "Gemini planning failed",
    missingContentSets: "API returned invalid format: missing content_sets array",
    missingSelectedSizes: "API returned invalid format: missing selected_sizes array",
    noImageGenerated: "No image was generated.",
    promptRegenerateFailed: "Failed to regenerate visual prompt",
  },
};

function getErrorMessage(key: keyof typeof errorMessages.en, locale: Locale = "en"): string {
  return errorMessages[locale][key];
}

// --- Configuration ---

const TEXT_MODEL = "gemini-2.5-flash";
const IMAGE_MODEL = "gemini-3-pro-image-preview";
const THINKING_BUDGET = 2048;

// Resolution types and helpers
export type ResolutionLevel = "1k" | "2k" | "4k";

// Resolution to API format mapping (must be uppercase)
const RESOLUTION_API_MAP: Record<ResolutionLevel, string> = {
  "1k": "1K",
  "2k": "2K",
  "4k": "4K",
};

function getImageConfig(resolution: ResolutionLevel = "4k") {
  return {
    imageSize: RESOLUTION_API_MAP[resolution],
  };
}

// --- Helpers ---

const cleanJson = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json/, "").replace(/```$/, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```/, "").replace(/```$/, "");
  }
  return clean.trim();
};

/**
 * Attempt to repair common JSON issues from AI responses
 * - Unquoted property names: {key: "value"} -> {"key": "value"}
 * - Single quotes: {'key': 'value'} -> {"key": "value"}
 * - Trailing commas: {"key": "value",} -> {"key": "value"}
 * - Unclosed brackets/braces
 */
const repairJson = (text: string): string => {
  let repaired = text;

  // Fix unquoted property names (but not inside strings)
  // Match: { key: or , key: where key is unquoted
  repaired = repaired.replace(
    /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
    '$1"$2":'
  );

  // Fix single quotes to double quotes (careful with apostrophes in text)
  // Only replace quotes that look like JSON string delimiters
  repaired = repaired.replace(
    /:\s*'([^']*)'/g,
    ': "$1"'
  );

  // Fix trailing commas before closing brackets/braces
  repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

  // Fix missing commas between properties (common AI error)
  // Match: "value" "key" -> "value", "key"
  repaired = repaired.replace(/"\s*\n\s*"/g, '",\n"');

  // Balance unclosed brackets and braces
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;

  if (openBrackets > closeBrackets) {
    repaired = repaired + "]".repeat(openBrackets - closeBrackets);
  }
  if (openBraces > closeBraces) {
    repaired = repaired + "}".repeat(openBraces - closeBraces);
  }

  return repaired;
};

/**
 * Parse JSON with automatic repair attempts
 */
const parseJsonSafe = <T>(text: string, locale: Locale = "en"): T => {
  const cleaned = cleanJson(text);

  // First attempt: parse as-is
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Second attempt: repair and parse
    try {
      const repaired = repairJson(cleaned);
      return JSON.parse(repaired) as T;
    } catch {
      // Log for debugging
      console.error("JSON parse failed. Original text:", cleaned.substring(0, 500));
      throw new Error(getErrorMessage("invalidFormat", locale));
    }
  }
};

const isValidUrl = (string: string): boolean => {
  try {
    const url = new URL(string);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

/**
 * Retry wrapper for API calls with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const errorMessage = lastError.message.toLowerCase();
      const isRetryable =
        errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("econnreset") ||
        errorMessage.includes("enotfound") ||
        errorMessage.includes("503") ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit");

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Enhance error message for better user experience
 */
function enhanceErrorMessage(error: unknown, locale: Locale = "en"): Error {
  const originalMessage =
    error instanceof Error ? error.message : String(error);
  const lowerMessage = originalMessage.toLowerCase();

  if (
    lowerMessage.includes("api key") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("401")
  ) {
    return new Error(getErrorMessage("apiKeyInvalid", locale));
  }

  if (
    lowerMessage.includes("rate limit") ||
    lowerMessage.includes("429") ||
    lowerMessage.includes("quota")
  ) {
    return new Error(getErrorMessage("rateLimitExceeded", locale));
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("econnreset") ||
    lowerMessage.includes("enotfound")
  ) {
    return new Error(getErrorMessage("networkError", locale));
  }

  if (lowerMessage.includes("timeout")) {
    return new Error(getErrorMessage("requestTimeout", locale));
  }

  if (
    lowerMessage.includes("safety") ||
    lowerMessage.includes("blocked") ||
    lowerMessage.includes("harmful")
  ) {
    return new Error(getErrorMessage("contentBlocked", locale));
  }

  if (
    lowerMessage.includes("500") ||
    lowerMessage.includes("502") ||
    lowerMessage.includes("503")
  ) {
    return new Error(getErrorMessage("serviceUnavailable", locale));
  }

  return error instanceof Error ? error : new Error(originalMessage);
}

// --- Client API Functions ---

export interface AnalyzeProductInput {
  imageBase64: string;
  imageMimeType: string;
  productName: string;
  productInfo: string;
  productUrl: string;
  apiKey: string;
  locale?: Locale;
}

export async function analyzeProductImageClient(
  input: AnalyzeProductInput
): Promise<DirectorOutput> {
  const locale = input.locale || "en";

  if (!input.apiKey) {
    throw new Error(getErrorMessage("apiKeyMissing", locale));
  }

  const ai = new GoogleGenAI({ apiKey: input.apiKey });

  // Build context - these are AI prompt parts, kept in Chinese/English based on locale
  const contextParts: string[] = [];

  if (input.productInfo) {
    const label = locale === "en" ? "Manual input info" : "手動輸入資訊";
    contextParts.push(`${label}: ${input.productInfo}`);
  }

  if (input.productUrl && isValidUrl(input.productUrl)) {
    const urlLabel = locale === "en" ? "Product URL" : "產品網址";
    const urlNote = locale === "en"
      ? "(Note: Please infer possible brand positioning and product features based on this URL)"
      : "（注意：請根據此網址推測可能的品牌定位與產品特色）";
    contextParts.push(`${urlLabel}: ${input.productUrl}\n${urlNote}`);
  }

  const notProvided = locale === "en" ? "Not provided" : "未提供";
  const combinedContext =
    contextParts.length > 0 ? contextParts.join("\n\n") : notProvided;
  const promptText = locale === "en"
    ? `
    Product Name: ${input.productName || "Not provided"}
    Brand/Product Info: ${combinedContext}
    ${input.productUrl ? `Product URL: ${input.productUrl}` : ""}

    Please analyze the above information and image, and execute the visual marketing director analysis task.
  `
    : `
    產品名稱: ${input.productName || "未提供"}
    品牌/產品資訊: ${combinedContext}
    ${input.productUrl ? `產品網址: ${input.productUrl}` : ""}

    請根據上述資訊與圖片，執行視覺行銷總監的分析任務。
  `;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: TEXT_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                data: input.imageBase64,
                mimeType: input.imageMimeType,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          systemInstruction: getDirectorSystemPrompt(locale),
          responseMimeType: "application/json",
          temperature: 1.0,
          topP: 0.95,
        },
      })
    );

    if (!response.text) {
      throw new Error(getErrorMessage("noResponse", locale));
    }

    // Parse with automatic repair
    const rawParsed = parseJsonSafe<unknown>(response.text, locale);

    // Validate with Zod schema
    try {
      const validated = validateDirectorOutput(rawParsed);
      return validated as DirectorOutput;
    } catch (e) {
      if (e instanceof ZodError) {
        const issues = e.issues.map(i => i.message).join(", ");
        throw new Error(locale === "en"
          ? `Invalid AI response format: ${issues}`
          : `AI 回應格式無效: ${issues}`);
      }
      throw e;
    }
  } catch (e) {
    throw enhanceErrorMessage(e, locale);
  }
}

export interface GenerateContentPlanInput {
  route: MarketingRoute;
  analysis: ProductAnalysis;
  referenceCopy: string;
  selectedSizes: ImageRatio[];
  apiKey: string;
  locale?: Locale;
}

export async function generateContentPlanClient(
  input: GenerateContentPlanInput
): Promise<ContentPlan> {
    const locale = input.locale || "en";
  if (!input.apiKey) {
    throw new Error(getErrorMessage("apiKeyMissing", locale));
  }

  const ai = new GoogleGenAI({ apiKey: input.apiKey });

  const sizeLabelsZh: Record<ImageRatio, string> = {
    "1:1": "FB 貼文",
    "9:16": "限時動態 / Stories",
    "4:5": "IG 貼文",
    "16:9": "橫式貼文",
    "1:1-commercial": "商業攝影",
  };

  const sizeLabelsEn: Record<ImageRatio, string> = {
    "1:1": "FB Post",
    "9:16": "Stories",
    "4:5": "IG Post",
    "16:9": "Landscape",
    "1:1-commercial": "Commercial",
  };

  const sizeLabels = locale === "en" ? sizeLabelsEn : sizeLabelsZh;

  const sizeList = input.selectedSizes
    .map((s) => `${s} (${sizeLabels[s]})`)
    .join(", ");

  const promptText = locale === "en"
    ? `
    Selected Strategy Route: ${input.route.route_name}
    Headline: ${input.route.headline}
    Subhead: ${input.route.subhead}
    Style: ${input.route.style_brief}
    Target Audience: ${input.route.target_audience}

    Product Name: ${input.analysis.name}
    Product Features: ${input.analysis.key_features}

    Reference Copy/Competitor Info: ${input.referenceCopy || "None (please plan the best structure)"}

    Selected Image Sizes: ${sizeList}

    Please generate 3 different content sets for each selected size (JSON).
  `
    : `
    選定策略路線: ${input.route.route_name}
    主標題: ${input.route.headline}
    副標題: ${input.route.subhead}
    風格: ${input.route.style_brief}
    目標受眾: ${input.route.target_audience}

    產品名稱: ${input.analysis.name}
    產品特點: ${input.analysis.key_features}

    參考文案/競品資訊: ${input.referenceCopy || "無 (請自行規劃最佳結構)"}

    選定的圖片尺寸: ${sizeList}

    請為每個選定的尺寸生成 3 組不同的內容方案 (JSON)。
  `;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: TEXT_MODEL,
        contents: { parts: [{ text: promptText }] },
        config: {
          systemInstruction: getContentPlannerSystemPrompt(locale),
          responseMimeType: "application/json",
          temperature: 1.0,
          topP: 0.95,
          thinkingConfig: { thinkingBudget: THINKING_BUDGET },
        },
      })
    );

    if (!response.text) throw new Error(getErrorMessage("planningFailed", locale));

    // Parse with automatic repair
    const rawParsed = parseJsonSafe<unknown>(response.text, locale);

    // Validate with Zod schema
    try {
      const validated = validateContentPlan(rawParsed);
      return validated as ContentPlan;
    } catch (e) {
      if (e instanceof ZodError) {
        const issues = e.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
        throw new Error(locale === "en"
          ? `Invalid content plan format: ${issues}`
          : `內容計畫格式無效: ${issues}`);
      }
      throw e;
    }
  } catch (e) {
    throw enhanceErrorMessage(e, locale);
  }
}

export interface GenerateImageInput {
  prompt: string;
  referenceImageBase64?: string;
  aspectRatio?: ImageRatio;
  secondaryImageBase64?: string | null;
  resolution?: ResolutionLevel;
  apiKey: string;
  locale?: Locale;
}

export async function generateMarketingImageClient(
  input: GenerateImageInput
): Promise<string> {
  const locale = input.locale || "en";
  if (!input.apiKey) {
    throw new Error(getErrorMessage("apiKeyMissing", locale));
  }

  const ai = new GoogleGenAI({ apiKey: input.apiKey });

  const aspectRatio = input.aspectRatio || "1:1";
  const _apiAspectRatio: "1:1" | "9:16" | "4:5" | "16:9" =
    aspectRatio === "1:1-commercial"
      ? "1:1"
      : aspectRatio === "4:5"
        ? "4:5"
        : aspectRatio === "9:16"
          ? "9:16"
          : aspectRatio === "16:9"
            ? "16:9"
            : "1:1";

  let enhancedPrompt = input.prompt;
  if (input.secondaryImageBase64) {
    enhancedPrompt += `\n\nIMPORTANT - MULTI-PRODUCT COMPOSITION: This image features TWO products that must appear together naturally in the same scene.
- PRIMARY PRODUCT (first image): Main focus, placed prominently in center or foreground
- SECONDARY PRODUCT (second image): Supporting element, placed naturally alongside, emerging from, or complementing the primary product
- Create a cohesive lifestyle/gift composition where both products appear together harmoniously
- Both products should maintain their original appearance and details
- The scene should tell a story of how these products relate to each other`;
  }

  // Get image config for resolution
  const imageConfig = getImageConfig(input.resolution || "4k");

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [{ text: enhancedPrompt }];

  if (input.referenceImageBase64) {
    const match = input.referenceImageBase64.match(
      /^data:(image\/[a-zA-Z+]+);base64,(.+)$/
    );
    if (match) {
      parts.push({
        inlineData: {
          data: match[2],
          mimeType: match[1],
        },
      });
    }
  }

  if (input.secondaryImageBase64) {
    const secMatch = input.secondaryImageBase64.match(
      /^data:(image\/[a-zA-Z+]+);base64,(.+)$/
    );
    if (secMatch) {
      parts.push({
        inlineData: {
          data: secMatch[2],
          mimeType: secMatch[1],
        },
      });
    }
  }

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts },
        config: {
          responseModalities: ["image", "text"],
          imageConfig,
        },
      })
    );

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const content = candidates[0]?.content;
      if (content?.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error(getErrorMessage("noImageGenerated", locale));
  } catch (e) {
    throw enhanceErrorMessage(e, locale);
  }
}

export interface RegeneratePromptInput {
  titleZh: string;
  copyZh: string;
  ratio: ImageRatio;
  sizeLabel: string;
  visualSummaryZh?: string;
  apiKey: string;
  locale?: Locale;
}

export async function regenerateVisualPromptClient(
  input: RegeneratePromptInput
): Promise<string> {
  const locale = input.locale || "en";
  if (!input.apiKey) {
    throw new Error(getErrorMessage("apiKeyMissing", locale));
  }

  const ai = new GoogleGenAI({ apiKey: input.apiKey });

  const ratioRequirements: Record<ImageRatio, string> = {
    "1:1": "Square composition, 1:1 aspect ratio",
    "9:16": "Vertical composition, 9:16 aspect ratio, mobile screen layout",
    "4:5": "Vertical composition, 4:5 aspect ratio, Instagram feed optimized",
    "16:9":
      "Horizontal composition, 16:9 aspect ratio, widescreen layout, banner format",
    "1:1-commercial":
      "Professional commercial photography, square composition, 1:1 aspect ratio, CLEAN SOLID COLOR BACKGROUND (light gray #f6f6f6 or pure white #ffffff), NO props NO decorations NO distracting elements, studio lighting setup with soft diffused light, high-end DSLR camera quality (Canon EOS R5 or Sony A7R IV style), product as the ABSOLUTE focal point centered in frame, sharp focus on product details and texture, minimal harsh shadows, commercial e-commerce product photography aesthetic, high resolution, professional color grading, simple minimalist composition",
  };

  const visualSummarySection = input.visualSummaryZh
    ? `\n- 構圖摘要 (Visual Summary): ${input.visualSummaryZh}\n\n**重要：請務必根據「構圖摘要」的描述來生成視覺提示詞，這是使用者指定的視覺方向。**`
    : "";

  const systemPrompt = `你是一位專業的視覺設計 Prompt 工程師。

你的任務是根據提供的「中文標題」、「中文文案」和「構圖摘要」，生成一個專業的英文視覺提示詞 (Visual Prompt)，用於 Gemini 3 Pro Image 生成圖片。

**輸入資訊：**
- 標題 (Title): ${input.titleZh}
- 文案 (Copy): ${input.copyZh}
- 圖片尺寸: ${input.ratio} (${input.sizeLabel})${visualSummarySection}

**核心要求：**
1. **必須保持產品原貌**：使用者會提供產品參考圖，生成的圖片必須「保留產品的完整外觀、包裝設計、顏色、形狀」，不可改變產品本身
2. **只調整背景和氛圍**：根據標題、文案和構圖摘要調整「背景、光線、道具、氛圍」，但產品本身必須維持原樣
3. 必須包含尺寸規範：${ratioRequirements[input.ratio]}
4. ${input.visualSummaryZh ? "**最重要：構圖摘要中的指示優先級最高，必須完全遵循**" : ""}

**Prompt 寫作指南：**
- 在 Prompt 開頭加上：KEEP THE PRODUCT EXACTLY AS SHOWN IN THE REFERENCE IMAGE, DO NOT MODIFY THE PRODUCT ITSELF
- 使用 "product placement in center" 確保產品位置正確
- 描述背景、光線、氛圍時，明確說明「around the product」或「in the background」
- 使用專業的攝影和設計術語（英文）
- 只輸出英文 Prompt 文字，不要包含任何其他說明

**範例格式：**
"KEEP THE PRODUCT EXACTLY AS SHOWN IN THE REFERENCE IMAGE, DO NOT MODIFY THE PRODUCT ITSELF. ${ratioRequirements[input.ratio]}, product placement in center, [background description], [lighting description around the product], [mood and atmosphere], [additional props or elements in the background]"`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: TEXT_MODEL,
        contents: {
          parts: [{ text: "請根據上述資訊生成視覺提示詞。" }],
        },
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.8,
          topP: 0.9,
        },
      })
    );

    if (!response.text) {
      throw new Error(getErrorMessage("promptRegenerateFailed", locale));
    }

    return response.text.trim();
  } catch (e) {
    throw enhanceErrorMessage(e, locale);
  }
}

export interface GenerateFromReferenceInput {
  productImageBase64: string;
  referenceImageBase64: string;
  similarity: number;
  aspectRatio?: ImageRatio;
  brandLogoBase64?: string | null;
  titleText?: string;
  copyText?: string;
  showText?: boolean;
  titleWeight?: "regular" | "medium" | "bold" | "black";
  copyWeight?: "regular" | "medium" | "bold" | "black";
  secondaryProductBase64?: string | null;
  resolution?: ResolutionLevel;
  apiKey: string;
  locale?: Locale;
}

export async function generateImageFromReferenceClient(
  input: GenerateFromReferenceInput
): Promise<string> {
  const locale = input.locale || "en";
  if (!input.apiKey) {
    throw new Error(getErrorMessage("apiKeyMissing", locale));
  }

  const ai = new GoogleGenAI({ apiKey: input.apiKey });

  const aspectRatio = input.aspectRatio || "1:1";
  const apiAspectRatio: "1:1" | "9:16" | "4:5" | "16:9" =
    aspectRatio === "1:1-commercial"
      ? "1:1"
      : aspectRatio === "4:5"
        ? "4:5"
        : aspectRatio === "9:16"
          ? "9:16"
          : aspectRatio === "16:9"
            ? "16:9"
            : "1:1";

  const aspectRatioDesc: Record<typeof apiAspectRatio, string> = {
    "1:1": "1:1 square format",
    "9:16": "9:16 vertical format for mobile screens",
    "4:5": "4:5 vertical format optimized for Instagram",
    "16:9": "16:9 horizontal widescreen format",
  };

  let prompt: string;

  if (input.similarity >= 70) {
    prompt = `Create a professional product photography image very closely following the reference image. Match the composition, object placement, layout, lighting setup, color palette, background style, and overall aesthetic. Place the product from the product image as the main subject, maintaining its original appearance. Professional commercial photography quality, ${aspectRatioDesc[apiAspectRatio]}.`;
  } else if (input.similarity >= 40) {
    prompt = `Create a professional product photography image moderately following the reference image. Match the lighting style, color palette, and overall mood, but feel free to create a different composition and object arrangement. Place the product from the product image as the main subject, maintaining its original appearance. Professional commercial photography quality, ${aspectRatioDesc[apiAspectRatio]}.`;
  } else {
    prompt = `Create a professional product photography image loosely inspired by the reference image. ONLY take inspiration from the color tone and atmospheric feeling. DO NOT copy the composition, layout, or object placement. Create a completely new and creative composition with the product as the main subject. The product should maintain its original appearance. Professional commercial photography quality, ${aspectRatioDesc[apiAspectRatio]}.`;
  }

  if (input.brandLogoBase64) {
    prompt +=
      "\n\nIMPORTANT: Place the uploaded brand logo in one of the four corners (top-left, top-right, bottom-left, or bottom-right) in a subtle, non-intrusive way. The logo should be clearly visible but not dominate the composition.";
  }

  if (input.secondaryProductBase64) {
    prompt += `\n\nIMPORTANT - MULTI-PRODUCT COMPOSITION: This image features TWO products that must appear together naturally in the same scene.
- PRIMARY PRODUCT: Main focus, placed prominently in center or foreground
- SECONDARY PRODUCT: Supporting element, placed naturally alongside, emerging from, or complementing the primary product
- Create a cohesive lifestyle/gift composition where both products appear together harmoniously
- Both products should maintain their original appearance and details
- The scene should tell a story of how these products relate to each other`;
  }

  if (input.showText && input.titleText && input.copyText) {
    const weightMap = {
      regular: "Regular (400)",
      medium: "Medium (500)",
      bold: "Bold (700)",
      black: "Black (900)",
    };

    const titleWeightStr = input.titleWeight
      ? weightMap[input.titleWeight]
      : "Bold (700)";
    const copyWeightStr = input.copyWeight
      ? weightMap[input.copyWeight]
      : "Regular (400)";

    prompt += `\n\nIMPORTANT: Overlay the following text on the image using Noto Sans TC (Noto Sans Traditional Chinese) font:\nTitle: "${input.titleText}" (Font: Noto Sans TC ${titleWeightStr})\nCopy: "${input.copyText}" (Font: Noto Sans TC ${copyWeightStr})\nUse appropriate positioning, size, and styling that complements the visual design. Make sure the font is Noto Sans TC (思源黑體).`;
  }

  // Get image config for resolution
  const imageConfig = getImageConfig(input.resolution || "4k");

  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [{ text: prompt }];

  // Add reference image
  const refMatch = input.referenceImageBase64.match(
    /^data:(image\/[a-zA-Z+]+);base64,(.+)$/
  );
  if (refMatch) {
    parts.push({
      inlineData: {
        data: refMatch[2],
        mimeType: refMatch[1],
      },
    });
  }

  // Add product image
  const prodMatch = input.productImageBase64.match(
    /^data:(image\/[a-zA-Z+]+);base64,(.+)$/
  );
  if (prodMatch) {
    parts.push({
      inlineData: {
        data: prodMatch[2],
        mimeType: prodMatch[1],
      },
    });
  }

  // Add brand logo
  if (input.brandLogoBase64) {
    const logoMatch = input.brandLogoBase64.match(
      /^data:(image\/[a-zA-Z+]+);base64,(.+)$/
    );
    if (logoMatch) {
      parts.push({
        inlineData: {
          data: logoMatch[2],
          mimeType: logoMatch[1],
        },
      });
    }
  }

  // Add secondary product
  if (input.secondaryProductBase64) {
    const secMatch = input.secondaryProductBase64.match(
      /^data:(image\/[a-zA-Z+]+);base64,(.+)$/
    );
    if (secMatch) {
      parts.push({
        inlineData: {
          data: secMatch[2],
          mimeType: secMatch[1],
        },
      });
    }
  }

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts },
        config: {
          responseModalities: ["image", "text"],
          imageConfig,
        },
      })
    );

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const content = candidates[0]?.content;
      if (content?.parts) {
        for (const part of content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error(getErrorMessage("noImageGenerated", locale));
  } catch (e) {
    throw enhanceErrorMessage(e, locale);
  }
}

/**
 * Check if server has API key - always returns false for static build
 */
export async function hasServerApiKeyClient(): Promise<boolean> {
  return false;
}

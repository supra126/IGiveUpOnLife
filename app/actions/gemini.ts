"use server";

import { GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";
import { DIRECTOR_SYSTEM_PROMPT, CONTENT_PLANNER_SYSTEM_PROMPT } from "@/prompts";
import {
  DirectorOutput,
  ContentPlan,
  MarketingRoute,
  ProductAnalysis,
  ImageRatio,
} from "@/types";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

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

const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get API key - prefers server env, falls back to user-provided key
 */
function getApiKey(userApiKey?: string): string {
  // Server API key takes precedence if available
  const serverKey = process.env.GEMINI_API_KEY;
  if (serverKey) {
    return serverKey;
  }

  // Fall back to user-provided key
  if (userApiKey) {
    return userApiKey;
  }

  throw new Error("找不到 API 金鑰。請在設定中輸入金鑰，或聯繫管理員。");
}

/**
 * Check if server has API key configured
 */
export async function hasServerApiKey(): Promise<boolean> {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Apply rate limiting for server API key usage
 */
async function applyRateLimit(): Promise<void> {
  // Only apply rate limit when using server API key
  if (!process.env.GEMINI_API_KEY) {
    return;
  }

  const headersList = await headers();
  const clientId = getClientIdentifier(headersList);
  const result = checkRateLimit(clientId);

  if (!result.success) {
    throw new Error(result.error || "請求過於頻繁，請稍後再試");
  }
}

// --- Server Actions ---

export interface AnalyzeProductInput {
  imageBase64: string;
  imageMimeType: string;
  productName: string;
  productInfo: string;
  productUrl: string;
  userApiKey?: string;
}

export async function analyzeProductImageAction(
  input: AnalyzeProductInput
): Promise<DirectorOutput> {
  await applyRateLimit();

  const apiKey = getApiKey(input.userApiKey);
  const ai = new GoogleGenAI({ apiKey });

  // Build context
  const contextParts: string[] = [];

  if (input.productInfo) {
    contextParts.push(`手動輸入資訊: ${input.productInfo}`);
  }

  if (input.productUrl && isValidUrl(input.productUrl)) {
    contextParts.push(
      `產品網址: ${input.productUrl}\n（注意：請根據此網址推測可能的品牌定位與產品特色）`
    );
  }

  const combinedContext =
    contextParts.length > 0 ? contextParts.join("\n\n") : "未提供";

  const promptText = `
    產品名稱: ${input.productName || "未提供"}
    品牌/產品資訊: ${combinedContext}
    ${input.productUrl ? `產品網址: ${input.productUrl}` : ""}

    請根據上述資訊與圖片，執行視覺行銷總監的分析任務。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
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
      systemInstruction: DIRECTOR_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 1.0,
      topP: 0.95,
    },
  });

  if (!response.text) {
    throw new Error("Gemini 沒有回應文字");
  }

  try {
    const cleaned = cleanJson(response.text);

    let parsed: DirectorOutput;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Attempt to fix common JSON issues
      let repaired = cleaned;

      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;

      if (openBraces > closeBraces) {
        repaired = repaired + "}".repeat(openBraces - closeBraces);
      }
      if (openBrackets > closeBrackets) {
        repaired = repaired + "]".repeat(openBrackets - closeBrackets);
      }

      try {
        parsed = JSON.parse(repaired);
      } catch {
        throw new Error("小GG 返回了無效的格式，且自動修復失敗。請再試一次。");
      }
    }

    return parsed;
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error("小GG 返回了無效的格式。請再試一次。");
  }
}

export interface GenerateContentPlanInput {
  route: MarketingRoute;
  analysis: ProductAnalysis;
  referenceCopy: string;
  selectedSizes: ImageRatio[];
  userApiKey?: string;
}

export async function generateContentPlanAction(
  input: GenerateContentPlanInput
): Promise<ContentPlan> {
  await applyRateLimit();

  const apiKey = getApiKey(input.userApiKey);
  const ai = new GoogleGenAI({ apiKey });

  const sizeLabels: Record<ImageRatio, string> = {
    "1:1": "FB 貼文",
    "9:16": "限時動態 / Stories",
    "4:5": "IG 貼文",
    "16:9": "橫式貼文",
    "1:1-commercial": "商業攝影",
  };

  const sizeList = input.selectedSizes
    .map((s) => `${s} (${sizeLabels[s]})`)
    .join(", ");

  const promptText = `
    選定策略路線: ${input.route.route_name}
    主標題: ${input.route.headline_zh}
    副標題: ${input.route.subhead_zh}
    風格: ${input.route.style_brief_zh}
    目標受眾: ${input.route.target_audience_zh}

    產品名稱: ${input.analysis.name}
    產品特點: ${input.analysis.key_features_zh}

    參考文案/競品資訊: ${input.referenceCopy || "無 (請自行規劃最佳結構)"}

    選定的圖片尺寸: ${sizeList}

    請為每個選定的尺寸生成 3 組不同的內容方案 (JSON)。
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: { parts: [{ text: promptText }] },
    config: {
      systemInstruction: CONTENT_PLANNER_SYSTEM_PROMPT,
      responseMimeType: "application/json",
      temperature: 1.0,
      topP: 0.95,
      thinkingConfig: { thinkingBudget: 2048 },
    },
  });

  if (!response.text) throw new Error("Gemini Planning failed");

  try {
    const cleaned = cleanJson(response.text);
    const parsed = JSON.parse(cleaned) as ContentPlan;

    if (!parsed.content_sets || !Array.isArray(parsed.content_sets)) {
      throw new Error("API 返回格式錯誤：缺少 content_sets 陣列");
    }

    if (!parsed.selected_sizes || !Array.isArray(parsed.selected_sizes)) {
      throw new Error("API 返回格式錯誤：缺少 selected_sizes 陣列");
    }

    const missingFields = parsed.content_sets.filter(
      (set) =>
        !set.id ||
        !set.ratio ||
        !set.title_zh ||
        !set.copy_zh ||
        !set.visual_prompt_en
    );

    if (missingFields.length > 0) {
      throw new Error("部分內容方案缺少必要欄位");
    }

    return parsed;
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error("企劃生成格式錯誤");
  }
}

export interface GenerateImageInput {
  prompt: string;
  referenceImageBase64?: string;
  aspectRatio?: ImageRatio;
  secondaryImageBase64?: string | null;
  userApiKey?: string;
}

export async function generateMarketingImageAction(
  input: GenerateImageInput
): Promise<string> {
  await applyRateLimit();

  const apiKey = getApiKey(input.userApiKey);
  const ai = new GoogleGenAI({ apiKey });

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

  let enhancedPrompt = input.prompt;
  if (input.secondaryImageBase64) {
    enhancedPrompt += `\n\nIMPORTANT - MULTI-PRODUCT COMPOSITION: This image features TWO products that must appear together naturally in the same scene.
- PRIMARY PRODUCT (first image): Main focus, placed prominently in center or foreground
- SECONDARY PRODUCT (second image): Supporting element, placed naturally alongside, emerging from, or complementing the primary product
- Create a cohesive lifestyle/gift composition where both products appear together harmoniously
- Both products should maintain their original appearance and details
- The scene should tell a story of how these products relate to each other`;
  }

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: enhancedPrompt },
  ];

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

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: apiAspectRatio,
        imageSize: "1K",
      },
    },
  });

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

  throw new Error("未生成圖片。");
}

export interface RegeneratePromptInput {
  titleZh: string;
  copyZh: string;
  ratio: ImageRatio;
  sizeLabel: string;
  visualSummaryZh?: string;
  userApiKey?: string;
}

export async function regenerateVisualPromptAction(
  input: RegeneratePromptInput
): Promise<string> {
  await applyRateLimit();

  const apiKey = getApiKey(input.userApiKey);
  const ai = new GoogleGenAI({ apiKey });

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

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [{ text: "請根據上述資訊生成視覺提示詞。" }],
    },
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.8,
      topP: 0.9,
    },
  });

  if (!response.text) {
    throw new Error("Failed to regenerate visual prompt");
  }

  return response.text.trim();
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
  userApiKey?: string;
}

export async function generateImageFromReferenceAction(
  input: GenerateFromReferenceInput
): Promise<string> {
  await applyRateLimit();

  const apiKey = getApiKey(input.userApiKey);
  const ai = new GoogleGenAI({ apiKey });

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

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: prompt },
  ];

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

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: apiAspectRatio,
        imageSize: "1K",
      },
    },
  });

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

  throw new Error("未生成圖片。");
}

"use server";

import { getContentPlannerSystemPrompt, Locale } from "@/prompts";
import { ContentPlan, MarketingRoute, ProductAnalysis, ImageRatio } from "@/types";
import { GenerateContentPlanInputSchema } from "@/lib/schemas";
import {
  applyRateLimit,
  createGeminiClient,
  getTextModel,
  getThinkingBudget,
  withRetry,
  getErrorMessage,
  enhanceErrorMessage,
  parseJsonSafe,
} from "./shared";

export interface GenerateContentPlanInput {
  route: MarketingRoute;
  analysis: ProductAnalysis;
  referenceCopy: string;
  selectedSizes: ImageRatio[];
  userApiKey?: string;
  locale?: Locale;
}

export async function generateContentPlanAction(
  input: GenerateContentPlanInput
): Promise<ContentPlan> {
  // Validate input
  const validationResult = GenerateContentPlanInputSchema.safeParse(input);
  if (!validationResult.success) {
    throw new Error(`Invalid input: ${validationResult.error.message}`);
  }
  const validatedInput = validationResult.data;

  await applyRateLimit();

  const locale = validatedInput.locale || "en";
  const ai = createGeminiClient(validatedInput.userApiKey, locale);

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

  const sizeList = validatedInput.selectedSizes
    .map((s) => `${s} (${sizeLabels[s]})`)
    .join(", ");

  const promptText = locale === "en"
    ? `
    Selected Strategy Route: ${validatedInput.route.route_name}
    Headline: ${validatedInput.route.headline}
    Subhead: ${validatedInput.route.subhead}
    Style: ${validatedInput.route.style_brief}
    Target Audience: ${validatedInput.route.target_audience}

    Product Name: ${validatedInput.analysis.name}
    Product Features: ${validatedInput.analysis.key_features}

    Reference Copy/Competitor Info: ${validatedInput.referenceCopy || "None (please plan the best structure)"}

    Selected Image Sizes: ${sizeList}

    Please generate 3 different content sets for each selected size (JSON).
  `
    : `
    選定策略路線: ${validatedInput.route.route_name}
    主標題: ${validatedInput.route.headline}
    副標題: ${validatedInput.route.subhead}
    風格: ${validatedInput.route.style_brief}
    目標受眾: ${validatedInput.route.target_audience}

    產品名稱: ${validatedInput.analysis.name}
    產品特點: ${validatedInput.analysis.key_features}

    參考文案/競品資訊: ${validatedInput.referenceCopy || "無 (請自行規劃最佳結構)"}

    選定的圖片尺寸: ${sizeList}

    請為每個選定的尺寸生成 3 組不同的內容方案 (JSON)。
  `;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: getTextModel(),
        contents: { parts: [{ text: promptText }] },
        config: {
          systemInstruction: getContentPlannerSystemPrompt(locale),
          responseMimeType: "application/json",
          temperature: 1.0,
          topP: 0.95,
          thinkingConfig: { thinkingBudget: getThinkingBudget() },
        },
      })
    );

    if (!response.text) throw new Error("Gemini Planning failed");

    // Parse with automatic repair
    const parsed = parseJsonSafe<ContentPlan>(response.text, locale);

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
        !set.title ||
        !set.copy ||
        !set.visual_prompt_en
    );

    if (missingFields.length > 0) {
      throw new Error(getErrorMessage("missingFields", locale));
    }

    return parsed;
  } catch (e) {
    throw enhanceErrorMessage(e, locale);
  }
}

/**
 * Gemini Service - Client-side utilities and wrapper functions
 *
 * This module provides:
 * 1. Client-side utility functions (fileToBase64, generateFullReport)
 * 2. Wrapper functions that call Server Actions
 *
 * API calls are handled by Server Actions in /app/actions/gemini.ts
 */

import {
  analyzeProductImageAction,
  generateContentPlanAction,
  generateMarketingImageAction,
  regenerateVisualPromptAction,
  generateImageFromReferenceAction,
  hasServerApiKey,
  type AnalyzeProductInput,
  type GenerateContentPlanInput,
  type GenerateImageInput,
  type RegeneratePromptInput,
  type GenerateFromReferenceInput,
} from "@/app/actions/gemini";
import {
  DirectorOutput,
  ContentPlan,
  MarketingRoute,
  ProductAnalysis,
  ContentSet,
  ImageRatio,
} from "@/types";

// Re-export for convenience
export { hasServerApiKey };

// --- Client-side Helpers ---

export const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Extract base64 data and mime type from a data URL
 */
const extractBase64Data = (
  dataUrl: string
): { data: string; mimeType: string } | null => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match) {
    return {
      mimeType: match[1],
      data: match[2],
    };
  }
  return null;
};

// --- Wrapper Functions (call Server Actions) ---

/**
 * Analyze product image
 * @param file - Product image file
 * @param productName - Product name
 * @param productInfo - Product information
 * @param productUrl - Product URL
 * @param apiKey - Optional user API key (falls back to server key)
 */
export const analyzeProductImage = async (
  file: File,
  productName: string,
  productInfo: string,
  productUrl: string,
  apiKey?: string
): Promise<DirectorOutput> => {
  const base64 = await fileToBase64(file);
  const extracted = extractBase64Data(base64);

  if (!extracted) {
    throw new Error("無法讀取圖片");
  }

  const input: AnalyzeProductInput = {
    imageBase64: extracted.data,
    imageMimeType: extracted.mimeType,
    productName,
    productInfo,
    productUrl,
    userApiKey: apiKey || undefined,
  };

  return analyzeProductImageAction(input);
};

/**
 * Generate content plan
 */
export const generateContentPlan = async (
  route: MarketingRoute,
  analysis: ProductAnalysis,
  referenceCopy: string,
  selectedSizes: ImageRatio[],
  apiKey?: string
): Promise<ContentPlan> => {
  const input: GenerateContentPlanInput = {
    route,
    analysis,
    referenceCopy,
    selectedSizes,
    userApiKey: apiKey || undefined,
  };

  return generateContentPlanAction(input);
};

/**
 * Generate marketing image
 */
export const generateMarketingImage = async (
  prompt: string,
  apiKey?: string,
  referenceImageBase64?: string,
  aspectRatio: ImageRatio = "1:1",
  secondaryImageBase64?: string | null
): Promise<string> => {
  const input: GenerateImageInput = {
    prompt,
    referenceImageBase64,
    aspectRatio,
    secondaryImageBase64,
    userApiKey: apiKey || undefined,
  };

  return generateMarketingImageAction(input);
};

/**
 * Regenerate visual prompt
 */
export const regenerateVisualPrompt = async (
  titleZh: string,
  copyZh: string,
  ratio: ImageRatio,
  sizeLabel: string,
  apiKey?: string,
  visualSummaryZh?: string
): Promise<string> => {
  const input: RegeneratePromptInput = {
    titleZh,
    copyZh,
    ratio,
    sizeLabel,
    visualSummaryZh,
    userApiKey: apiKey || undefined,
  };

  return regenerateVisualPromptAction(input);
};

/**
 * Generate image from reference
 */
export const generateImageFromReference = async (
  productImageBase64: string,
  referenceImageBase64: string,
  similarity: number,
  apiKey?: string,
  aspectRatio: ImageRatio = "1:1",
  brandLogoBase64?: string | null,
  titleText?: string,
  copyText?: string,
  showText?: boolean,
  titleWeight?: "regular" | "medium" | "bold" | "black",
  copyWeight?: "regular" | "medium" | "bold" | "black",
  secondaryProductBase64?: string | null
): Promise<string> => {
  const input: GenerateFromReferenceInput = {
    productImageBase64,
    referenceImageBase64,
    similarity,
    aspectRatio,
    brandLogoBase64,
    titleText,
    copyText,
    showText,
    titleWeight,
    copyWeight,
    secondaryProductBase64,
    userApiKey: apiKey || undefined,
  };

  return generateImageFromReferenceAction(input);
};

// --- Report Generation (client-side only) ---

export const generateFullReport = (
  analysis: ProductAnalysis,
  routes: MarketingRoute[],
  selectedRouteIndex: number,
  contentPlan: ContentPlan,
  editedContentSets: ContentSet[]
): string => {
  const route = routes[selectedRouteIndex];
  const date = new Date().toLocaleDateString();

  let report = `不想怒力了 I give up on life - Product Marketing Strategy Report\n`;
  report += `Date: ${date}\n`;
  report += `=================================================\n\n`;

  report += `[PRODUCT ANALYSIS]\n`;
  report += `Name: ${analysis.name}\n`;
  report += `Visual Description: ${analysis.visual_description}\n`;
  report += `Key Features: ${analysis.key_features_zh}\n\n`;

  report += `[SELECTED STRATEGY: ${route.route_name}]\n`;
  report += `Headline: ${route.headline_zh}\n`;
  report += `Subhead: ${route.subhead_zh}\n`;
  report += `Style: ${route.style_brief_zh}\n`;
  report += `Target Audience: ${route.target_audience_zh}\n\n`;

  report += `-------------------------------------------------\n`;
  report += `[CONTENT PLAN]\n`;
  report += `Plan Name: ${contentPlan.plan_name}\n`;
  report += `Selected Sizes: ${contentPlan.selected_sizes.join(", ")}\n\n`;

  editedContentSets.forEach((item) => {
    report += `--- ${item.size_label} Set ${item.set_number} (${item.ratio}) ---\n`;
    report += `Title: ${item.title_zh}\n`;
    report += `Copy: ${item.copy_zh}\n`;
    report += `Visual Summary: ${item.visual_summary_zh}\n`;
    report += `PROMPT:\n${item.visual_prompt_en}\n\n`;
  });

  return report;
};

/**
 * Gemini Service - Unified entry point with build mode detection
 *
 * This module automatically switches between:
 * - Server Actions (default): Uses server-side API calls with rate limiting
 * - Client Mode (BUILD_MODE=static): Uses direct client-side API calls
 *
 * The build mode is determined by NEXT_PUBLIC_BUILD_MODE environment variable.
 */

import {
  DirectorOutput,
  ContentPlan,
  MarketingRoute,
  ProductAnalysis,
  ContentSet,
  ImageRatio,
} from "@/types";
import { Locale } from "@/prompts";

// Detect build mode at compile time
const IS_STATIC_BUILD = process.env.NEXT_PUBLIC_BUILD_MODE === "static";

// --- Client-side Helpers (always available) ---

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

// --- Conditional Imports ---

// Server Actions (only imported in server mode)
let serverActions: typeof import("@/app/actions/gemini") | null = null;

// Client functions (only imported in static mode)
let clientFunctions: typeof import("@/services/geminiClient") | null = null;

/**
 * Initialize the appropriate module based on build mode
 */
async function initModule() {
  if (IS_STATIC_BUILD) {
    if (!clientFunctions) {
      clientFunctions = await import("@/services/geminiClient");
    }
  } else {
    if (!serverActions) {
      serverActions = await import("@/app/actions/gemini");
    }
  }
}

// --- Wrapper Functions ---

/**
 * Check if server has API key configured
 * Returns false for static builds
 */
export const hasServerApiKey = async (): Promise<boolean> => {
  if (IS_STATIC_BUILD) {
    return false;
  }
  await initModule();
  return serverActions!.hasServerApiKey();
};

/**
 * Analyze product image
 */
export const analyzeProductImage = async (
  file: File,
  productName: string,
  productInfo: string,
  productUrl: string,
  apiKey?: string,
  locale?: Locale
): Promise<DirectorOutput> => {
  const base64 = await fileToBase64(file);
  const extracted = extractBase64Data(base64);

  if (!extracted) {
    throw new Error("無法讀取圖片");
  }

  await initModule();

  if (IS_STATIC_BUILD) {
    if (!apiKey) {
      throw new Error("靜態版本需要提供 API 金鑰");
    }
    return clientFunctions!.analyzeProductImageClient({
      imageBase64: extracted.data,
      imageMimeType: extracted.mimeType,
      productName,
      productInfo,
      productUrl,
      apiKey,
      locale,
    });
  }

  return serverActions!.analyzeProductImageAction({
    imageBase64: extracted.data,
    imageMimeType: extracted.mimeType,
    productName,
    productInfo,
    productUrl,
    userApiKey: apiKey || undefined,
    locale,
  });
};

/**
 * Generate content plan
 */
export const generateContentPlan = async (
  route: MarketingRoute,
  analysis: ProductAnalysis,
  referenceCopy: string,
  selectedSizes: ImageRatio[],
  apiKey?: string,
  locale?: Locale
): Promise<ContentPlan> => {
  await initModule();

  if (IS_STATIC_BUILD) {
    if (!apiKey) {
      throw new Error("靜態版本需要提供 API 金鑰");
    }
    return clientFunctions!.generateContentPlanClient({
      route,
      analysis,
      referenceCopy,
      selectedSizes,
      apiKey,
      locale,
    });
  }

  return serverActions!.generateContentPlanAction({
    route,
    analysis,
    referenceCopy,
    selectedSizes,
    userApiKey: apiKey || undefined,
    locale,
  });
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
  await initModule();

  if (IS_STATIC_BUILD) {
    if (!apiKey) {
      throw new Error("靜態版本需要提供 API 金鑰");
    }
    return clientFunctions!.generateMarketingImageClient({
      prompt,
      referenceImageBase64,
      aspectRatio,
      secondaryImageBase64,
      apiKey,
    });
  }

  return serverActions!.generateMarketingImageAction({
    prompt,
    referenceImageBase64,
    aspectRatio,
    secondaryImageBase64,
    userApiKey: apiKey || undefined,
  });
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
  await initModule();

  if (IS_STATIC_BUILD) {
    if (!apiKey) {
      throw new Error("靜態版本需要提供 API 金鑰");
    }
    return clientFunctions!.regenerateVisualPromptClient({
      titleZh,
      copyZh,
      ratio,
      sizeLabel,
      visualSummaryZh,
      apiKey,
    });
  }

  return serverActions!.regenerateVisualPromptAction({
    titleZh,
    copyZh,
    ratio,
    sizeLabel,
    visualSummaryZh,
    userApiKey: apiKey || undefined,
  });
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
  await initModule();

  if (IS_STATIC_BUILD) {
    if (!apiKey) {
      throw new Error("靜態版本需要提供 API 金鑰");
    }
    return clientFunctions!.generateImageFromReferenceClient({
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
      apiKey,
    });
  }

  return serverActions!.generateImageFromReferenceAction({
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
  });
};

// --- Report Generation (client-side only, no API calls) ---

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
  report += `Key Features: ${analysis.key_features}\n\n`;

  report += `[SELECTED STRATEGY: ${route.route_name}]\n`;
  report += `Headline: ${route.headline}\n`;
  report += `Subhead: ${route.subhead}\n`;
  report += `Style: ${route.style_brief}\n`;
  report += `Target Audience: ${route.target_audience}\n\n`;

  report += `-------------------------------------------------\n`;
  report += `[CONTENT PLAN]\n`;
  report += `Plan Name: ${contentPlan.plan_name}\n`;
  report += `Selected Sizes: ${contentPlan.selected_sizes.join(", ")}\n\n`;

  editedContentSets.forEach((item) => {
    report += `--- ${item.size_label} Set ${item.set_number} (${item.ratio}) ---\n`;
    report += `Title: ${item.title}\n`;
    report += `Copy: ${item.copy}\n`;
    report += `Visual Summary: ${item.visual_summary}\n`;
    report += `PROMPT:\n${item.visual_prompt_en}\n\n`;
  });

  return report;
};

// --- Build Mode Info ---

/**
 * Check if running in static build mode
 */
export const isStaticBuild = (): boolean => {
  return IS_STATIC_BUILD;
};

/**
 * Get build mode info
 */
export const getBuildModeInfo = (): {
  mode: "static" | "server";
  requiresUserApiKey: boolean;
} => {
  return {
    mode: IS_STATIC_BUILD ? "static" : "server",
    requiresUserApiKey: IS_STATIC_BUILD,
  };
};

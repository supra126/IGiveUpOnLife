"use server";

import { Locale } from "@/prompts";
import { ImageRatio } from "@/types";
import {
  GenerateImageInputSchema,
  RegeneratePromptInputSchema,
  GenerateFromReferenceInputSchema,
} from "@/lib/schemas";
import { createInlineDataPart, normalizeAspectRatio } from "@/lib/image-utils";
import {
  ASPECT_RATIO_DESCRIPTIONS,
  getVisualPromptSystemPrompt,
  getMultiProductPrompt,
  getBrandLogoPrompt,
  getTextOverlayPrompt,
  getReferenceBasedPrompt,
} from "@/lib/prompt-templates";
import {
  applyRateLimit,
  createGeminiClient,
  getTextModel,
  getImageModel,
  withRetry,
  getErrorMessage,
  enhanceErrorMessage,
} from "./shared";

// --- Generate Marketing Image ---

export interface GenerateImageInput {
  prompt: string;
  referenceImageBase64?: string;
  aspectRatio?: ImageRatio;
  secondaryImageBase64?: string | null;
  userApiKey?: string;
  locale?: Locale;
}

export async function generateMarketingImageAction(
  input: GenerateImageInput
): Promise<string> {
  // Validate input
  const validationResult = GenerateImageInputSchema.safeParse(input);
  if (!validationResult.success) {
    throw new Error(`Invalid input: ${validationResult.error.message}`);
  }
  const validatedInput = validationResult.data;

  await applyRateLimit();

  const locale = validatedInput.locale || "en";
  const ai = createGeminiClient(validatedInput.userApiKey, locale);

  let enhancedPrompt = validatedInput.prompt;
  if (validatedInput.secondaryImageBase64) {
    enhancedPrompt += getMultiProductPrompt();
  }

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: enhancedPrompt },
  ];

  const refPart = createInlineDataPart(validatedInput.referenceImageBase64);
  if (refPart) {
    parts.push(refPart);
  }

  const secPart = createInlineDataPart(validatedInput.secondaryImageBase64);
  if (secPart) {
    parts.push(secPart);
  }

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: getImageModel(),
        contents: { parts },
        config: {
          responseModalities: ["image", "text"],
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

// --- Regenerate Visual Prompt ---

export interface RegeneratePromptInput {
  titleZh: string;
  copyZh: string;
  ratio: ImageRatio;
  sizeLabel: string;
  visualSummaryZh?: string;
  userApiKey?: string;
  locale?: Locale;
}

export async function regenerateVisualPromptAction(
  input: RegeneratePromptInput
): Promise<string> {
  // Validate input
  const validationResult = RegeneratePromptInputSchema.safeParse(input);
  if (!validationResult.success) {
    throw new Error(`Invalid input: ${validationResult.error.message}`);
  }
  const validatedInput = validationResult.data;

  await applyRateLimit();

  const locale = validatedInput.locale || "en";
  const ai = createGeminiClient(validatedInput.userApiKey, locale);

  const systemPrompt = getVisualPromptSystemPrompt(
    validatedInput.titleZh,
    validatedInput.copyZh,
    validatedInput.ratio,
    validatedInput.sizeLabel,
    validatedInput.visualSummaryZh
  );

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: getTextModel(),
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
      throw new Error("Failed to regenerate visual prompt");
    }

    return response.text.trim();
  } catch (e) {
    throw enhanceErrorMessage(e, locale);
  }
}

// --- Generate Image From Reference ---

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
  locale?: Locale;
}

export async function generateImageFromReferenceAction(
  input: GenerateFromReferenceInput
): Promise<string> {
  // Validate input
  const validationResult = GenerateFromReferenceInputSchema.safeParse(input);
  if (!validationResult.success) {
    throw new Error(`Invalid input: ${validationResult.error.message}`);
  }
  const validatedInput = validationResult.data;

  await applyRateLimit();

  const locale = validatedInput.locale || "en";
  const ai = createGeminiClient(validatedInput.userApiKey, locale);

  const apiAspectRatio = normalizeAspectRatio(validatedInput.aspectRatio);
  const aspectRatioDesc = ASPECT_RATIO_DESCRIPTIONS[apiAspectRatio];

  let prompt = getReferenceBasedPrompt(validatedInput.similarity, aspectRatioDesc);

  if (validatedInput.brandLogoBase64) {
    prompt += getBrandLogoPrompt();
  }

  if (validatedInput.secondaryProductBase64) {
    prompt += getMultiProductPrompt();
  }

  if (validatedInput.showText && validatedInput.titleText && validatedInput.copyText) {
    prompt += getTextOverlayPrompt(
      validatedInput.titleText,
      validatedInput.copyText,
      validatedInput.titleWeight,
      validatedInput.copyWeight
    );
  }

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: prompt },
  ];

  // Add reference image
  const refPart = createInlineDataPart(validatedInput.referenceImageBase64);
  if (refPart) {
    parts.push(refPart);
  }

  // Add product image
  const prodPart = createInlineDataPart(validatedInput.productImageBase64);
  if (prodPart) {
    parts.push(prodPart);
  }

  // Add brand logo
  const logoPart = createInlineDataPart(validatedInput.brandLogoBase64);
  if (logoPart) {
    parts.push(logoPart);
  }

  // Add secondary product
  const secPart = createInlineDataPart(validatedInput.secondaryProductBase64);
  if (secPart) {
    parts.push(secPart);
  }

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: getImageModel(),
        contents: { parts },
        config: {
          responseModalities: ["image", "text"],
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

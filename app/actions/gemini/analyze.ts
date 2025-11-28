"use server";

import { getDirectorSystemPrompt, Locale } from "@/prompts";
import { DirectorOutput } from "@/types";
import { AnalyzeProductInputSchema } from "@/lib/schemas";
import {
  applyRateLimit,
  createGeminiClient,
  isValidUrl,
  getTextModel,
  withRetry,
  getErrorMessage,
  enhanceErrorMessage,
  parseJsonSafe,
} from "./shared";

export interface AnalyzeProductInput {
  imageBase64: string;
  imageMimeType: string;
  productName: string;
  productInfo: string;
  productUrl: string;
  userApiKey?: string;
  locale?: Locale;
}

export async function analyzeProductImageAction(
  input: AnalyzeProductInput
): Promise<DirectorOutput> {
  // Validate input
  const validationResult = AnalyzeProductInputSchema.safeParse(input);
  if (!validationResult.success) {
    throw new Error(`Invalid input: ${validationResult.error.message}`);
  }
  const validatedInput = validationResult.data;

  await applyRateLimit();

  const locale = validatedInput.locale || "en";
  const ai = createGeminiClient(validatedInput.userApiKey, locale);

  // Build context - these are AI prompt parts, kept in Chinese/English based on locale
  const contextParts: string[] = [];

  if (validatedInput.productInfo) {
    const label = locale === "en" ? "Manual input info" : "手動輸入資訊";
    contextParts.push(`${label}: ${validatedInput.productInfo}`);
  }

  if (validatedInput.productUrl && isValidUrl(validatedInput.productUrl)) {
    const urlLabel = locale === "en" ? "Product URL" : "產品網址";
    const urlNote = locale === "en"
      ? "(Note: Please infer possible brand positioning and product features based on this URL)"
      : "（注意：請根據此網址推測可能的品牌定位與產品特色）";
    contextParts.push(`${urlLabel}: ${validatedInput.productUrl}\n${urlNote}`);
  }

  const notProvided = locale === "en" ? "Not provided" : "未提供";
  const combinedContext =
    contextParts.length > 0 ? contextParts.join("\n\n") : notProvided;

  const promptText = locale === "en"
    ? `
    Product Name: ${validatedInput.productName || "Not provided"}
    Brand/Product Info: ${combinedContext}
    ${validatedInput.productUrl ? `Product URL: ${validatedInput.productUrl}` : ""}

    Please analyze the above information and image, and execute the visual marketing director analysis task.
  `
    : `
    產品名稱: ${validatedInput.productName || "未提供"}
    品牌/產品資訊: ${combinedContext}
    ${validatedInput.productUrl ? `產品網址: ${validatedInput.productUrl}` : ""}

    請根據上述資訊與圖片，執行視覺行銷總監的分析任務。
  `;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: getTextModel(),
        contents: {
          parts: [
            {
              inlineData: {
                data: validatedInput.imageBase64,
                mimeType: validatedInput.imageMimeType,
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
    const parsed = parseJsonSafe<DirectorOutput>(response.text, locale);

    return parsed;
  } catch (e) {
    throw enhanceErrorMessage(e, locale);
  }
}

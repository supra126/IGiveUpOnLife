"use server";

/**
 * Gemini server actions（server 模式）
 *
 * 每支 action：驗證輸入 → guard（金鑰 / 白名單 / 限流）→ 共用 core → Result。
 * static 模式不會用到這個檔案，瀏覽器直接呼叫同一套 core。
 */
import type { ContentPlan, DirectorOutput } from "@/types";
import { toResult, type Result } from "@/lib/gemini/result";
import {
  analyzeProduct,
  editImage,
  generatePromptImage,
  generateSimilarImage,
  parseInput,
  planContent,
  regenerateVisualPrompt,
  type GeneratedImage,
} from "@/lib/gemini/operations";
import {
  AnalyzeInputSchema,
  EditImageInputSchema,
  PlanInputSchema,
  PromptImageInputSchema,
  RegeneratePromptInputSchema,
  SimilarImageInputSchema,
  type AnalyzeInput,
  type EditImageInput,
  type PlanInput,
  type PromptImageInput,
  type RegeneratePromptInput,
  type SimilarImageInput,
} from "@/lib/gemini/schemas";
import { getPublicRateLimit, getServerAllowlists, getServerDefaults, guard } from "@/lib/server/guard";

export interface ServerCapabilities {
  hasServerKey: boolean;
  defaults: { textModel: string; imageModel: string };
  allowedTextModels: string[] | null;
  allowedImageModels: string[] | null;
  rateLimit: { maxRequests: number; windowMs: number } | null;
}

export async function getServerCapabilitiesAction(): Promise<ServerCapabilities> {
  const allowlists = getServerAllowlists();
  return {
    hasServerKey: Boolean(process.env.GEMINI_API_KEY),
    defaults: getServerDefaults(),
    allowedTextModels: allowlists.text,
    allowedImageModels: allowlists.image,
    rateLimit: getPublicRateLimit(),
  };
}

export async function analyzeAction(raw: AnalyzeInput, apiKey?: string): Promise<Result<DirectorOutput>> {
  return toResult(async () => {
    const input = parseInput(AnalyzeInputSchema, raw);
    const { ai, textModel } = await guard({ userApiKey: apiKey, kind: "text", model: input.model });
    return analyzeProduct(ai, input, { textModel });
  });
}

export async function planAction(raw: PlanInput, apiKey?: string): Promise<Result<ContentPlan>> {
  return toResult(async () => {
    const input = parseInput(PlanInputSchema, raw);
    const { ai, textModel } = await guard({ userApiKey: apiKey, kind: "text", model: input.model });
    return planContent(ai, input, { textModel });
  });
}

export async function regeneratePromptAction(raw: RegeneratePromptInput, apiKey?: string): Promise<Result<string>> {
  return toResult(async () => {
    const input = parseInput(RegeneratePromptInputSchema, raw);
    const { ai, textModel } = await guard({ userApiKey: apiKey, kind: "text", model: input.model });
    return regenerateVisualPrompt(ai, input, { textModel });
  });
}

export async function promptImageAction(raw: PromptImageInput, apiKey?: string): Promise<Result<GeneratedImage>> {
  return toResult(async () => {
    const input = parseInput(PromptImageInputSchema, raw);
    const { ai, imageModel } = await guard({ userApiKey: apiKey, kind: "image", model: input.model });
    return generatePromptImage(ai, input, { imageModel });
  });
}

export async function similarImageAction(raw: SimilarImageInput, apiKey?: string): Promise<Result<GeneratedImage>> {
  return toResult(async () => {
    const input = parseInput(SimilarImageInputSchema, raw);
    const { ai, imageModel } = await guard({ userApiKey: apiKey, kind: "image", model: input.model });
    return generateSimilarImage(ai, input, { imageModel });
  });
}

export async function editImageAction(raw: EditImageInput, apiKey?: string): Promise<Result<GeneratedImage>> {
  return toResult(async () => {
    const input = parseInput(EditImageInputSchema, raw);
    const { ai, imageModel } = await guard({ userApiKey: apiKey, kind: "image", model: input.model });
    return editImage(ai, input, { imageModel });
  });
}

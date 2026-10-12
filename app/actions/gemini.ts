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
  streamAnalyze,
  streamPlan,
  type GeneratedImage,
} from "@/lib/gemini/operations";
import { catchStreamErrors, type StreamEvent } from "@/lib/gemini/stream";
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

/**
 * 把串流事件包成 ReadableStream 回傳（每個 chunk 是一個 JSON 字串）
 * 驗證與 guard 失敗也以 error 事件回報，前端只需處理一種格式
 */
function toEventStream<T>(make: (signal: AbortSignal) => Promise<AsyncGenerator<StreamEvent<T>>>): ReadableStream<string> {
  const controller = new AbortController();
  let iterator: AsyncGenerator<StreamEvent<T>> | null = null;
  return new ReadableStream<string>({
    async pull(stream) {
      iterator ??= catchStreamErrors(async function* () {
        yield* await make(controller.signal);
      });
      const { value, done } = await iterator.next();
      if (done) stream.close();
      else stream.enqueue(JSON.stringify(value));
    },
    async cancel() {
      controller.abort();
      await iterator?.return(undefined);
    },
  });
}

export async function analyzeStreamAction(raw: AnalyzeInput, apiKey?: string): Promise<ReadableStream<string>> {
  return toEventStream(async (signal) => {
    const input = parseInput(AnalyzeInputSchema, raw);
    const { ai, textModel } = await guard({ userApiKey: apiKey, kind: "text", model: input.model });
    return streamAnalyze(ai, input, { textModel, signal });
  });
}

export async function planStreamAction(raw: PlanInput, apiKey?: string): Promise<ReadableStream<string>> {
  return toEventStream(async (signal) => {
    const input = parseInput(PlanInputSchema, raw);
    const { ai, textModel } = await guard({ userApiKey: apiKey, kind: "text", model: input.model });
    return streamPlan(ai, input, { textModel, signal });
  });
}

/**
 * 結構化回應的串流：邊生成邊回報思考摘要與進度，最後才驗證完整 JSON
 * （前後端共用；server action 會把事件包成 ReadableStream 傳給前端）
 */
import type { GenerateContentParameters, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { classifyError, GeminiError, type GeminiErrorCode } from "./errors";
import { withRetry } from "./retry";
import { parseStructured } from "./responses";

export type StreamEvent<T> =
  | { type: "thought"; text: string }
  | { type: "progress"; chars: number; done?: number; total?: number }
  | { type: "result"; data: T }
  | { type: "error"; code: GeminiErrorCode; message?: string; retryAfterMs?: number };

export interface StreamOptions {
  signal?: AbortSignal;
  /** 預期的項目總數（例如規劃的組數），配合 countPattern 計算完成數 */
  total?: number;
  countPattern?: RegExp;
}

/** 思考摘要通常以「**標題**」開頭，只取標題作為進度文字 */
export function summarizeThought(text: string): string | null {
  const bold = text.match(/\*\*(.+?)\*\*/);
  const line = (bold?.[1] ?? text.split("\n").find((l) => l.trim()) ?? "").trim();
  if (!line) return null;
  return line.length > 120 ? `${line.slice(0, 117)}…` : line;
}

function countMatches(text: string, pattern: RegExp): number {
  const global = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
  return text.match(global)?.length ?? 0;
}

async function openStream(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
  signal?: AbortSignal
): Promise<AsyncGenerator<GenerateContentResponse>> {
  const withThoughts: GenerateContentParameters = {
    ...params,
    config: {
      ...params.config,
      thinkingConfig: { ...params.config?.thinkingConfig, includeThoughts: true },
      abortSignal: signal,
    },
  };
  try {
    return await withRetry(() => ai.models.generateContentStream(withThoughts), { signal });
  } catch (error) {
    // 少數模型不支援思考摘要時，改用一般串流
    if (classifyError(error).code !== "INVALID_INPUT") throw error;
    return withRetry(
      () => ai.models.generateContentStream({ ...params, config: { ...params.config, abortSignal: signal } }),
      { signal }
    );
  }
}

export async function* streamStructured<S extends z.ZodType>(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
  schema: S,
  options: StreamOptions = {}
): AsyncGenerator<StreamEvent<z.output<S>>> {
  const { signal, total, countPattern } = options;
  const stream = await openStream(ai, params, signal);

  let text = "";
  let last: GenerateContentResponse | undefined;
  let lastDone = -1;

  for await (const chunk of stream) {
    if (signal?.aborted) throw new GeminiError("ABORTED");
    last = chunk;
    for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
      if (!part.text) continue;
      if (part.thought) {
        const summary = summarizeThought(part.text);
        if (summary) yield { type: "thought", text: summary };
      } else {
        text += part.text;
      }
    }
    const done = countPattern ? Math.min(countMatches(text, countPattern), total ?? Infinity) : undefined;
    if (done !== lastDone || !countPattern) {
      lastDone = done ?? lastDone;
      yield { type: "progress", chars: text.length, done, total };
    }
  }

  if (!last) throw new GeminiError("INVALID_RESPONSE", "Empty stream");
  // 用累積的文字與最後一個 chunk 的 finishReason 組出完整回應再驗證
  const merged = {
    ...last,
    text,
    candidates: last.candidates,
    promptFeedback: last.promptFeedback,
  } as GenerateContentResponse;
  yield { type: "result", data: parseStructured(merged, schema) };
}

/** 把任何錯誤轉成 error 事件，讓串流以事件結束而不是丟出例外 */
export async function* catchStreamErrors<T>(
  source: () => AsyncGenerator<StreamEvent<T>>
): AsyncGenerator<StreamEvent<T>> {
  try {
    yield* source();
  } catch (raw) {
    const error = classifyError(raw);
    yield { type: "error", code: error.code, message: error.message.slice(0, 300), retryAfterMs: error.retryAfterMs };
  }
}

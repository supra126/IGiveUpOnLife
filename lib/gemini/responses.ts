/**
 * 解析 Gemini 回應：安全過濾、圖片擷取、結構化 JSON 驗證
 */
import type { GenerateContentResponse } from "@google/genai";
import type { z } from "zod";
import { GeminiError } from "./errors";

export interface ExtractedImage {
  dataUrl: string;
  mimeType: string;
  thoughtSignature?: string;
  text?: string;
}

const BLOCKED_FINISH_REASONS = new Set([
  "SAFETY",
  "IMAGE_SAFETY",
  "PROHIBITED_CONTENT",
  "IMAGE_PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "RECITATION",
  "IMAGE_RECITATION",
]);

export function assertNotBlocked(response: GenerateContentResponse): void {
  if (response.promptFeedback?.blockReason) {
    throw new GeminiError("CONTENT_BLOCKED", String(response.promptFeedback.blockReason));
  }
  const reason = response.candidates?.[0]?.finishReason;
  if (reason && BLOCKED_FINISH_REASONS.has(String(reason))) {
    throw new GeminiError("CONTENT_BLOCKED", String(reason));
  }
}

/** 取出最終圖片（略過 thought 過程圖），並檢查安全過濾 */
export function extractImage(
  response: GenerateContentResponse
): ExtractedImage {
  assertNotBlocked(response);
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const finalParts = parts.filter((p) => !p.thought);
  const imagePart = [...finalParts].reverse().find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    const reason = response.candidates?.[0]?.finishReason;
    throw new GeminiError("NO_IMAGE", reason ? String(reason) : undefined);
  }
  const mimeType = imagePart.inlineData.mimeType || "image/png";
  const text = finalParts
    .map((p) => p.text)
    .filter(Boolean)
    .join("\n")
    .trim();
  return {
    dataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    mimeType,
    thoughtSignature: imagePart.thoughtSignature,
    text: text || undefined,
  };
}

/** 解析結構化 JSON 回應並用 zod 驗證 */
export function parseStructured<S extends z.ZodType>(response: GenerateContentResponse, schema: S): z.output<S> {
  assertNotBlocked(response);
  if (String(response.candidates?.[0]?.finishReason) === "MAX_TOKENS") {
    throw new GeminiError("RESPONSE_TRUNCATED");
  }
  const text = response.text?.trim();
  if (!text) throw new GeminiError("INVALID_RESPONSE", "Empty response");

  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));
  } catch {
    throw new GeminiError("INVALID_RESPONSE", "Response is not valid JSON");
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new GeminiError("INVALID_RESPONSE", issue ? `${issue.path.join(".")}: ${issue.message}` : undefined);
  }
  return result.data;
}

/**
 * server action 的守門員：決定用哪把金鑰、是否限流、模型是否允許
 *
 * 金鑰規則：
 * - 使用者有帶自己的 key → 用使用者的，不限流、不受模型白名單限制
 * - 沒帶 → 用伺服器 GEMINI_API_KEY，套用限流與 GEMINI_ALLOWED_*_MODELS 白名單
 */
import { GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";
import { GeminiError } from "@/lib/gemini/errors";
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL,
  parseModelAllowlist,
} from "@/lib/gemini/models";
import { checkRateLimit, getClientIdentifier, getRateLimitConfig } from "./rate-limit";
import { isTrustedUser } from "./cloudflare-access";

export type ModelKind = "text" | "image";

export interface GuardResult {
  ai: GoogleGenAI;
  source: "user" | "server";
  textModel: string;
  imageModel: string;
}

export function getServerDefaults() {
  return {
    textModel: process.env.GEMINI_TEXT_MODEL || DEFAULT_TEXT_MODEL,
    imageModel: process.env.GEMINI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
  };
}

export function getServerAllowlists() {
  return {
    text: parseModelAllowlist(process.env.GEMINI_ALLOWED_TEXT_MODELS),
    image: parseModelAllowlist(process.env.GEMINI_ALLOWED_IMAGE_MODELS),
  };
}

async function applyRateLimit(): Promise<void> {
  if (process.env.NODE_ENV === "development") return;

  const headerList = await headers();
  if (await isTrustedUser(headerList)) return;

  const result = checkRateLimit(getClientIdentifier(headerList));
  if (!result.success) {
    throw new GeminiError("RATE_LIMITED", "Server rate limit", result.resetIn);
  }
}

export async function guard(options: {
  userApiKey?: string;
  kind: ModelKind;
  model?: string;
}): Promise<GuardResult> {
  const defaults = getServerDefaults();
  const userKey = options.userApiKey?.trim();

  if (userKey) {
    return { ai: new GoogleGenAI({ apiKey: userKey }), source: "user", ...defaults };
  }

  const serverKey = process.env.GEMINI_API_KEY;
  if (!serverKey) throw new GeminiError("API_KEY_MISSING");

  // 沒設定白名單時，伺服器金鑰可使用任何模型
  const allowlist = getServerAllowlists()[options.kind];
  if (options.model && allowlist && !allowlist.includes(options.model)) {
    throw new GeminiError("MODEL_NOT_ALLOWED", options.model);
  }

  await applyRateLimit();
  return { ai: new GoogleGenAI({ apiKey: serverKey }), source: "server", ...defaults };
}

export function getPublicRateLimit() {
  const config = getRateLimitConfig();
  return config.enabled ? { maxRequests: config.maxRequests, windowMs: config.windowMs } : null;
}

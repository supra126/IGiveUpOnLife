import { GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";
import { Locale } from "@/prompts";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

// --- Server-side i18n for error messages ---

export const errorMessages = {
  zh: {
    apiKeyInvalid: "API 金鑰無效或已過期。請檢查您的金鑰設定。",
    rateLimitExceeded: "請求過於頻繁，已達到 API 限制。請稍後再試。",
    networkError: "網路連線錯誤。請檢查您的網路連線後再試。",
    requestTimeout: "請求超時。請稍後再試，或嘗試生成較簡單的內容。",
    contentBlocked: "內容被安全過濾器阻擋。請嘗試調整您的輸入內容。",
    serviceUnavailable: "AI 服務暫時無法使用。請稍後再試。",
    apiKeyMissing: "找不到 API 金鑰。請在設定中輸入金鑰，或聯繫管理員。",
    rateLimitWarning: "請求過於頻繁，請稍後再試",
    noResponse: "Gemini 沒有回應文字",
    invalidFormat: "AI 返回了無效的格式，且自動修復失敗。請再試一次。",
    missingFields: "部分內容方案缺少必要欄位",
    noImageGenerated: "未生成圖片。",
  },
  en: {
    apiKeyInvalid: "API key is invalid or expired. Please check your key settings.",
    rateLimitExceeded: "Too many requests. API limit reached. Please try again later.",
    networkError: "Network connection error. Please check your connection and try again.",
    requestTimeout: "Request timed out. Please try again later or try generating simpler content.",
    contentBlocked: "Content was blocked by safety filters. Please adjust your input.",
    serviceUnavailable: "AI service is temporarily unavailable. Please try again later.",
    apiKeyMissing: "API key not found. Please enter your key in settings or contact administrator.",
    rateLimitWarning: "Too many requests, please try again later",
    noResponse: "Gemini returned no response",
    invalidFormat: "AI returned invalid format and auto-repair failed. Please try again.",
    missingFields: "Some content sets are missing required fields",
    noImageGenerated: "No image was generated.",
  },
};

export function getErrorMessage(key: keyof typeof errorMessages.en, locale: Locale = "en"): string {
  return errorMessages[locale][key];
}

// --- Helpers ---

export const cleanJson = (text: string): string => {
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json/, "").replace(/```$/, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```/, "").replace(/```$/, "");
  }
  return clean.trim();
};

/**
 * Attempt to repair common JSON issues from AI responses
 * - Unquoted property names: {key: "value"} -> {"key": "value"}
 * - Single quotes: {'key': 'value'} -> {"key": "value"}
 * - Trailing commas: {"key": "value",} -> {"key": "value"}
 * - Unclosed brackets/braces
 */
export const repairJson = (text: string): string => {
  let repaired = text;

  // Fix unquoted property names (but not inside strings)
  // Match: { key: or , key: where key is unquoted
  repaired = repaired.replace(
    /([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g,
    '$1"$2":'
  );

  // Fix single quotes to double quotes (careful with apostrophes in text)
  // Only replace quotes that look like JSON string delimiters
  repaired = repaired.replace(
    /:\s*'([^']*)'/g,
    ': "$1"'
  );

  // Fix trailing commas before closing brackets/braces
  repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

  // Fix missing commas between properties (common AI error)
  // Match: "value" "key" -> "value", "key"
  repaired = repaired.replace(/"\s*\n\s*"/g, '",\n"');

  // Balance unclosed brackets and braces
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;

  if (openBrackets > closeBrackets) {
    repaired = repaired + "]".repeat(openBrackets - closeBrackets);
  }
  if (openBraces > closeBraces) {
    repaired = repaired + "}".repeat(openBraces - closeBraces);
  }

  return repaired;
};

/**
 * Parse JSON with automatic repair attempts
 */
export const parseJsonSafe = <T>(text: string, locale: Locale = "en"): T => {
  const cleaned = cleanJson(text);

  // First attempt: parse as-is
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Second attempt: repair and parse
    try {
      const repaired = repairJson(cleaned);
      return JSON.parse(repaired) as T;
    } catch {
      // Log for debugging
      console.error("JSON parse failed. Original text:", cleaned.substring(0, 500));
      throw new Error(getErrorMessage("invalidFormat", locale));
    }
  }
};

export const isValidUrl = (string: string): boolean => {
  try {
    const url = new URL(string);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

/**
 * Get text model name from environment variable
 * Defaults to gemini-2.5-flash if not set
 */
export function getTextModel(): string {
  const model = process.env.GEMINI_TEXT_MODEL;
  if (model === "gemini-2.5-pro" || model === "gemini-2.5-flash") {
    return model;
  }
  return "gemini-2.5-flash"; // default
}

/**
 * Get image model name from environment variable
 * Defaults to gemini-3-pro-image-preview if not set
 */
export function getImageModel(): string {
  const model = process.env.GEMINI_IMAGE_MODEL;
  if (model) {
    return model;
  }
  return "gemini-3-pro-image-preview"; // default
}

/**
 * Get thinking budget from environment variable
 * Defaults to 2048 if not set
 */
export function getThinkingBudget(): number {
  const budget = process.env.GEMINI_THINKING_BUDGET;
  if (budget) {
    const parsed = parseInt(budget, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 24000) {
      return parsed;
    }
  }
  return 2048; // default
}

/**
 * Retry wrapper for API calls with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-retryable errors
      const errorMessage = lastError.message.toLowerCase();
      const isRetryable =
        errorMessage.includes("network") ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("econnreset") ||
        errorMessage.includes("enotfound") ||
        errorMessage.includes("503") ||
        errorMessage.includes("429") ||
        errorMessage.includes("rate limit");

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Enhance error message for better user experience
 */
export function enhanceErrorMessage(error: unknown, locale: Locale = "en"): Error {
  const originalMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = originalMessage.toLowerCase();

  // API Key errors
  if (lowerMessage.includes("api key") || lowerMessage.includes("unauthorized") || lowerMessage.includes("401")) {
    return new Error(getErrorMessage("apiKeyInvalid", locale));
  }

  // Rate limit errors
  if (lowerMessage.includes("rate limit") || lowerMessage.includes("429") || lowerMessage.includes("quota")) {
    return new Error(getErrorMessage("rateLimitExceeded", locale));
  }

  // Network errors
  if (lowerMessage.includes("network") || lowerMessage.includes("econnreset") || lowerMessage.includes("enotfound")) {
    return new Error(getErrorMessage("networkError", locale));
  }

  // Timeout errors
  if (lowerMessage.includes("timeout")) {
    return new Error(getErrorMessage("requestTimeout", locale));
  }

  // Content safety errors
  if (lowerMessage.includes("safety") || lowerMessage.includes("blocked") || lowerMessage.includes("harmful")) {
    return new Error(getErrorMessage("contentBlocked", locale));
  }

  // Server errors
  if (lowerMessage.includes("500") || lowerMessage.includes("502") || lowerMessage.includes("503")) {
    return new Error(getErrorMessage("serviceUnavailable", locale));
  }

  // Return original error if no match
  return error instanceof Error ? error : new Error(originalMessage);
}

/**
 * Get API key - prefers server env, falls back to user-provided key
 */
export function getApiKey(userApiKey?: string, locale: Locale = "en"): string {
  // Server API key takes precedence if available
  const serverKey = process.env.GEMINI_API_KEY;
  if (serverKey) {
    return serverKey;
  }

  // Fall back to user-provided key
  if (userApiKey) {
    return userApiKey;
  }

  throw new Error(getErrorMessage("apiKeyMissing", locale));
}

/**
 * Check if server has API key configured
 */
export function hasServerApiKey(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Apply rate limiting for server API key usage
 * Trusted users (authenticated via Cloudflare Access) bypass rate limiting
 */
export async function applyRateLimit(): Promise<void> {
  // Only apply rate limit when using server API key
  if (!process.env.GEMINI_API_KEY) {
    return;
  }

  const headersList = await headers();
  const clientId = getClientIdentifier(headersList);

  // Pass headers to checkRateLimit for Cloudflare Access verification
  const result = await checkRateLimit(clientId, headersList);

  if (!result.success) {
    throw new Error(result.error || getErrorMessage("rateLimitWarning", "en"));
  }
}

/**
 * Create a GoogleGenAI client with the appropriate API key
 */
export function createGeminiClient(userApiKey?: string, locale: Locale = "en"): GoogleGenAI {
  const apiKey = getApiKey(userApiKey, locale);
  return new GoogleGenAI({ apiKey });
}

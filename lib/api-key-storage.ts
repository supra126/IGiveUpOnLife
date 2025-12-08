/**
 * API key storage utilities
 * Uses localStorage for persistent storage across sessions
 */

const STORAGE_KEY = "gemini_api_key";

/**
 * Store API key in localStorage
 * localStorage persists across browser sessions
 */
export function saveApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, key);
}

/**
 * Retrieve stored API key
 */
export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

/**
 * Clear stored API key
 */
export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if an API key is stored
 */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

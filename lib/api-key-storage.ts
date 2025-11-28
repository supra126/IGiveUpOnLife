/**
 * Secure API key storage utilities
 * Uses sessionStorage for better security (cleared when browser closes)
 * Keys are only stored in memory during the session
 */

const STORAGE_KEY = "gemini_api_key";

/**
 * Store API key securely in sessionStorage
 * sessionStorage is preferred over localStorage because:
 * 1. Data is cleared when the browser tab is closed
 * 2. Less persistent, reducing exposure window for XSS attacks
 */
export function saveApiKey(key: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, key);
}

/**
 * Retrieve stored API key
 */
export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

/**
 * Clear stored API key
 */
export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if an API key is stored
 */
export function hasApiKey(): boolean {
  return getApiKey() !== null;
}

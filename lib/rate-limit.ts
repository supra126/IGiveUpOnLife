/**
 * Simple in-memory rate limiter with Cloudflare Zero Trust integration
 *
 * Environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000 = 1 minute)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 10)
 * - RATE_LIMIT_ENABLED: Enable/disable rate limiting (default: true)
 *
 * Cloudflare Zero Trust:
 * - Users authenticated via Cloudflare Access bypass rate limiting
 * - Configure CF_ACCESS_TEAM_NAME and CF_ACCESS_AUD to enable
 */

import { isTrustedUser } from "./cloudflareAccess";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (will reset on server restart)
// For production with multiple instances, consider using Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  enabled: boolean;
}

export function getRateLimitConfig(): RateLimitConfig {
  return {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10", 10),
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
  };
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
  error?: string;
  trusted?: boolean; // true if user is trusted (bypassed rate limit)
}

/**
 * Check rate limit for a given identifier (e.g., IP address, user ID)
 * Trusted users (authenticated via Cloudflare Access) bypass rate limiting
 *
 * @param identifier - Client identifier (IP address)
 * @param headers - Optional request headers for Cloudflare Access verification
 */
export async function checkRateLimit(
  identifier: string,
  headers?: Headers
): Promise<RateLimitResult> {
  const config = getRateLimitConfig();

  // Check if user is trusted via Cloudflare Access
  if (headers) {
    const trusted = await isTrustedUser(headers);
    if (trusted) {
      return {
        success: true,
        remaining: Infinity,
        resetIn: 0,
        trusted: true,
      };
    }
  }

  // If rate limiting is disabled, always allow
  if (!config.enabled) {
    return {
      success: true,
      remaining: config.maxRequests,
      resetIn: 0,
    };
  }

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or expired
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Entry exists and not expired
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
      error: `Too many requests, please try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds`,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Synchronous version for backward compatibility (without Cloudflare Access check)
 * @deprecated Use async checkRateLimit with headers instead
 */
export function checkRateLimitSync(identifier: string): RateLimitResult {
  const config = getRateLimitConfig();

  // If rate limiting is disabled, always allow
  if (!config.enabled) {
    return {
      success: true,
      remaining: config.maxRequests,
      resetIn: 0,
    };
  }

  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No existing entry or expired
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Entry exists and not expired
  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
      error: `Too many requests, please try again in ${Math.ceil((entry.resetTime - now) / 1000)} seconds`,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Get client identifier from request headers
 * Falls back to 'anonymous' if no identifier found
 */
export function getClientIdentifier(headers: Headers): string {
  // Try Cloudflare-specific header first
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Try various headers for client identification
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback for development or edge cases
  return "anonymous";
}

/**
 * Simple in-memory rate limiter
 *
 * Environment variables:
 * - RATE_LIMIT_WINDOW_MS: Time window in milliseconds (default: 60000 = 1 minute)
 * - RATE_LIMIT_MAX_REQUESTS: Max requests per window (default: 10)
 * - RATE_LIMIT_ENABLED: Enable/disable rate limiting (default: true)
 */

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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  };
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // milliseconds until reset
  error?: string;
}

/**
 * Check rate limit for a given identifier (e.g., IP address, user ID)
 */
export function checkRateLimit(identifier: string): RateLimitResult {
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
      error: `請求過於頻繁，請在 ${Math.ceil((entry.resetTime - now) / 1000)} 秒後再試`,
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
  // Try various headers for client identification
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback for development or edge cases
  return 'anonymous';
}

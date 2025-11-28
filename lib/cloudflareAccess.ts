/**
 * Cloudflare Zero Trust Access Integration
 *
 * Verifies JWT tokens from Cloudflare Access to identify trusted users.
 * Trusted users bypass rate limiting.
 *
 * Configuration:
 * - CF_ACCESS_TEAM_NAME: Your Cloudflare Zero Trust team name
 * - CF_ACCESS_AUD: Application Audience (AUD) tag from Access policy
 *
 * How it works:
 * 1. Cloudflare Access adds `Cf-Access-Jwt-Assertion` header for authenticated users
 * 2. We verify the JWT signature using Cloudflare's public keys
 * 3. If valid, the user is marked as "trusted" and bypasses rate limits
 */

import { jwtVerify, createRemoteJWKSet } from "jose";

// Configuration from environment
const CF_TEAM_NAME = process.env.CF_ACCESS_TEAM_NAME;
const CF_AUD = process.env.CF_ACCESS_AUD;

// Cache for JWKS (JSON Web Key Set)
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksCacheTeam: string | null = null;

/**
 * Get or create cached JWKS for the team
 */
function getJWKS(teamName: string) {
  if (jwksCache && jwksCacheTeam === teamName) {
    return jwksCache;
  }

  const jwksUrl = new URL(
    `https://${teamName}.cloudflareaccess.com/cdn-cgi/access/certs`
  );

  jwksCache = createRemoteJWKSet(jwksUrl);
  jwksCacheTeam = teamName;

  return jwksCache;
}

/**
 * Verify Cloudflare Access JWT token
 *
 * @param token - The JWT token from Cf-Access-Jwt-Assertion header
 * @returns Decoded payload if valid, null otherwise
 */
async function verifyAccessToken(
  token: string
): Promise<{ email?: string; sub?: string } | null> {
  if (!CF_TEAM_NAME || !CF_AUD) {
    return null;
  }

  try {
    const jwks = getJWKS(CF_TEAM_NAME);

    const { payload } = await jwtVerify(token, jwks, {
      audience: CF_AUD,
      issuer: `https://${CF_TEAM_NAME}.cloudflareaccess.com`,
    });

    return payload as { email?: string; sub?: string };
  } catch (error) {
    // Log error in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.warn("[Cloudflare Access] JWT verification failed:", error);
    }
    return null;
  }
}

/**
 * Check if the request is from a trusted user (authenticated via Cloudflare Access)
 *
 * @param headers - Request headers (from Next.js headers())
 * @returns true if user is authenticated via Cloudflare Access
 */
export async function isTrustedUser(headers: Headers): Promise<boolean> {
  // If Cloudflare Access is not configured, no one is trusted
  if (!CF_TEAM_NAME || !CF_AUD) {
    return false;
  }

  // Get the JWT from Cloudflare Access header
  const token = headers.get("Cf-Access-Jwt-Assertion");

  if (!token) {
    return false;
  }

  // Verify the token
  const payload = await verifyAccessToken(token);

  return payload !== null;
}

/**
 * Get the authenticated user's email from Cloudflare Access
 *
 * @param headers - Request headers
 * @returns User email if authenticated, null otherwise
 */
export async function getTrustedUserEmail(
  headers: Headers
): Promise<string | null> {
  if (!CF_TEAM_NAME || !CF_AUD) {
    return null;
  }

  const token = headers.get("Cf-Access-Jwt-Assertion");

  if (!token) {
    return null;
  }

  const payload = await verifyAccessToken(token);

  return payload?.email || null;
}

/**
 * Check if Cloudflare Access is configured
 */
export function isCloudflareAccessConfigured(): boolean {
  return Boolean(CF_TEAM_NAME && CF_AUD);
}

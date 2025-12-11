import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import crypto from "crypto";

const JWT_SECRET: string = process.env.JWT_SECRET ?? "dev_secret_key_change_in_production";
const ACCESS_EXP: string = process.env.JWT_ACCESS_EXP ?? "15m";
const REFRESH_EXP_DAYS: number = parseInt(process.env.JWT_REFRESH_EXP_DAYS ?? "14");

interface TokenPayload {
  userId: string;
  email?: string;
  role: string;
  jti: string;
}

/**
 * Sign an access token with short TTL (15min default).
 * Used for API requests.
 */
export function signAccessToken(payload: Omit<TokenPayload, "jti">): string {
  const jti = crypto.randomUUID();
  const tokenPayload: TokenPayload = { ...payload, jti };
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: ACCESS_EXP } as any);
}

/**
 * Sign a refresh token with long TTL (14 days default).
 * Token JTI stored in DB for revocation checks.
 */
export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { userId, jti, type: "refresh" },
    JWT_SECRET,
    { expiresIn: `${REFRESH_EXP_DAYS}d` } as any
  );
  return { token, jti };
}

/**
 * Verify access token and check if NOT revoked.
 * Returns null if invalid or revoked.
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Check if token was revoked
    if (decoded.jti) {
      const revoked = await prisma.tokenRevocation.findUnique({
        where: { token_jti: decoded.jti },
      });
      if (revoked) return null;
    }
    
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Verify refresh token (longer verification, checks DB for revocation).
 * Also validates JTI is not revoked.
 */
export async function verifyRefreshToken(token: string): Promise<{ userId: string; jti: string } | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.type !== "refresh") return null;
    
    // Check if revoked
    if (decoded.jti) {
      const revoked = await prisma.tokenRevocation.findUnique({
        where: { token_jti: decoded.jti },
      });
      if (revoked) return null;
    }
    
    return { userId: decoded.userId, jti: decoded.jti };
  } catch (err) {
    return null;
  }
}

/**
 * Revoke a token by storing its JTI with expiry in DB.
 * Useful for logout and token rotation.
 */
export async function revokeToken(userId: string, jti: string, expiresAt: Date): Promise<void> {
  await prisma.tokenRevocation.create({
    data: {
      userId,
      token_jti: jti,
      expires_at: expiresAt,
    },
  });
}

/**
 * Hash refresh token for storage (if needed for additional security layer).
 * Use this before storing token in response for client-side rotation.
 */
export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Rotate refresh token: revoke old, issue new.
 * Ensures only latest refresh token is valid.
 */
export async function rotateRefreshToken(
  userId: string,
  oldJti: string,
  oldExpiresAt: Date
): Promise<{ token: string; jti: string }> {
  // Revoke old token
  await revokeToken(userId, oldJti, oldExpiresAt);
  // Issue new
  return signRefreshToken(userId);
}

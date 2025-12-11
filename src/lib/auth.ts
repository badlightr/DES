// src/lib/auth.ts
// Authentication & Authorization utilities with refresh token rotation

import { NextRequest } from "next/server";
import { AuthenticationError, AuthorizationError } from "./errors";
import { verifyAccessToken, verifyRefreshToken, rotateRefreshToken } from "./jwt";

export interface TokenPayload {
  userId: string;
  email?: string;
  role: "EMPLOYEE" | "SUPERVISOR" | "MANAGER" | "HR" | "ADMIN";
  jti: string;
}

/**
 * Extract Bearer token from Authorization header.
 * Throws AuthenticationError if missing or malformed.
 */
export function extractToken(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing or invalid authorization header");
  }
  return authHeader.slice(7);
}

/**
 * Verify Authorization header and return token payload.
 * Used in protected route handlers.
 */
export async function verifyAuthorization(request: NextRequest): Promise<TokenPayload> {
  const authHeader = request.headers.get("authorization");
  const token = extractToken(authHeader);
  
  const decoded = await verifyAccessToken(token);
  if (!decoded) {
    throw new AuthenticationError("Invalid or expired token");
  }
  
  return decoded as TokenPayload;
}

/**
 * RBAC: Check if user role matches required role(s).
 * Throws AuthorizationError if insufficient permissions.
 */
export function requireRole(userRole: string, requiredRoles: string[]): void {
  if (!requiredRoles.includes(userRole)) {
    throw new AuthorizationError(`This action requires one of: ${requiredRoles.join(", ")}`);
  }
}

/**
 * Role hierarchy for implicit permission grants.
 * ADMIN can act as HR, MANAGER, SUPERVISOR, EMPLOYEE.
 * HR can act as MANAGER, SUPERVISOR, EMPLOYEE.
 * etc.
 */
export const roleHierarchy: Record<string, string[]> = {
  EMPLOYEE: [],
  SUPERVISOR: ["EMPLOYEE"],
  MANAGER: ["EMPLOYEE", "SUPERVISOR"],
  HR: ["EMPLOYEE", "SUPERVISOR", "MANAGER"],
  ADMIN: ["EMPLOYEE", "SUPERVISOR", "MANAGER", "HR"],
};

/**
 * Check if userRole implicitly includes requiredRole.
 * Used for permission delegation in approval chains.
 */
export function hasPermission(userRole: string, requiredRole: string): boolean {
  if (userRole === requiredRole) return true;
  return roleHierarchy[userRole]?.includes(requiredRole) ?? false;
}

/**
 * Handle token refresh via refresh token.
 * Validates refresh token and returns new access + rotated refresh token.
 */
export async function handleRefreshToken(refreshToken: string, userId: string) {
  const verified = await verifyRefreshToken(refreshToken);
  if (!verified || verified.userId !== userId) {
    throw new AuthenticationError("Invalid refresh token");
  }
  
  // Rotate: revoke old, issue new
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + parseInt(process.env.JWT_REFRESH_EXP_DAYS ?? "14"));
  
  const newRefreshToken = await rotateRefreshToken(userId, verified.jti, expiryDate);
  
  return newRefreshToken;
}
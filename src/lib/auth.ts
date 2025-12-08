// src/lib/auth.ts
// Authentication & Authorization utilities

import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import { AuthenticationError, AuthorizationError } from "./errors";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret_key_change_in_production";
const ACCESS_EXP = process.env.JWT_ACCESS_EXP ?? "15m";
const REFRESH_EXP = process.env.JWT_REFRESH_EXP_DAYS ?? "14";

export interface TokenPayload {
  sub: string; // user id
  email: string;
  role: "EMPLOYEE" | "SUPERVISOR" | "MANAGER" | "HR" | "ADMIN";
  iat?: number;
  exp?: number;
  type: "access" | "refresh";
}

export function signAccessToken(payload: Omit<TokenPayload, "iat" | "exp" | "type">): string {
  return jwt.sign({ ...payload, type: "access" }, JWT_SECRET, { expiresIn: ACCESS_EXP } as any);
}

export function signRefreshToken(payload: Omit<TokenPayload, "iat" | "exp" | "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, {
    expiresIn: `${REFRESH_EXP}d`,
  } as any);
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (err) {
    throw new AuthenticationError("Invalid or expired token");
  }
}

export function extractToken(authHeader: string): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthenticationError("Missing or invalid authorization header");
  }
  return authHeader.slice(7);
}

export function verifyAuthorization(request: NextRequest): TokenPayload {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    throw new AuthenticationError("Missing authorization header");
  }

  const token = extractToken(authHeader);
  return verifyToken(token);
}

export function requireRole(userRole: string, requiredRoles: string[]): void {
  if (!requiredRoles.includes(userRole)) {
    throw new AuthorizationError(`This action requires one of: ${requiredRoles.join(", ")}`);
  }
}

// Role hierarchy for implicit permission grants
export const roleHierarchy: Record<string, string[]> = {
  EMPLOYEE: [],
  SUPERVISOR: ["EMPLOYEE"],
  MANAGER: ["EMPLOYEE", "SUPERVISOR"],
  HR: ["EMPLOYEE", "SUPERVISOR", "MANAGER"],
  ADMIN: ["EMPLOYEE", "SUPERVISOR", "MANAGER", "HR"],
};

export function hasPermission(userRole: string, requiredRole: string): boolean {
  if (userRole === requiredRole) return true;
  return roleHierarchy[userRole]?.includes(requiredRole) ?? false;
}

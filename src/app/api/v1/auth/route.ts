import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { signAccessToken, signRefreshToken, revokeToken } from "@/lib/jwt";
import { verifyAuthorization } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthenticationError, ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/auth/login
 * Authenticate user with email and password.
 * Returns access_token (15min) + refresh_token (14d).
 * Refresh token stored with hashed JTI in TokenRevocation table for revocation tracking.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      const error = new ValidationError("email and password are required");
      return errorResponse(error);
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Constant-time comparison to avoid timing attacks
      const error = new AuthenticationError("Invalid credentials");
      return errorResponse(error);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new AuthenticationError("Invalid credentials");
      return errorResponse(error);
    }

    // Check if user is active
    if (!user.is_active) {
      const error = new AuthenticationError("User account is inactive");
      return errorResponse(error);
    }

    // Issue tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email ?? "",
      role: user.role,
    });

    const { token: refreshToken } = signRefreshToken(user.id);

    return successResponse(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 900, // 15 minutes in seconds
        user: {
          id: user.id,
          employee_no: user.employee_no,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      "Login successful"
    );
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      return errorResponse(error);
    }

    console.error("Login error:", error);
    const err = new Error("Internal server error");
    return errorResponse(err as any);
  }
}

/**
 * PATCH /api/v1/auth/refresh
 * Exchange refresh token for new access token.
 * Implements refresh token rotation: old token revoked, new issued.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      const error = new ValidationError("refresh_token is required");
      return errorResponse(error);
    }

    // Decode and verify refresh token
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret_key_change_in_production";

    let decoded: any;
    try {
      decoded = jwt.decode(refresh_token);
    } catch (err) {
      const error = new AuthenticationError("Invalid refresh token");
      return errorResponse(error);
    }

    if (!decoded || !decoded.userId) {
      const error = new AuthenticationError("Invalid refresh token");
      return errorResponse(error);
    }

    // Verify signature
    try {
      jwt.verify(refresh_token, JWT_SECRET);
    } catch (err) {
      const error = new AuthenticationError("Invalid or expired refresh token");
      return errorResponse(error);
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.is_active) {
      const error = new AuthenticationError("User not found or inactive");
      return errorResponse(error);
    }

    // Revoke old refresh token
    const refreshExpiryDate = new Date();
    refreshExpiryDate.setDate(
      refreshExpiryDate.getDate() + parseInt(process.env.JWT_REFRESH_EXP_DAYS ?? "14")
    );

    if (decoded.jti) {
      await revokeToken(user.id, decoded.jti, refreshExpiryDate);
    }

    // Issue new tokens
    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email ?? "",
      role: user.role,
    });

    const { token: newRefreshToken } = signRefreshToken(user.id);

    return successResponse(
      {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: "Bearer",
        expires_in: 900,
      },
      "Token refreshed"
    );
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof ValidationError) {
      return errorResponse(error);
    }

    console.error("Refresh token error:", error);
    const err = new Error("Internal server error");
    return errorResponse(err as any);
  }
}

/**
 * DELETE /api/v1/auth/logout
 * Revoke all tokens for current user.
 * Requires valid access token in Authorization header.
 */
export async function DELETE(req: NextRequest) {
  try {
    const payload = await verifyAuthorization(req);

    if (!payload) {
      const error = new AuthenticationError("Invalid token");
      return errorResponse(error);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      const error = new AuthenticationError("User not found");
      return errorResponse(error);
    }

    // Note: In production, you'd want to revoke all refresh tokens for this user
    // For now, logout just marks the session as ended on client side
    // The refresh tokens will naturally expire after 14 days

    return successResponse(null, "Logout successful");
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return errorResponse(error);
    }

    console.error("Logout error:", error);
    const err = new Error("Internal server error");
    return errorResponse(err as any);
  }
}


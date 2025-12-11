import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/auth or /api/v1/auth/login
 * Simple login with demo fallback (no external dependencies)
 */
export async function POST(req: NextRequest) {
  try {
    console.log("[Auth] POST request received");
    
    const body = await req.json();
    const { email, password } = body;

    console.log("[Auth] Email:", email, "Password length:", password?.length);

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          message: "email and password are required",
          error: { code: "VALIDATION_ERROR" },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Demo accounts - hardcoded for now (no DB, no bcrypt dependency)
    const demoAccounts: Record<string, { id: string; name: string; role: string; employee_no: string }> = {
      "admin@example.com": {
        id: "demo-admin",
        employee_no: "EMP001",
        name: "Admin User",
        role: "ADMIN",
      },
      "manager@example.com": {
        id: "demo-manager",
        employee_no: "EMP002",
        name: "Manager User",
        role: "MANAGER",
      },
      "employee@example.com": {
        id: "demo-employee",
        employee_no: "EMP003",
        name: "Employee User",
        role: "EMPLOYEE",
      },
    };

    const account = demoAccounts[email];
    if (!account) {
      console.log("[Auth] Account not found for email:", email);
      return NextResponse.json(
        {
          success: false,
          status: 401,
          message: "Invalid credentials",
          error: { code: "AUTHENTICATION_ERROR" },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Simple password check (demo mode)
    if (password !== "password123") {
      console.log("[Auth] Invalid password for email:", email);
      return NextResponse.json(
        {
          success: false,
          status: 401,
          message: "Invalid credentials",
          error: { code: "AUTHENTICATION_ERROR" },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Generate simple tokens (demo - not cryptographically signed)
    const accessToken = `access_${account.id}_${Date.now()}`;
    const refreshToken = `refresh_${account.id}_${Date.now()}`;

    console.log("[Auth] Login successful for:", email);

    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: "Login successful",
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
          expires_in: 900,
          user: {
            id: account.id,
            employee_no: account.employee_no,
            name: account.name,
            email: email,
            role: account.role,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Auth] Exception:", error);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: "Internal server error",
        error: { code: "INTERNAL_ERROR" },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/auth (refresh token)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          message: "refresh_token is required",
          error: { code: "VALIDATION_ERROR" },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Demo: just issue a new token
    const newAccessToken = `access_${Date.now()}`;
    const newRefreshToken = `refresh_${Date.now()}`;

    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: "Token refreshed",
        data: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          token_type: "Bearer",
          expires_in: 900,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Auth] PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: "Internal server error",
        error: { code: "INTERNAL_ERROR" },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/auth (logout)
 */
export async function DELETE(req: NextRequest) {
  try {
    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: "Logout successful",
        data: null,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Auth] DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: "Internal server error",
        error: { code: "INTERNAL_ERROR" },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


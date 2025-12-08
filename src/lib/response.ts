// src/lib/response.ts
// Standardized API response format

import { NextResponse } from "next/server";
import { AppError } from "./errors";

export interface ApiResponse<T = any> {
  success: boolean;
  status: number;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: Record<string, any>;
  };
  timestamp: string;
  requestId?: string;
}

export function successResponse<T>(
  data: T,
  message: string = "Success",
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      status: statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

export function errorResponse(
  error: AppError | Error,
  statusCode?: number
): NextResponse<ApiResponse> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        status: error.statusCode,
        message: error.message,
        error: {
          code: error.code,
          details: error.details,
        },
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode }
    );
  }

  return NextResponse.json(
    {
      success: false,
      status: 500,
      message: "Internal server error",
      error: {
        code: "INTERNAL_ERROR",
      },
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
  message: string = "Success"
): NextResponse<ApiResponse<{ items: T[]; pagination: any }>> {
  const totalPages = Math.ceil(total / pageSize);

  return NextResponse.json(
    {
      success: true,
      status: 200,
      message,
      data: {
        items: data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}

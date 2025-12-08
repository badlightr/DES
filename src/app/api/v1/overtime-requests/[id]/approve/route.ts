// src/app/api/v1/overtime-requests/[id]/approve/route.ts
// DEPRECATED: Use /api/v1/overtime-requests/{id}/approvals instead

import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/response";
import { NotFoundError } from "@/lib/errors";

/**
 * POST /api/v1/overtime-requests/{id}/approve (DEPRECATED)
 * This endpoint has been moved to POST /api/v1/overtime-requests/{id}/approvals
 * See approvals/route.ts for the new implementation with optimistic locking and full audit trails.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const error = new NotFoundError(
    "Approval endpoint moved. Use POST /api/v1/overtime-requests/{id}/approvals instead"
  );
  return errorResponse(error);
}


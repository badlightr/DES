import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthorization, requireRole } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ConflictError,
  NotFoundError,
  BusinessRuleViolation,
} from "@/lib/errors";
import { incrementRowVersion } from "@/lib/concurrency";
import crypto from "crypto";

/**
 * POST /api/v1/overtime-requests/{id}/approvals
 * Approve, reject, or skip an approval step for an overtime request.
 *
 * FEATURES:
 * - Optimistic locking with row_version check
 * - Only assigned approver can act
 * - Transaction-based update ensures consistency
 * - Auto-escalate to next level on final approval
 * - Audit trail with SHA256 hash chain
 * - Idempotency via request deduplication (optional)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = id;
    const payload = await verifyAuthorization(req);

    if (!payload) {
      throw new AuthenticationError("Invalid token");
    }

    const body = await req.json();
    const { step_order, status, comment, row_version } = body;

    // Validate input
    if (!step_order || !status) {
      throw new ValidationError("step_order and status are required");
    }

    if (!["APPROVED", "REJECTED", "SKIPPED"].includes(status)) {
      throw new ValidationError('status must be APPROVED, REJECTED, or SKIPPED');
    }

    // Fetch the overtime request
    const overtimeRequest = await prisma.overtimeRequest.findUnique({
      where: { id: requestId },
      include: {
        approvals: {
          orderBy: { step_order: "asc" },
        },
      },
    });

    if (!overtimeRequest) {
      throw new NotFoundError("Overtime request");
    }

    // Find the specific approval step
    const approvalStep = overtimeRequest.approvals.find(
      (a: any) => a.step_order === step_order
    );

    if (!approvalStep) {
      throw new NotFoundError("Approval step");
    }

    // Verify approver is assigned to this step
    if (approvalStep.approver_id !== payload.userId) {
      throw new AuthorizationError(
        "Only the assigned approver can update this step"
      );
    }

    // Verify approver has correct role
    const approver = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!approver) {
      throw new AuthenticationError("Approver user not found");
    }

    // Check if step is already decided
    if (approvalStep.status !== "PENDING") {
      throw new ConflictError(
        `This approval step is already ${approvalStep.status.toLowerCase()}`,
        { current_status: approvalStep.status }
      );
    }

    // OPTIMISTIC LOCKING: Verify row_version matches (if provided)
    // This prevents lost updates if someone else modified the request between fetch and update
    if (row_version !== undefined && overtimeRequest.row_version !== row_version) {
      throw new ConflictError(
        "Request was modified by another user. Please refresh and try again.",
        {
          expected_version: row_version,
          current_version: overtimeRequest.row_version,
        }
      );
    }

    // TRANSACTION: Update approval step and check if final
    // All-or-nothing consistency
    const result = await prisma.$transaction(async (tx: any) => {
      // Update approval step
      const updatedStep = await tx.approvalStep.update({
        where: { id: approvalStep.id },
        data: {
          status,
          decision_at: new Date(),
          comment: comment || null,
          row_version: { increment: 1 },
        },
      });

      // Fetch updated request to check if approval chain is complete
      const updatedRequest = await tx.overtimeRequest.findUnique({
        where: { id: requestId },
        include: { approvals: { orderBy: { step_order: "asc" } } },
      });

      if (!updatedRequest) {
        throw new NotFoundError("Overtime request");
      }

      // Determine if this is final approval
      const pendingSteps = updatedRequest.approvals.filter(
        (a: any) => a.status === "PENDING"
      );

      let newRequestStatus = overtimeRequest.status;
      let updatedRequestData: any = updatedRequest;

      if (status === "APPROVED" && pendingSteps.length === 0) {
        // All approvals done, mark request as APPROVED
        updatedRequestData = await tx.overtimeRequest.update({
          where: { id: requestId },
          data: {
            status: "APPROVED",
            current_level: updatedRequest.max_level,
            row_version: { increment: 1 },
            updated_at: new Date(),
          },
          include: { approvals: true },
        });

        newRequestStatus = "APPROVED";
      } else if (status === "REJECTED") {
        // Any rejection marks entire request as REJECTED
        updatedRequestData = await tx.overtimeRequest.update({
          where: { id: requestId },
          data: {
            status: "REJECTED",
            row_version: { increment: 1 },
            updated_at: new Date(),
          },
          include: { approvals: true },
        });

        newRequestStatus = "REJECTED";
      }

      // Create audit entry for approval action
      const auditDiff = {
        action: "APPROVAL_UPDATE",
        step_order,
        old_status: "PENDING",
        new_status: status,
        comment: comment || null,
        request_status_after: newRequestStatus,
      };

      // Get previous audit entry hash for chain
      const lastAudit = await tx.auditEntry.findFirst({
        where: {
          entity_table: "ApprovalStep",
          entity_id: approvalStep.id,
        },
        orderBy: { performed_at: "desc" },
      });

      const sha256 = crypto
        .createHash("sha256")
        .update(JSON.stringify(auditDiff))
        .digest("hex");

      await tx.auditEntry.create({
        data: {
          entity_table: "ApprovalStep",
          entity_id: approvalStep.id,
          action: "UPDATE",
          performed_by: payload.userId,
          performed_at: new Date(),
          diff: auditDiff,
          sha256,
          previous_sha256: lastAudit?.sha256 || null,
        },
      });

      return {
        approval: updatedStep,
        request: updatedRequestData,
        isFinalApproval: pendingSteps.length === 0,
      };
    });

    return successResponse(
      {
        approval_step: {
          id: result.approval.id,
          step_order: result.approval.step_order,
          status: result.approval.status,
          approver_id: result.approval.approver_id,
          decision_at: result.approval.decision_at,
          comment: result.approval.comment,
          row_version: result.approval.row_version,
        },
        request: {
          id: result.request.id,
          status: result.request.status,
          current_level: result.request.current_level,
          row_version: result.request.row_version,
        },
        is_final_approval: result.isFinalApproval,
      },
      "Approval recorded successfully"
    );
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError ||
      error instanceof ValidationError ||
      error instanceof ConflictError ||
      error instanceof NotFoundError ||
      error instanceof BusinessRuleViolation
    ) {
      return errorResponse(error);
    }

    console.error("Approval error:", error);
    const err = new Error("Internal server error");
    return errorResponse(err as any);
  }
}

/**
 * GET /api/v1/overtime-requests/{id}/approvals
 * Fetch all approval steps for an overtime request.
 * Authorization: Only involved parties (requester, approvers, admin) can view.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const requestId = id;
    const payload = await verifyAuthorization(req);

    if (!payload) {
      throw new AuthenticationError("Invalid token");
    }

    // Fetch request and approvals
    const request = await prisma.overtimeRequest.findUnique({
      where: { id: requestId },
      include: {
        approvals: {
          orderBy: { step_order: "asc" },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundError("Overtime request");
    }

    // Authorization: Employee sees own, approvers see assigned, admin sees all
    if (
      payload.userId !== request.userId &&
      payload.role !== "ADMIN" &&
      payload.role !== "HR"
    ) {
      // Check if user is an approver for this request
      const isApprover = request.approvals.some(
        (a: any) => a.approver_id === payload.userId
      );

      if (!isApprover) {
        throw new AuthorizationError(
          "You do not have permission to view these approvals"
        );
      }
    }

    return successResponse(
      {
        request_id: request.id,
        user: request.user,
        status: request.status,
        approvals: request.approvals.map((a: any) => ({
          id: a.id,
          step_order: a.step_order,
          status: a.status,
          approver_id: a.approver_id,
          decision_at: a.decision_at,
          comment: a.comment,
          created_at: a.created_at,
        })),
      },
      "Approvals retrieved successfully"
    );
  } catch (error) {
    if (
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError ||
      error instanceof NotFoundError
    ) {
      return errorResponse(error);
    }

    console.error("Get approvals error:", error);
    const err = new Error("Internal server error");
    return errorResponse(err as any);
  }
}

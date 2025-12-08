// src/app/api/v1/overtime-requests/[id]/approve/route.ts
// Approval endpoint - multi-level approval workflow

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthorization, requireRole } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/response";
import { NotFoundError, AuthorizationError, BusinessRuleViolation, AppError } from "@/lib/errors";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = verifyAuthorization(request);
    const { id } = params;

    // Only SUPERVISOR, MANAGER, HR can approve
    requireRole(user.role, ["SUPERVISOR", "MANAGER", "HR"]);

    const body = await request.json();
    const { status, comment } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Invalid approval status");
    }

    // Get overtime request
    const overtimeRequest = await prisma.overtimeRequest.findUnique({
      where: { id },
      include: {
        approvals: { orderBy: { step_order: "asc" } },
        user: true,
      },
    });

    if (!overtimeRequest) {
      throw new NotFoundError("OvertimeRequest");
    }

    // Check authorization - user can only approve if they are in approval chain
    const userApprovalStep = overtimeRequest.approvals.find(
      (a) => a.approver_id === user.sub && a.status === "PENDING"
    );

    if (!userApprovalStep) {
      throw new AuthorizationError("You are not authorized to approve this request at this step");
    }

    // Process approval transactionally
    const result = await prisma.$transaction(async (tx: any) => {
      // Update current approval step
      const updatedStep = await tx.approvalStep.update({
        where: { id: userApprovalStep.id },
        data: {
          status,
          decision_at: new Date(),
          comment,
          row_version: userApprovalStep.row_version + 1,
        },
      });

      let newStatus = overtimeRequest.status;

      if (status === "REJECTED") {
        // If rejected, mark entire request as rejected
        newStatus = "REJECTED";
      } else if (status === "APPROVED") {
        // Check if this is final approval
        const nextPendingStep = overtimeRequest.approvals.find(
          (a) => a.step_order > userApprovalStep.step_order && a.status === "PENDING"
        );

        if (!nextPendingStep) {
          // No more steps - request is approved
          newStatus = "APPROVED";
        } else {
          // Move to next approval step
          newStatus = "PENDING";
        }
      }

      // Update overtime request
      const updated = await tx.overtimeRequest.update({
        where: { id },
        data: {
          status: newStatus,
          current_level: userApprovalStep.step_order,
          updated_at: new Date(),
          row_version: overtimeRequest.row_version + 1,
        },
      });

      // Audit log
      await tx.auditEntry.create({
        data: {
          entity_table: "OvertimeRequest",
          entity_id: id,
          action: "APPROVE",
          performed_by: user.sub,
          diff: {
            from: { status: overtimeRequest.status },
            to: { status: newStatus },
          },
          sha256: crypto
            .createHash("sha256")
            .update(JSON.stringify(updated))
            .digest("hex"),
          previous_sha256: crypto
            .createHash("sha256")
            .update(JSON.stringify(overtimeRequest))
            .digest("hex"),
        },
      });

      return updated;
    });

    return successResponse(result, `Overtime request ${status.toLowerCase()}`);
  } catch (error) {
    return errorResponse(error as AppError | Error);
  }
}

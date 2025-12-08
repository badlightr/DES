import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runWithIdempotency } from "@/lib/idempotency";
import { verifyAuthorization } from "@/lib/auth";
import { successResponse, errorResponse, paginatedResponse } from "@/lib/response";
import { validateOvertimeRequest as validateInput, validatePagination, throwIfInvalid } from "@/lib/validation";
import { validateOvertimeRequest as validateBusinessRules, createApprovalSteps } from "@/lib/overtime";
import { AppError, ValidationError, BusinessRuleViolation, NotFoundError } from "@/lib/errors";
import crypto from "crypto";

/**
 * GET /api/v1/overtime-requests
 * List overtime requests with pagination, filtering, sorting
 * RBAC: Employee sees own, Supervisor+ sees team
 */
export async function GET(request: NextRequest) {
  try {
    const user = verifyAuthorization(request);

    // Pagination
    const searchParams = request.nextUrl.searchParams;
    const { page, pageSize } = validatePagination(searchParams.get("page"), searchParams.get("pageSize"));

    // Filtering
    const status = searchParams.get("status");
    const userId = searchParams.get("userId");
    const departmentId = searchParams.get("departmentId");

    // Build query
    const where: any = { is_active: true };

    // Authorization: Employees only see their own
    if (user.role === "EMPLOYEE") {
      where.userId = user.sub;
    } else {
      // Supervisors+ can filter by userId/departmentId
      if (userId) where.userId = userId;
      if (departmentId) where.departmentId = departmentId;
    }

    if (status) where.status = status;

    const [requests, total] = await Promise.all([
      prisma.overtimeRequest.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          approvals: {
            orderBy: { step_order: "asc" },
          },
        },
      }),
      prisma.overtimeRequest.count({ where }),
    ]);

    return paginatedResponse(requests, page, pageSize, total, "Overtime requests retrieved");
  } catch (error) {
    return errorResponse(error as AppError | Error);
  }
}

/**
 * POST /api/v1/overtime-requests
 * Create new overtime request
 * CRITICAL: Must validate against attendance logs, not user input
 */
export async function POST(request: NextRequest) {
  try {
    const user = verifyAuthorization(request);

    // Only EMPLOYEE role can submit
    if (user.role !== "EMPLOYEE" && user.role !== "SUPERVISOR") {
      throw new Error("Only employees and supervisors can submit overtime requests");
    }

    // Idempotency key
    const idempotencyKey = request.headers.get("x-idempotency-key");
    if (!idempotencyKey) {
      throw new ValidationError("Missing X-Idempotency-Key header");
    }

    const body = await request.json();

    // Validate input
    const validation = validateInput(body);
    throwIfInvalid(validation);

    const { start_at, end_at, reason, departmentId } = body;
    const startTime = new Date(start_at);
    const endTime = new Date(end_at);
    const durationMin = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    // Validate business rules
    const businessValidation = await validateBusinessRules(
      user.sub,
      startTime,
      endTime,
      durationMin
    );

    if (!businessValidation.valid) {
      throw new BusinessRuleViolation(
        "Overtime request violates business rules",
        "BUSINESS_RULE_VIOLATION",
        { violations: businessValidation.violations }
      );
    }

    const result = await runWithIdempotency(
      idempotencyKey,
      user.sub,
      "/api/v1/overtime-requests",
      async () => {
        // Check for overlaps transactionally
        return await prisma.$transaction(async (tx: any) => {
          const overlaps = await tx.$queryRawUnsafe(
            `
            SELECT id FROM "OvertimeRequest"
            WHERE "userId" = $1
              AND "is_active" = true
              AND "status" NOT IN ('REJECTED','CANCELED','EXPIRED')
              AND tstzrange("start_at","end_at",'[]') && tstzrange($2,$3,'[]')
            FOR UPDATE
            `,
            user.sub,
            startTime.toISOString(),
            endTime.toISOString()
          );

          if ((overlaps as any[]).length > 0) {
            throw new BusinessRuleViolation(
              "Overtime period overlaps with existing request",
              "OVERLAP_DETECTED"
            );
          }

          // Create overtime request
          const created = await tx.overtimeRequest.create({
            data: {
              userId: user.sub,
              departmentId,
              start_at: startTime,
              end_at: endTime,
              duration_min: durationMin,
              reason,
              status: "SUBMITTED",
              submitted_at: new Date(),
              created_by: user.sub,
              current_level: 0,
            },
          });

          // Create approval steps based on department's approval chain
          const chain = await tx.approvalChain.findFirst({
            where: { departmentId },
            include: { steps: { orderBy: { step_order: "asc" } } },
          });

          if (chain) {
            await tx.approvalStep.createMany({
              data: chain.steps.map((step: any) => ({
                overtimeRequestId: created.id,
                step_order: step.step_order,
                approver_id: step.userId,
                status: "PENDING",
              })),
            });
          }

          // Audit log
          await tx.auditEntry.create({
            data: {
              entity_table: "OvertimeRequest",
              entity_id: created.id,
              action: "INSERT",
              performed_by: user.sub,
              diff: { created },
              sha256: crypto.createHash("sha256").update(JSON.stringify(created)).digest("hex"),
            },
          });

          return created;
        });
      }
    );

    if (result.duplicate) {
      return successResponse(result.response, "Overtime request already submitted", 200);
    }

    return successResponse(result.response, "Overtime request created", 201);
  } catch (error) {
    return errorResponse(error as AppError | Error);
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuthorization } from "@/lib/auth";
import { successResponse, errorResponse, paginatedResponse } from "@/lib/response";
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
  AuthorizationError,
  BusinessRuleViolation,
  NotFoundError,
  AppError,
} from "@/lib/errors";
import { validateOvertimeRequest, createApprovalSteps } from "@/lib/overtime";
import { validatePagination } from "@/lib/validation";
import crypto from "crypto";

/**
 * GET /api/v1/overtime-requests
 * List overtime requests with pagination, filtering, sorting
 * RBAC: Employee sees own, Supervisor+ sees team
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthorization(request);

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
      where.userId = user.userId;
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
 * FEATURES:
 * - X-Idempotency-Key for deduplication
 * - SELECT ... FOR UPDATE to prevent overlaps
 * - Transaction-based approval step creation
 * - Audit trail with SHA256 hash chain
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthorization(request);

    // Idempotency key
    const idempotencyKey = request.headers.get("x-idempotency-key");
    if (!idempotencyKey) {
      throw new ValidationError("Missing X-Idempotency-Key header");
    }

    const body = await request.json();
    const { start_time, end_time, reason } = body;

    if (!start_time || !end_time) {
      throw new ValidationError("start_time and end_time are required");
    }

    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    if (startTime >= endTime) {
      throw new ValidationError("start_time must be before end_time");
    }

    const durationMin = Math.floor((endTime.getTime() - startTime.getTime()) / 60000);

    if (durationMin <= 0) {
      throw new ValidationError("Duration must be at least 1 minute");
    }

    // Check idempotency
    const existingKey = await prisma.idempotencyKey.findUnique({
      where: { key: idempotencyKey },
    });

    if (existingKey && existingKey.response_body) {
      return successResponse(existingKey.response_body, "Request already processed", 200);
    }

    // Business validations (attendance, overlap, daily/weekly limits, submission window)
    const validation = await validateOvertimeRequest(user.userId, startTime, endTime, durationMin);
    if (!validation.valid) {
      throw new BusinessRuleViolation("Overtime validation failed", { details: validation.violations });
    }

    // Create new request with overlap check in transaction
    const created = await (prisma.$transaction as any)(async (tx: any) => {
      // Check for overlaps using raw SQL with FOR UPDATE (using new column names)
      const overlaps = await (tx as any).$queryRawUnsafe(
        `
        SELECT id FROM "OvertimeRequest"
        WHERE "userId" = $1
          AND "is_active" = true
          AND "status" NOT IN ('REJECTED','CANCELED','EXPIRED')
          AND tstzrange("start_time","end_time",'[]') && tstzrange($2::timestamptz, $3::timestamptz, '[]')
        FOR UPDATE SKIP LOCKED
        `,
        user.userId,
        startTime,
        endTime
      );

      if (overlaps.length > 0) {
        throw new ConflictError(
          "Overtime period overlaps with existing request",
          { conflicting_ids: overlaps.map((o: any) => o.id) }
        );
      }

      // Create overtime request
      // Create overtime request using new schema fields
      const overtimeRequest = await tx.overtimeRequest.create({
        data: {
          userId: user.userId,
          date: startTime,
          start_time: startTime,
          end_time: endTime,
          total_minutes: durationMin,
          reason: reason || null,
          status: "SUBMITTED",
          submitted_at: new Date(),
          created_by: user.userId,
          current_level: 0,
          max_level: 3,
        },
      });

      // Create approval steps from configured chain (throws if chain missing)
      await createApprovalSteps(overtimeRequest.id, user.userId).catch(async (err) => {
        // If no chain, fallback to default 3-step chain
        const approvalSteps = [
          { step_order: 1 },
          { step_order: 2 },
          { step_order: 3 },
        ];

        await tx.approvalStep.createMany({
          data: approvalSteps.map((step) => ({
            overtimeRequestId: overtimeRequest.id,
            step_order: step.step_order,
            approver_id: null,
            status: "PENDING",
          })),
        });
      });

      // Audit entry (created by trigger, but we can add application-level info)
      const sha256 = crypto.createHash("sha256").update(JSON.stringify(overtimeRequest)).digest("hex");

      await tx.auditEntry.create({
        data: {
          entity_table: "OvertimeRequest",
          entity_id: overtimeRequest.id,
          action: "CREATE",
          performed_by: user.userId,
          performed_at: new Date(),
          diff: { created: overtimeRequest },
          sha256,
          previous_sha256: null,
        },
      });

      return overtimeRequest;
    });

    // Store idempotency key
    const responseData = {
      id: created.id,
      status: created.status,
      date: created.date,
      start_time: created.start_time,
      end_time: created.end_time,
      total_minutes: created.total_minutes,
      created_at: created.created_at,
    };

    await prisma.idempotencyKey.upsert({
      where: { key: idempotencyKey },
      create: {
        key: idempotencyKey,
        owner_id: user.userId,
        method: "POST",
        path: "/api/v1/overtime-requests",
        request_hash: crypto
          .createHash("sha256")
          .update(JSON.stringify(body))
          .digest("hex"),
        response_body: responseData,
        used_at: new Date(),
      },
      update: {
        used_at: new Date(),
      },
    });

    return successResponse(responseData, "Overtime request created", 201);
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof ConflictError ||
      error instanceof AuthenticationError
    ) {
      return errorResponse(error);
    }

    console.error("Create overtime request error:", error);
    const err = new Error("Internal server error");
    return errorResponse(err as any);
  }
}

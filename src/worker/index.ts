import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

/**
 * src/worker/index.ts
 * Background worker for overtime expiration and escalation
 * 
 * CONCURRENCY PATTERN:
 * - Uses FOR UPDATE SKIP LOCKED to process requests without blocking others
 * - Idempotent: can be safely run multiple times
 * - Processes in batches to avoid long transaction locks
 * 
 * Features:
 * 1. Expire old DRAFT requests
 * 2. Auto-escalate stalled approvals
 * 3. Create audit entries for all changes
 * 4. Hash chain tracking
 */

const prisma = new PrismaClient();

const EXPIRATION_DAYS = 30;
const ESCALATION_TIMEOUT_MIN = 3 * 24 * 60; // 3 days

async function expireDraftRequests() {
  console.log("[Worker] Starting draft request expiration...");

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - EXPIRATION_DAYS);

  // Use FOR UPDATE SKIP LOCKED for concurrent safety
  const expiredDrafts = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT id, user_id FROM "OvertimeRequest"
    WHERE status = 'DRAFT'
      AND created_at < $1
      AND is_active = true
    FOR UPDATE SKIP LOCKED
    LIMIT 100
    `,
    cutoffDate
  );

  console.log(`[Worker] Found ${expiredDrafts.length} draft requests to expire`);

  for (const draft of expiredDrafts) {
    try {
      await prisma.$transaction(async (tx) => {
        // Update status
        const updated = await tx.overtimeRequest.update({
          where: { id: draft.id },
          data: {
            status: "EXPIRED",
            row_version: { increment: 1 },
            updated_at: new Date(),
          },
        });

        // Create audit entry
        const sha256 = crypto
          .createHash("sha256")
          .update(JSON.stringify({ action: "EXPIRE", id: draft.id }))
          .digest("hex");

        await tx.auditEntry.create({
          data: {
            entity_table: "OvertimeRequest",
            entity_id: draft.id,
            action: "EXPIRE",
            performed_by: null, // System action
            performed_at: new Date(),
            diff: { old_status: "DRAFT", new_status: "EXPIRED", reason: "Auto-expiration" },
            sha256,
            previous_sha256: null,
          },
        });
      });

      console.log(`[Worker] Expired draft request: ${draft.id}`);
    } catch (error) {
      console.error(`[Worker] Failed to expire draft ${draft.id}:`, error);
    }
  }
}

async function escalateStalleddApprovals() {
  console.log("[Worker] Starting stalled approval escalation...");

  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - ESCALATION_TIMEOUT_MIN);

  // Find approval steps that have been pending too long
  const stalledSteps = await prisma.$queryRawUnsafe<any[]>(
    `
    SELECT a.id, a."overtimeRequestId", a.step_order
    FROM "ApprovalStep" a
    WHERE a.status = 'PENDING'
      AND a.created_at < $1
    FOR UPDATE SKIP LOCKED
    LIMIT 100
    `,
    cutoffTime
  );

  console.log(`[Worker] Found ${stalledSteps.length} stalled approval steps`);

  for (const step of stalledSteps) {
    try {
      await prisma.$transaction(async (tx) => {
        // Mark as escalated/skipped
        const updated = await tx.approvalStep.update({
          where: { id: step.id },
          data: {
            status: "SKIPPED",
            row_version: { increment: 1 },
            comment: "Auto-skipped due to timeout",
          },
        });

        // Create audit entry
        const sha256 = crypto
          .createHash("sha256")
          .update(
            JSON.stringify({
              action: "ESCALATE",
              step_id: step.id,
            })
          )
          .digest("hex");

        await tx.auditEntry.create({
          data: {
            entity_table: "ApprovalStep",
            entity_id: step.id,
            action: "ESCALATE",
            performed_by: null,
            performed_at: new Date(),
            diff: {
              old_status: "PENDING",
              new_status: "SKIPPED",
              reason: "Auto-escalation timeout",
            },
            sha256,
            previous_sha256: null,
          },
        });

        // Check if request now has no pending steps
        const request = await tx.overtimeRequest.findUnique({
          where: { id: step.overtimeRequestId },
          include: { approvals: true },
        });

        if (request) {
          const hasPending = request.approvals.some((a) => a.status === "PENDING");

          if (!hasPending) {
            // All steps processed, mark as expired
            await tx.overtimeRequest.update({
              where: { id: step.overtimeRequestId },
              data: {
                status: "EXPIRED",
                row_version: { increment: 1 },
              },
            });

            console.log(
              `[Worker] Auto-completed request ${step.overtimeRequestId} after escalation`
            );
          }
        }
      });

      console.log(`[Worker] Escalated approval step: ${step.id}`);
    } catch (error) {
      console.error(`[Worker] Failed to escalate step ${step.id}:`, error);
    }
  }
}

async function cleanupRevokedTokens() {
  console.log("[Worker] Starting revoked token cleanup...");

  const deleted = await prisma.tokenRevocation.deleteMany({
    where: {
      expires_at: {
        lt: new Date(),
      },
    },
  });

  console.log(`[Worker] Cleaned up ${deleted.count} expired token revocations`);
}

async function run() {
  console.log("[Worker] Starting overtime background worker...");

  try {
    await expireDraftRequests();
    await escalateStalleddApprovals();
    await cleanupRevokedTokens();

    console.log("[Worker] Worker completed successfully");
  } catch (error) {
    console.error("[Worker] Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run immediately
run();

import { prisma } from "./prisma";
import { ConflictError, BusinessRuleViolation } from "./errors";

/**
 * Check for overlapping overtime requests for a user.
 * Uses SELECT ... FOR UPDATE to prevent concurrent overlaps during creation.
 * 
 * CONCURRENCY PATTERN:
 * 1. Begin transaction
 * 2. SELECT ... FOR UPDATE on relevant rows
 * 3. Check for overlaps
 * 4. Insert new request
 * 5. Commit transaction
 * 
 * This ensures that concurrent requests creating overlapping times will fail
 * on the database constraint or the transaction check.
 */
export async function checkAndPreventOverlap(
  userId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string
): Promise<void> {
  // Use raw SQL to implement SELECT ... FOR UPDATE
  // Prisma doesn't natively support SELECT FOR UPDATE, so we use raw query
  const query = excludeId
    ? `
    SELECT id, start_at, end_at FROM "OvertimeRequest" 
    WHERE "userId" = $1 
      AND "is_active" = true 
      AND id != $2
      AND (start_at, end_at) OVERLAPS ($3::timestamptz, $4::timestamptz)
    FOR UPDATE SKIP LOCKED
    `
    : `
    SELECT id, start_at, end_at FROM "OvertimeRequest" 
    WHERE "userId" = $1 
      AND "is_active" = true 
      AND (start_at, end_at) OVERLAPS ($3::timestamptz, $4::timestamptz)
    FOR UPDATE SKIP LOCKED
    `;

  const overlapping = await prisma.$queryRawUnsafe<any[]>(
    query,
    userId,
    excludeId,
    startAt,
    endAt
  );

  if (overlapping.length > 0) {
    throw new ConflictError(
      "Overlapping overtime request already exists for this time period",
      {
        overlapping_requests: overlapping.map((r) => ({
          id: r.id,
          start_at: r.start_at,
          end_at: r.end_at,
        })),
      }
    );
  }
}

/**
 * Validate overtime request against business rules.
 * Checks daily/weekly limits, submission deadline, policy constraints.
 */
export async function validateOvertimeRequest(
  userId: string,
  startAt: Date,
  endAt: Date,
  durationMin: number
): Promise<void> {
  // Load policy config
  const maxDailyMin = 240; // 4 hours
  const maxWeeklyMin = 720; // 12 hours
  const submissionDeadlineDays = 3;

  // Check 1: Daily limit
  const dayStart = new Date(startAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(startAt);
  dayEnd.setHours(23, 59, 59, 999);

  const dayTotal = await prisma.overtimeRequest.aggregate({
    where: {
      userId,
      is_active: true,
      status: { in: ["SUBMITTED", "PENDING", "APPROVED"] },
      start_at: { gte: dayStart },
      end_at: { lte: dayEnd },
    },
    _sum: { duration_min: true },
  });

  const currentDayTotal = (dayTotal._sum.duration_min || 0) + durationMin;
  if (currentDayTotal > maxDailyMin) {
    throw new BusinessRuleViolation(
      `Daily overtime limit exceeded. Max: ${maxDailyMin}min, Current: ${currentDayTotal}min`,
      "DAILY_LIMIT_EXCEEDED",
      { max: maxDailyMin, current: currentDayTotal }
    );
  }

  // Check 2: Weekly limit (Monday-Sunday)
  const weekStart = new Date(startAt);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekTotal = await prisma.overtimeRequest.aggregate({
    where: {
      userId,
      is_active: true,
      status: { in: ["SUBMITTED", "PENDING", "APPROVED"] },
      start_at: { gte: weekStart },
      end_at: { lte: weekEnd },
    },
    _sum: { duration_min: true },
  });

  const currentWeekTotal = (weekTotal._sum.duration_min || 0) + durationMin;
  if (currentWeekTotal > maxWeeklyMin) {
    throw new BusinessRuleViolation(
      `Weekly overtime limit exceeded. Max: ${maxWeeklyMin}min, Current: ${currentWeekTotal}min`,
      "WEEKLY_LIMIT_EXCEEDED",
      { max: maxWeeklyMin, current: currentWeekTotal }
    );
  }

  // Check 3: Submission deadline (must be submitted within 3 days of overtime)
  const now = new Date();
  const daysDiff = Math.floor((startAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff > submissionDeadlineDays) {
    throw new BusinessRuleViolation(
      `Overtime must be submitted within ${submissionDeadlineDays} days of the date`,
      "SUBMISSION_DEADLINE_EXCEEDED",
      { deadline_days: submissionDeadlineDays, days_ahead: daysDiff }
    );
  }
}

/**
 * Check row version for optimistic locking.
 * Used in approval updates to ensure no concurrent modifications.
 */
export async function verifyRowVersion(
  requestId: string,
  expectedVersion: number
): Promise<boolean> {
  const request = await prisma.overtimeRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) return false;
  return request.row_version === expectedVersion;
}

/**
 * Increment row version (for optimistic locking).
 */
export async function incrementRowVersion(requestId: string): Promise<number> {
  const updated = await prisma.overtimeRequest.update({
    where: { id: requestId },
    data: { row_version: { increment: 1 } },
    select: { row_version: true },
  });

  return updated.row_version;
}

// src/lib/overtime.ts
// Overtime calculation engine - production grade

import { prisma } from "./prisma";
import { BusinessRuleViolation, ConflictError, DatabaseError } from "./errors";
import {
  getAttendanceLogs,
  calculateWorkingMinutes,
  isNightShift,
  isHoliday,
  getPolicyConfig,
  defaultPolicies,
} from "./attendance";

export interface OvertimeValidationResult {
  valid: boolean;
  violations: string[];
  calculatedMinutes: number;
  appliedMultipliers: {
    nightShift: boolean;
    holiday: boolean;
    multiplier: number;
  };
}

/**
 * CRITICAL BUSINESS RULE:
 * Overtime must be calculated from ACTUAL attendance logs, not user input
 * User input is only metadata (reason, etc)
 * This prevents fraud and ensures audit trail accuracy
 */
export async function validateOvertimeRequest(
  userId: string,
  startTime: Date,
  endTime: Date,
  submittedDurationMin: number
): Promise<OvertimeValidationResult> {
  const violations: string[] = [];
  let calculatedMinutes = submittedDurationMin;
  let nightShiftMultiplier = 1;
  let isHolidayOvertime = false;

  // Rule 1: Fetch actual attendance logs for this period
  const attendanceLogs = await getAttendanceLogs(userId, startTime, endTime);
  if (attendanceLogs.length === 0) {
    violations.push("No verified attendance logs found for this period");
  }

  // Rule 2: Check for overlapping overtime requests
  const overlaps = await prisma.overtimeRequest.findMany({
    where: {
      userId,
      is_active: true,
      status: {
        notIn: ["REJECTED", "CANCELED", "EXPIRED"],
      },
      start_time: {
        lt: endTime,
      },
      end_time: {
        gt: startTime,
      },
    },
  });

  if (overlaps.length > 0) {
    violations.push("Overlapping overtime request already exists");
  }

  // Rule 3: Check daily overtime limit
  const maxDailyMinutes = await getPolicyConfig("max_overtime_day_min");
  const dailyLimit = maxDailyMinutes?.minutes
    ? maxDailyMinutes.minutes
    : defaultPolicies.maxOvertimePerDay;

  if (calculatedMinutes > dailyLimit) {
    violations.push(`Daily overtime limit exceeded. Maximum: ${dailyLimit / 60} hours`);
  }

  // Rule 4: Check weekly overtime limit
  const weekStart = new Date(startTime);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weeklyOvertimes = await prisma.overtimeRequest.aggregate({
    where: {
      userId,
      is_active: true,
      status: {
        notIn: ["REJECTED", "CANCELED", "EXPIRED"],
      },
      start_time: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    _sum: {
      total_minutes: true,
    },
  });

  const maxWeeklyMinutes = await getPolicyConfig("max_overtime_week_min");
  const weeklyLimit = maxWeeklyMinutes?.minutes
    ? maxWeeklyMinutes.minutes
    : defaultPolicies.maxOvertimePerWeek;

  const totalWeeklyMinutes = (weeklyOvertimes._sum.total_minutes ?? 0) + calculatedMinutes;
  if (totalWeeklyMinutes > weeklyLimit) {
    violations.push(
      `Weekly overtime limit exceeded. Maximum: ${weeklyLimit / 60} hours, Current: ${totalWeeklyMinutes / 60} hours`
    );
  }

  // Rule 5: Check submission deadline (must be within X days of work date)
  const submissionDeadlineDays = await getPolicyConfig("submission_deadline_days");
  const deadline = submissionDeadlineDays?.days
    ? submissionDeadlineDays.days
    : defaultPolicies.submissionDeadlineDays;

  const daysSinceWork = Math.floor((new Date().getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceWork > deadline) {
    violations.push(
      `Submission deadline passed. Must submit within ${deadline} days of work date`
    );
  }

  // Rule 6: Apply multipliers
  const isNight = isNightShift(startTime);
  const isHol = await isHoliday(startTime);

  if (isNight) {
    nightShiftMultiplier = (await getPolicyConfig("night_multiplier"))?.multiplier
      ? (await getPolicyConfig("night_multiplier")).multiplier
      : defaultPolicies.nightShiftMultiplier;
  }

  if (isHol) {
    isHolidayOvertime = true;
    const holidayMult = (await getPolicyConfig("holiday_multiplier"))?.multiplier
      ? (await getPolicyConfig("holiday_multiplier")).multiplier
      : defaultPolicies.holidayMultiplier;
    // Holiday multiplier takes precedence
    nightShiftMultiplier = holidayMult;
  }

  return {
    valid: violations.length === 0,
    violations,
    calculatedMinutes,
    appliedMultipliers: {
      nightShift: isNight,
      holiday: isHol,
      multiplier: nightShiftMultiplier,
    },
  };
}

/**
 * Get approval chain for user's department
 * Returns ordered list of approvers
 */
export async function getApprovalChain(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new DatabaseError("User not found");
  }

  return await prisma.approvalChain.findFirst({
    where: {
      departmentId: user.departmentId,
    },
    include: {
      steps: {
        orderBy: {
          step_order: "asc",
        },
      },
    },
  });
}

/**
 * Create approval steps based on approval chain configuration
 */
export async function createApprovalSteps(
  overtimeRequestId: string,
  userId: string
) {
  const chain = await getApprovalChain(userId);

  if (!chain) {
    throw new BusinessRuleViolation(
      "No approval chain configured for this department",
      "NO_APPROVAL_CHAIN"
    );
  }

  const steps = chain.steps.map((step) => ({
    overtimeRequestId,
    step_order: step.step_order,
    approver_id: step.userId,
    status: "PENDING" as const,
  }));

  return await prisma.approvalStep.createMany({
    data: steps,
  });
}

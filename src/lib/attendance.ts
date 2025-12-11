// src/lib/attendance.ts
// Attendance log service - mock implementation

import { prisma } from "./prisma";
import { NotFoundError, DatabaseError } from "./errors";

export interface AttendanceCalculation {
  totalMinutes: number;
  workingHours: number;
  startTime: Date;
  endTime: Date;
  isNightShift: boolean;
  isHoliday: boolean;
}

/**
 * Get attendance logs for user within date range
 * CRITICAL: This is foundation for all overtime calculations
 * Do not use user input for overtime - always validate against attendance logs
 */
export async function getAttendanceLogs(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  try {
    return await prisma.attendanceLog.findMany({
      where: {
        userId,
        check_in: {
          gte: startDate,
          lte: endDate,
        },
        verified: true,
      },
      orderBy: {
        check_in: "asc",
      },
    });
  } catch (error) {
    throw new DatabaseError("Failed to fetch attendance logs");
  }
}

/**
 * Calculate actual working hours from attendance logs
 * Returns working minutes between check_in and check_out
 */
export function calculateWorkingMinutes(checkIn: Date, checkOut: Date | null): number {
  if (!checkOut) return 0;
  return Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
}

/**
 * Detect night shift (22:00 - 06:00)
 */
export function isNightShift(time: Date): boolean {
  const hour = time.getHours();
  return hour >= 22 || hour < 6;
}

/**
 * Check if date is holiday
 * TODO: Integrate with actual holiday calendar
 */
export async function isHoliday(date: Date): Promise<boolean> {
  // Mock implementation - return false for now
  // In production: query holiday_calendars table
  return false;
}

/**
 * Get policy config value
 */
export async function getPolicyConfig(key: string): Promise<any> {
  const config = await prisma.policyConfig.findUnique({
    where: { key },
  });
  return config?.value ?? null;
}

/**
 * Default policies - load from database in production
 */
export const defaultPolicies = {
  maxOvertimePerDay: 4 * 60, // 4 hours in minutes
  maxOvertimePerWeek: 12 * 60, // 12 hours in minutes
  nightShiftMultiplier: 1.5,
  holidayMultiplier: 2.0,
  submissionDeadlineDays: 3,
};

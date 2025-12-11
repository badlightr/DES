// src/lib/validation.ts
// Input validation utilities

import { ValidationError } from "./errors";

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateDateRange(startDate: Date, endDate: Date): boolean {
  return endDate > startDate;
}

export function validateNonEmpty(value: any): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  return value != null;
}

export function validateOvertimeRequest(data: any): ValidationResult {
  const errors: Record<string, string> = {};

  // Accept new field names `start_time` / `end_time` (or legacy `start_at` / `end_at`)
  const startField = data.start_time ?? data.start_at;
  const endField = data.end_time ?? data.end_at;

  if (!startField) {
    errors.start_time = "Start time is required";
  }
  if (!endField) {
    errors.end_time = "End time is required";
  }
  if (startField && endField) {
    const start = new Date(startField);
    const end = new Date(endField);
    if (!validateDateRange(start, end)) {
      errors.dateRange = "End time must be after start time";
    }
  }

  if (data.reason && typeof data.reason !== "string") {
    errors.reason = "Reason must be a string";
  }

  if (data.departmentId && !validateUUID(data.departmentId)) {
    errors.departmentId = "Invalid department ID";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function throwIfInvalid(result: ValidationResult): void {
  if (!result.valid) {
    throw new ValidationError("Validation failed", result.errors);
  }
}

export function validatePagination(page?: any, pageSize?: any) {
  const p = parseInt(page) || 1;
  const ps = parseInt(pageSize) || 10;

  if (p < 1) throw new ValidationError("Page must be >= 1");
  if (ps < 1 || ps > 100) throw new ValidationError("PageSize must be between 1 and 100");

  return { page: p, pageSize: ps };
}

// Business rule constants
export const OVERTIME_RULES = {
  MAX_HOURS_PER_DAY: 4, // 4 hours max per day
  MAX_HOURS_PER_WEEK: 12, // 12 hours max per week
  MIN_HOURS_PER_REQUEST: 0.5, // 30 minutes minimum
};

// Client-side helper functions
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return endMinutes - startMinutes;
}

export function calculateDurationHours(startTime: string, endTime: string): number {
  return calculateDurationMinutes(startTime, endTime) / 60;
}

export function calculatePayment(durationMinutes: number, hourlyRate: number): number {
  const hours = durationMinutes / 60;
  // Apply typical overtime multiplier (1.5x)
  return Math.round(hours * hourlyRate * 1.5);
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

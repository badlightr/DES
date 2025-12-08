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

  if (!data.start_at) {
    errors.start_at = "Start time is required";
  }
  if (!data.end_at) {
    errors.end_at = "End time is required";
  }
  if (data.start_at && data.end_at) {
    const start = new Date(data.start_at);
    const end = new Date(data.end_at);
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

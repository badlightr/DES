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

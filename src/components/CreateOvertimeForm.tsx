'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { apiClient } from '@/lib/api-client';
import {
  calculateDurationHours,
  calculatePayment,
  OVERTIME_RULES,
} from '@/lib/validation';

interface CreateOvertimeFormData {
  date: Date;
  start_time: string;
  end_time: string;
  reason: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export default function CreateOvertimeForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [estimatedPayment, setEstimatedPayment] = useState<number | null>(null);

  const {
    control,
    register,
    watch,
    handleSubmit,
    formState: { errors: formErrors },
  } = useForm<CreateOvertimeFormData>({
    defaultValues: {
      date: new Date(),
      start_time: '18:00',
      end_time: '20:00',
      reason: '',
    },
  });

  const startTime = watch('start_time');
  const endTime = watch('end_time');

  // Calculate estimated duration and payment
  React.useEffect(() => {
    if (startTime && endTime) {
      try {
        const hours = calculateDurationHours(startTime, endTime);
        if (hours > 0 && hours <= OVERTIME_RULES.MAX_HOURS_PER_DAY) {
          // Estimate payment at ₹1000/hour base * 1.5x
          const payment = calculatePayment(hours * 60, 1000);
          setEstimatedPayment(payment);
        }
      } catch (err) {
        // Silently ignore errors during calculation
      }
    }
  }, [startTime, endTime]);

  const onSubmit = async (data: CreateOvertimeFormData) => {
    setServerError(null);
    setValidationErrors([]);

    // Client-side validation
    const clientErrors: ValidationError[] = [];

    // Validate times
    if (!data.start_time || !data.end_time) {
      clientErrors.push({ field: 'time', message: 'Both start and end times are required' });
    } else {
      const [startH, startM] = data.start_time.split(':').map(Number);
      const [endH, endM] = data.end_time.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      if (startMin >= endMin) {
        clientErrors.push({ field: 'end_time', message: 'End time must be after start time' });
      }

      const diffMinutes = endMin - startMin;
      const diffHours = diffMinutes / 60;

      if (diffHours < OVERTIME_RULES.MIN_HOURS_PER_REQUEST) {
        clientErrors.push({
          field: 'duration',
          message: `Minimum duration is ${OVERTIME_RULES.MIN_HOURS_PER_REQUEST} hours`,
        });
      }

      if (diffHours > OVERTIME_RULES.MAX_HOURS_PER_DAY) {
        clientErrors.push({
          field: 'duration',
          message: `Maximum duration is ${OVERTIME_RULES.MAX_HOURS_PER_DAY} hours per day`,
        });
      }
    }

    // Validate reason
    if (!data.reason || data.reason.trim().length < 10) {
      clientErrors.push({
        field: 'reason',
        message: 'Reason must be at least 10 characters',
      });
    }

    // Validate date
    if (!data.date) {
      clientErrors.push({ field: 'date', message: 'Date is required' });
    }

    if (clientErrors.length > 0) {
      setValidationErrors(clientErrors);
      return;
    }

    setLoading(true);

    try {
      const formattedDate = data.date.toISOString().split('T')[0];

      const response = await apiClient.post('/api/v1/overtime/submit', {
        date: formattedDate,
        start_time: data.start_time,
        end_time: data.end_time,
        reason: data.reason,
      });

      if (response.success) {
        setSuccess(true);
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setServerError(response.message || 'Failed to submit request');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit request';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Success!
          </h2>
          <p className="text-gray-600 text-center">
            Your overtime request has been submitted successfully. Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Ajukan Lembur</h1>

          {serverError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <div className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5 font-bold">!</div>
              <div>
                <p className="font-medium text-red-800">Error</p>
                <p className="text-red-700 text-sm">{serverError}</p>
              </div>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="font-medium text-yellow-800 mb-2">
                Please fix the following errors:
              </p>
              <ul className="space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx} className="text-sm text-yellow-700">
                    • {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Date Field */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-900 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <Controller
                name="date"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <input
                    type="date"
                    value={value ? value.toISOString().split('T')[0] : ''}
                    onChange={(e) => onChange(new Date(e.target.value))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Select overtime date"
                  />
                )}
              />
              {formErrors.date && (
                <p className="text-red-600 text-sm mt-1">{formErrors.date.message}</p>
              )}
            </div>

            {/* Time Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start_time"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('start_time', { required: 'Start time is required' })}
                  type="time"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="Start time"
                />
                {formErrors.start_time && (
                  <p className="text-red-600 text-sm mt-1">
                    {formErrors.start_time.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="end_time"
                  className="block text-sm font-medium text-gray-900 mb-2"
                >
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('end_time', { required: 'End time is required' })}
                  type="time"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="End time"
                />
                {formErrors.end_time && (
                  <p className="text-red-600 text-sm mt-1">
                    {formErrors.end_time.message}
                  </p>
                )}
              </div>
            </div>

            {/* Duration and Payment Info */}
            {startTime && endTime && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  Duration:{' '}
                  <span className="font-semibold text-gray-900">
                    {calculateDurationHours(startTime, endTime).toFixed(2)} hours
                  </span>
                </p>
                {estimatedPayment && (
                  <p className="text-sm text-gray-600">
                    Estimated Payment:{' '}
                    <span className="font-semibold text-gray-900">
                      ₹{(estimatedPayment / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      (based on ₹1000/hr × 1.5x multiplier)
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Reason Field */}
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-900 mb-2"
              >
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                {...register('reason', {
                  required: 'Reason is required',
                  minLength: {
                    value: 10,
                    message: 'Reason must be at least 10 characters',
                  },
                })}
                rows={4}
                placeholder="Describe why overtime is needed..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Reason for overtime"
              />
              {formErrors.reason && (
                <p className="text-red-600 text-sm mt-1">
                  {formErrors.reason.message}
                </p>
              )}
            </div>

            {/* Business Rules Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">
                Business Rules
              </h3>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>✓ Maximum {OVERTIME_RULES.MAX_HOURS_PER_DAY} hours per day</li>
                <li>✓ Maximum {OVERTIME_RULES.MAX_HOURS_PER_WEEK} hours per week</li>
                <li>✓ Minimum {OVERTIME_RULES.MIN_HOURS_PER_REQUEST} hours per request</li>
                <li>✓ No overlapping overtime requests allowed</li>
                <li>✓ Must have verified attendance record for the day</li>
              </ul>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-medium"
                aria-label="Submit overtime request"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition font-medium"
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

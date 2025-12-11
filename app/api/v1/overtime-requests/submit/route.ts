import { NextRequest, NextResponse } from 'next/server';
import { validateOvertimeRequest } from '@/lib/validation';
import { successResponse, errorResponse } from '@/lib/response';

interface OvertimeSubmitRequest {
  date: string; // YYYY-MM-DD format
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  reason: string;
}

/**
 * POST /api/v1/overtime/submit
 * Submit a new overtime request
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OvertimeSubmitRequest;

    // Validate input
    const validation = validateOvertimeRequest(body);
    if (!validation.valid) {
      return errorResponse(
        new Error('Validation failed'),
        400
      );
    }

    // Extract user from headers (in a real app, verify JWT token)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return errorResponse(
        new Error('Unauthorized'),
        401
      );
    }

    // Parse date and times
    const [year, month, day] = body.date.split('-').map(Number);
    const [startH, startM] = body.start_time.split(':').map(Number);
    const [endH, endM] = body.end_time.split(':').map(Number);

    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const totalMinutes = endMin - startMin;

    if (totalMinutes <= 0 || totalMinutes > 240) {
      return errorResponse(
        new Error('Invalid duration'),
        400
      );
    }

    // In a real app, save to database
    // For now, return mock response
    const requestId = `ot-${Date.now()}`;

    return successResponse(
      {
        success: true,
        id: requestId,
      },
      'Overtime request submitted successfully',
      201
    );
  } catch (error) {
    console.error('[Overtime Submit] Error:', error);
    return errorResponse(
      new Error('Internal server error'),
      500
    );
  }
}

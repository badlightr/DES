import { NextRequest, NextResponse } from 'next/server';
import { validateOvertimeRequest } from '@/lib/validation';

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
      return NextResponse.json(
        {
          success: false,
          status: 400,
          message: 'Validation failed',
          error: { code: 'VALIDATION_ERROR', details: validation.errors },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Check authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          status: 401,
          message: 'Unauthorized',
          error: { code: 'UNAUTHORIZED' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // Parse times to validate duration
    const [startH, startM] = body.start_time.split(':').map(Number);
    const [endH, endM] = body.end_time.split(':').map(Number);

    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    const totalMinutes = endMin - startMin;

    if (totalMinutes <= 30 || totalMinutes > 240) {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          message: 'Invalid duration',
          error: {
            code: 'VALIDATION_ERROR',
            details: { duration: 'Duration must be between 30 minutes and 4 hours' },
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // In a real app, save to database
    // For now, return mock response
    const requestId = `ot-${Date.now()}`;

    return NextResponse.json(
      {
        success: true,
        status: 201,
        message: 'Overtime request submitted successfully',
        data: {
          success: true,
          id: requestId,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Overtime Submit] Error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: 'Internal server error',
        error: { code: 'INTERNAL_ERROR' },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

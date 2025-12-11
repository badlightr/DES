import { NextRequest, NextResponse } from 'next/server';
import { MOCK_OVERTIME_REQUESTS } from '@/lib/mock-data';

/**
 * GET /api/v1/overtime/:id
 * Get a specific overtime request with attendance logs and overlap info
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    // Find the overtime request
    const overtime = MOCK_OVERTIME_REQUESTS.find((r) => r.id === id);
    if (!overtime) {
      return NextResponse.json(
        {
          success: false,
          status: 404,
          message: 'Overtime request not found',
          error: { code: 'NOT_FOUND' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Mock attendance logs
    const attendanceLogs = [
      {
        id: 'att-001',
        check_in: new Date(overtime.date + 'T09:00:00').toISOString(),
        check_out: new Date(overtime.date + 'T17:00:00').toISOString(),
        verified: true,
      },
    ];

    // In a real app, check for overlaps with other approved/submitted requests
    const overlaps: any[] = [];

    // Get approver chain (mock)
    const approverChain = [
      {
        step_order: 1,
        approver_name: 'Jane Smith',
        status: 'APPROVED',
        decision_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: 'Overtime request retrieved',
        data: {
          overtime,
          attendance_logs: attendanceLogs,
          overlaps,
          approver_chain: approverChain,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Overtime Get] Error:', error);
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

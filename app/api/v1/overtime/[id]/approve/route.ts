import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/v1/overtime/:id/approve
 * Approve an overtime request
 */
export async function POST(
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

    // In a real app, update the request status
    // For now, return mock success response
    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: 'Overtime request approved',
        data: {
          success: true,
          total_payment: 2400,
          approved_at: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Overtime Approve] Error:', error);
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

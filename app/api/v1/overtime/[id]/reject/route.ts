import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/v1/overtime/:id/reject
 * Reject an overtime request
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { reason } = body;

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

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          message: 'Reason is required for rejection',
          error: { code: 'VALIDATION_ERROR' },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // In a real app, update the request status and save reason
    // For now, return mock success response
    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: 'Overtime request rejected',
        data: {
          success: true,
          reason,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Overtime Reject] Error:', error);
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

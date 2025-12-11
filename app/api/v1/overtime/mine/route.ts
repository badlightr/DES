import { NextRequest, NextResponse } from 'next/server';
import { MOCK_OVERTIME_REQUESTS } from '@/lib/mock-data';

/**
 * GET /api/v1/overtime/mine
 * Get the current user's overtime requests filtered by month
 */
export async function GET(req: NextRequest) {
  try {
    // Get month parameter from query string
    const month = req.nextUrl.searchParams.get('month');

    if (!month || !month.match(/^\d{4}-\d{2}$/)) {
      return NextResponse.json(
        {
          success: false,
          status: 400,
          message: 'Invalid month format. Use YYYY-MM',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    // Get auth header (in a real app, extract user ID from JWT)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          status: 401,
          message: 'Unauthorized',
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }

    // For now, use mock data - filter by month
    const [year, monthNum] = month.split('-').map(Number);
    const filtered = MOCK_OVERTIME_REQUESTS.filter((req) => {
      const date = new Date(req.date);
      return date.getFullYear() === year && date.getMonth() + 1 === monthNum;
    });

    return NextResponse.json(
      {
        success: true,
        status: 200,
        message: 'Overtime requests retrieved successfully',
        data: filtered,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Overtime Mine] Error:', error);
    return NextResponse.json(
      {
        success: false,
        status: 500,
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const { hotelId } = await params;

  if (!hotelId) {
    return NextResponse.json(
      { error: 'Hotel ID is required' },
      { status: 400, headers: corsHeaders }
    );
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0];

  try {
    const response = await fetch(
      `https://api.stayflexi.com/core/api/v1/beservice/hotelcheckout/?hotelId=${hotelId}&date=${todayFormatted}`,
      {
        headers: {
          'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data, { 
      headers: corsHeaders 
    });
  } catch (error) {
    console.error('Error fetching checkout times:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checkout times' }, 
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
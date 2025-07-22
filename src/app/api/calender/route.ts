import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    if (!hotelId || !fromDate || !toDate) {
      return NextResponse.json(
        { error: 'hotelId, fromDate, and toDate are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const response = await fetch(
      `https://api.stayflexi.com/core/api/v1/beservice/hotelcalendar/?hotelId=${hotelId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`,
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
    console.error('Error fetching hotel calendar:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel calendar' }, 
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
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
    const checkin = searchParams.get('checkin');
    const checkout = searchParams.get('checkout');

    if (!hotelId || !checkin || !checkout) {
      return NextResponse.json(
        { error: 'hotelId, checkin, and checkout are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const response = await fetch(
      `https://api.stayflexi.com/core/api/v1/beservice/hoteldetailadvanced?hotelId=${hotelId}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&discount=0`,
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
    console.error('Error fetching hotel availability:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotel availability' }, 
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
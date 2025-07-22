import { NextRequest, NextResponse } from 'next/server';

// Required for Webflow Cloud Edge Runtime
export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  // Handle CORS for Edge runtime
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  // Get query parameters from URL
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get('hotelId');
  const checkin = searchParams.get('checkin');
  const checkout = searchParams.get('checkout');

  if (!hotelId || !checkin || !checkout) {
    return NextResponse.json(
      { error: 'hotelId, checkin, and checkout are required' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
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
      status: 200, 
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
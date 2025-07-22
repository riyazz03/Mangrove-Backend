import { NextResponse } from 'next/server';

export async function GET() {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const response = await fetch(
      `https://api.stayflexi.com/core/api/v1/beservice/grouphotels?groupId=24316`,
      {
        headers: {
          "X-SF-API-KEY": process.env.STAYFLEXI_API_KEY || '',
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
    console.error('Error fetching hotels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotels' }, 
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
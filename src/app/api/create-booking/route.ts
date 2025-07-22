import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

interface RoomStay {
  roomTypeId: string;
  ratePlanId: string;
  adults: number;
  children: number;
}

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const {
      hotelId,
      checkin,
      checkout,
      customerDetails,
      amount,
      roomTypeId,
      ratePlanId,
      adults,
      children,
      rooms
    } = body;

    if (!hotelId || !checkin || !checkout || !customerDetails || !amount) {
      return NextResponse.json(
        { success: false, message: 'Missing required booking data.' },
        { status: 400, headers: corsHeaders }
      );
    }

    let roomStays = [];

    if (rooms && Array.isArray(rooms) && rooms.length > 0) {
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        if (!room.roomTypeId || !room.ratePlanId) {
          return NextResponse.json({ 
            success: false, 
            message: `Room ${i + 1} is missing roomTypeId or ratePlanId`,
            roomData: room
          }, { status: 400, headers: corsHeaders });
        }
      }

      roomStays = rooms.map((room: RoomStay) => ({
        numAdults: room.adults || 1,
        numChildren: room.children || 0,
        numChildren1: 0,
        roomTypeId: room.roomTypeId,
        ratePlanId: room.ratePlanId
      }));
    } else if (roomTypeId && ratePlanId) {
      roomStays = [{
        numAdults: adults || 1,
        numChildren: children || 0,
        numChildren1: 0,
        roomTypeId,
        ratePlanId
      }];
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'No room information provided'
      }, { status: 400, headers: corsHeaders });
    }

    // Create enquiry booking with Stayflexi (30 min hold)
    const bookingPayload = {
      checkin,
      checkout,
      hotelId,
      bookingStatus: 'CONFIRMED',
      bookingSource: 'STAYFLEXI_OD',
      roomStays,
      ctaId: "",
      customerDetails,
      paymentDetails: {
        sellRate: amount,
        roomRate: amount,
        payAtHotel: false
      },
      promoInfo: {},
      specialRequests: '',
      requestToBook: false,
      isAddOnPresent: true,
      posOrderList: [],
      isInsured: false,
      refundableBookingFee: 0,
      appliedPromocode: '',
      promoAmount: 0,
      bookingFees: 0,
      isEnquiry: true,
      isExternalPayment: false
    };

    const response = await fetch('https://api.stayflexi.com/core/api/v1/beservice/perform-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY!
      },
      body: JSON.stringify(bookingPayload)
    });

    const text = await response.text();
    
    if (!text || text.trim() === '') {
      return NextResponse.json({
        success: false,
        message: 'Empty response from Stayflexi API'
      }, { status: 500, headers: corsHeaders });
    }
    
    if (text.trim().startsWith('<')) {
      return NextResponse.json({
        success: false,
        message: 'Received HTML response from Stayflexi API'
      }, { status: 500, headers: corsHeaders });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid JSON response from Stayflexi API'
      }, { status: 500, headers: corsHeaders });
    }

    if (!data.status || !data.bookingId) {
      return NextResponse.json({
        success: false,
        message: data.message || 'Booking creation failed',
        fullResponse: data
      }, { status: 400, headers: corsHeaders });
    }

    console.log('Booking ID:', data.bookingId);
    
    return NextResponse.json({
      success: true,
      bookingId: data.bookingId,
      hotelId,
      roomCount: roomStays.length,
      amount: amount,
      message: 'Enquiry booking created successfully'
    }, { headers: corsHeaders });

  } catch (error) {
    const err = error as Error;
    console.error('Booking creation error:', err.message);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Server error', 
      error: err.message
    }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
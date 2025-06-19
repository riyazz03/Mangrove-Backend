import type { NextApiRequest, NextApiResponse } from 'next';

interface RoomStay {
  roomTypeId: string;
  ratePlanId: string;
  adults: number;
  children: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
  } = req.body;

  if (!hotelId || !checkin || !checkout || !customerDetails || !amount) {
    return res.status(400).json({ success: false, message: 'Missing required booking data.' });
  }

  try {
    let roomStays = [];

    if (rooms && Array.isArray(rooms) && rooms.length > 0) {
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        
        if (!room.roomTypeId || !room.ratePlanId) {
          return res.status(400).json({ 
            success: false, 
            message: `Room ${i + 1} is missing roomTypeId or ratePlanId`,
            roomData: room
          });
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
      return res.status(400).json({ 
        success: false, 
        message: 'No room information provided',
        debugInfo: { rooms, roomTypeId, ratePlanId }
      });
    }

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
      return res.status(500).json({
        success: false,
        message: 'Empty response from Stayflexi API',
        statusCode: response.status,
        statusText: response.statusText
      });
    }
    
    if (text.trim().startsWith('<')) {
      return res.status(500).json({
        success: false,
        message: 'Received HTML response from Stayflexi API (possible error page)',
        statusCode: response.status,
        responsePreview: text.substring(0, 500)
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      
      return res.status(500).json({ 
        success: false, 
        message: 'Invalid JSON response from Stayflexi API', 
        rawResponse: text.substring(0, 1000),
        parseErrorMessage: errorMessage,
        responseLength: text.length
      });
    }

    if (!data.status) {
      return res.status(400).json({
        success: false,
        message: data.message || 'Booking failed - no status returned',
        fullResponse: data
      });
    }

    if (!data.bookingId || data.bookingId === 'undefined' || data.bookingId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Booking failed - no valid booking ID returned',
        bookingId: data.bookingId,
        fullResponse: data
      });
    }

    console.log('Booking ID:', data.bookingId);
    
    const successResponse = {
      success: true,
      bookingId: data.bookingId,
      hotelId,
      roomCount: roomStays.length,
      debugInfo: {
        roomStaysCount: roomStays.length,
        isMultiRoom: roomStays.length > 1
      }
    };
    
    return res.status(200).json(successResponse);

  } catch (error) {
    const err = error as Error;
    
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
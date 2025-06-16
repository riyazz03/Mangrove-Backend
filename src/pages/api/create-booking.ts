// Enhanced version with comprehensive logging
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

  // Enhanced logging
  console.log('=== BOOKING REQUEST DEBUG ===');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('Hotel ID:', hotelId);
  console.log('Rooms array:', rooms);
  console.log('Single room data:', { roomTypeId, ratePlanId, adults, children });

  if (!hotelId || !checkin || !checkout || !customerDetails || !amount) {
    return res.status(400).json({ success: false, message: 'Missing required booking data.' });
  }

  try {
    let roomStays = [];

    if (rooms && Array.isArray(rooms) && rooms.length > 0) {
      console.log('Processing multiple rooms:', rooms.length);
      
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        console.log(`Room ${i + 1}:`, room);
        
        if (!room.roomTypeId || !room.ratePlanId) {
          console.error(`Room ${i + 1} missing required IDs:`, room);
          return res.status(400).json({ 
            success: false, 
            message: `Room ${i + 1} is missing roomTypeId or ratePlanId`,
            roomData: room
          });
        }
      }

      roomStays = rooms.map((room: RoomStay, index: number) => {
        const roomStay = {
          numAdults: room.adults || 1,
          numChildren: room.children || 0,
          numChildren1: 0,
          roomTypeId: room.roomTypeId,
          ratePlanId: room.ratePlanId
        };
        console.log(`Mapped room ${index + 1}:`, roomStay);
        return roomStay;
      });
    } else if (roomTypeId && ratePlanId) {
      console.log('Processing single room');
      roomStays = [{
        numAdults: adults || 1,
        numChildren: children || 0,
        numChildren1: 0,
        roomTypeId,
        ratePlanId
      }];
    } else {
      console.error('No valid room data found');
      return res.status(400).json({ 
        success: false, 
        message: 'No room information provided',
        debugInfo: { rooms, roomTypeId, ratePlanId }
      });
    }

    console.log('Final roomStays:', JSON.stringify(roomStays, null, 2));

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

    console.log('=== SENDING TO STAYFLEXI API ===');
    console.log('Payload:', JSON.stringify(bookingPayload, null, 2));

    const response = await fetch('https://api.stayflexi.com/core/api/v1/beservice/perform-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY!
      },
      body: JSON.stringify(bookingPayload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response ok:', response.ok);

    const text = await response.text();
    console.log('Raw response length:', text.length);
    console.log('Raw response preview:', text.substring(0, 200));
    
    // Check if response is empty
    if (!text || text.trim() === '') {
      console.error('Empty response from Stayflexi API');
      return res.status(500).json({
        success: false,
        message: 'Empty response from Stayflexi API',
        statusCode: response.status,
        statusText: response.statusText
      });
    }
    
    // Check if response looks like HTML (error page)
    if (text.trim().startsWith('<')) {
      console.error('Received HTML response instead of JSON');
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
      console.log('Parsed response:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error('Failed to parse response:', parseError);
      console.error('Raw response that failed to parse:', text);
      console.error('Response length:', text.length);
      console.error('First 500 chars:', text.substring(0, 500));
      
      return res.status(500).json({ 
        success: false, 
        message: 'Invalid JSON response from Stayflexi API', 
        rawResponse: text.substring(0, 1000), // Limit to prevent huge responses
        parseErrorMessage: errorMessage,
        responseLength: text.length
      });
    }

    // Enhanced response validation
    console.log('=== RESPONSE VALIDATION ===');
    console.log('data.status:', data.status);
    console.log('data.bookingId:', data.bookingId);
    console.log('typeof data.bookingId:', typeof data.bookingId);
    console.log('data.bookingId === undefined:', data.bookingId === undefined);
    console.log('data.bookingId === null:', data.bookingId === null);

    if (!data.status) {
      console.error('Booking failed - no status');
      return res.status(400).json({
        success: false,
        message: data.message || 'Booking failed - no status returned',
        fullResponse: data
      });
    }

    if (!data.bookingId || data.bookingId === 'undefined' || data.bookingId === undefined) {
      console.error('Booking failed - invalid booking ID');
      return res.status(400).json({
        success: false,
        message: 'Booking failed - no valid booking ID returned',
        bookingId: data.bookingId,
        fullResponse: data
      });
    }

    console.log('=== SUCCESS ===');
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
    
    console.log('Sending success response:', successResponse);
    return res.status(200).json(successResponse);

  } catch (error) {
    const err = error as Error;
    console.error('=== ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}
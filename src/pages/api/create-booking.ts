import type { NextApiRequest, NextApiResponse } from 'next';

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

    // Build roomStays array
    if (rooms && Array.isArray(rooms) && rooms.length > 0) {
      for (const room of rooms) {
        if (!room.roomTypeId || !room.ratePlanId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Each room must have roomTypeId and ratePlanId' 
          });
        }
      }

      roomStays = rooms.map((room: any) => ({
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
        message: 'No room information provided' 
      });
    }

    // Force single-room-like payment structure even for multi-room
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
        roomRate: 0, // CRITICAL: Set to 0 like working single room bookings
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

    console.log('=== BOOKING PAYLOAD ===');
    console.log(JSON.stringify(bookingPayload, null, 2));

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

    const text = await response.text();
    console.log('Raw response:', text);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `API Error ${response.status}: ${text}`,
        statusCode: response.status
      });
    }

    let data;
    try {
      data = JSON.parse(text);
      console.log('Parsed response:', JSON.stringify(data, null, 2));
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error('Parse error:', errorMessage);
      return res.status(500).json({ 
        success: false, 
        message: 'Invalid JSON response from Stayflexi API', 
        rawResponse: text,
        parseErrorMessage: errorMessage
      });
    }

    if (!data.status || !data.bookingId) {
      console.error('Booking creation failed:', data);
      return res.status(400).json({
        success: false,
        message: data.message || 'Booking failed',
        fullResponse: data
      });
    }

    console.log('=== BOOKING CREATED SUCCESSFULLY ===');
    console.log('Booking ID:', data.bookingId);

    // Wait 3 seconds before returning to ensure booking is fully processed
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to verify the booking exists
    try {
      const verifyResponse = await fetch(`https://api.stayflexi.com/core/api/v1/beservice/booking-details/${data.bookingId}`, {
        headers: {
          'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY!
        }
      });
      
      const verifyData = await verifyResponse.json();
      console.log('Booking verification:', verifyData);
      
      if (!verifyData.status) {
        console.warn('Booking verification failed, but continuing...');
      }
    } catch (verifyError) {
      const errorMsg = verifyError instanceof Error ? verifyError.message : String(verifyError);
      console.warn('Could not verify booking, but continuing...', errorMsg);
    }

    return res.status(200).json({
      success: true,
      bookingId: data.bookingId,
      hotelId,
      roomCount: roomStays.length,
      paymentReady: true
    });

  } catch (mainError) {
    const err = mainError as Error;
    console.error('=== SERVER ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message
    });
  }
}
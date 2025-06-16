/* eslint-disable @typescript-eslint/no-explicit-any */
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
    let roomStays: any[] = [];

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

    // Create "Pay at Hotel" booking first (from API doc page 13 - Pay at hotel payload)
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
        payAtHotel: true // CRITICAL: true for pay at hotel
      },
      promoInfo: {},
      specialRequests: "",
      requestToBook: false,
      isAddOnPresent: true,
      posOrderList: [],
      isInsured: false,
      refundableBookingFee: 0,
      appliedPromocode: "",
      promoAmount: 0,
      bookingFees: 0,
      isEnquiry: false, // CRITICAL: false for pay at hotel (automatically confirmed)
      isExternalPayment: false
    };

    console.log('=== CREATING PAY AT HOTEL BOOKING ===');
    console.log(JSON.stringify(bookingPayload, null, 2));

    const response = await fetch('https://api.stayflexi.com/core/api/v1/beservice/perform-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY!
      },
      body: JSON.stringify(bookingPayload)
    });

    const text = await response.text();
    console.log('Booking API Response Status:', response.status);
    console.log('Booking API Raw Response:', text);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Stayflexi Booking API Error ${response.status}: ${text}`
      });
    }

    let bookingData;
    try {
      bookingData = JSON.parse(text);
    } catch {
      return res.status(500).json({ 
        success: false, 
        message: 'Invalid JSON response from Stayflexi Booking API', 
        rawResponse: text
      });
    }

    if (!bookingData.status || !bookingData.bookingId) {
      return res.status(400).json({
        success: false,
        message: bookingData.message || 'Booking creation failed',
        fullResponse: bookingData
      });
    }

    console.log('✅ Pay at Hotel Booking Created:', bookingData.bookingId);

    // Now record external payment (from API doc page 14-15)
    const paymentPayload = {
      hotel_id: hotelId,
      booking_id: bookingData.bookingId,
      booking_source: "CUSTOM_BE",
      module_source: "CUSTOM_BE_PAYMENT", 
      amount: amount,
      currency: "INR",
      payment_gateway_id: `sf_gateway_${Date.now()}`, // Generate unique ID
      pg_name: "STAYFLEXI_GATEWAY",
      requires_post_payment_confirmation: "true",
      notes: "Online payment via Stayflexi gateway",
      gateway_message: "",
      payment_type: "Online Payment",
      payment_issuer: "STAYFLEXI",
      payment_mode: "ONLINE",
      status: "PENDING" // Will be updated after actual payment
    };

    console.log('=== RECORDING EXTERNAL PAYMENT ===');
    console.log(JSON.stringify(paymentPayload, null, 2));

    const paymentResponse = await fetch('https://api.stayflexi.com/api/v2/payments/recordExternalPayment/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Note: This API doesn't require X-SF-API-KEY according to documentation
      },
      body: JSON.stringify(paymentPayload)
    });

    const paymentText = await paymentResponse.text();
    console.log('Payment API Response Status:', paymentResponse.status);
    console.log('Payment API Raw Response:', paymentText);

    if (!paymentResponse.ok) {
      console.warn('Payment recording failed, but booking exists:', paymentText);
      // Continue anyway - booking exists, payment can be handled later
    }

    console.log('✅ Booking Process Complete');

    return res.status(200).json({
      success: true,
      bookingId: bookingData.bookingId,
      hotelId,
      roomCount: roomStays.length,
      paymentRequired: true,
      bookingType: 'pay_at_hotel_with_gateway'
    });

  } catch (error: any) {
    console.error('Server Error:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message || 'Unknown error'
    });
  }
}
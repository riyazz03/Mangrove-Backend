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

    // Build roomStays according to official Stayflexi API format
    if (rooms && Array.isArray(rooms) && rooms.length > 0) {
      // Multi-room booking: add all rooms to single roomStays array
      roomStays = rooms.map((room: any) => ({
        numAdults: room.adults || 1,
        numChildren: room.children || 0,
        numChildren1: 0, // This is for infants - set to 0
        roomTypeId: room.roomTypeId,
        ratePlanId: room.ratePlanId
      }));
    } else if (roomTypeId && ratePlanId) {
      // Single room booking
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

    // CRITICAL: Payment structure exactly as per Stayflexi documentation
    const bookingPayload = {
      checkin, // Format: "DD-MM-YYYY HH:MM:ss"
      checkout, // Format: "DD-MM-YYYY HH:MM:ss"
      hotelId,
      bookingStatus: "CONFIRMED", // Exactly as per docs
      bookingSource: "STAYFLEXI_OD", // Exactly as per docs
      roomStays,
      ctaId: "", // For direct billing customer (empty for regular bookings)
      customerDetails: {
        firstName: customerDetails.firstName,
        lastName: customerDetails.lastName || "",
        emailId: customerDetails.emailId,
        phoneNumber: customerDetails.phoneNumber,
        country: customerDetails.country || "",
        city: customerDetails.city || "",
        zipcode: customerDetails.zipcode || "",
        address: customerDetails.address || "",
        state: customerDetails.state || ""
      },
      paymentDetails: {
        sellRate: amount, // Total amount being paid by customer
        roomRate: amount, // Total amount being paid by customer  
        payAtHotel: false // FALSE for online payment via gateway
      },
      promoInfo: {},
      specialRequests: "",
      requestToBook: false, // Don't change this field as per docs
      isAddOnPresent: true, // Don't change this field as per docs
      posOrderList: [], // Don't change this field as per docs
      isInsured: false, // Don't change this field as per docs
      refundableBookingFee: 0, // Don't change this field as per docs
      appliedPromocode: "",
      promoAmount: 0,
      bookingFees: 0,
      isEnquiry: true, // TRUE for pay now bookings (creates 30min enquiry)
      isExternalPayment: false // Don't change this field as per docs
    };

    console.log('Booking payload:', JSON.stringify(bookingPayload, null, 2));

    const response = await fetch('https://api.stayflexi.com/core/api/v1/beservice/perform-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY!
      },
      body: JSON.stringify(bookingPayload)
    });

    const text = await response.text();
    console.log('Raw API response:', text);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: `Stayflexi API Error ${response.status}: ${text}`
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ 
        success: false, 
        message: 'Invalid JSON response from Stayflexi API', 
        rawResponse: text
      });
    }

    // Check response format as per documentation
    if (!data.status || !data.bookingId) {
      return res.status(400).json({
        success: false,
        message: data.message || 'Booking creation failed',
        stayflexiResponse: data
      });
    }

    console.log('Booking created successfully:', data.bookingId);

    return res.status(200).json({
      success: true,
      bookingId: data.bookingId,
      hotelId,
      roomCount: roomStays.length,
      message: data.message || 'Success'
    });

  } catch (error: any) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message
    });
  }
}
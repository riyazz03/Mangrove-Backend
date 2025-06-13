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
      for (const room of rooms) {
        if (!room.roomTypeId || !room.ratePlanId) {
          return res.status(400).json({ 
            success: false, 
            message: 'Each room must have roomTypeId and ratePlanId' 
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
        message: 'No room information provided' 
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
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({ 
        success: false, 
        message: 'Invalid response from Stayflexi', 
        raw: text 
      });
    }

    if (!data.status || !data.bookingId) {
      return res.status(400).json({
        success: false,
        message: data.message || 'Booking failed',
        data
      });
    }

    return res.status(200).json({
      success: true,
      bookingId: data.bookingId,
      hotelId,
      roomCount: roomStays.length
    });

  } catch (error) {
    const err = error as Error;
    return res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: err.message 
    });
  }
}
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
    roomTypeId,
    ratePlanId,
    customerDetails,
    amount,
    adults,
    children
  } = req.body;

  if (!hotelId || !checkin || !checkout || !roomTypeId || !ratePlanId || !customerDetails || !amount) {
    return res.status(400).json({ success: false, message: 'Missing required booking data.' });
  }

  try {
    const response = await fetch('https://api.stayflexi.com/core/api/v1/beservice/perform-booking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY!
      },
      body: JSON.stringify({
        checkin,
        checkout,
        hotelId,
        bookingStatus: 'CONFIRMED',
        bookingSource: 'STAYFLEXI_OD',
        roomStays: [
          {
            numAdults: adults,
            numChildren: children,
            numChildren1: 0,
            roomTypeId,
            ratePlanId
          }
        ],
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
      })
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      console.error('Stayflexi raw response:', text);
      return res.status(500).json({ success: false, message: 'Invalid response from Stayflexi', raw: text });
    }

    console.log('Stayflexi response:', data);

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
      hotelId
    });

  } catch (error) {
    const err = error as Error;
    console.error('Server error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }

}

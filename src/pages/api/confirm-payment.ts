// pages/api/confirm-payment.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    bookingId,
    hotelId,
    amount
  } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
    return res.status(400).json({
      success: false,
      message: 'Missing required payment data'
    });
  }

  try {
    // Step 1: Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Step 2: Record payment with Stayflexi
    const paymentData = {
      hotel_id: hotelId,
      booking_id: bookingId,
      booking_source: "CUSTOM_BE",
      module_source: "CUSTOM_BE_PAYMENT",
      amount: amount,
      currency: "INR",
      payment_gateway_id: razorpay_payment_id,
      pg_name: "RAZORPAY",
      requires_post_payment_confirmation: "true",
      notes: `Payment ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}`,
      gateway_message: "",
      payment_type: "Credit card",
      payment_issuer: "RAZORPAY",
      payment_mode: "ONLINE",
      status: "SUCCESS"
    };

    const paymentResponse = await fetch('https://api.stayflexi.com/api/v2/payments/recordExternalPayment/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!paymentResponse.ok) {
      throw new Error(`Payment recording failed: ${paymentResponse.status}`);
    }

    const paymentResult = await paymentResponse.json();

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed and booking completed',
      bookingId: bookingId,
      paymentId: razorpay_payment_id,
      paymentResult: paymentResult
    });

  } catch (error) {
    const err = error as Error;
    console.error('Payment confirmation error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Payment confirmation failed',
      error: err.message
    });
  }
}
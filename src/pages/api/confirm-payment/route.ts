import { NextRequest, NextResponse } from 'next/server';

// Required for Webflow Cloud Edge Runtime
export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  // Handle CORS for Edge runtime
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return NextResponse.json(
      { success: false, message: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const body = await req.json();
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      bookingId,
      hotelId,
      amount
    } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
      return NextResponse.json({
        success: false,
        message: 'Missing required payment data'
      }, { status: 400, headers: corsHeaders });
    }

    // Step 1: Verify Razorpay signature using Web Crypto API (Edge runtime compatible)
    const signatureBody = razorpay_order_id + "|" + razorpay_payment_id;
    
    // Convert secret to Uint8Array for Web Crypto API
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(process.env.RAZORPAY_SECRET!);
    
    // Create HMAC key
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Generate signature
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(signatureBody)
    );
    
    // Convert to hex string
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({
        success: false,
        message: 'Invalid payment signature'
      }, { status: 400, headers: corsHeaders });
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

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and booking completed',
      bookingId: bookingId,
      paymentId: razorpay_payment_id,
      paymentResult: paymentResult
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    const err = error as Error;
    console.error('Payment confirmation error:', err.message);

    return NextResponse.json({
      success: false,
      message: 'Payment confirmation failed',
      error: err.message
    }, { status: 500, headers: corsHeaders });
  }
}
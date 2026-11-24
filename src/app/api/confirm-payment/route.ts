import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
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
        'Content-Type': 'application/json',
        'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY || ''
      },
      body: JSON.stringify(paymentData)
    });

    const paymentText = await paymentResponse.text();

    if (!paymentResponse.ok) {
      console.error('Stayflexi recordExternalPayment rejected:', paymentResponse.status, paymentText, 'booking:', bookingId, 'payment:', razorpay_payment_id);
      throw new Error(`Payment recording failed: ${paymentResponse.status} ${paymentText.slice(0, 200)}`);
    }

    let paymentResult: Record<string, unknown> | null = null;
    try {
      paymentResult = paymentText ? JSON.parse(paymentText) : null;
    } catch {
      paymentResult = null;
    }

    // Stayflexi can answer HTTP 200 with an error in the body
    // (e.g. {"code":"401","message":"Please specify the correct api key"}).
    const errorCode = Number(paymentResult?.code);
    const rejected =
      !!paymentResult &&
      (paymentResult.error !== undefined ||
        paymentResult.status === false ||
        (Number.isFinite(errorCode) && errorCode >= 400));

    if (rejected) {
      console.error('Stayflexi recordExternalPayment returned an error body:', paymentText, 'booking:', bookingId, 'payment:', razorpay_payment_id);
      throw new Error(`Payment recording failed: ${paymentText.slice(0, 200)}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and booking completed',
      bookingId: bookingId,
      paymentId: razorpay_payment_id,
      paymentResult: paymentResult
    }, { headers: corsHeaders });

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
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    console.log('Creating Razorpay order via HTTP API...');
    
    // Check environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
      console.error('Missing Razorpay credentials');
      return NextResponse.json({ 
        success: false,
        error: 'Missing Razorpay credentials' 
      }, { status: 500, headers: corsHeaders });
    }

    const body = await request.json();
    const { amount, currency = 'INR', receipt } = body;
    console.log('Request data:', { amount, currency, receipt });

    if (!amount || typeof amount !== 'number') {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid or missing amount' 
      }, { status: 400, headers: corsHeaders });
    }

    if (amount <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Amount must be greater than 0' 
      }, { status: 400, headers: corsHeaders });
    }

    const orderReceipt = receipt || `rcpt_${Date.now().toString().slice(-8)}_${Math.floor(Math.random() * 999)}`;
    const amountInPaise = Math.round(amount * 100);

    console.log('Receipt length:', orderReceipt.length, 'Receipt:', orderReceipt);

    // Create Basic Auth header
    const auth = btoa(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`);

    const orderData = {
      amount: amountInPaise,
      currency: currency,
      receipt: orderReceipt,
    };

    console.log('Making HTTP request to Razorpay API...');

    // Make direct HTTP call to Razorpay API
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData)
    });

    console.log('Razorpay response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Razorpay API error:', errorText);
      return NextResponse.json({ 
        success: false,
        error: `Razorpay API error: ${errorText}` 
      }, { status: response.status, headers: corsHeaders });
    }

    const order = await response.json();
    console.log('Order created successfully:', order.id);
    
    return NextResponse.json({ 
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        success: false,
        error: `Server error: ${error.message}` 
      }, { status: 500, headers: corsHeaders });
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Unknown server error',
      details: String(error)
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
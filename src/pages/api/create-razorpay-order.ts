import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Creating Razorpay order via HTTP API...');
    
    // Check environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
      console.error('Missing Razorpay credentials');
      return res.status(500).json({ 
        success: false,
        error: 'Missing Razorpay credentials' 
      });
    }

    const { amount, currency = 'INR', receipt } = req.body;
    console.log('Request data:', { amount, currency, receipt });

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid or missing amount' 
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Amount must be greater than 0' 
      });
    }

    const orderReceipt = receipt || `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const amountInPaise = Math.round(amount * 100);

    // Create Basic Auth header
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_SECRET}`).toString('base64');

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
      return res.status(response.status).json({ 
        success: false,
        error: `Razorpay API error: ${errorText}` 
      });
    }

    const order = await response.json();
    console.log('Order created successfully:', order.id);
    
    return res.status(200).json({ 
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        success: false,
        error: `Server error: ${error.message}` 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: 'Unknown server error',
      details: String(error)
    });
  }
}
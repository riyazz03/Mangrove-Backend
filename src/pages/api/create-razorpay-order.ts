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
    console.log('Starting Razorpay order creation...');
    
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

    // Import Razorpay dynamically to avoid initialization issues
    const Razorpay = (await import('razorpay')).default;
    
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const orderReceipt = receipt || `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const amountInPaise = Math.round(amount * 100);

    console.log('Creating order with amount:', amountInPaise, 'paise');

    const orderData = {
      amount: amountInPaise,
      currency: currency,
      receipt: orderReceipt,
    };

    console.log('Order data:', orderData);

    const order = await razorpay.orders.create(orderData);

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
    console.error('Detailed error information:');
    console.error('Error type:', typeof error);
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.message.includes('auth')) {
        return res.status(401).json({ 
          success: false,
          error: 'Razorpay authentication failed. Check your API keys.' 
        });
      }
      
      return res.status(500).json({ 
        success: false,
        error: `Razorpay error: ${error.message}` 
      });
    }
    
    // Handle non-Error objects
    return res.status(500).json({ 
      success: false,
      error: 'Unknown error creating Razorpay order',
      details: String(error)
    });
  }
}
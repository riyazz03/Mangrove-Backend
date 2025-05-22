import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_SECRET || '',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  res.setHeader('Access-Control-Allow-Origin', '*'); // Consider being more specific in production
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: `${req.method} method is not supported. Use POST instead.`
    });
  }

  try {
    console.log('Request body:', req.body);
    console.log('Environment check:', {
      hasKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasSecret: !!process.env.RAZORPAY_SECRET
    });

    const { amount, currency = 'INR', receipt } = req.body;

    // Validate required fields
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ 
        error: 'Invalid or missing amount',
        received: { amount, type: typeof amount }
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount must be greater than 0',
        received: amount
      });
    }

    // Generate receipt if not provided
    const orderReceipt = receipt || `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const orderOptions = {
      amount: amount,
      currency: currency,
      receipt: orderReceipt,
    };

    console.log('Creating order with options:', orderOptions);

    const order = await razorpay.orders.create(orderOptions);
    
    console.log('Order created successfully:', order.id);
    
    return res.status(200).json({ 
      success: true,
      order: order 
    });

  } catch (err: unknown) {
    console.error('Detailed error:', err);
    
    if (err instanceof Error) {
      console.error('Error creating Razorpay order:', err.message);
      
      // Handle specific Razorpay errors
      if (err.message.includes('authentication')) {
        return res.status(401).json({ 
          error: 'Authentication failed',
          message: 'Invalid Razorpay credentials'
        });
      }
      
      if (err.message.includes('Bad request')) {
        return res.status(400).json({ 
          error: 'Bad request',
          message: err.message
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create order',
        message: err.message
      });
    } else {
      console.error('Unknown error:', err);
      return res.status(500).json({ 
        error: 'Unknown error occurred',
        details: String(err)
      });
    }
  }
}
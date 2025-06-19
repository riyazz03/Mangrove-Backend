import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

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
    console.log('Environment check:');
    console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Set' : 'Missing');
    console.log('RAZORPAY_SECRET:', process.env.RAZORPAY_SECRET ? 'Set' : 'Missing');

    const { amount, currency = 'INR', receipt } = req.body;
    console.log('Request body:', { amount, currency, receipt });

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid or missing amount' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_SECRET) {
      console.error('Missing Razorpay credentials');
      return res.status(500).json({ error: 'Missing Razorpay credentials' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET,
    });

    const orderReceipt = receipt || `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    console.log('Creating Razorpay order with amount:', amount * 100);

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: currency,
      receipt: orderReceipt,
    });

    console.log('Order created successfully:', order.id);
    
    return res.status(200).json({ 
      success: true,
      order: order 
    });

  } catch (err: unknown) {
    console.error('Razorpay API Error:', err);
    
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
      
      if (err.message.includes('authentication')) {
        return res.status(401).json({ error: 'Razorpay authentication failed' });
      }
      
      if (err.message.includes('Bad request')) {
        return res.status(400).json({ error: 'Bad request to Razorpay' });
      }
      
      return res.status(500).json({ error: 'Failed to create order: ' + err.message });
    } else {
      return res.status(500).json({ error: 'Unknown error occurred' });
    }
  }
}
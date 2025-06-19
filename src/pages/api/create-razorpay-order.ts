import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_SECRET || '',
});

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
    const { amount, currency = 'INR', receipt } = req.body;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid or missing amount' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const orderReceipt = receipt || `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: currency,
      receipt: orderReceipt,
    });
    
    return res.status(200).json({ 
      success: true,
      order: order 
    });

  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.includes('authentication')) {
        return res.status(401).json({ error: 'Authentication failed' });
      }
      
      if (err.message.includes('Bad request')) {
        return res.status(400).json({ error: 'Bad request' });
      }
      
      return res.status(500).json({ error: 'Failed to create order' });
    } else {
      return res.status(500).json({ error: 'Unknown error occurred' });
    }
  }
}
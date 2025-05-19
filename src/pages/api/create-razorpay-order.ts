import type { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_SECRET || '',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://mangrove-stays-web.webflow.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, currency = 'INR', receipt = 'receipt_order_74394' } = req.body;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Invalid or missing amount' });
    }

    const order = await razorpay.orders.create({ amount, currency, receipt });
    return res.status(200).json({ order });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Error creating Razorpay order:', err.message);
    } else {
      console.error('Unknown error:', err);
    }
    return res.status(500).json({ error: 'Failed to create order' });
  }
}

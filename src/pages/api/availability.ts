import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { hotelId, checkin, checkout } = req.query;

  if (!hotelId || typeof hotelId !== 'string' || !checkin || typeof checkin !== 'string' || !checkout || typeof checkout !== 'string') {
    return res.status(400).json({ error: 'hotelId, checkin, and checkout are required' });
  }

  try {
    const response = await axios.get(
      `https://api.stayflexi.com/core/api/v1/beservice/hoteldetailadvanced?hotelId=${hotelId}&checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}&discount=0`,
      {
        headers: {
          'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY || '',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching hotel availability:', error);
    res.status(500).json({ error: 'Failed to fetch hotel availability' });
  }
}

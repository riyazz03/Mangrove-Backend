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

  const { hotelId } = req.query;

  if (!hotelId || typeof hotelId !== 'string') {
    return res.status(400).json({ error: 'Hotel ID is required' });
  }

  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const response = await axios.get(
      `https://api.stayflexi.com/core/api/v1/beservice/hotelcheckin/?hotelId=${hotelId}&date=${todayFormatted}`,
      {
        headers: {
          'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY || '',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching check-in times:', error);
    res.status(500).json({ error: 'Failed to fetch check-in times' });
  }
}

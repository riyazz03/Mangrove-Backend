import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { hotelId } = req.query;

  if (!hotelId || typeof hotelId !== 'string') {
    return res.status(400).json({ error: 'Hotel ID is required' });
  }

  const today = new Date();
  const todayFormatted = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

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
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Axios Error fetching check-in times:', error.message, error.response?.data);
      res.status(error.response?.status || 500).json(error.response?.data || { error: 'Axios error' });
    } else {
      console.error('Unknown error fetching check-in times:', error);
      res.status(500).json({ error: 'Unknown error' });
    }
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Axios Error fetching hotel availability:', error.message, error.response?.data);
      res.status(error.response?.status || 500).json(error.response?.data || { error: 'Axios error' });
    } else {
      console.error('Unknown error fetching hotel availability:', error);
      res.status(500).json({ error: 'Unknown error' });
    }
  }
}

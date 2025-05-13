import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { bookingId } = req.query;

  if (!bookingId || typeof bookingId !== 'string') {
    return res.status(400).json({ error: 'Booking ID is required' });
  }

  try {
    const response = await axios.get(
      `https://api.stayflexi.com/core/api/v1/beservice/bookingcancellation?bookingId=${bookingId}`,
      {
        headers: {
          'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY || '',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Axios Error cancelling booking:', error.message, error.response?.data);
      res.status(error.response?.status || 500).json(error.response?.data || { error: 'Axios error' });
    } else {
      console.error('Unknown error cancelling booking:', error);
      res.status(500).json({ error: 'Unknown error' });
    }
  }
}

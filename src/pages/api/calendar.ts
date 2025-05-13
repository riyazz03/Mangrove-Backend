import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { hotelId, fromDate, toDate } = req.query;

  if (!hotelId || typeof hotelId !== 'string' || !fromDate || typeof fromDate !== 'string' || !toDate || typeof toDate !== 'string') {
    return res.status(400).json({ error: 'hotelId, fromDate, and toDate are required' });
  }

  try {
    const response = await axios.get(
      `https://api.stayflexi.com/core/api/v1/beservice/hotelcalendar/?hotelId=${hotelId}&fromDate=${encodeURIComponent(fromDate)}&toDate=${encodeURIComponent(toDate)}`,
      {
        headers: {
          'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY || '',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Axios Error fetching hotel calendar:', error.message, error.response?.data);
      res.status(error.response?.status || 500).json(error.response?.data || { error: 'Axios error' });
    } else {
      console.error('Unknown error fetching hotel calendar:', error);
      res.status(500).json({ error: 'Unknown error' });
    }
  }
}

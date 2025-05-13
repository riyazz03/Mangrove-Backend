import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body;

  try {
    const response = await axios.post(
      `https://api.stayflexi.com/core/api/v1/beservice/perform-booking`,
      payload,
      {
        headers: {
          'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error('Axios Error creating booking:', error.message, error.response?.data);
      res.status(error.response?.status || 500).json(error.response?.data || { error: 'Axios error' });
    } else {
      console.error('Unknown error creating booking:', error);
      res.status(500).json({ error: 'Unknown error' });
    }
  }
}

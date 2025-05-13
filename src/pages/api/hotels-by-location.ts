import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { location } = req.query;

  if (!location || typeof location !== 'string') {
    return res.status(400).json({ error: 'Location is required' });
  }

  try {
    const response = await axios.get(
      `https://api.stayflexi.com/core/api/v1/beservice/grouphotelsbylocation?groupId=24316&location=${encodeURIComponent(location)}`,
      {
        headers: {
          'X-SF-API-KEY': process.env.STAYFLEXI_API_KEY || '',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching hotels by location:', error.message, error.response?.data);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: 'Failed to fetch hotels by location' });
    }
  }
}

import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await axios.get(
      `https://api.stayflexi.com/core/api/v1/beservice/grouphotels?groupId=24316`,
      {
        headers: {
          "X-SF-API-KEY": process.env.STAYFLEXI_API_KEY || '',
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching hotels:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
}

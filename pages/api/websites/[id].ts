import type { NextApiRequest, NextApiResponse } from 'next';
import { websiteApi } from '@/lib/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  try {
    const website = await websiteApi.getWebsiteById(Number(id));
    res.status(200).json(website);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch website' });
  }
} 
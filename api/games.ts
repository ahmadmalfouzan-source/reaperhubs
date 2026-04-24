import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.VITE_RAWG_API_KEY || '4d04b89bb977405d831f7dd24b492dd7';
    const query = req.query;
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(query)) {
      if (key !== 'path' && value) params.set(key, String(value));
    }
    params.set('key', apiKey);

    const pathSegments = Array.isArray(req.query.path) ? req.query.path.join('/') : (req.query.path || '');
    const rawgUrl = `https://api.rawg.io/api/games${pathSegments ? '/' + pathSegments : ''}?${params.toString()}`;

    const response = await fetch(rawgUrl);
    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('RAWG Proxy Error:', error);
    res.status(500).json({ error: 'Failed to fetch from RAWG' });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.VITE_RAWG_API_KEY || '4d04b89bb977405d831f7dd24b492dd7';

    // Extract the path after /api/games
    const fullPath = req.url || '';
    const pathAfterGames = fullPath.replace(/^\/api\/games/, '');

    // Build RAWG URL
    const urlObj = new URL('https://api.rawg.io/api/games' + pathAfterGames, 'https://api.rawg.io');
    urlObj.searchParams.set('key', apiKey);

    const response = await fetch(urlObj.toString());
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('RAWG Proxy Error:', error);
    res.status(500).json({ error: 'Failed to fetch from RAWG' });
  }
}

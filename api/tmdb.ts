export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.VITE_TMDB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'TMDB API key not configured' });

    // Extract the path after /api/tmdb
    const fullPath = req.url || '';
    const pathAfterTmdb = fullPath.replace(/^\/api\/tmdb/, '');

    // Build query params, inject api_key
    const urlObj = new URL('https://api.themoviedb.org/3' + pathAfterTmdb, 'https://api.themoviedb.org');
    urlObj.searchParams.set('api_key', apiKey);

    const response = await fetch(urlObj.toString());
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('TMDB Proxy Error:', error);
    res.status(500).json({ error: 'Failed to fetch from TMDB' });
  }
}

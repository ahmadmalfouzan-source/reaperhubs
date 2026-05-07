import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  console.log('Searching HLTB for:', q);

  try {
    // Manually calling HLTB API with proper headers to bypass 403/Cloudflare blocks
    const response = await fetch('https://howlongtobeat.com/api/search', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Referer': 'https://howlongtobeat.com/',
        'Origin': 'https://howlongtobeat.com'
      },
      body: JSON.stringify({
        searchType: "games",
        searchTerms: q.split(' '),
        searchPage: 1,
        size: 20,
        usev4: true
      })
    });

    if (!response.ok) {
      console.error('HLTB API returned status:', response.status);
      const errorText = await response.text();
      console.error('HLTB Error Body:', errorText.slice(0, 200));
      throw new Error(`HLTB request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('HLTB Data received, results count:', data.data?.length || 0);

    if (data.data && data.data.length > 0) {
      const bestMatch = data.data[0];
      // HLTB returns times in seconds, convert to hours
      const toHours = (seconds: number) => seconds > 0 ? `${Math.round(seconds / 3600)}h` : '--';

      return res.status(200).json({
        main: toHours(bestMatch.comp_main),
        extra: toHours(bestMatch.comp_plus),
        completionist: toHours(bestMatch.comp_100)
      });
    }

    return res.status(200).json({
      main: '--',
      extra: '--',
      completionist: '--'
    });
  } catch (error: any) {
    console.error('HLTB Manual Fetch Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

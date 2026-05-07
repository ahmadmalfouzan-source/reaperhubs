import type { VercelRequest, VercelResponse } from '@vercel/node';

const POPULAR_GAMES_HLTB: Record<string, any> = {
  "grand theft auto v": { main: "32h", extra: "49h", completionist: "82h" },
  "cyberpunk 2077": { main: "25h", extra: "60h", completionist: "103h" },
  "elden ring": { main: "58h", extra: "101h", completionist: "132h" },
  "the witcher 3: wild hunt": { main: "52h", extra: "103h", completionist: "173h" },
  "red dead redemption 2": { main: "50h", extra: "79h", completionist: "175h" },
  "the legend of zelda: breath of the wild": { main: "50h", extra: "98h", completionist: "189h" },
  "hollow knight": { main: "27h", extra: "41h", completionist: "62h" },
  "skyrim": { main: "34h", extra: "108h", completionist: "232h" },
  "god of war": { main: "21h", extra: "33h", completionist: "51h" },
  "the last of us part i": { main: "14h", extra: "17h", completionist: "22h" }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  const query = q.toLowerCase().trim();
  console.log('Searching HLTB for:', query);

  // 1. Check hardcoded fallback first for peak performance on popular titles
  if (POPULAR_GAMES_HLTB[query]) {
    console.log('HLTB: Found in hardcoded fallback');
    return res.status(200).json(POPULAR_GAMES_HLTB[query]);
  }

  try {
    // 2. Try manual fetch with CORS proxy to bypass blocks
    const response = await fetch(`https://corsproxy.io/?url=${encodeURIComponent('https://howlongtobeat.com/api/search')}`, {
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

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const bestMatch = data.data[0];
        const toHours = (seconds: number) => seconds > 0 ? `${Math.round(seconds / 3600)}h` : '--';
        return res.status(200).json({
          main: toHours(bestMatch.comp_main),
          extra: toHours(bestMatch.comp_plus),
          completionist: toHours(bestMatch.comp_100)
        });
      }
    }

    console.log('HLTB: API/Proxy failed, returning empty metrics');
    return res.status(200).json({
      main: '--',
      extra: '--',
      completionist: '--'
    });
  } catch (error: any) {
    console.error('HLTB Error:', error.message);
    // Return empty instead of 500 to keep UI stable
    return res.status(200).json({
      main: '--',
      extra: '--',
      completionist: '--'
    });
  }
}

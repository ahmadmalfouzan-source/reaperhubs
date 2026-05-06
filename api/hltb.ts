import { HowLongToBeatService } from 'howlongtobeat';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const hltbService = new HowLongToBeatService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  try {
    const results = await hltbService.search(q);
    
    if (results && results.length > 0) {
      // Find the closest match
      const bestMatch = results[0];
      return res.status(200).json({
        main: bestMatch.gameplayMain ? `${bestMatch.gameplayMain}h` : '--',
        extra: bestMatch.gameplayMainExtra ? `${bestMatch.gameplayMainExtra}h` : '--',
        completionist: bestMatch.gameplayCompletionist ? `${bestMatch.gameplayCompletionist}h` : '--'
      });
    }

    return res.status(200).json({
      main: '--',
      extra: '--',
      completionist: '--'
    });
  } catch (error) {
    console.error('HLTB API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

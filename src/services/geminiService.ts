import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

const CACHE_KEY_PREFIX = 'rh_ai_cache_';
const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hour

function getCachedData(key: string) {
  const cached = localStorage.getItem(CACHE_KEY_PREFIX + key);
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_EXPIRATION) {
      return data;
    }
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  } catch (e) {
    localStorage.removeItem(CACHE_KEY_PREFIX + key);
  }
  return null;
}

function setCachedData(key: string, data: any) {
  const cacheObj = {
    data,
    timestamp: Date.now()
  };
  localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheObj));
}

export async function getMediaRecommendations(watchlist: string[]) {
  const cacheKey = `recs_${watchlist.sort().join('_')}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Based on the following user's media library: [${(watchlist || []).join(', ')}], suggest 4 new movies, series, or games. Focus on items that are popular or highly rated. Provide title, type (movie/series/game), primary genre, and a 1-sentence reasoning for the recommendation. Return as a JSON array with objects having keys: title, type, genre, reason.`;
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    const text = result.text || '';
    const jsonMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      setCachedData(cacheKey, data);
      return data;
    }
    return [];
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return [];
  }
}

export async function getDiscoverPicks() {
  const cacheKey = 'discover_picks';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `Suggest 8 trending and highly rated movies, TV series, and games from 2023-2024. Mix different genres. Return as a JSON array with objects having keys: title, type (movie/series/game), genre, overview (1 sentence), year.`;
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    const text = result.text || '';
    const jsonMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      setCachedData(cacheKey, data);
      return data;
    }
    return [];
  } catch (error) {
    console.error('Error getting discover picks:', error);
    return [];
  }
}

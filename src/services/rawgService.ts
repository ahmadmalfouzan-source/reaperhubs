// rawgService.ts
const BASE_URL = 'https://api.rawg.io/api';
const API_KEY = import.meta.env.VITE_RAWG_API_KEY || '';

export interface RAWGGame {
  id: number;
  name: string;
  released: string;
  background_image: string;
  rating: number;
  rating_top: number;
  genres: { name: string }[];
  tags?: { slug: string; name: string }[];
  description_raw?: string;
  platforms?: { platform: { name: string } }[];
  developers?: { id: number, name: string, image_background: string }[];
}

export async function searchGames(query: string): Promise<RAWGGame[]> {
  try {
    const url = `${BASE_URL}/games?search=${encodeURIComponent(query)}&page_size=20&key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('RAWG API error');
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching games on RAWG:', error);
    return [];
  }
}

export async function getGameDetails(id: string | number): Promise<RAWGGame | null> {
  const numericId = id.toString().replace('rawg-', '');
  console.log('Fetching RAWG details for ID:', numericId);
  try {
    const url = `${BASE_URL}/games/${numericId}?key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`RAWG API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching game details from RAWG:', error);
    return null;
  }
}

export async function getGameSuggested(id: string | number): Promise<RAWGGame[]> {
  const numericId = id.toString().replace('rawg-', '');
  console.log('Fetching RAWG related games for ID:', numericId);
  try {
    // 1. Attempt to fetch games in the same series
    const seriesUrl = `${BASE_URL}/games/${numericId}/game-series?key=${API_KEY}`;
    const seriesResponse = await fetch(seriesUrl);

    let results: RAWGGame[] = [];

    if (seriesResponse.ok) {
      const seriesData = await seriesResponse.json();
      results = seriesData.results || [];
    }

    // 2. Final Fallback - Search by tags if still empty
    if (results.length === 0) {
      // Get game details first to find tags
      const gameDetails = await getGameDetails(numericId);
      if (gameDetails && gameDetails.tags && gameDetails.tags.length > 0) {
        const tagSlugs = gameDetails.tags.map(t => t.slug).join(',');
        const fallbackUrl = `${BASE_URL}/games?tags=${tagSlugs}&page_size=10&key=${API_KEY}`;
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          // Exclude the current game from results
          results = (fallbackData.results || []).filter((g: any) => g.id.toString() !== numericId);
        }
      }
    }

    console.log('RAWG Related Games Count:', results.length);
    return results;
  } catch (error) {
    console.error('Error fetching related games from RAWG:', error);
    return [];
  }
}

export function mapRAWGToMedia(game: RAWGGame) {
  return {
    id: `rawg-${game.id}`,
    tmdb_id: game.id.toString(),
    title: game.name,
    type: 'game' as const,
    cover_url: game.background_image || '',
    poster_path: game.background_image || '',
    backdrop_path: game.background_image || '',
    overview: game.description_raw || '',
    release_date: game.released || '',
    vote_average: game.rating || 0,
    vote_count: 0,
    genre_ids: [],
    genres: game.genres?.map(g => ({ name: g.name })) || [],
    developers: game.developers || [],
    popularity: (game.rating || 0) * 100,
  };
}

export async function getPopularGames(): Promise<RAWGGame[]> {
  try {
    const url = `${BASE_URL}/games?ordering=-rating&page_size=20&key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('RAWG popular games error');
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching popular games:', error);
    return [];
  }
}

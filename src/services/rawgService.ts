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
  description_raw?: string;
  platforms?: { platform: { name: string } }[];
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
  try {
    const url = `${BASE_URL}/games/${id}?key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('RAWG API error');
    return await response.json();
  } catch (error) {
    console.error('Error fetching game details from RAWG:', error);
    return null;
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
    genres: game.genres?.map(g => g.name) || [],
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

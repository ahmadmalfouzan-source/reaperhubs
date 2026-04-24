const BASE_URL = '/api/tmdb';

export interface TMDBMedia {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  media_type?: 'movie' | 'tv';
  vote_average: number;
}

export async function searchTMDB(query: string, type: 'movie' | 'tv' | 'multi' = 'multi', page = 1) {
  if (!query) return [];
  
  const url = `${BASE_URL}/search/${type}?query=${encodeURIComponent(query)}&page=${page}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('TMDB Search Error:', error);
    return [];
  }
}

export async function discoverTMDB(options: {
  type: 'movie' | 'tv';
  genreId?: string;
  sortBy?: string;
  page?: number;
}) {
  const { type, genreId, sortBy = 'popularity.desc', page = 1 } = options;
  
  let url = `${BASE_URL}/discover/${type}?sort_by=${sortBy}&page=${page}`;
  
  if (genreId && genreId !== 'all') {
    url += `&with_genres=${genreId}`;
  }
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('TMDB Discover Error:', error);
    return [];
  }
}

export async function getTMDBGenres(type: 'movie' | 'tv') {
  const url = `${BASE_URL}/genre/${type}/list`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.genres || [];
  } catch (error) {
    console.error('TMDB Genres Error:', error);
    return [];
  }
}

export function getTMDBImageUrl(path: string | null | undefined, size: 'w300' | 'w500' | 'original' = 'w300') {
  if (!path) return 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80';
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export async function getMediaDetails(id: string, type: 'movie' | 'tv') {
  const url = `${BASE_URL}/${type}/${id}?append_to_response=credits,recommendations,videos`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch details');
    return await response.json();
  } catch (error) {
    console.error('TMDB Details Error:', error);
    return null;
  }
}

export async function getTMDBItemByTitle(title: string, type: string) {
  const tmdbType = type.toLowerCase() === 'series' || type.toLowerCase() === 'tv' ? 'tv' : 'movie';
  const url = `${BASE_URL}/search/${tmdbType}?query=${encodeURIComponent(title)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return { ...data.results[0], media_type: tmdbType };
    }
    return null;
  } catch (error) {
    console.error('TMDB Search Error:', error);
    return null;
  }
}

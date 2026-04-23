const TMDB_API_KEY = 'e09c714c70283f7112fa2b6f7391a9db'; // Placeholder for user
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300';

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
  
  const url = `${BASE_URL}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
  
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
  
  let url = `${BASE_URL}/discover/${type}?api_key=${TMDB_API_KEY}&sort_by=${sortBy}&page=${page}`;
  
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
  const url = `${BASE_URL}/genre/${type}/list?api_key=${TMDB_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.genres || [];
  } catch (error) {
    console.error('TMDB Genres Error:', error);
    return [];
  }
}

export function getTMDBImageUrl(path: string) {
  if (!path) return null;
  return `${IMAGE_BASE_URL}${path}`;
}

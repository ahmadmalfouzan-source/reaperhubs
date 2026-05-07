import { useEffect, useState, useCallback, useRef } from 'react';
import { addToLibrary as addToLibraryQuery } from '../lib/reaperhub/queries';
import { searchTMDB, discoverTMDB, getTMDBGenres, getTMDBImageUrl, getTMDBItemByTitle, getTrendingTMDB } from '../services/tmdbService';
import { searchGames as searchRAWG, mapRAWGToMedia } from '../services/rawgService';
import { TrendingUp, Plus, Check, Search as SearchIcon, Filter, X, Clock, Trash2, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Skeleton from '../components/Skeleton';

function DiscoverImage({ title, type }: { title: string; type: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (type === 'game') {
      searchRAWG(title).then(results => {
        if (results && results.length > 0 && results[0].background_image) {
          setUrl(results[0].background_image);
        }
        setLoading(false);
      });
    } else {
      getTMDBItemByTitle(title, type).then(item => {
        if (item?.poster_path) {
          setUrl(getTMDBImageUrl(item.poster_path));
        }
        setLoading(false);
      });
    }
  }, [title, type]);

  if (loading) return <Skeleton className="w-full h-full rounded-none" />;
  if (!url) return (
    <div className="w-full h-full bg-surface-2 flex items-center justify-center text-[10px] text-muted text-center p-2 uppercase font-bold">
      {type}
    </div>
  );

  return <img loading="lazy" src={url} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-110" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />;
}

type MediaType = 'movie' | 'tv' | 'game' | 'all';
type SortOption = 'relevance' | 'popularity.desc' | 'vote_average.desc' | 'release_date.desc';
const RECENT_SEARCHES_KEY = 'reaperhub_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [discoverPicks, setDiscoverPicks] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();



  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [minYear, setMinYear] = useState<number>(1900);
  const [maxYear, setMaxYear] = useState<number>(new Date().getFullYear());
  const [minRating, setMinRating] = useState<number>(0);
  const [maxRating, setMaxRating] = useState<number>(10);

  // Search history & suggestions
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState<SortOption>('popularity.desc');
  const [genres, setGenres] = useState<any[]>([]);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(async () => {
        // Fetch suggestions
        try {
          const type = mediaType === 'all' ? 'multi' : mediaType as 'movie' | 'tv';
          let tmdbSuggestions: any[] = [];
          if (mediaType !== 'game') {
            tmdbSuggestions = await searchTMDB(query, type);
          }

          let gameSuggestions: any[] = [];
          if (mediaType === 'game' || mediaType === 'all') {
             const rawgRes = await searchRAWG(query);
             gameSuggestions = rawgRes.map(mapRAWGToMedia);
          }

          const combined = [...tmdbSuggestions.map(i => ({
             ...i,
             type: i.media_type || (i.title ? 'movie' : 'tv'),
             title: i.title || i.name
          })), ...gameSuggestions];

          // Sort by popularity roughly for suggestions
          combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

          setSuggestions(combined.slice(0, 5));
          setShowSuggestions(true);
        } catch (e) {
           console.error(e);
        }
        handleSearch(query);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      // Wait to handle search for empty query to avoid multiple API calls during rapid deletion
      searchTimeoutRef.current = setTimeout(() => {
         handleSearch('');
      }, 300);
    }
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  useEffect(() => {
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    } catch (e) {
      console.error('Failed to save recent searches', e);
    }
  }, [recentSearches]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Initial load
    fetchDiscoverPicks();
    loadGenres();
    handleSearch('');
  }, []);

  const loadGenres = async () => {
    const movieGenres = await getTMDBGenres('movie');
    const tvGenres = await getTMDBGenres('tv');
    // Merge and unique
    const all = [...movieGenres, ...tvGenres];
    const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
    setGenres(unique);
  };

  const fetchDiscoverPicks = async () => {
    setDiscoverLoading(true);
    const trending = await getTrendingTMDB('all', 'week');
    const mapped = trending.slice(0, 6).map((item: any) => ({
      title: item.title || item.name,
      type: item.media_type === 'tv' ? 'series' : item.media_type,
      genre: 'Trending',
      description: item.overview,
      id: item.id
    }));
    setDiscoverPicks(mapped);
    setDiscoverLoading(false);
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    let data: any[] = [];

    if (!searchQuery) {
      // If no query, use discover API for movies/tv
      if (mediaType === 'game' || mediaType === 'all') {
        const gameData = await searchRAWG(''); // Get trending games
        const formatted = gameData.map(mapRAWGToMedia);
        data = [...formatted];
      }
      
      if (mediaType !== 'game') {
        const tmdbType = mediaType === 'all' ? 'movie' : mediaType;
        const tmdbData = await discoverTMDB({
          type: tmdbType as 'movie' | 'tv',
          genreIds: selectedGenres.length > 0 ? selectedGenres : undefined,
          sortBy: sortBy === 'relevance' ? 'popularity.desc' : sortBy,
          minYear,
          maxYear,
          minRating,
          maxRating
        });
        
        const formatted = tmdbData.map((item: any) => ({
          id: `tmdb-${item.id}`,
          title: item.title || item.name,
          type: mediaType === 'all' ? (item.title ? 'movie' : 'tv') : mediaType,
          cover_url: getTMDBImageUrl(item.poster_path),
          release_year: (item.release_date || item.first_air_date || '').split('-')[0],
          rating: item.vote_average,
          overview: item.overview
        }));
        data = [...data, ...formatted];
      }
    } else {
      // Search with query
      if (mediaType === 'game' || mediaType === 'all') {
        const gameData = await searchRAWG(searchQuery);
        const formatted = gameData.map(mapRAWGToMedia);
        data = [...formatted];
      }

      if (mediaType !== 'game') {
        const tmdbType = mediaType === 'all' ? 'multi' : mediaType as 'movie' | 'tv';
        const tmdbData = await searchTMDB(searchQuery, tmdbType);
        
        const formatted = tmdbData.map((item: any) => ({
          id: `tmdb-${item.id}`,
          title: item.title || item.name,
          type: item.media_type || (item.title ? 'movie' : 'tv'),
          cover_url: getTMDBImageUrl(item.poster_path),
          release_year: (item.release_date || item.first_air_date || '').split('-')[0],
          rating: item.vote_average,
          overview: item.overview
        }));
        data = [...data, ...formatted];
      }
    }
    
    // Apply local filtering to results since TMDB search doesn't support advanced filters
    let filteredData = data;

    if (searchQuery) {
       filteredData = filteredData.filter(item => {
          // Check year
          if (item.release_year) {
             const year = parseInt(item.release_year);
             if (year < minYear || year > maxYear) return false;
          }

          // Check rating
          if (item.rating !== undefined) {
             if (item.rating > 0 && (item.rating < minRating || item.rating > maxRating)) return false;
          }

          // Genre filtering is hard for multi-search as it doesn't return detailed genres consistently
          // and we only have genre_ids which requires mapping.
          // For simplicity, we skip strict genre filtering on local text search unless we map ids.
          return true;
       });

       // Local sort
       if (sortBy === 'vote_average.desc') {
         filteredData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
       } else if (sortBy === 'release_date.desc') {
         filteredData.sort((a, b) => {
            const dateA = a.release_date || `${a.release_year}-01-01` || '';
            const dateB = b.release_date || `${b.release_year}-01-01` || '';
            return dateB.localeCompare(dateA);
         });
       } else if (sortBy === 'popularity.desc') {
         filteredData.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
       }
    }

    setResults(filteredData);
    setLoading(false);
  }, [mediaType, selectedGenres, sortBy, minYear, maxYear, minRating, maxRating]);

  // Re-run search when filters change
  useEffect(() => {
    handleSearch(query);
  }, [mediaType, selectedGenres, sortBy, minYear, maxYear, minRating, maxRating, handleSearch]);

  const handleAdd = async (item: any) => {
    const res = await addToLibraryQuery(item.title, item.type, 'plan_to_watch', {
      overview: item.overview,
      cover_url: item.cover_url
    }, String(item.id));
    if (res.success) {
      setAddedIds(prev => new Set(prev).add(item.title));
      if (res.rewards) {
        toast.success(`+${res.rewards.earnedXp} XP! Item added to library!`, {
          icon: '✨'
        });
      } else {
        toast.success(`Item added to library!`);
      }
    } else {
      toast.error(res.message || "Failed to add to library.");
    }
  };

  const saveSearchToHistory = (term: string) => {
    if (!term.trim()) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    saveSearchToHistory(query);
    handleSearch(query);
  };

  const handleSuggestionClick = (title: string) => {
     setQuery(title);
     setShowSuggestions(false);
     saveSearchToHistory(title);
     handleSearch(title);
  };

  const handleRecentSearchClick = (term: string) => {
     setQuery(term);
     setShowSuggestions(false);
     saveSearchToHistory(term);
     handleSearch(term);
  };

  const clearFilters = () => {
    setMediaType('all');
    setSelectedGenres([]);
    setSortBy('relevance');
    setMinYear(1900);
    setMaxYear(new Date().getFullYear());
    setMinRating(0);
    setMaxRating(10);
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row gap-8 relative">
        {/* Mobile Filter Toggle */}
        <div className="md:hidden flex items-center justify-between mb-4">
           <h1 className="font-display font-bold text-3xl">Search</h1>
           <button
             onClick={() => setShowFilters(!showFilters)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${showFilters ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-muted hover:text-text'}`}
           >
             <Filter size={18} />
             <span className="text-sm font-bold">Filters</span>
           </button>
        </div>

        {/* Sidebar Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} md:block w-full md:w-64 space-y-6 flex-shrink-0 bg-surface md:bg-transparent border md:border-0 border-border p-4 md:p-0 rounded-2xl md:rounded-none`}>
            <div className="hidden md:flex items-center justify-between mb-6">
              <h1 className="font-display font-bold text-2xl">Filters</h1>
              <button
                onClick={clearFilters}
                className="text-xs font-bold text-muted hover:text-danger transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>

            {/* Media Type */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Media Type</label>
              <div className="flex flex-wrap gap-2">
                {(['all', 'movie', 'tv', 'game'] as MediaType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMediaType(t)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${mediaType === t ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-2 border-border text-muted hover:border-text/30'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="popularity.desc">Popularity</option>
                <option value="vote_average.desc">Rating</option>
                <option value="release_date.desc">Release Date</option>
              </select>
            </div>

            {/* Year Range */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Year</label>
                <span className="text-xs text-primary font-mono">{minYear} - {maxYear}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minYear}
                  onChange={(e) => setMinYear(Math.max(1900, Math.min(maxYear, parseInt(e.target.value) || 1900)))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs text-center"
                />
                <span className="text-muted">-</span>
                <input
                  type="number"
                  value={maxYear}
                  onChange={(e) => setMaxYear(Math.min(new Date().getFullYear(), Math.max(minYear, parseInt(e.target.value) || new Date().getFullYear())))}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-xs text-center"
                />
              </div>
            </div>

            {/* Rating Range */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Rating</label>
                <span className="text-xs text-yellow-500 font-mono">★ {minRating} - {maxRating}</span>
              </div>
              <div className="px-2">
                <input
                  type="range"
                  min="0" max="10" step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(Math.min(maxRating, parseFloat(e.target.value)))}
                  className="w-full accent-yellow-500 h-1 bg-surface-2 rounded-lg appearance-none cursor-pointer mb-2"
                />
                <input
                  type="range"
                  min="0" max="10" step="0.5"
                  value={maxRating}
                  onChange={(e) => setMaxRating(Math.max(minRating, parseFloat(e.target.value)))}
                  className="w-full accent-yellow-500 h-1 bg-surface-2 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Genre Multi-select */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Genres</label>
                {selectedGenres.length > 0 && (
                  <button onClick={() => setSelectedGenres([])} className="text-[10px] text-muted hover:text-danger">Clear</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {genres.map(g => {
                   const isSelected = selectedGenres.includes(String(g.id));
                   return (
                     <button
                       key={g.id}
                       onClick={() => {
                          setSelectedGenres(prev =>
                            isSelected ? prev.filter(id => id !== String(g.id)) : [...prev, String(g.id)]
                          );
                       }}
                       className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${isSelected ? 'bg-primary-2/20 border-primary-2 text-primary-2' : 'bg-surface-2 border-border/50 text-muted hover:border-text/30'}`}
                     >
                       {g.name}
                     </button>
                   )
                })}
              </div>
            </div>

            <div className="md:hidden flex justify-end pt-4 border-t border-border mt-6">
               <button
                 onClick={clearFilters}
                 className="flex items-center gap-2 text-xs font-bold text-muted hover:text-danger transition-colors mr-4"
               >
                 <X size={14} /> Clear All
               </button>
               <button
                 onClick={() => setShowFilters(false)}
                 className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold"
               >
                 Apply Filters
               </button>
            </div>
        </div>

        {/* Main Search Area */}
        <div className="flex-1 space-y-6">

        <div className="flex flex-wrap gap-2 mb-2">
          {mediaType !== 'all' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-full text-[10px] font-bold uppercase tracking-tighter">
              Type: {mediaType}
              <X size={10} className="ml-1 cursor-pointer" onClick={() => setMediaType('all')} />
            </span>
          )}
          {selectedGenres.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary-2/10 border border-primary-2/30 text-primary-2 rounded-full text-[10px] font-bold uppercase tracking-tighter">
              Genres: {selectedGenres.length} selected
              <X size={10} className="ml-1 cursor-pointer" onClick={() => setSelectedGenres([])} />
            </span>
          )}
          {sortBy !== 'relevance' && sortBy !== 'popularity.desc' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-success/10 border border-success/30 text-success rounded-full text-[10px] font-bold uppercase tracking-tighter">
              Sort: {sortBy.split('.')[0]}
              <X size={10} className="ml-1 cursor-pointer" onClick={() => setSortBy('relevance')} />
            </span>
          )}
        </div>
        
        <div className="relative" ref={searchContainerRef}>
          <form onSubmit={onSubmit} className="flex gap-2 relative z-10">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search movies, series, games..."
                className="w-full bg-surface border border-border rounded-xl p-[14px] pl-12 text-text focus:outline-none focus:border-primary transition-colors shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl px-8 transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Search'}
            </button>
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && query.trim().length > 0 && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-[104px] mt-2 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(item.title)}
                  className="flex items-center gap-3 p-3 hover:bg-surface-2 cursor-pointer transition-colors border-b border-border/50 last:border-0"
                >
                  <SearchIcon size={14} className="text-muted flex-shrink-0" />
                  <div className="flex-1 truncate">
                    <span className="text-sm text-text font-medium">{item.title}</span>
                    {item.release_year && <span className="text-xs text-muted ml-2">({item.release_year})</span>}
                  </div>
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md bg-surface-2 text-muted border border-border/50">
                    {item.type}
                  </span>
                  <ArrowUpRight size={14} className="text-muted opacity-50" />
                </div>
              ))}
            </div>
          )}

          {/* Recent Searches (when input is empty) */}
          {!query.trim() && recentSearches.length > 0 && (
             <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted flex items-center gap-1 mr-2"><Clock size={12}/> Recent:</span>
                {recentSearches.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleRecentSearchClick(term)}
                    className="px-3 py-1 rounded-full text-xs bg-surface-2 border border-border/50 text-text hover:border-primary/50 hover:text-primary transition-colors"
                  >
                    {term}
                  </button>
                ))}
                <button
                  onClick={() => setRecentSearches([])}
                  className="ml-auto text-[10px] text-muted hover:text-danger flex items-center gap-1"
                >
                  Clear History
                </button>
             </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
            ))}
          </div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-20 text-muted bg-surface/30 rounded-[32px] border border-dashed border-border/50 flex flex-col items-center justify-center space-y-4">
            <SearchIcon className="w-12 h-12 text-muted opacity-20" />
            <div className="space-y-1">
              <p className="text-sm text-muted italic">No signals detected. Try different keywords.</p>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    const mediaId = item.id.replace('tmdb-', '').replace('rawg-', '');
                    navigate(`/media/${item.type}/${mediaId}`);
                  }}
                  className="relative group rounded-2xl overflow-hidden bg-surface-2 cursor-pointer touch-manipulation aspect-[2/3] shadow-lg border border-border/50"
                >
                {item.cover_url ? (
                  <img loading="lazy" src={item.cover_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted bg-surface">
                    <span className="text-4xl mb-2 opacity-50">🎬</span>
                    No Cover
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none"></div>

                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-md bg-black/60 text-white border border-white/10">
                    {item.type}
                  </span>
                  {item.rating > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                      ★ {item.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 z-20">
                  <h3 className="font-display font-medium text-lg text-white leading-tight mb-2">
                    {item.title} {item.release_year ? `(${item.release_year})` : ''}
                  </h3>
                  <p className="text-[10px] text-muted line-clamp-3 mb-4 italic leading-relaxed">
                    {item.overview || 'No overview available.'}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const mediaId = item.id.replace('tmdb-', '').replace('rawg-', '');
                      navigate(`/media/${item.type}/${mediaId}`);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 z-0"
                    aria-label="View details"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdd(item);
                    }}
                    disabled={addedIds.has(item.title)}
                    className="w-full py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 relative z-30"
                  >
                    {addedIds.has(item.title) ? (
                      <><Check size={14} /> In Library</>
                    ) : (
                      <><Plus size={14} /> Add to Library</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>{/* End Main Search Area */}
      </div>{/* End Flex Row */}


      {/* Discover Section */}
      <section className="space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-2" />
            <h2 className="font-display font-bold text-2xl uppercase tracking-wide">Market Discover</h2>
          </div>
          {!discoverLoading && (
            <button 
              onClick={fetchDiscoverPicks}
              className="text-xs font-bold text-primary hover:text-primary-2 transition-colors uppercase tracking-widest"
            >
              Refresh Intel
            </button>
          )}
        </div>

        {discoverLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-surface-2 rounded-2xl animate-pulse border border-border/50"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {discoverPicks.map((item, idx) => (
              <div key={idx} className="bg-surface border border-border rounded-2xl p-6 flex gap-6 hover:border-primary-2/30 transition-all duration-300 group shadow-lg">
                <div 
                  className="w-24 h-32 flex-shrink-0 relative rounded-xl overflow-hidden shadow-2xl cursor-pointer"
                  onClick={async () => {
                    if (item.type === 'game') {
                      const gameResults = await searchRAWG(item.title);
                      if (gameResults && gameResults.length > 0) {
                        navigate(`/media/game/${gameResults[0].id}`);
                      }
                    } else {
                      const tmdbItem = await getTMDBItemByTitle(item.title, item.type);
                      if (tmdbItem) {
                        navigate(`/media/${item.type === 'series' ? 'tv' : item.type}/${tmdbItem.id}`);
                      }
                    }
                  }}
                >
                  <DiscoverImage title={item.title} type={item.type} />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary-2/20 text-primary-2 border border-primary-2/30">
                        {item.type}
                      </span>
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-surface-2 text-muted border border-border">
                        {item.genre}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-xl text-white leading-tight mb-2 group-hover:text-primary-2 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2 italic">
                      "{item.description}"
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={addedIds.has(item.title)}
                    className="mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-primary-2/10 hover:bg-primary-2 text-primary-2 hover:text-black rounded-xl text-xs font-bold transition-all border border-primary-2/20 disabled:opacity-50"
                  >
                    {addedIds.has(item.title) ? (
                      <><Check size={14} /> In Library</>
                    ) : (
                      <><Plus size={14} /> Add to Library</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

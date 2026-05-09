import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { addToLibrary as addToLibraryQuery } from '../lib/reaperhub/queries';
import { searchTMDB, discoverTMDB, getTMDBGenres, getTMDBImageUrl, getTMDBItemByTitle, getTrendingTMDB } from '../services/tmdbService';
import { searchGames as searchRAWG, mapRAWGToMedia, type RAWGSearchFilters } from '../services/rawgService';
import { TrendingUp, Plus, Check, Search as SearchIcon, Filter, X, Clock, Trash2, ArrowUpRight, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Skeleton from '../components/Skeleton';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';

type MediaType = 'all' | 'movie' | 'tv' | 'game';
type SortOption = 'relevance' | 'popularity.desc' | 'vote_average.desc' | 'release_date.desc';

// --- Sub-components ---

const DiscoverImage = memo(({ title, type }: { title: string; type: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (type === 'game') {
      searchRAWG(title).then(results => {
        if (isMounted) {
          if (results && results.length > 0 && results[0].background_image) {
            setUrl(results[0].background_image);
          }
          setLoading(false);
        }
      });
    } else {
      getTMDBItemByTitle(title, type).then(item => {
        if (isMounted) {
          if (item?.poster_path) {
            setUrl(getTMDBImageUrl(item.poster_path));
          }
          setLoading(false);
        }
      });
    }
    return () => { isMounted = false; };
  }, [title, type]);

  if (loading) return <Skeleton className="w-full h-full rounded-none" />;
  if (!url) return (
    <div className="w-full h-full bg-surface-2 flex items-center justify-center text-xs text-text-muted text-center p-2 uppercase font-bold">
      {type}
    </div>
  );

  return (
    <img 
      loading="lazy" 
      src={url} 
      alt={title} 
      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} 
    />
  );
});

const SearchResultCard = memo(({ item, onAdd, isAdded }: { item: any, onAdd: (item: any) => void, isAdded: boolean }) => {
  const navigate = useNavigate();
  const mediaId = item.id.replace('tmdb-', '').replace('rawg-', '');

  return (
    <div 
      onClick={() => navigate(`/media/${item.type}/${mediaId}`)}
      className="card card-interactive group aspect-[2/3] overflow-hidden"
    >
      {item.cover_url ? (
        <img 
          loading="lazy" 
          src={item.cover_url} 
          alt={item.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} 
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2">
          <span className="text-4xl mb-2 opacity-20">🎬</span>
          <span className="text-xs font-bold text-text-muted uppercase tracking-widest">No Intel</span>
        </div>
      )}
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-md bg-black/60 text-white border border-white/10 tracking-widest">
          {item.type}
        </span>
        {item.rating > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md bg-accent-primary/20 text-accent-primary border border-accent-primary/30 flex items-center gap-1">
            <Star size={10} fill="currentColor" /> {item.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 z-20 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
        <h3 className="font-display font-bold text-lg text-text-primary leading-tight mb-1 line-clamp-2">
          {item.title}
        </h3>
        <span className="text-xs text-text-muted font-mono mb-3 block">
          {item.release_year || 'DATE UNKNOWN'}
        </span>
        
        <p className="text-xs text-text-muted line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity delay-75">
          {item.overview || 'Mission details classified.'}
        </p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(item);
          }}
          disabled={isAdded}
          className={`btn w-full py-2 ${isAdded ? 'btn-ghost' : 'btn-primary'} !text-[10px] h-9`}
        >
          {isAdded ? (
            <><Check size={14} /> Recorded</>
          ) : (
            <><Plus size={14} /> Add to Intel</>
          )}
        </button>
      </div>
    </div>
  );
});

// --- Main Component ---

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
  const [minYearInput, setMinYearInput] = useState('1900');
  const [maxYearInput, setMaxYearInput] = useState(String(new Date().getFullYear()));
  const [minYear, setMinYear] = useState(1900);
  const [maxYear, setMaxYear] = useState(new Date().getFullYear());
  const [yearError, setYearError] = useState('');
  const [minRating, setMinRating] = useState<number>(0);
  const [maxRating, setMaxRating] = useState<number>(10);
  const [sortBy, setSortBy] = useState<SortOption>('popularity.desc');
  const [genres, setGenres] = useState<any[]>([]);

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
  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const activeFilterCount = [
    mediaType !== 'all',
    selectedGenres.length > 0,
    sortBy !== 'relevance' && sortBy !== 'popularity.desc',
    minYear !== 1900,
    maxYear !== new Date().getFullYear(),
    minRating !== 0,
    maxRating !== 10,
  ].filter(Boolean).length;

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(async () => {
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
      searchTimeoutRef.current = setTimeout(() => {
         handleSearch('');
      }, 300);
    }
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  useEffect(() => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
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
    fetchDiscoverPicks();
    loadGenres();
    handleSearch('');
  }, []);

  const loadGenres = async () => {
    const movieGenres = await getTMDBGenres('movie');
    const tvGenres = await getTMDBGenres('tv');
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

    const rawgFilters: RAWGSearchFilters = {};
    if (minYear !== 1900 || maxYear !== new Date().getFullYear()) {
      rawgFilters.dates = `${minYear}-01-01,${maxYear}-12-31`;
    }
    if (minRating !== 0 || maxRating !== 10) {
      rawgFilters.metacritic = `${Math.round(minRating * 10)},${Math.round(maxRating * 10)}`;
    }
    if (sortBy === 'vote_average.desc') {
      rawgFilters.ordering = '-rating';
    } else if (sortBy === 'release_date.desc') {
      rawgFilters.ordering = '-released';
    } else if (sortBy === 'popularity.desc' || sortBy === 'relevance') {
      rawgFilters.ordering = '-added';
    }

    if (!searchQuery) {
      if (mediaType === 'game' || mediaType === 'all') {
        const gameData = await searchRAWG('', rawgFilters);
        data = [...gameData.map((game: any) => {
          const mapped = mapRAWGToMedia(game);
          return {
            ...mapped,
            release_year: mapped.release_date ? mapped.release_date.split('-')[0] : '',
            rating: mapped.vote_average || 0
          };
        })];
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
        
        data = [...data, ...tmdbData.map((item: any) => ({
          id: `tmdb-${item.id}`,
          title: item.title || item.name,
          type: mediaType === 'all' ? (item.title ? 'movie' : 'tv') : mediaType,
          cover_url: getTMDBImageUrl(item.poster_path),
          release_year: (item.release_date || item.first_air_date || '').split('-')[0],
          release_date: item.release_date || item.first_air_date || '',
          rating: item.vote_average || 0,
          overview: item.overview,
          popularity: item.popularity || 0,
          genre_ids: item.genre_ids || []
        }))];
      }
    } else {
      if (mediaType === 'game' || mediaType === 'all') {
        const gameData = await searchRAWG(searchQuery, rawgFilters);
        data = [...gameData.map((game: any) => {
          const mapped = mapRAWGToMedia(game);
          return {
            ...mapped,
            release_year: mapped.release_date ? mapped.release_date.split('-')[0] : '',
            rating: mapped.vote_average || 0
          };
        })];
      }

      if (mediaType !== 'game') {
        const tmdbType = mediaType === 'all' ? 'multi' : mediaType as 'movie' | 'tv';
        const tmdbData = await searchTMDB(searchQuery, tmdbType);
        
        data = [...data, ...tmdbData.map((item: any) => ({
          id: `tmdb-${item.id}`,
          title: item.title || item.name,
          type: item.media_type || (item.title ? 'movie' : 'tv'),
          cover_url: getTMDBImageUrl(item.poster_path),
          release_year: (item.release_date || item.first_air_date || '').split('-')[0],
          release_date: item.release_date || item.first_air_date || '',
          rating: item.vote_average || 0,
          overview: item.overview,
          popularity: item.popularity || 0,
          genre_ids: item.genre_ids || []
        }))];
      }
    }
    
    let filteredData = data.filter(item => {
      if (item.release_year) {
        const year = parseInt(item.release_year);
        if (!isNaN(year) && (year < minYear || year > maxYear)) return false;
      }
      if (item.rating !== undefined && item.rating > 0 && (item.rating < minRating || item.rating > maxRating)) return false;
      if (selectedGenres.length > 0 && item.type !== 'game' && item.genre_ids) {
        if (!item.genre_ids.some((id: number) => selectedGenres.includes(String(id)))) return false;
      }
      return true;
    });

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

    setResults(filteredData);
    setLoading(false);
  }, [mediaType, selectedGenres, sortBy, minYear, maxYear, minRating, maxRating]);

  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = setTimeout(() => {
      handleSearch(query);
    }, 300);
    return () => { if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current); };
  }, [mediaType, selectedGenres, sortBy, minYear, maxYear, minRating, maxRating]);

  const handleAdd = async (item: any) => {
    const res = await addToLibraryQuery(item.title, item.type, 'plan_to_watch', {
      overview: item.overview,
      cover_url: item.cover_url
    }, String(item.id));
    if (res.success) {
      setAddedIds(prev => new Set(prev).add(item.title));
      toast.success(res.rewards ? `+${res.rewards.earnedXp} XP! Recorded in library.` : `Target recorded in library.`, {
        icon: '⚔️'
      });
    } else {
      toast.error(res.message || "Failed to establish link.");
    }
  };

  const clearFilters = () => {
    setMediaType('all');
    setSelectedGenres([]);
    setSortBy('relevance');
    setMinYearInput('1900');
    setMaxYearInput(String(new Date().getFullYear()));
    setMinYear(1900);
    setMaxYear(new Date().getFullYear());
    setYearError('');
    setMinRating(0);
    setMaxRating(10);
  };

  const handleYearBlur = (field: 'min' | 'max') => {
    const minVal = parseInt(minYearInput) || 1900;
    const maxVal = parseInt(maxYearInput) || new Date().getFullYear();
    if (minVal > maxVal) {
      setYearError('Temporal inconsistency: Min > Max');
      return;
    }
    setYearError('');
    field === 'min' ? setMinYear(minVal) : setMaxYear(maxVal);
  };

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 md:px-8 relative overflow-hidden bg-bg-base">
      <ScanlineOverlay className="opacity-10" />
      <TacticalGrid className="opacity-5" />
      
      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
      <div className="flex flex-col md:flex-row gap-10">
        
        {/* Sidebar Filters */}
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-bg-base/95 backdrop-blur-xl p-6 overflow-y-auto' : 'hidden md:block w-72 flex-shrink-0'} space-y-8`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl uppercase tracking-widest font-bold flex items-center gap-2 text-text-primary">
              <Filter size={20} className="text-accent-primary" /> Tactical Filters
            </h2>
            <button onClick={clearFilters} className="btn btn-ghost !p-2 rounded-full hover:text-accent-danger transition-colors">
              <Trash2 size={16} />
            </button>
          </div>

          <div className="space-y-8">
            {/* Media Type */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Registry Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['all', 'movie', 'tv', 'game'] as MediaType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMediaType(t)}
                    className={`btn !py-2 !px-3 text-[10px] ${mediaType === t ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Priority Ordering</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="input h-11 !text-sm appearance-none cursor-pointer"
              >
                <option value="relevance">Relevance</option>
                <option value="popularity.desc">High Popularity</option>
                <option value="vote_average.desc">Peak Rating</option>
                <option value="release_date.desc">Recent Deployment</option>
              </select>
            </div>

            {/* Year Range */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Temporal Range</label>
                <span className="text-[10px] text-accent-primary font-mono">{minYear} - {maxYear}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={minYearInput}
                  onChange={(e) => setMinYearInput(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => handleYearBlur('min')}
                  className={`input !py-2 text-center !text-sm ${yearError ? 'input-error' : ''}`}
                  placeholder="Min"
                  maxLength={4}
                />
                <span className="text-text-muted">/</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={maxYearInput}
                  onChange={(e) => setMaxYearInput(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={() => handleYearBlur('max')}
                  className={`input !py-2 text-center !text-sm ${yearError ? 'input-error' : ''}`}
                  placeholder="Max"
                  maxLength={4}
                />
              </div>
              {yearError && <p className="text-[10px] text-accent-danger font-bold uppercase">{yearError}</p>}
            </div>

            {/* Rating Range */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Quality Score</label>
                <span className="text-[10px] text-accent-warning font-mono">★ {minRating} - {maxRating}</span>
              </div>
              <div className="space-y-3 px-1">
                <input
                  type="range" min="0" max="10" step="0.5" value={minRating}
                  onChange={(e) => setMinRating(Math.min(maxRating, parseFloat(e.target.value)))}
                  className="w-full h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-accent-primary"
                />
                <input
                  type="range" min="0" max="10" step="0.5" value={maxRating}
                  onChange={(e) => setMaxRating(Math.max(minRating, parseFloat(e.target.value)))}
                  className="w-full h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-accent-primary"
                />
              </div>
            </div>

            {/* Genres */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Specializations (Genres)</label>
              <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {genres.map(g => {
                   const isSelected = selectedGenres.includes(String(g.id));
                   return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGenres(prev => isSelected ? prev.filter(id => id !== String(g.id)) : [...prev, String(g.id)])}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold border transition-all uppercase tracking-wider ${isSelected ? 'bg-accent-primary/20 border-accent-primary text-accent-primary shadow-glow-primary/20' : 'bg-surface-1 border-surface-3 text-text-muted hover:border-text-primary/30'}`}
                      >
                       {g.name}
                     </button>
                   )
                })}
              </div>
            </div>

            {showFilters && (
               <button onClick={() => setShowFilters(false)} className="btn btn-primary w-full mt-6">Apply Operations</button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-8">
          
          {/* Header & Search Bar */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl md:text-4xl uppercase tracking-tighter text-text-primary font-bold">Intel Database</h1>
              <button onClick={() => setShowFilters(true)} className="md:hidden btn btn-ghost !p-3">
                <Filter size={20} />
              </button>
            </div>

            <div className="relative" ref={searchContainerRef}>
              <form onSubmit={(e) => e.preventDefault()} className="flex gap-3">
                <div className="relative flex-1 group">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-accent-primary transition-colors" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search registry (Terminals, Operations, Personnel)..."
                    className="input pl-12 h-14"
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </form>

              {/* Suggestions */}
              {showSuggestions && query.trim() && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 card z-50 shadow-2xl divide-y divide-surface-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => { setQuery(item.title); setShowSuggestions(false); handleSearch(item.title); }}
                      className="flex items-center gap-4 p-4 hover:bg-surface-2 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-14 flex-shrink-0 bg-surface-3 rounded overflow-hidden border border-surface-3">
                        <DiscoverImage title={item.title} type={item.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-text-primary truncate">{item.title}</h4>
                        <p className="text-xs text-text-muted font-mono">{item.release_year || '---'} | {item.type.toUpperCase()}</p>
                      </div>
                      <ArrowUpRight size={16} className="text-text-muted" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Filters Bar */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-4">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mr-2">Active Modifiers:</span>
                {mediaType !== 'all' && (
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase tracking-wider">
                    {mediaType} <X size={10} className="cursor-pointer" onClick={() => setMediaType('all')} />
                  </span>
                )}
                {selectedGenres.length > 0 && (
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase tracking-wider">
                    Genres: {selectedGenres.length} <X size={10} className="cursor-pointer" onClick={() => setSelectedGenres([])} />
                  </span>
                )}
                {(minYear !== 1900 || maxYear !== new Date().getFullYear()) && (
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-[10px] font-bold uppercase tracking-wider">
                    {minYear}-{maxYear} <X size={10} className="cursor-pointer" onClick={() => { setMinYear(1900); setMaxYear(new Date().getFullYear()); }} />
                  </span>
                )}
                <button onClick={clearFilters} className="text-[10px] font-bold text-accent-danger hover:underline uppercase ml-2 tracking-widest">Wipe All</button>
              </div>
            )}
          </div>

          {/* Results Grid */}
          <div className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="card h-96 tactical-grid flex flex-col items-center justify-center text-center p-8 space-y-4">
                <SearchIcon className="w-16 h-16 text-text-muted opacity-20" />
                <div className="space-y-2 max-w-xs">
                  <h3 className="text-xl uppercase tracking-widest text-text-primary">No Signals Detected</h3>
                  <p className="text-sm text-text-muted">Registry scan yielded zero results. Adjust tactical filters or search parameters.</p>
                </div>
                <button onClick={clearFilters} className="btn btn-ghost mt-4">Reset Parameters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {results.map((item) => (
                  <SearchResultCard 
                    key={item.id} 
                    item={item} 
                    onAdd={handleAdd} 
                    isAdded={addedIds.has(item.title)} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Discover Trending (only if no results or early search) */}
          {!query && (
            <section className="pt-12 border-t border-surface-3 space-y-8 relative overflow-hidden">
              <TacticalGrid className="opacity-10" />
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-surface-3" />
                <h2 className="text-xl uppercase tracking-[0.2em] font-bold flex items-center gap-3 text-text-primary">
                   <TrendingUp size={24} className="text-accent-primary" /> Global Hotzone
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-surface-3" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {discoverLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div key={i} className="card h-48 animate-pulse bg-surface-2/50" />
                  ))
                ) : (
                  discoverPicks.map((item, idx) => (
                    <div key={idx} className="card card-interactive p-5 flex gap-5 group relative overflow-hidden">
                      <div 
                        className="w-24 h-32 flex-shrink-0 relative rounded-lg overflow-hidden shadow-xl cursor-pointer bg-surface-3"
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

                      <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                              {item.type}
                            </span>
                            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-surface-2 text-text-muted border border-surface-3">
                              {item.genre}
                            </span>
                          </div>
                          <h3 className="font-display font-bold text-lg text-text-primary leading-tight mb-2 group-hover:text-accent-primary transition-colors truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-text-muted leading-relaxed line-clamp-2 italic opacity-60">
                            "{item.description}"
                          </p>
                        </div>
                        <button
                          onClick={() => handleAdd(item)}
                          disabled={addedIds.has(item.title)}
                          className={`btn w-full mt-3 !py-1.5 !text-[10px] ${addedIds.has(item.title) ? 'btn-ghost' : 'btn-primary'}`}
                        >
                          {addedIds.has(item.title) ? (
                            <><Check size={14} /> Recorded</>
                          ) : (
                            <><Plus size={14} /> Add Intel</>
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  </div>
);
}

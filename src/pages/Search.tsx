import { useEffect, useState, useCallback, useRef } from 'react';
import { addToLibrary as addToLibraryQuery } from '../lib/reaperhub/queries';
import { getDiscoverPicks } from '../services/geminiService';
import { searchTMDB, discoverTMDB, getTMDBGenres, getTMDBImageUrl, getTMDBItemByTitle } from '../services/tmdbService';
import { searchGames as searchRAWG, mapRAWGToMedia } from '../services/rawgService';
import { Sparkles, Plus, Check, Search as SearchIcon, Filter, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

  if (loading) return <div className="w-full h-full bg-surface-2 animate-pulse" />;
  if (!url) return (
    <div className="w-full h-full bg-surface-2 flex items-center justify-center text-[10px] text-muted text-center p-2 uppercase font-bold">
      {type}
    </div>
  );

  return <img src={url} alt={title} className="w-full h-full object-cover transition-transform group-hover:scale-110" />;
}

type MediaType = 'movie' | 'tv' | 'game' | 'all';
type SortOption = 'popularity.desc' | 'vote_average.desc' | 'release_date.desc';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [discoverPicks, setDiscoverPicks] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(query);
      }, 300);
    }
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [mediaType, setMediaType] = useState<MediaType>('all');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('popularity.desc');
  const [genres, setGenres] = useState<any[]>([]);

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
    const picks = await getDiscoverPicks();
    setDiscoverPicks(picks);
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
          genreId: selectedGenre,
          sortBy: sortBy
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
    
    setResults(data);
    setLoading(false);
  }, [mediaType, selectedGenre, sortBy]);

  // Re-run search when filters change
  useEffect(() => {
    handleSearch(query);
  }, [mediaType, selectedGenre, sortBy, handleSearch]);

  const handleAdd = async (item: any) => {
    const res = await addToLibraryQuery(item.title, item.type);
    if (res.success) {
      setAddedIds(prev => new Set(prev).add(item.title));
      toast.success(`${item.title} added to your library.`);
    } else {
      toast.error("Archive failed. System interference.");
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const clearFilters = () => {
    setMediaType('all');
    setSelectedGenre('all');
    setSortBy('popularity.desc');
  };

  return (
    <div className="space-y-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-bold text-3xl">Search Media</h1>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${showFilters ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-muted hover:text-text'}`}
          >
            <Filter size={18} />
            <span className="text-sm font-bold">Filters</span>
          </button>
        </div>
        
        {showFilters && (
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Media Type</label>
                <div className="flex flex-wrap gap-2">
                  {(['all', 'movie', 'tv', 'game'] as MediaType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setMediaType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${mediaType === t ? 'bg-primary/20 border-primary text-primary' : 'bg-surface-2 border-border text-muted hover:border-text/30'}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Genre</label>
                <select 
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="all">All Genres</option>
                  {genres.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Sort By</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="popularity.desc">Popularity</option>
                  <option value="vote_average.desc">Rating</option>
                  <option value="release_date.desc">Release Date</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={clearFilters}
                className="flex items-center gap-2 text-xs font-bold text-muted hover:text-danger transition-colors"
              >
                <X size={14} />
                Clear All
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {mediaType !== 'all' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/30 text-primary rounded-full text-[10px] font-bold uppercase tracking-tighter">
              Type: {mediaType}
              <X size={10} className="ml-1 cursor-pointer" onClick={() => setMediaType('all')} />
            </span>
          )}
          {selectedGenre !== 'all' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary-2/10 border border-primary-2/30 text-primary-2 rounded-full text-[10px] font-bold uppercase tracking-tighter">
              Genre: {genres.find(g => String(g.id) === String(selectedGenre))?.name}
              <X size={10} className="ml-1 cursor-pointer" onClick={() => setSelectedGenre('all')} />
            </span>
          )}
          {sortBy !== 'popularity.desc' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-success/10 border border-success/30 text-success rounded-full text-[10px] font-bold uppercase tracking-tighter">
              Sort: {sortBy.split('.')[0]}
              <X size={10} className="ml-1 cursor-pointer" onClick={() => setSortBy('popularity.desc')} />
            </span>
          )}
        </div>
        
        <form onSubmit={onSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, series, games..."
              className="w-full bg-surface border border-border rounded-xl p-[14px] pl-12 text-text focus:outline-none focus:border-primary transition-colors"
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

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-surface-2 rounded-2xl animate-pulse border border-border/50"></div>
            ))}
          </div>
        ) : results.length === 0 && query ? (
          <div className="text-center py-20 text-muted bg-surface rounded-[18px] border border-border">
            Nothing found for "{query}".
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
                  <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
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
      </div>

      {/* Discover Section */}
      <section className="space-y-6 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary-2" />
            <h2 className="font-display font-bold text-2xl uppercase tracking-wide">AI Discover</h2>
          </div>
          {!discoverLoading && (
            <button 
              onClick={fetchDiscoverPicks}
              className="text-xs font-bold text-primary hover:text-primary-2 transition-colors uppercase tracking-widest"
            >
              Refresh Picks
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

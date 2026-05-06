import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMediaDetails as getTMDBDetails, getTMDBImageUrl, getSeasonDetails } from '../services/tmdbService';
import { getGameDetails, mapRAWGToMedia } from '../services/rawgService';
import { addToLibrary, removeFromLibrary, updateMediaEntry, getEpisodeWatches, toggleEpisodeWatch } from '../lib/reaperhub/queries';
import { supabase } from '../lib/supabase';
import { Star, Calendar, Plus, Trash2, ChevronLeft, Loader2, Save, ChevronDown, ChevronUp, CheckCircle2, Circle, Play, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import Skeleton from '../components/Skeleton';
import { cn } from '../lib/utils';

const STATUS_OPTIONS = [
  { value: 'plan_to_watch', label: 'Plan to Watch/Play', color: 'text-blue-400' },
  { value: 'watching', label: 'Currently Watching/Playing', color: 'text-yellow-400' },
  { value: 'completed', label: 'Completed', color: 'text-green-400' },
  { value: 'dropped', label: 'Dropped', color: 'text-red-400' },
  { value: 'on_hold', label: 'On Hold', color: 'text-gray-400' },
];

export default function MediaDetail() {
  const { id, type = 'movie' } = useParams<{ id: string; type: string }>();
  const [media, setMedia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inLibrary, setInLibrary] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [localMediaId, setLocalMediaId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [status, setStatus] = useState('plan_to_watch');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [watchedEpisodes, setWatchedEpisodes] = useState<any[]>([]);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());
  const [seasonData, setSeasonData] = useState<Record<number, any>>({});
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    const fetchMetadata = async () => {
      let data: any;
      if (type === 'game') {
        const game = await getGameDetails(id);
        if (game) {
          data = mapRAWGToMedia(game);
          // Standardize fields for detailed view
          data.backdrop_path = game.background_image;
          data.poster_path = game.background_image;
          data.genres = game.genres;
          data.vote_average = game.rating * 2;
        }
      } else {
        data = await getTMDBDetails(id, type as 'movie' | 'tv');
      }

      if (!data) {
        toast.error("Failed to load project details.");
        navigate('/search');
        return;
      }
      setMedia(data);
      setLoading(false);

      // Check if in library
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && id) {
          const { data: libraryItem, error: queryError } = await supabase
            .from('library_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('media_id', id)
            .eq('media_type', type)
            .maybeSingle();
          
          if (queryError) {
            console.error('Library check query error:', queryError);
          } else if (libraryItem) {
            setLocalMediaId(libraryItem.id);
            setInLibrary(true);
            setRating(libraryItem.rating || 0);
            setReview(libraryItem.review || '');
            setStatus(libraryItem.status || 'plan_to_watch');
          }
        }
      } catch (err) {
        console.error('Failed to check library status:', err);
      }
    };

    fetchMetadata();
  }, [id, type, navigate]);

  const handleToggleLibrary = async () => {
    if (!media) return;
    setActionLoading(true);

    try {
      if (inLibrary && localMediaId) {
        const res = await removeFromLibrary(localMediaId);
        if (res.success) {
          setInLibrary(false);
          setLocalMediaId(null);
          toast.success("Successfully purged from your archive.");
        } else {
          toast.error("Purge failed. System interference detected.");
        }
      } else {
        const res = await addToLibrary(media.title || media.name, type, status, {
          overview: media.overview,
          cover_url: type === 'game' ? media.cover_url : getTMDBImageUrl(media.poster_path)
        }, id || '');
        
        if (res.success) {
          setInLibrary(true);
          if (res.data?.id) {
            setLocalMediaId(res.data.id);
          }
          
          if (res.rewards) {
            toast.success(`+${res.rewards.earnedXp} XP! Item added to library!`, { icon: '✨' });
          } else {
            toast.success("Item added to library!");
          }
        } else {
          toast.error("Archive failure. Check your connection.");
        }
      }
    } catch (err) {
      toast.error("Critical error during library operation.");
    } finally {
      setActionLoading(false);
      setShowMenu(false);
    }
  };

  const handleUpdateEntry = async () => {
    if (!localMediaId) return;
    setIsUpdating(true);
    const res = await updateMediaEntry(localMediaId, { rating, review, status });
    if (res.success) {
      toast.success("Entry synchronized with central mainframe.");
    } else {
      toast.error("Sync failure.");
    }
    setIsUpdating(false);
  };

  useEffect(() => {
    if (media && type === 'tv' && id) {
      setSeasons(media.seasons || []);
      getEpisodeWatches(id).then(setWatchedEpisodes);
    }
  }, [media, type, id]);

  const toggleSeasonCollapse = async (seasonNumber: number) => {
    const next = new Set(expandedSeasons);
    if (next.has(seasonNumber)) {
      next.delete(seasonNumber);
    } else {
      next.add(seasonNumber);
      // Fetch episodes if not already loaded
      if (!seasonData[seasonNumber] && id) {
        setLoadingSeasons(true);
        const data = await getSeasonDetails(id, seasonNumber);
        if (data) {
          setSeasonData(prev => ({ ...prev, [seasonNumber]: data }));
        }
        setLoadingSeasons(false);
      }
    }
    setExpandedSeasons(next);
  };

  const isEpisodeWatched = (seasonNum: number, episodeNum: number) => {
    return watchedEpisodes.some(w => w.season_number === seasonNum && w.episode_number === episodeNum);
  };

  const handleToggleEpisode = async (seasonNum: number, episodeNum: number) => {
    if (!id) return;
    
    // Optimistic UI
    const isWatched = isEpisodeWatched(seasonNum, episodeNum);
    if (isWatched) {
      setWatchedEpisodes(prev => prev.filter(w => !(w.season_number === seasonNum && w.episode_number === episodeNum)));
    } else {
      setWatchedEpisodes(prev => [...prev, { season_number: seasonNum, episode_number: episodeNum }]);
    }

    const res = await toggleEpisodeWatch(id, seasonNum, episodeNum);
    if (!res.success) {
      toast.error("Sync error. Pulse signal lost.");
      // Revert
      if (isWatched) {
        setWatchedEpisodes(prev => [...prev, { season_number: seasonNum, episode_number: episodeNum }]);
      } else {
        setWatchedEpisodes(prev => prev.filter(w => !(w.season_number === seasonNum && w.episode_number === episodeNum)));
      }
    }
  };

  const calculateSeasonProgress = (seasonNum: number, totalEpisodes: number) => {
    const watchedInSeason = watchedEpisodes.filter(w => w.season_number === seasonNum).length;
    return {
      watched: watchedInSeason,
      total: totalEpisodes,
      percentage: totalEpisodes > 0 ? (watchedInSeason / totalEpisodes) * 100 : 0
    };
  };

  const calculateOverallProgress = () => {
    if (!media || !seasons.length) return 0;
    const totalEpisodes = seasons.reduce((acc, s) => acc + (s.episode_count || 0), 0);
    const totalWatched = watchedEpisodes.length;
    return totalEpisodes > 0 ? Math.round((totalWatched / totalEpisodes) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto px-4 py-8">
        <Skeleton className="h-[400px] w-full rounded-3xl" />
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-10 w-2/3" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const backdrop = type === 'game' ? media.backdrop_path : getTMDBImageUrl(media.backdrop_path, 'original');
  const poster = type === 'game' ? media.poster_path : getTMDBImageUrl(media.poster_path, 'w500');
  const year = type === 'game' ? media.release_year : new Date(media.release_date || media.first_air_date).getFullYear();

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-40 md:pb-24">
      {/* Hero Backdrop */}
      <div className="relative h-[250px] md:h-[450px] rounded-[32px] md:rounded-[40px] overflow-hidden shadow-2xl group mx-4 md:mx-0">
        {backdrop ? (
          <img 
            src={backdrop} 
            alt="Backdrop" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1200&q=80'; }}
          />
        ) : (
          <div className="w-full h-full bg-surface-2"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 md:top-6 md:left-6 p-2 md:p-3 bg-black/40 backdrop-blur-md rounded-xl md:rounded-2xl text-white hover:bg-primary transition-all shadow-lg border border-white/10 z-10"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 flex items-end justify-between gap-6 z-10">
          <div className="space-y-2 md:space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2 md:px-3 py-0.5 md:py-1 bg-primary rounded-full text-[8px] md:text-xs font-bold uppercase tracking-widest text-black shadow-lg">
                {type.toUpperCase()}
              </span>
              <div className="flex items-center gap-1.5 px-2 md:px-3 py-0.5 md:py-1 bg-black/40 backdrop-blur-md rounded-full text-[8px] md:text-xs font-bold text-primary-2 border border-white/5">
                <Star size={10} className="fill-current" />
                {media.vote_average?.toFixed(1)} / 10
              </div>
            </div>
            <h1 className="font-display font-bold text-2xl md:text-6xl text-white leading-tight drop-shadow-2xl uppercase tracking-tighter italic">
              {media.title || media.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="relative z-20 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 px-4 md:px-0">
        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="hidden md:block relative group rounded-3xl overflow-hidden shadow-2xl border border-border/50">
            {poster ? (
              <img src={poster} alt={media.title || media.name} className="w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=500&q=80'; }} />
            ) : (
              <div className="aspect-[2/3] bg-surface-2 flex items-center justify-center text-muted">No Poster</div>
            )}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          </div>

          <div className="space-y-4">
            <div className="bg-surface-2 border border-border rounded-2xl p-4 md:p-6 space-y-4 relative overflow-hidden group">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                   <label className="text-[9px] font-bold uppercase tracking-widest text-muted">Deploy Status</label>
                   <select
                     value={status}
                     onChange={(e) => setStatus(e.target.value)}
                     className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-primary cursor-pointer transition-all hover:bg-surface-3"
                   >
                     {STATUS_OPTIONS.map(opt => (
                       <option key={opt.value} value={opt.value}>{opt.label}</option>
                     ))}
                   </select>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-3 bg-surface border border-border rounded-xl text-muted hover:text-white transition-all active:scale-95"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <button 
                        onClick={handleToggleLibrary}
                        disabled={actionLoading}
                        className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-danger hover:bg-danger/5 transition-all"
                      >
                        {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Purge Entry
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!inLibrary && (
                <button
                  onClick={handleToggleLibrary}
                  disabled={actionLoading}
                  className="w-full py-4 bg-primary text-black rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                >
                  {actionLoading ? <Loader2 className="animate-spin" /> : <Plus size={16} />}
                  Add to Archive
                </button>
              )}
            </div>
          </div>
          
          <div className="bg-surface border border-border rounded-3xl p-6 space-y-6 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted">Intelligence Report</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Calendar size={14} />
                  Launched
                </div>
                <span className="text-text font-bold">{year}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Star size={14} />
                  Rating
                </div>
                <span className="text-primary-2 font-bold">{media.vote_average?.toFixed(1)} / 10</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 pt-2">
              {media.genres?.map((g: any) => (
                <span key={g.id || g.name} className="px-3 py-1.5 bg-surface-2 border border-border rounded-xl text-xs font-bold text-muted uppercase">
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content Info */}
        <div className="md:col-span-2 space-y-12">
          {inLibrary && (
            <section className="bg-surface-2 border-2 border-primary/20 rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity pointer-events-none">
                <Save size={64} className="text-primary" />
              </div>
              <div className="space-y-8 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-sm md:text-xl font-display font-bold text-white uppercase tracking-tight flex items-center gap-3 whitespace-nowrap">
                    <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                    Personal Appraisal
                  </h2>
                  <div className="flex items-center gap-1">
                    {[...Array(10)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setRating(i + 1)}
                        onMouseEnter={() => setRating(i + 1)}
                        className={`transition-all p-0.5 sm:p-0 ${i + 1 <= rating ? 'text-yellow-400 scale-110' : 'text-muted/20 hover:text-muted'}`}
                      >
                        <Star className="w-5 h-5 sm:w-4.5 sm:h-4.5" fill={i + 1 <= rating ? "currentColor" : "none"} />
                      </button>
                    ))}
                    <span className="ml-2 font-mono font-bold text-yellow-400 text-lg sm:text-base w-6">{rating}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-[0.2em] text-muted px-1">After-Action Review</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Document your findings, operative..."
                    className="w-full bg-surface border border-border rounded-2xl p-4 min-h-[120px] text-sm text-white focus:outline-none focus:border-primary transition-all resize-none italic shadow-inner"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateEntry}
                    disabled={isUpdating}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    <span className="uppercase tracking-widest text-xs">Sync Intel</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
               Synopsis
            </h2>
            <div className="relative">
              <div className={cn(
                "text-lg md:text-xl leading-relaxed text-text/80 font-light first-letter:text-5xl first-letter:font-bold first-letter:text-white first-letter:mr-3 first-letter:float-left transition-all duration-700",
                !showFullOverview && "line-clamp-4 md:line-clamp-none overflow-hidden"
              )}>
                {media.overview || 'No intelligence provided.'}
              </div>
              
              {!showFullOverview && media.overview?.length > 200 && (
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent md:hidden pointer-events-none"></div>
              )}
            </div>

            {media.overview?.length > 200 && (
              <button 
                onClick={() => setShowFullOverview(!showFullOverview)}
                className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em] md:hidden pt-2"
              >
                {showFullOverview ? (
                  <>Collapse Dossier <ChevronUp size={14} /></>
                ) : (
                  <>Expand Dossier <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </section>

          {/* Episode Tracker (TV Only) */}
          {type === 'tv' && seasons.length > 0 && (
            <section className="space-y-8">
              <div className="flex items-center justify-between gap-4 border-b border-border/30 pb-6">
                <div className="space-y-1">
                  <h2 className="text-lg md:text-xl font-display font-bold text-white uppercase tracking-tight flex items-center gap-3">
                    <span className="w-2 h-8 bg-primary-2 rounded-full"></span>
                    Mission Progress
                  </h2>
                  <p className="text-[9px] md:text-xs text-muted font-bold uppercase tracking-widest">Unit deployment across sectors</p>
                </div>
                
                <div className="relative flex items-center justify-center">
                  <svg className="w-16 h-16 md:w-20 md:h-20 transform -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="40%"
                      className="stroke-surface-2 fill-none"
                      strokeWidth="6"
                    />
                    <circle
                      cx="50%"
                      cy="50%"
                      r="40%"
                      className="stroke-primary-2 fill-none transition-all duration-1000 ease-out"
                      strokeWidth="6"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * calculateOverallProgress()) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-display font-bold text-white leading-none">{calculateOverallProgress()}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {seasons.filter(s => s.season_number > 0).map((season) => {
                  const progress = calculateSeasonProgress(season.season_number, season.episode_count);
                  const isExpanded = expandedSeasons.has(season.season_number);
                  const data = seasonData[season.season_number];

                  return (
                    <div key={season.id} className="group bg-surface-2/30 border border-border/50 rounded-[24px] overflow-hidden transition-all hover:border-primary-2/30">
                      <button 
                        onClick={() => toggleSeasonCollapse(season.season_number)}
                        className="w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-primary-2/5 transition-all"
                      >
                        <div className="flex items-center gap-4 md:gap-6">
                          <div className="w-10 h-14 md:w-12 md:h-16 rounded-lg overflow-hidden border border-border/50 flex-shrink-0 bg-surface shadow-lg group-hover:scale-105 transition-transform">
                            {season.poster_path ? (
                              <img src={getTMDBImageUrl(season.poster_path)} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] text-muted">N/A</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-bold text-base md:text-lg text-white uppercase tracking-tight truncate">{season.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[8px] md:text-xs text-muted font-bold uppercase tracking-widest">{season.episode_count} EP</span>
                              <span className="w-1 h-1 bg-border rounded-full"></span>
                              <span className="text-[8px] md:text-xs text-primary-2 font-bold uppercase tracking-widest">{progress.watched} Clear</span>
                            </div>
                            <div className="mt-2 w-full h-1 bg-surface rounded-full overflow-hidden border border-border/10 sm:hidden">
                              <div className="h-full bg-primary-2/60 transition-all duration-1000" style={{ width: `${progress.percentage}%` }} />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 ml-4">
                          <div className="hidden sm:block w-24 h-1.5 bg-surface rounded-full overflow-hidden border border-border/30">
                            <div className="h-full bg-primary-2/60 transition-all duration-1000" style={{ width: `${progress.percentage}%` }} />
                          </div>
                          {isExpanded ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/30 p-4 space-y-2 animate-in slide-in-from-top-4 duration-300">
                          {loadingSeasons && !data ? (
                            <div className="flex flex-col items-center py-8 space-y-4 opacity-50">
                              <Loader2 className="w-6 h-6 animate-spin text-primary-2" />
                              <span className="text-xs font-bold uppercase tracking-widest">Intercepting intel...</span>
                            </div>
                          ) : data?.episodes?.map((ep: any) => {
                            const watched = isEpisodeWatched(season.season_number, ep.episode_number);
                            return (
                              <div key={ep.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-2/50 transition-all border border-transparent hover:border-border/30 group/ep">
                                <button 
                                  onClick={() => handleToggleEpisode(season.season_number, ep.episode_number)}
                                  className={cn(
                                    "p-2 rounded-lg transition-all active:scale-90",
                                    watched ? "text-primary-2 bg-primary-2/10" : "text-muted hover:text-white"
                                  )}
                                >
                                  {watched ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[9px] text-primary-2 font-bold">E{ep.episode_number}</span>
                                    <h4 className={cn("text-xs font-bold truncate transition-all", watched ? "text-white/40 italic line-through" : "text-text")}>
                                      {ep.name}
                                    </h4>
                                  </div>
                                </div>

                                <div className="opacity-0 group-hover/ep:opacity-100 transition-opacity hidden md:block">
                                   <Play size={12} className="text-muted hover:text-primary-2 cursor-pointer" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {type !== 'game' && media.credits?.cast && media.credits.cast.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Field Operatives</h2>
              <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-none snap-x -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
                {media.credits.cast.slice(0, 8).map((person: any) => (
                  <div key={person.id} className="group bg-surface hover:bg-surface-2 border border-border p-3 rounded-2xl transition-all shadow-md flex-shrink-0 w-32 md:w-auto snap-start">
                    <div className="aspect-square rounded-xl overflow-hidden mb-3 grayscale group-hover:grayscale-0 transition-all duration-500 border border-border/50">
                      <img 
                        src={person.profile_path ? getTMDBImageUrl(person.profile_path) : `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=random`} 
                        alt={person.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=random`; }}
                      />
                    </div>
                    <p className="font-bold text-xs md:text-xs truncate text-white">{person.name}</p>
                    <p className="text-[8px] md:text-xs text-muted truncate uppercase tracking-widest">{person.character}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMediaDetails as getTMDBDetails, getTMDBImageUrl } from '../services/tmdbService';
import { getGameDetails, mapRAWGToMedia } from '../services/rawgService';
import { addToLibrary, removeFromLibrary, updateMediaEntry } from '../lib/reaperhub/queries';
import { supabase } from '../lib/supabase';
import { Star, Calendar, Plus, Trash2, ChevronLeft, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import Skeleton from '../components/Skeleton';

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
  const [libraryEntry, setLibraryEntry] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [status, setStatus] = useState('plan_to_watch');
  const [isUpdating, setIsUpdating] = useState(false);
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
      const { data: localItem } = await supabase
        .from('media_items')
        .select(`
          id,
          user_media_entries!inner (
            id,
            status,
            rating,
            review
          )
        `)
        .eq('title', data.title || data.name)
        .eq('type', type)
        .maybeSingle();
      
      if (localItem && localItem.user_media_entries?.[0]) {
        const entry = localItem.user_media_entries[0];
        setLocalMediaId(localItem.id);
        setInLibrary(true);
        setLibraryEntry(entry);
        setRating(entry.rating || 0);
        setReview(entry.review || '');
        setStatus(entry.status || 'plan_to_watch');
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
          setLibraryEntry(null);
          toast.success("Successfully purged from your archive.");
        } else {
          toast.error("Purge failed. System interference detected.");
        }
      } else {
        const res = await addToLibrary(media.title || media.name, type, status, {
          overview: media.overview,
          cover_url: type === 'game' ? media.cover_url : getTMDBImageUrl(media.poster_path)
        });
        if (res.success) {
          setInLibrary(true);
          if (res.id) setLocalMediaId(res.id);
          toast.success("New intel added to your library.");
          // Refresh to get full entry
          window.location.reload(); 
        } else {
          toast.error("Archive failure. Check your connection.");
        }
      }
    } catch (err) {
      toast.error("Critical error during library operation.");
    } finally {
      setActionLoading(false);
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
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      {/* Hero Backdrop */}
      <div className="relative h-[300px] md:h-[450px] rounded-[40px] overflow-hidden shadow-2xl group">
        {backdrop ? (
          <img 
            src={backdrop} 
            alt="Backdrop" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full bg-surface-2"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 p-3 bg-black/40 backdrop-blur-md rounded-2xl text-white hover:bg-primary transition-all shadow-lg border border-white/10"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="absolute bottom-8 left-8 right-8 flex items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-primary rounded-full text-[10px] font-bold uppercase tracking-widest text-black shadow-lg">
                {type.toUpperCase()}
              </span>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-bold text-primary-2 border border-white/5">
                <Star size={12} className="fill-current" />
                {media.vote_average?.toFixed(1)} / 10
              </div>
            </div>
            <h1 className="font-display font-bold text-4xl md:text-6xl text-white leading-none drop-shadow-2xl uppercase tracking-tighter">
              {media.title || media.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-12 px-4">
        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="relative group rounded-3xl overflow-hidden shadow-2xl border border-border/50">
            {poster ? (
              <img src={poster} alt={media.title || media.name} className="w-full object-cover" />
            ) : (
              <div className="aspect-[2/3] bg-surface-2 flex items-center justify-center text-muted">No Poster</div>
            )}
            <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted px-2">Deployment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-primary cursor-pointer transition-all hover:bg-surface-3"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleToggleLibrary}
              disabled={actionLoading}
              className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl ${
                inLibrary 
                  ? 'bg-danger/10 text-danger border border-danger/20 hover:bg-danger hover:text-white' 
                  : 'bg-primary text-black hover:bg-primary/90 shadow-primary/20'
              } disabled:opacity-50`}
            >
              {actionLoading ? (
                <Loader2 className="animate-spin" />
              ) : inLibrary ? (
                <>
                  <Trash2 size={20} />
                  Purge from Archive
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Secure Item
                </>
              )}
            </button>
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
                <span key={g.id || g.name} className="px-3 py-1.5 bg-surface-2 border border-border rounded-xl text-[10px] font-bold text-muted uppercase">
                  {g.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Content Info */}
        <div className="md:col-span-2 space-y-12">
          {inLibrary && (
            <section className="bg-surface-2 border-2 border-primary/20 rounded-[32px] p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                <Save size={64} className="text-primary" />
              </div>
              <div className="space-y-8 relative z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-display font-bold text-white uppercase tracking-tight flex items-center gap-3">
                    <span className="w-2 h-8 bg-primary rounded-full"></span>
                    Personal Appraisal
                  </h2>
                  <div className="flex items-center gap-1">
                    {[...Array(10)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setRating(i + 1)}
                        onMouseEnter={() => setRating(i + 1)}
                        className={`transition-all ${i + 1 <= rating ? 'text-yellow-400 scale-110' : 'text-muted/20 hover:text-muted'}`}
                      >
                        <Star size={18} fill={i + 1 <= rating ? "currentColor" : "none"} />
                      </button>
                    ))}
                    <span className="ml-3 font-mono font-bold text-yellow-400 text-lg w-6">{rating}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">After-Action Review</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Document your findings, operative..."
                    className="w-full bg-surface/50 border border-border rounded-2xl p-4 min-h-[120px] text-sm text-white focus:outline-none focus:border-primary transition-all resize-none italic"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateEntry}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-8 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    Sync Intel
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Synopsis</h2>
            <div className="text-lg md:text-xl leading-relaxed text-muted font-light first-letter:text-4xl first-letter:font-bold first-letter:text-white first-letter:mr-2 first-letter:float-left">
              {media.overview || 'No intelligence provided.'}
            </div>
          </section>

          {type !== 'game' && media.credits?.cast && media.credits.cast.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Operatives</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {media.credits.cast.slice(0, 4).map((person: any) => (
                  <div key={person.id} className="group bg-surface hover:bg-surface-2 border border-border p-3 rounded-2xl transition-all shadow-md">
                    <div className="aspect-square rounded-xl overflow-hidden mb-3 grayscale group-hover:grayscale-0 transition-all duration-500">
                      <img 
                        src={person.profile_path ? getTMDBImageUrl(person.profile_path) : `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=random`} 
                        alt={person.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <p className="font-bold text-xs truncate text-white">{person.name}</p>
                    <p className="text-[10px] text-muted truncate">{person.character}</p>
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

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getLibraryItems } from '../lib/reaperhub/queries';
import { Library as LibraryIcon, Search, Play, Sparkles, Zap, TrendingUp, Filter } from 'lucide-react';
import Skeleton, { MediaCardSkeleton } from '../components/Skeleton';
import { cn } from '../lib/utils';
import { toast } from '../lib/toastUtils';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';

const STATUS_TABS = [
  { id: 'all', label: 'All Intel' },
  { id: 'plan_to_watch', label: 'Plan to Watch' },
  { id: 'watching', label: 'Watching' },
  { id: 'completed', label: 'Completed' },
  { id: 'on_hold', label: 'On Hold' },
  { id: 'dropped', label: 'Dropped' },
];

export default function Library() {
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    getLibraryItems().then(data => {
      setItems(data);
      setFilteredItems(data);
      setLoading(false);
    }).catch(err => {
      console.error('Library fetch error:', err);
      toast.error("Failed to decrypt archives.");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeStatus === 'all') {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter(item => item.status === activeStatus));
    }
  }, [activeStatus, items]);

  const LibrarySkeleton = () => (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-surface-3 pb-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-12 w-40 rounded-xl" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-32 rounded-xl flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        {[...Array(10)].map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'text-accent-purple border-accent-purple/30 bg-accent-purple/10';
      case 'watching': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
      case 'plan_to_watch': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'on_hold': return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
      case 'dropped': return 'text-accent-red border-accent-red/30 bg-accent-red/10';
      default: return 'text-muted border-surface-3 bg-surface-2';
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-24 px-4 md:px-8 bg-bg-base">
       <LibrarySkeleton />
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 md:px-8 relative overflow-hidden bg-bg-base">
      <ScanlineOverlay className="opacity-10" />
      <TacticalGrid className="opacity-5" />

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-surface-3 pb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-accent-purple text-[10px] font-bold uppercase tracking-[0.4em]">
              <Zap size={14} className="fill-current" />
              Archives // Encrypted
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-tighter text-white italic leading-none">
              Dossier
              <span className="ml-4 text-accent-purple text-xl not-italic font-mono align-top opacity-50">[{items.length}]</span>
            </h1>
            <p className="text-muted text-sm font-medium tracking-wide max-w-lg">Accessing classified media repositories. All transmissions are end-to-end encrypted for operative security.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link 
              to="/search" 
              className="btn btn-primary h-12 px-8"
            >
              <Search size={18} />
              Begin Infiltration
            </Link>
          </div>
        </div>

        {/* Status Filters */}
        <div className="sticky top-[80px] z-40 py-4 bg-bg-base/80 backdrop-blur-md -mx-4 px-4">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            <div className="flex-shrink-0 p-2 bg-surface-3 rounded-lg text-accent-purple">
               <Filter size={18} />
            </div>
            <div className="flex items-center gap-2">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatus(tab.id)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all uppercase tracking-[0.2em] border",
                    activeStatus === tab.id
                      ? "bg-accent-purple text-white border-accent-purple shadow-[0_0_15px_rgba(139,92,246,0.3)] scale-105"
                      : "text-muted border-surface-3 hover:text-white hover:bg-surface-3"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "ml-2 font-mono",
                    activeStatus === tab.id ? "text-white/60" : "text-muted/40"
                  )}>
                    {tab.id === 'all' ? items.length : items.filter(i => i.status === tab.id).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="card h-[400px] flex flex-col items-center justify-center text-center p-8 space-y-6 border-dashed border-2 bg-surface-2/20 max-w-3xl mx-auto">
            <div className="w-24 h-24 rounded-full bg-surface-3 flex items-center justify-center text-muted/10 relative">
              <LibraryIcon size={48} />
              <div className="absolute inset-0 rounded-full border border-accent-purple/20 animate-ping" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">No Intel Found</h3>
              <p className="text-sm text-muted max-w-xs mx-auto italic leading-relaxed">
                The archives are currently empty for this frequency. Start tracking targets to populate your dossier.
              </p>
            </div>
            <button 
              onClick={() => navigate('/search')} 
              className="btn btn-secondary h-11 px-8"
            >
               Expand Operations
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {filteredItems.map((item) => {
              const mediaType = item.media_type || item.media_items?.type || 'movie';
              const detailPath = `/media/${mediaType}/${item.media_id || item.media_items?.tmdb_id || item.media_items?.rawg_id || item.id}`;
              
              return (
                <div 
                  key={item.id} 
                  onClick={() => navigate(detailPath)}
                  className="card-interactive group aspect-[2/3] relative overflow-hidden"
                >
                  {/* Poster Image */}
                  {(item.poster_url || item.cover_url || item.media_items?.cover_url) ? (
                    <img loading="lazy"
                      src={item.poster_url || item.cover_url || item.media_items?.cover_url}
                      alt={item.title} 
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-sm text-muted bg-surface-3">
                      <Play className="w-12 h-12 mb-4 opacity-10" />
                      <span className="font-bold uppercase tracking-widest text-[10px]">No Signal</span>
                    </div>
                  )}

                  {/* Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-black/40 pointer-events-none group-hover:via-bg-base/20 transition-all duration-500" />
                  <div className="absolute inset-0 bg-accent-purple/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4 z-20">
                    <span className={cn(
                      "text-[9px] uppercase font-bold px-3 py-1.5 rounded-lg backdrop-blur-md border shadow-2xl tracking-[0.1em]",
                      getStatusColor(item.status)
                    )}>
                      {item.status?.replace(/_/g, ' ') || 'unknown'}
                    </span>
                  </div>

                  {/* Rating Badge */}
                  {item.rating > 0 && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/5 rounded-lg px-2 py-1 flex items-center gap-1.5 text-accent-purple text-[10px] font-bold shadow-lg z-20">
                      <Sparkles size={10} className="fill-current" />
                      {item.rating}
                    </div>
                  )}

                  {/* Title Area */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 z-20 space-y-1 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="text-[9px] text-accent-purple font-bold uppercase tracking-[0.3em] mb-1 opacity-80">
                      {mediaType}
                    </div>
                    <h3 className="font-display font-bold text-lg md:text-xl text-white leading-tight line-clamp-2 italic group-hover:text-accent-purple transition-colors">
                      {item.title || item.media_items?.title || 'Unknown Intel'}
                    </h3>
                  </div>

                  {/* Hover Scanline */}
                  <ScanlineOverlay className="opacity-0 group-hover:opacity-20 transition-opacity" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

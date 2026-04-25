import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getLibraryItems, getCurrentUser } from '../lib/reaperhub/queries';
import { Library as LibraryIcon, Search, Play, Ghost, Sparkles } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { cn } from '../lib/utils';

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
    // Guest mode is allowed, so we don't redirect to login here
    getLibraryItems().then(data => {
      setItems(data);
      setFilteredItems(data);
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
    <div className="space-y-8">
      <Skeleton className="h-10 w-48" />
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex-shrink-0">
            <Skeleton className="h-10 w-24 rounded-xl" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return <LibrarySkeleton />;

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'bg-success/20 text-success border-success/30';
      case 'watching': return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
      case 'plan_to_watch': return 'bg-blue-400/20 text-blue-400 border-blue-400/30';
      case 'on_hold': return 'bg-gray-400/20 text-gray-400 border-gray-400/30';
      case 'dropped': return 'bg-danger/20 text-danger border-danger/30';
      default: return 'bg-surface-2 text-muted border-border';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-8">
        <div className="space-y-1">
          <h1 className="font-display font-bold text-5xl uppercase tracking-tighter text-white italic">
            Archives
            <span className="ml-3 text-primary text-sm not-italic font-mono align-top">{items.length}</span>
          </h1>
          <p className="text-muted text-sm font-medium tracking-wide">Accessing classified media repositories.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            to="/search" 
            className="flex items-center gap-2 px-6 py-3 bg-primary text-black font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 active:scale-95"
          >
            <Search size={18} />
            Infiltrate
          </Link>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
        <div className="flex items-center gap-2 p-1.5 bg-surface-2/50 backdrop-blur-md rounded-[20px] border border-border/50">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStatus(tab.id)}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all uppercase tracking-widest",
                activeStatus === tab.id
                  ? "bg-primary text-black shadow-lg shadow-primary/20 scale-105"
                  : "text-muted hover:text-white hover:bg-white/5"
              )}
            >
              {tab.label}
              <span className={cn(
                "ml-2 text-[10px] tabular-nums",
                activeStatus === tab.id ? "text-black/60" : "text-muted/40"
              )}>
                ({tab.id === 'all' ? items.length : items.filter(i => i.status === tab.id).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-32 space-y-8 bg-surface-2/30 rounded-[40px] border border-dashed border-border border-2 max-w-2xl mx-auto">
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <Ghost className="w-16 h-16 text-muted opacity-10 absolute animate-bounce" />
            <LibraryIcon className="w-12 h-12 text-muted opacity-20" />
          </div>
          <div className="space-y-3">
            <h2 className="font-display font-bold text-2xl text-white uppercase tracking-tight">No intelligence found</h2>
            <p className="text-muted text-sm max-w-xs mx-auto italic leading-relaxed">
              Detection protocols return zero entries for this status. Update your mission parameters or Infiltrate the Database.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {filteredItems.map((item) => {
                    const mediaType = item.media_type || item.media_items?.type || 'movie';
                    const detailPath = `/media/${mediaType}/${item.media_id || item.media_items?.tmdb_id || item.media_items?.rawg_id || item.id}`;
            
            return (
              <div 
                key={item.id} 
                onClick={() => navigate(detailPath)}
                className="relative group rounded-[32px] overflow-hidden bg-surface cursor-pointer touch-manipulation aspect-[2/3] shadow-2xl border border-border/50 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2"
              >
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none"></div>
                
                          {(item.poster_url || item.cover_url || item.media_items?.cover_url) ? (
                  <img 
                                src={item.poster_url || item.cover_url || item.media_items?.cover_url}
                    alt="Cover" 
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted bg-surface-2">
                    <Play className="w-8 h-8 mb-2 opacity-10" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">No Signal</span>
                  </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none z-20"></div>

                {/* Status Badge */}
                <div className="absolute top-4 left-4 z-30">
                  <span className={`text-[9px] md:text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md border ${getStatusColor(item.status)}`}>
                    {item.status?.replace(/_/g, ' ') || 'unknown'}
                  </span>
                </div>

                {/* Rating */}
                {item.rating > 0 && (
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-white/5 rounded-full px-3 py-1 flex items-center gap-1.5 text-yellow-400 text-[10px] md:text-[11px] font-bold shadow-lg z-30">
                    <Sparkles size={10} className="fill-current" />
                    {item.rating}
                  </div>
                )}

                {/* Bottom Info Area */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-30 space-y-1">
                  <div className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] mb-1 drop-shadow-md">
                              {item.media_type || item.media_items?.type || 'media'}
                  </div>
                  <h3 className="font-display font-bold text-xl md:text-2xl text-white leading-tight line-clamp-2 drop-shadow-2xl italic group-hover:text-primary transition-colors" title={item.media_items?.title || 'Unknown'}>
                              {item.title || item.media_items?.title || 'Unknown'}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

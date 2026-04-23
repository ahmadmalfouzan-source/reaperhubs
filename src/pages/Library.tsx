import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLibrary, getCurrentUser } from '../lib/reaperhub/queries';

export default function Library() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) navigate('/login');
    });

    getLibrary().then(data => {
      setItems(data);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) return <div className="text-center py-20 text-muted">Loading library...</div>;

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return 'bg-success/20 text-success';
      case 'playing':
      case 'watching': return 'bg-primary-2/20 text-primary-2';
      case 'dropped': return 'bg-danger/20 text-danger';
      default: return 'bg-surface-2 text-muted';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-3xl">My Library</h1>

      {items.length === 0 ? (
        <div className="text-center py-20 text-muted bg-surface rounded-[18px] border border-border">
          Library is empty.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative group rounded-2xl overflow-hidden bg-surface-2 cursor-pointer touch-manipulation aspect-[2/3] shadow-lg border border-border/50">
              {item.media_items?.cover_url ? (
                <img src={item.media_items.cover_url} alt="Cover" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-xs text-muted bg-surface">
                  <span className="text-4xl mb-2 opacity-50">🎬</span>
                  No Cover
                </div>
              )}

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none"></div>

              {/* Status Badge */}
              <div className="absolute top-3 left-3 z-10">
                <span className={`text-[10px] md:text-xs uppercase font-bold px-2.5 py-1 rounded-full shadow-md backdrop-blur-md ${getStatusColor(item.status)}`}>
                  {item.status || 'unknown'}
                </span>
              </div>

              {/* Rating */}
              {item.rating && (
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1 text-primary-2 text-[10px] md:text-xs font-bold shadow-md">
                  ★ {item.rating}
                </div>
              )}

              {/* Bottom Info Area */}
              <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                <div className="text-[10px] text-primary-2 uppercase tracking-wide font-bold mb-1 shadow-black drop-shadow-md">
                  {item.media_items?.type || 'media'}
                </div>
                <h3 className="font-display font-medium text-lg md:text-xl text-white leading-tight line-clamp-2 drop-shadow-lg" title={item.media_items?.title || 'Unknown'}>
                  {item.media_items?.title || 'Unknown'}
                </h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

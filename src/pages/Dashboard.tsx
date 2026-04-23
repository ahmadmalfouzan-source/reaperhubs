import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardData, getLibraryTitles, addToLibrary } from '../lib/reaperhub/queries';
import { getMediaRecommendations } from '../services/geminiService';
import { Target, Zap, Coins, Compass, Library, Trophy, MessageSquare, BellRing, Sparkles, Plus, Check } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardData().then(async (res) => {
      if (!res.user) {
        navigate('/login');
        return;
      }
      setData(res);
      setLoading(false);
      
      // Fetch recommendations
      setRecLoading(true);
      const watchlist = await getLibraryTitles();
      const recs = await getMediaRecommendations(watchlist);
      setRecommendations(recs);
      setRecLoading(false);
    });
  }, [navigate]);

  const handleAdd = async (item: any) => {
    const res = await addToLibrary(item.title, item.type);
    if (res.success) {
      setAddedIds(prev => new Set(prev).add(item.title));
    }
  };

  if (loading) return <div className="text-center py-20 text-muted">Loading dashboard...</div>;
  if (!data) return null;

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-3xl">Dashboard</h1>
        <div className="text-muted">{data.user.email}</div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-surface border border-border rounded-[18px] p-[20px] border-l-4 border-l-blue-500 shadow-lg">
          <div className="text-muted text-sm mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            Current Level
          </div>
          <div className="font-display font-bold text-4xl text-primary">{data.level}</div>
        </div>
        <div className="bg-surface border border-border rounded-[18px] p-[20px] border-l-4 border-l-purple-500 shadow-lg">
          <div className="text-muted text-sm mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            Total XP
          </div>
          <div className="font-display font-bold text-4xl text-primary-2">{data.xp}</div>
        </div>
        <div className="bg-surface border border-border rounded-[18px] p-[20px] border-l-4 border-l-green-500 shadow-lg">
          <div className="text-muted text-sm mb-2 flex items-center gap-2">
            <Coins className="w-4 h-4 text-green-500" />
            Coins Balance
          </div>
          <div className="font-display font-bold text-4xl text-success">{data.coins}</div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4">
        <Link to="/search" className="flex items-center gap-2 bg-surface hover:bg-surface-2 border border-border rounded-full px-5 py-2.5 text-sm font-bold transition-colors shadow-sm">
          <Compass className="w-4 h-4 text-primary" />
          Browse Media
        </Link>
        <Link to="/library" className="flex items-center gap-2 bg-surface hover:bg-surface-2 border border-border rounded-full px-5 py-2.5 text-sm font-bold transition-colors shadow-sm">
          <Library className="w-4 h-4 text-primary-2" />
          My Library
        </Link>
        <Link to="/leaderboard" className="flex items-center gap-2 bg-surface hover:bg-surface-2 border border-border rounded-full px-5 py-2.5 text-sm font-bold transition-colors shadow-sm">
          <Trophy className="w-4 h-4 text-success" />
          Leaderboard
        </Link>
      </div>

      {/* AI Recommendations Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="font-display font-bold text-2xl uppercase tracking-wide">Smart Recommendations</h2>
        </div>
        
        {recLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[2/3] bg-surface-2 rounded-2xl animate-pulse border border-border/50"></div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-surface-2 border border-border/50 rounded-2xl p-8 text-center text-muted italic">
            Add more to your library for personalized recommendations!
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.map((item, idx) => (
              <div key={idx} className="relative group rounded-2xl overflow-hidden bg-surface-2 aspect-[2/3] shadow-lg border border-border/50 hover:border-primary/30 transition-all duration-300">
                <img 
                  src={`https://images.unsplash.com/photo-${1600000000000 + idx}?w=500&q=80`} 
                  alt={item.title} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                
                <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1">
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary text-black">
                    {item.type}
                  </span>
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/10">
                    {item.genre}
                  </span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 z-10 space-y-2">
                  <h3 className="font-display font-bold text-lg text-white leading-tight line-clamp-2 drop-shadow-md">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-muted line-clamp-2 leading-relaxed h-7">
                    {item.reason}
                  </p>
                  <button
                    onClick={() => handleAdd(item)}
                    disabled={addedIds.has(item.title)}
                    className="w-full py-2 bg-surface hover:bg-white text-text hover:text-black rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 border border-border group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addedIds.has(item.title) ? (
                      <><Check className="w-3 h-3" /> Added</>
                    ) : (
                      <><Plus className="w-3 h-3 group-hover/btn:scale-125 transition-transform" /> Add to Library</>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-display font-bold text-xl mb-4">Recent Posts</h2>
          {data.recentPosts.length === 0 ? (
            <div className="bg-surface border border-border rounded-[18px] p-8 flex flex-col items-center justify-center text-center text-muted h-[200px]">
              <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Nothing here yet.</p>
              <p className="text-xs mt-1">Start tracking to see activity!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentPosts.map((post: any) => (
                <div key={post.id} className="bg-surface border border-border rounded-[18px] p-[20px]">
                  <p className="mb-2">{post.content}</p>
                  <p className="text-xs text-muted">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-display font-bold text-xl mb-4">Recent Notifications</h2>
          {data.notifications.length === 0 ? (
            <div className="bg-surface border border-border rounded-[18px] p-8 flex flex-col items-center justify-center text-center text-muted h-[200px]">
              <BellRing className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">You are all caught up.</p>
              <p className="text-xs mt-1">No new notifications.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.notifications.map((notif: any) => (
                <div key={notif.id} className="bg-surface border border-border rounded-[18px] p-[20px] relative">
                  {!notif.is_read && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]"></div>
                  )}
                  <div className={!notif.is_read ? 'pl-4' : ''}>
                    <p>{notif.content}</p>
                    <p className="text-xs text-muted mt-1">{new Date(notif.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


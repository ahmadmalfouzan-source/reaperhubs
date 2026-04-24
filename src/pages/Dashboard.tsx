import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardData, getLibraryTitles, addToLibrary } from '../lib/reaperhub/queries';
import { getMediaRecommendations } from '../services/geminiService';
import { searchGames } from '../services/rawgService';
import { getTMDBItemByTitle, getTMDBImageUrl } from '../services/tmdbService';
import { Target, Zap, Coins, Compass, Library, Trophy, MessageSquare, BellRing, Sparkles, Plus, Check, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import Skeleton from '../components/Skeleton';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await getDashboardData();
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
      
      // Enhance recommendations with TMDB/RAWG posters
      const enhancedRecs = await Promise.all(recs.map(async (item: any) => {
        if (item.type === 'game') {
          const gameResults = await searchGames(item.title);
          const topGame = gameResults?.[0];
          return { 
            ...item, 
            poster: topGame?.background_image || `https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&q=80`,
            tmdbId: topGame?.id
          };
        }
        const tmdbItem = await getTMDBItemByTitle(item.title, item.type);
        return { 
          ...item, 
          poster: getTMDBImageUrl(tmdbItem?.poster_path, 'w500'),
          tmdbId: tmdbItem?.id
        };
      }));
      
      setRecommendations(enhancedRecs);
      setRecLoading(false);
    } catch (err) {
      console.error('Dashboard error:', err);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleAdd = async (item: any) => {
    const res = await addToLibrary(item.title, item.type);
    if (res.success) {
      setAddedIds(prev => new Set(prev).add(item.title));
      toast.success(`${item.title} archived successfully.`);
    } else {
      toast.error("Archive failed. System interference.");
    }
  };

  const DashboardSkeleton = () => (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <div key={i}><Skeleton className="h-32 w-full rounded-[24px]" /></div>)}
      </div>
      <div className="flex gap-4">
        {[...Array(3)].map((_, i) => <div key={i}><Skeleton className="h-10 w-32 rounded-full" /></div>)}
      </div>
      <section className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i}><Skeleton className="aspect-[2/3] w-full rounded-2xl" /></div>)}
        </div>
      </section>
    </div>
  );

  if (loading) return <DashboardSkeleton />;
  if (!data) return null;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-border/50 pb-6">
        <div className="space-y-1">
          <h1 className="font-display font-bold text-4xl uppercase tracking-tighter text-white">System Overview</h1>
          <p className="text-muted font-medium text-sm">Welcome back, operative.</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Access Terminal</div>
          <div className="text-muted font-mono">{data?.user?.email}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="group bg-surface hover:bg-surface-2 border border-border rounded-[24px] p-6 border-l-4 border-l-blue-500 shadow-xl transition-all duration-300">
          <div className="text-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            Clearance Level
          </div>
          <div className="font-display font-bold text-5xl text-white group-hover:text-blue-400 transition-colors">{data.level}</div>
          <div className="mt-4 w-full bg-border/30 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-full w-[65%]" />
          </div>
        </div>
        <div className="group bg-surface hover:bg-surface-2 border border-border rounded-[24px] p-6 border-l-4 border-l-purple-500 shadow-xl transition-all duration-300">
          <div className="text-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500 fill-purple-500/20" />
            Current XP
          </div>
          <div className="font-display font-bold text-5xl text-white group-hover:text-purple-400 transition-colors">{data.xp}</div>
          <p className="text-[10px] text-muted font-bold mt-4 uppercase tracking-widest">Next Evolution: 2,500 XP</p>
        </div>
        <div className="group bg-surface hover:bg-surface-2 border border-border rounded-[24px] p-6 border-l-4 border-l-green-500 shadow-xl transition-all duration-300">
          <div className="text-muted text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Coins className="w-4 h-4 text-green-500 fill-green-500/20" />
            Credit Balance
          </div>
          <div className="font-display font-bold text-5xl text-white group-hover:text-green-400 transition-colors uppercase">{data.coins}</div>
          <p className="text-[10px] text-muted font-bold mt-4 uppercase tracking-widest">Market is active</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4">
        {[
          { to: "/search", icon: <Compass className="w-5 h-5 text-blue-500" />, label: "Infiltrate" },
          { to: "/library", icon: <Library className="w-5 h-5 text-purple-500" />, label: "Archive" },
          { to: "/leaderboard", icon: <Trophy className="w-5 h-5 text-green-500" />, label: "Vanguard" },
        ].map((link) => (
          <Link 
            key={link.to}
            to={link.to} 
            className="flex items-center gap-3 bg-surface hover:bg-surface-2 border border-border rounded-2xl px-6 py-3.5 text-xs font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 border-b-4 border-b-border active:border-b-0 active:translate-y-1"
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>

      {/* AI Recommendations Section */}
      <section className="space-y-6 relative">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-[100px] pointer-events-none"></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display font-bold text-2xl uppercase tracking-tighter text-white">Smart Intelligence</h2>
              <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em]">Personalized recommendations</p>
            </div>
          </div>
        </div>
        
        {recLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[2/3] w-full rounded-3xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-surface/50 border border-dashed border-border rounded-3xl p-12 text-center group">
            <Sparkles className="w-12 h-12 text-muted mx-auto mb-4 opacity-20 group-hover:opacity-40 transition-opacity" />
            <p className="text-muted italic text-sm">Add more data points to your archive for advanced profiling.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((item, idx) => (
              <div 
                key={idx} 
                className="relative group rounded-3xl overflow-hidden bg-surface shadow-2xl border border-border/50 hover:border-primary/50 transition-all duration-500 transform hover:-translate-y-2 cursor-pointer"
                onClick={() => item.tmdbId ? navigate(`/media/${item.type === 'game' ? 'game' : item.type}/${item.tmdbId}`) : navigate('/search')}
              >
                <div className="aspect-[2/3] relative">
                  {item.poster ? (
                    <img 
                      src={item.poster} 
                      alt={item.title} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface-2 flex items-center justify-center text-muted">No Intelligence</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                  
                  <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                    <span className="text-[8px] uppercase font-bold px-2.5 py-1 rounded-full bg-primary text-black shadow-lg">
                      {item.type}
                    </span>
                    <span className="text-[8px] uppercase font-bold px-2.5 py-1 rounded-full bg-black/80 text-white border border-white/10 backdrop-blur-md">
                      {item.genre}
                    </span>
                  </div>
                </div>

                <div className="p-5 z-10 space-y-3 bg-gradient-to-b from-surface/80 to-surface backdrop-blur-sm">
                  <h3 className="font-display font-medium text-lg text-white leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-muted line-clamp-2 leading-relaxed h-8 font-medium">
                    {item.reason}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(item);
                      }}
                      disabled={addedIds.has(item.title)}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border shadow-lg active:scale-95",
                        addedIds.has(item.title)
                          ? "bg-success/10 border-success/20 text-success"
                          : "bg-surface-2 border-border text-text hover:bg-white hover:text-black group-hover:border-primary/50"
                      )}
                    >
                      {addedIds.has(item.title) ? (
                        <><Check className="w-3.5 h-3.5" /> Archived</>
                      ) : (
                        <><Plus className="w-3.5 h-3.5" /> Archive</>
                      )}
                    </button>
                    <button className="p-3 bg-surface-2 border border-border rounded-xl text-muted hover:text-primary transition-colors">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-10">
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-2" />
            <h2 className="font-display font-bold text-xl uppercase tracking-tighter">Transmission Logs</h2>
          </div>
          {data.recentPosts.length === 0 ? (
            <div className="bg-surface/50 border border-dashed border-border rounded-[32px] p-12 flex flex-col items-center justify-center text-center text-muted h-[240px]">
              <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">System Silence</p>
              <p className="text-[10px] mt-2 max-w-[180px]">Initialize communications via the Community Feed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentPosts.map((post: any) => (
                <div key={post.id} className="group bg-surface hover:bg-surface-2 border border-border rounded-[24px] p-6 transition-all duration-300 shadow-lg hover:border-primary-2/30">
                  <p className="text-sm leading-relaxed mb-4 text-muted group-hover:text-text transition-colors">{post.content}</p>
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted/60">
                    <span>Alpha Sector</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-danger" />
            <h2 className="font-display font-bold text-xl uppercase tracking-tighter">Priority Intel</h2>
          </div>
          {data.notifications.length === 0 ? (
            <div className="bg-surface/50 border border-dashed border-border rounded-[32px] p-12 flex flex-col items-center justify-center text-center text-muted h-[240px]">
              <BellRing className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">Frequency Clear</p>
              <p className="text-[10px] mt-2 max-w-[180px]">No immediate threats or intel updates recorded.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.notifications.map((notif: any) => (
                <div key={notif.id} className={cn(
                  "group bg-surface hover:bg-surface-2 border border-border rounded-[24px] p-6 relative transition-all duration-300 shadow-lg",
                  !notif.is_read ? "border-danger/30 bg-danger/5" : "opacity-60"
                )}>
                  {!notif.is_read && (
                    <div className="absolute top-6 right-6 w-2 h-2 rounded-full bg-danger shadow-[0_0_8px_var(--color-danger)] animate-pulse"></div>
                  )}
                  <p className={cn("text-sm leading-relaxed mb-4", !notif.is_read ? "text-text font-medium" : "text-muted")}>
                    {notif.content}
                  </p>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted/60">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


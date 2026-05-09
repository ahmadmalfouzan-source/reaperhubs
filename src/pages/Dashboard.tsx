import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getDashboardData } from '../lib/reaperhub/queries';
import { getTrendingTMDB, getTMDBImageUrl } from '../services/tmdbService';
import { 
  Target, Zap, Coins, Library, Trophy, BellRing, 
  Play, Sparkles, ChevronRight, Activity, Cpu, Shield, MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import Skeleton, { MediaCardSkeleton } from '../components/Skeleton';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recLoading, setRecLoading] = useState(false);
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
      
      setRecLoading(true);
      const trending = await getTrendingTMDB('all', 'day');
      
      const mappedRecs = trending.slice(0, 4).map((item: any) => ({
        title: item.title || item.name,
        type: item.media_type,
        genre: 'Trending',
        reason: item.overview,
        poster: getTMDBImageUrl(item.poster_path, 'w500'),
        tmdbId: item.id
      }));
      
      setRecommendations(mappedRecs);
      setRecLoading(false);
    } catch (err) {
      console.error('Dashboard error:', err);
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Combat XP', value: data.xp.toLocaleString(), icon: <Zap size={18} />, color: 'text-accent-primary' },
      { label: 'Level', value: `LVL ${data.level}`, icon: <Trophy size={18} />, color: 'text-accent-warning' },
      { label: 'Credits', value: data.coins.toLocaleString(), icon: <Coins size={18} />, color: 'text-accent-primary' },
      { label: 'Intel', value: data.notifications.length, icon: <BellRing size={18} />, color: 'text-accent-secondary' },
    ];
  }, [data]);

  const DashboardSkeleton = () => (
    <div className="space-y-12 py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-surface-2 pb-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-12 w-48 rounded-xl" />
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-6">
             <Skeleton className="h-8 w-48" />
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => <MediaCardSkeleton key={i} />)}
             </div>
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-8 w-full rounded-2xl" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen pt-8">
       <DashboardSkeleton />
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <ScanlineOverlay />
      <TacticalGrid />

      <div className="relative z-10 space-y-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-surface-2 pb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-accent-primary text-[10px] font-bold uppercase tracking-[0.4em]">
              <Cpu size={14} className="animate-pulse" />
              Mainframe Uplink: Stable
            </div>
            <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-tighter text-text-primary italic leading-none">
              Command Center
            </h1>
            <p className="text-text-muted text-sm font-medium tracking-wide max-w-lg italic">
              Status update: All systems operational. Operative <span className="text-text-primary font-bold">{data?.user?.user_metadata?.username || 'Ahmad'}</span> signal identified.
            </p>
          </div>
          
          <div className="bg-surface-2/50 backdrop-blur-md border border-surface-3 px-6 py-3 rounded-xl shadow-glow-primary/5">
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent-primary mb-1">Authenticated Terminal</div>
            <div className="text-text-muted font-mono text-xs truncate max-w-[200px]">
              {data?.user?.email}
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="card card-interactive p-6 flex flex-col gap-2 group">
              <div className={cn("absolute top-0 right-0 p-4 opacity-[0.05] transition-all duration-500 scale-[2] group-hover:scale-[2.5] group-hover:rotate-12", stat.color)}>
                {stat.icon}
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className={cn("p-2.5 rounded-xl transition-all duration-500 bg-surface-3/50", stat.color)}>
                  {stat.icon}
                </div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">{stat.label}</span>
              </div>
              <div className="mt-4 relative z-10">
                <div className="text-3xl font-display font-bold text-text-primary group-hover:text-accent-primary transition-colors">
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {/* Recommendations */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-surface-2 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent-primary/10 rounded-lg">
                    <Activity className="w-5 h-5 text-accent-primary" />
                  </div>
                  <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-tighter text-text-primary">Priority Intel</h2>
                </div>
                <Link to="/search" className="text-[10px] uppercase tracking-widest flex items-center gap-2 group text-text-muted hover:text-accent-primary transition-colors font-bold">
                  Scan Network <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            
              {recLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => <MediaCardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {recommendations.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="card card-interactive group aspect-[2/3] relative overflow-hidden cursor-pointer"
                      onClick={() => item.tmdbId && navigate(`/media/${item.type}/${item.tmdbId}`)}
                    >
                      <img 
                        src={item.poster} 
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bg-base via-transparent to-black/40" />
                      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                        <div className="text-[9px] font-bold text-accent-primary uppercase tracking-[0.2em] mb-1 opacity-80">
                          {item.type === 'movie' ? 'Cinematic' : 'Broadcast'}
                        </div>
                        <h3 className="font-bold text-text-primary text-sm md:text-base leading-tight italic truncate">{item.title}</h3>
                      </div>
                      <div className="absolute top-3 right-3 p-1.5 bg-bg-elevated/80 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 border border-surface-3">
                        <Sparkles size={14} className="text-accent-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Mission Log */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-surface-2 pb-4">
                <div className="p-2 bg-surface-3 rounded-lg">
                  <Target className="w-5 h-5 text-accent-primary" />
                </div>
                <h2 className="font-display font-bold text-2xl md:text-3xl uppercase tracking-tighter text-text-primary">Mission History</h2>
              </div>
              
              {data.recentPosts.length === 0 ? (
                <div className="card h-[300px] flex flex-col items-center justify-center text-center p-8 space-y-6 bg-surface-2/20 border-dashed">
                  <div className="w-20 h-20 rounded-full bg-surface-3 flex items-center justify-center text-text-muted/10 relative">
                    <Library size={32} />
                    <div className="absolute inset-0 rounded-full border border-accent-primary/20 animate-ping" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold uppercase tracking-widest text-text-primary">Archive Empty</h3>
                    <p className="text-sm text-text-muted max-w-xs mx-auto italic">
                      No tactical engagements recorded. Initialize tracking to populate your history.
                    </p>
                  </div>
                  <Link to="/search" className="btn btn-secondary h-10 px-6 text-[10px]">
                    Launch Reconnaissance
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                   {data.recentPosts.map((post: any) => (
                      <div key={post.id} className="card card-interactive p-5 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center border border-surface-3 text-accent-primary">
                              <MessageSquare size={20} />
                           </div>
                           <div>
                              <p className="text-text-primary font-medium line-clamp-1 italic">"{post.body}"</p>
                              <span className="text-[9px] font-mono text-text-muted uppercase tracking-widest">
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                           </div>
                        </div>
                        <button onClick={() => navigate('/feed')} className="btn btn-ghost !p-2 rounded-lg opacity-0 group-hover:opacity-100">
                           <ChevronRight size={18} />
                        </button>
                      </div>
                   ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar Notifications */}
          <div className="space-y-8 h-fit lg:sticky lg:top-24">
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-surface-2 pb-4">
                <div className="p-2 bg-accent-secondary/10 rounded-lg">
                  <Shield className="w-5 h-5 text-accent-secondary" />
                </div>
                <h2 className="font-display font-bold text-2xl uppercase tracking-tighter text-text-primary">Tactical Intel</h2>
              </div>
              
              {data.notifications.length === 0 ? (
                <div className="card p-10 flex flex-col items-center justify-center text-center text-text-muted min-h-[350px] relative overflow-hidden bg-surface-2/10">
                  <div className="absolute inset-0 opacity-[0.03] rotate-12 scale-150 pointer-events-none">
                    <BellRing size={200} />
                  </div>
                  <BellRing className="w-16 h-16 mb-6 opacity-5" />
                  <div className="space-y-2 relative z-10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-primary">Frequency Clear</p>
                    <p className="text-sm italic opacity-60">No immediate threats or intel updates recorded in this sector.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.notifications.map((notif: any) => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "card p-5 relative transition-all duration-300 border-l-4",
                        !notif.is_read ? "border-l-accent-secondary bg-accent-secondary/5" : "border-l-surface-3 bg-surface-2/30"
                      )}
                    >
                      <div className="space-y-3">
                        <p className={cn(
                          "text-xs leading-relaxed italic", 
                          !notif.is_read ? "text-text-primary font-medium" : "text-text-muted"
                        )}>
                          "{notif.content}"
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-text-muted/60">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                          {!notif.is_read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-secondary shadow-glow-secondary animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <Link to="/notifications" className="btn btn-ghost w-full py-3 text-[10px]">
                    Decrypt All History
                  </Link>
                </div>
              )}
            </section>
            
            {/* Quick Actions */}
            <section className="card p-6 bg-accent-primary/5 border-accent-primary/20 space-y-4">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-primary">Direct Commands</h3>
               <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => navigate('/settings')} className="btn btn-ghost h-10 text-[9px]">
                    Config
                  </button>
                  <button onClick={() => navigate('/profile')} className="btn btn-ghost h-10 text-[9px]">
                    Dossier
                  </button>
               </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}


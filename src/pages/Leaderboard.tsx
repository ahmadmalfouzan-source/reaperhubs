import { useEffect, useState } from 'react';
import { getLeaderboard } from '../lib/reaperhub/queries';
import { Trophy, Medal, User, Zap, Coins, Info, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { MediaCardSkeleton } from '../components/Skeleton';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';

export default function Leaderboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]';
    if (index === 1) return 'text-slate-300 drop-shadow-[0_0_12px_rgba(203,213,225,0.6)]';
    if (index === 2) return 'text-amber-600 drop-shadow-[0_0_12px_rgba(180,83,9,0.6)]';
    return 'text-muted/40';
  };

  if (loading) {
    return (
      <div className="space-y-12 max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-4">
          <div className="h-12 w-64 bg-surface-2 animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-surface-2 animate-pulse rounded-lg" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 w-full bg-surface-2 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <TacticalGrid />
      <ScanlineOverlay opacity={0.03} />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border/50 pb-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-primary/10 rounded-full border border-accent-primary/20 text-[10px] font-bold text-accent-primary uppercase tracking-[0.2em]">
              <Trophy size={12} /> Global Rankings
            </div>
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl uppercase tracking-tighter text-text-primary italic">
              Hall of Fame
            </h1>
            <p className="text-text-muted text-sm font-medium max-w-md italic">
              Monitoring the top field operatives in the collective. Only the elite secure a spot in the transmission.
            </p>
          </div>
          
          <div className="card p-6 border-accent-primary/20 bg-accent-primary/5 max-w-sm shadow-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-primary/20 rounded-xl text-accent-primary">
                <Info size={20} />
              </div>
              <p className="text-[10px] text-text-muted font-bold uppercase tracking-[0.15em] leading-relaxed italic">
                XP is earned via tracking,<br />communications & objectives.
              </p>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden shadow-5 relative border-surface-3">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/5 blur-[100px] pointer-events-none"></div>
          
          {data.length === 0 ? (
            <div className="text-center py-32 space-y-8">
              <div className="w-24 h-24 bg-surface-2 rounded-full flex items-center justify-center mx-auto border border-surface-3 group overflow-hidden relative">
                <TacticalGrid />
                <Search className="w-10 h-10 text-text-muted opacity-20 group-hover:scale-110 transition-transform relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-2xl text-text-primary uppercase tracking-tight italic">No operatives detected</h3>
                <p className="text-text-muted text-sm italic">The leaderboard is currently offline. Be the first to secure a spot.</p>
              </div>
              <Link to="/search" className="btn btn-primary px-10">
                Start Tracking
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-2/30 border-b border-surface-3">
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">Rank</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted">Agent</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted text-center">Clearance</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted text-right">XP</th>
                    <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-text-muted text-right">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-3">
                  {data.map((item, index) => {
                    const user = Array.isArray(item.users) ? item.users[0] : item.users;
                    const coins = Array.isArray(item.user_coins) ? item.user_coins[0] : item.user_coins;
                    
                    return (
                      <tr key={item.user_id} className="hover:bg-accent-primary/5 transition-all duration-300 group">
                        <td className="px-8 py-8 font-display font-bold text-2xl">
                          <div className="flex items-center gap-3">
                             {index < 3 ? (
                               <Medal size={28} className={getMedalColor(index)} />
                             ) : (
                               <span className="text-text-muted/20 w-7 text-center">{index + 1}</span>
                             )}
                          </div>
                        </td>
                        <td className="px-8 py-8">
                          <Link to={`/profile/${user?.username}`} className="flex items-center gap-4 group/user">
                            <div className={cn(
                               "w-12 h-12 rounded-2xl bg-surface-2 border border-surface-3 overflow-hidden flex-shrink-0 flex items-center justify-center transition-all duration-500 group-hover/user:shadow-glow-primary group-hover/user:border-accent-primary/50",
                               index === 0 && "border-accent-warning/50"
                            )}>
                              {user?.avatar_url ? (
                                <img loading="lazy" src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover"  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
                              ) : (
                                <User className="w-6 h-6 text-text-muted/40 group-hover/user:text-accent-primary transition-colors" />
                              )}
                            </div>
                            <div>
                              <p className="font-display font-bold text-lg leading-tight transition-colors group-hover/user:text-accent-primary drop-shadow-sm uppercase tracking-tight italic">
                                {user?.username || 'Redacted Agent'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 bg-accent-success rounded-full animate-pulse"></span>
                                <span className="text-[9px] text-text-muted font-bold uppercase tracking-widest italic">Active Operative</span>
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-8 py-8 text-center">
                          <span className="px-4 py-1.5 bg-surface-2 rounded-xl font-display text-xl text-accent-primary font-bold border border-surface-3 transition-all group-hover:border-accent-primary group-hover:shadow-glow-primary">
                            {item.level || 1}
                          </span>
                        </td>
                        <td className="px-8 py-8 text-right">
                          <div className="inline-flex items-center gap-1.5 text-accent-primary font-bold group-hover:scale-110 transition-transform origin-right">
                            <Zap size={14} className="fill-current" />
                            {item.xp?.toLocaleString() || 0}
                          </div>
                        </td>
                        <td className="px-8 py-8 text-right">
                          <div className="inline-flex items-center gap-1.5 text-accent-success font-bold font-mono">
                            <Coins size={14} className="fill-current opacity-40" />
                            {coins?.balance?.toLocaleString() || 0}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

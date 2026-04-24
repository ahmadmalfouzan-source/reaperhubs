import { useEffect, useState } from 'react';
import { getLeaderboard } from '../lib/reaperhub/queries';
import { Trophy, Medal, User, Zap, Coins, Info, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import Skeleton from '../components/Skeleton';

export default function Leaderboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  const LeaderboardSkeleton = () => (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="bg-surface border border-border rounded-[32px] overflow-hidden">
        <div className="p-8 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i}><Skeleton className="h-16 w-full rounded-2xl" /></div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) return <LeaderboardSkeleton />;

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]';
    if (index === 1) return 'text-slate-300 drop-shadow-[0_0_12px_rgba(203,213,225,0.6)]';
    if (index === 2) return 'text-amber-600 drop-shadow-[0_0_12px_rgba(180,83,9,0.6)]';
    return 'text-muted/40';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2">
            Global Rankings
          </div>
          <h1 className="font-display font-bold text-4xl md:text-5xl uppercase tracking-tighter flex items-center gap-4 text-white">
            <Trophy className="w-12 h-12 text-primary" />
            Hall of Fame
          </h1>
          <p className="text-muted font-medium">Monitoring the top field operatives in the collective.</p>
        </div>
        
        <div className="bg-surface-2/50 backdrop-blur-md border border-border rounded-2xl px-6 py-4 flex items-center gap-4 shadow-xl">
          <Info size={20} className="text-primary-2" />
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-relaxed">
            XP is earned via tracking,<br />communications & achievements.
          </p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-[40px] overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none"></div>
        
        {data.length === 0 ? (
          <div className="text-center py-32 space-y-6">
            <div className="w-24 h-24 bg-surface-2 rounded-full flex items-center justify-center mx-auto border border-border group">
              <Search className="w-10 h-10 text-muted opacity-20 group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-display font-bold text-white uppercase tracking-tight">No operatives detected</p>
              <p className="text-muted text-sm italic">The leaderboard is currently offline. Be the first to secure a spot.</p>
            </div>
            <Link to="/search" className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-black font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg active:scale-95">
              Start Tracking
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-2/30 border-b border-border/50">
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Rank</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-muted">Agent</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-muted text-center">Clearance</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-muted text-right">XP</th>
                  <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.3em] text-muted text-right">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {data.map((item, index) => {
                  const user = Array.isArray(item.users) ? item.users[0] : item.users;
                  const coins = Array.isArray(item.user_coins) ? item.user_coins[0] : item.user_coins;
                  
                  return (
                    <tr key={item.user_id} className="hover:bg-primary/5 transition-all duration-300 group">
                      <td className="px-8 py-8 font-display font-bold text-2xl">
                        <div className="flex items-center gap-3">
                          {index < 3 ? (
                            <Medal size={28} className={getMedalColor(index)} />
                          ) : (
                            <span className="text-muted/20 w-7 text-center">{index + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <Link to={`/profile/${user?.username}`} className="flex items-center gap-4 group/user">
                          <div className={cn(
                            "w-12 h-12 rounded-2xl bg-surface-2 border border-border overflow-hidden flex-shrink-0 flex items-center justify-center transition-all duration-500 group-hover/user:shadow-[0_0_20px_rgba(124,92,255,0.3)] group-hover/user:border-primary-2/50",
                            index === 0 && "border-yellow-500/50"
                          )}>
                            {user?.avatar_url ? (
                              <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-primary/40 group-hover/user:text-primary-2 transition-colors" />
                            )}
                          </div>
                          <div>
                            <p className="font-display font-bold text-lg leading-tight transition-colors group-hover/user:text-primary-2 drop-shadow-sm uppercase tracking-tight">
                              {user?.username || 'Redacted Agent'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                              <span className="text-[9px] text-muted font-bold uppercase tracking-widest">Active Operative</span>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className="px-4 py-1.5 bg-surface-2 rounded-xl font-display text-xl text-primary font-bold border border-border transition-all group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(0,183,255,0.2)]">
                          {item.level || 1}
                        </span>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className="inline-flex items-center gap-1.5 text-primary-2 font-bold group-hover:scale-110 transition-transform origin-right">
                          <Zap size={14} className="fill-current" />
                          {item.xp?.toLocaleString() || 0}
                        </div>
                      </td>
                      <td className="px-8 py-8 text-right">
                        <div className="inline-flex items-center gap-1.5 text-success font-bold font-mono">
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
  );
}

import { useEffect, useState } from 'react';
import { getLeaderboard } from '../lib/reaperhub/queries';
import { Trophy, Medal, User, Zap, Coins } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Leaderboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard().then((res) => {
      setData(res);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-center py-20 text-muted">Loading leaderboard...</div>;

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]';
    if (index === 1) return 'text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]';
    if (index === 2) return 'text-amber-600 drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]';
    return 'text-muted';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-4xl uppercase tracking-tight flex items-center gap-3">
            <Trophy className="w-10 h-10 text-primary" />
            Global Hall of Fame
          </h1>
          <p className="text-muted mt-2">The most dedicated reapers tracking their journey.</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-[24px] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted">Rank</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted">User</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted text-center">Level</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted text-right">XP</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted text-right">Coins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.map((item, index) => {
                const user = Array.isArray(item.users) ? item.users[0] : item.users;
                const coins = Array.isArray(item.user_coins) ? item.user_coins[0] : item.user_coins;
                
                return (
                  <tr key={item.user_id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-6 font-display font-bold text-2xl">
                      <div className="flex items-center gap-2">
                        {index < 3 ? (
                          <Medal size={24} className={getMedalColor(index)} />
                        ) : (
                          <span className="text-muted/50 pl-1">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <Link to={`/profile/${user?.username}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        <div className="w-10 h-10 rounded-full bg-surface-2 border border-border overflow-hidden flex-shrink-0">
                          {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary-2 text-xs font-bold uppercase">
                              {user?.username?.[0] || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-base leading-tight">{user?.username || 'Unknown'}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className="px-3 py-1 bg-surface-2 rounded-lg font-display text-lg text-primary-2 border border-border/50">
                        {item.level}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="inline-flex items-center gap-1 text-primary font-bold">
                        <Zap size={14} />
                        {item.xp.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="inline-flex items-center gap-1 text-success font-bold">
                        <Coins size={14} />
                        {coins?.balance?.toLocaleString() || 0}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

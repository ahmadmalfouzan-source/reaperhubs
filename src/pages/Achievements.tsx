import { useEffect, useState } from 'react';
import { getAllAchievements, getUserAchievements, getCurrentUser } from '../lib/reaperhub/queries';
import { Award, Lock, CheckCircle2, Zap, Trophy, Target, MessageSquare, Archive, Swords, History } from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export default function Achievements() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [currentUser, allAchs] = await Promise.all([
        getCurrentUser(),
        getAllAchievements()
      ]);
      
      setUser(currentUser);
      setAchievements(allAchs);
      
      if (currentUser) {
        const userAchs = await getUserAchievements(currentUser.id);
        setUnlockedIds(new Map(userAchs.map((ua: any) => [ua.achievement_id, ua.unlocked_at || ua.created_at])));
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const categories = [
    { id: 'tracking', label: 'Field Ops', icon: <Target size={16} /> },
    { id: 'social', label: 'Neural Link', icon: <MessageSquare size={16} /> },
    { id: 'economy', label: 'Logistics', icon: <Zap size={16} /> },
    { id: 'special', label: 'Vanguard', icon: <Trophy size={16} /> },
  ];

  const unlockedCount = achievements.filter(a => unlockedIds.has(a.id)).length;
  const progressPercentage = achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-12 max-w-6xl mx-auto px-4 py-12">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-48 rounded-[32px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-6xl mx-auto px-4 py-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border/50 pb-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
            Service Record
          </div>
          <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl uppercase tracking-tighter text-white italic">
            Milestones
          </h1>
          <p className="text-muted text-sm font-medium max-w-md italic">
            Monitoring operative progress across all tactical sectors. Secure rewards by completing designated objectives.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-6 min-w-[240px] space-y-4 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[60px] pointer-events-none group-hover:bg-primary/10 transition-all"></div>
           <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted">
              <span>Sync Progress</span>
              <span className="text-primary">{unlockedCount} / {achievements.length}</span>
           </div>
           <div className="h-3 bg-surface-2 rounded-full overflow-hidden border border-border/50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-primary shadow-[0_0_15px_rgba(0,183,255,0.5)]"
              />
           </div>
           <p className="text-[10px] text-muted text-center font-bold uppercase tracking-widest pt-1">
              Overall Completion: {Math.round(progressPercentage)}%
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-8">
           <section className="space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted px-2">Operational Sectors</h3>
              <div className="flex flex-col gap-2">
                 <button className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary text-black font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 transition-all">
                    <History size={16} /> All Targets
                 </button>
                 {categories.map(cat => (
                   <button key={cat.id} className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface-2 border border-border text-muted hover:text-white hover:border-primary/50 transition-all font-bold text-xs uppercase tracking-widest group">
                      <span className="group-hover:text-primary transition-colors">{cat.icon}</span>
                      {cat.label}
                   </button>
                 ))}
              </div>
           </section>

           <section className="bg-surface border border-border rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
                 <Zap size={14} className="fill-current" />
                 Tactical Advantage
              </div>
              <p className="text-[10px] text-muted leading-relaxed italic">
                Unlocking milestones awards XP and Credits which can be used to recalibrate your operative profile in the market.
              </p>
           </section>
        </div>

        {/* Achievement Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((ach) => {
              const unlockedAt = unlockedIds.get(ach.id);
              const unlocked = !!unlockedAt;
              return (
                <motion.div 
                  key={ach.id}
                  whileHover={{ y: -5 }}
                  className={cn(
                    "group relative p-6 rounded-[32px] border-2 transition-all duration-500 overflow-hidden",
                    unlocked 
                      ? "bg-surface border-primary/30 shadow-[0_20px_40px_-15px_rgba(0,183,255,0.15)]" 
                      : "bg-surface-2/30 border-border/50 opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                  )}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                     <Award size={80} className={unlocked ? "text-primary" : "text-muted"} />
                  </div>
                  
                  <div className="flex flex-col h-full space-y-4 relative z-10">
                    <div className="flex items-start justify-between">
                       <div className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-500">
                          {ach.icon_url || '🎯'}
                       </div>
                       {unlocked ? (
                         <div className="p-1.5 bg-success/20 rounded-full">
                            <CheckCircle2 size={14} className="text-success" />
                         </div>
                       ) : (
                         <div className="p-1.5 bg-surface-2 rounded-full border border-border">
                            <Lock size={12} className="text-muted/50" />
                         </div>
                       )}
                    </div>

                    <div className="space-y-1 flex-1">
                       <h3 className="font-display font-bold text-lg text-white uppercase tracking-tight group-hover:text-primary transition-colors">
                          {ach.name}
                       </h3>
                       <p className="text-[11px] text-muted leading-relaxed font-medium italic">
                          "{ach.description}"
                       </p>

                       {/* Progress Bar */}
                       <div className="pt-3">
                         <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider mb-1">
                           <span className={unlocked ? "text-primary" : "text-muted"}>Progress</span>
                           <span className={unlocked ? "text-primary" : "text-muted"}>{unlocked ? '100%' : 'Locked'}</span>
                         </div>
                         <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden border border-border/30">
                           <motion.div
                             initial={{ width: 0 }}
                             animate={{ width: unlocked ? '100%' : '0%' }}
                             transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                             className={cn("h-full shadow-[0_0_10px_rgba(0,183,255,0.5)]", unlocked ? "bg-primary" : "bg-muted/30")}
                           />
                         </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-border/30">
                       <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 rounded-lg border border-primary/20 text-[9px] font-bold text-primary">
                          +{ach.xp_reward} XP
                       </div>
                       <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 rounded-lg border border-success/20 text-[9px] font-bold text-success">
                          +{ach.coin_reward} CR
                       </div>
                    </div>
                    {unlockedAt && (
                      <div className="text-[10px] text-muted text-right font-medium">
                        Unlocked {new Date(unlockedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

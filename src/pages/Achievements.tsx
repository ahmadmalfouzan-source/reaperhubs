import { useEffect, useState } from 'react';
import { getAllAchievements, getUserAchievements, getCurrentUser } from '../lib/reaperhub/queries';
import { Award, Lock, CheckCircle2, Zap, Trophy, Target, MessageSquare, History } from 'lucide-react';
import { MediaCardSkeleton } from '../components/Skeleton';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';

export default function Achievements() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
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
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const categories = [
    { id: 'tracking', label: 'Field Ops', icon: <Target size={16} /> },
    { id: 'social', label: 'Neural Link', icon: <MessageSquare size={16} /> },
    { id: 'economy', label: 'Logistics', icon: <Zap size={16} /> },
    { id: 'special', label: 'Vanguard', icon: <Trophy size={16} /> },
  ];

  const filteredAchievements = activeCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === activeCategory);

  const unlockedCount = achievements.filter(a => unlockedIds.has(a.id)).length;
  const progressPercentage = achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-24 px-4 md:px-8 relative overflow-hidden bg-bg-base">
        <ScanlineOverlay className="opacity-10" />
        <TacticalGrid className="opacity-5" />

        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          <div className="space-y-4">
            <div className="h-12 w-64 bg-surface-2 animate-pulse rounded-lg" />
            <div className="h-4 w-96 bg-surface-2 animate-pulse rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => <MediaCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 md:px-8 relative overflow-hidden bg-bg-base">
      <ScanlineOverlay className="opacity-10" />
      <TacticalGrid className="opacity-5" />

      <div className="max-w-7xl mx-auto space-y-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border/50 pb-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-primary/10 rounded-full border border-accent-primary/20 text-[10px] font-bold text-accent-primary uppercase tracking-[0.2em]">
              <Trophy size={12} /> Service Record
            </div>
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl uppercase tracking-tighter text-text-primary italic">
              Milestones
            </h1>
            <p className="text-text-muted text-sm font-medium max-w-md italic">
              Monitoring operative progress across all tactical sectors. Secure rewards by completing designated objectives.
            </p>
          </div>

          <div className="card p-6 min-w-[280px] space-y-4 relative overflow-hidden group shadow-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 blur-[60px] pointer-events-none group-hover:bg-accent-primary/10 transition-all"></div>
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <span>Sync Progress</span>
              <span className="text-accent-primary">{unlockedCount} / {achievements.length}</span>
            </div>
            <div className="h-2 bg-surface-2 rounded-full overflow-hidden border border-surface-3">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-accent-primary shadow-glow-primary"
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
                <button 
                  onClick={() => setActiveCategory('all')}
                  className={cn(
                    "btn w-full justify-start gap-3",
                    activeCategory === 'all' ? "btn-primary" : "btn-secondary"
                  )}
                >
                  <History size={16} /> All Targets
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "btn w-full justify-start gap-3",
                      activeCategory === cat.id ? "btn-primary" : "btn-secondary"
                    )}
                  >
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="card p-6 space-y-4 border-accent-primary/20 bg-accent-primary/5 shadow-5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-accent-primary">
                <Zap size={14} className="fill-current" />
                Tactical Advantage
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed italic">
                Unlocking milestones awards XP and Credits which can be used to recalibrate your operative profile in the market.
              </p>
            </section>
          </div>

          {/* Achievement Grid */}
          <div className="lg:col-span-3">
            {filteredAchievements.length === 0 ? (
              <div className="card p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
                <div className="p-4 bg-surface-2 rounded-full text-text-muted">
                  <Lock size={32} strokeWidth={1} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-text-primary uppercase tracking-wider">No Intelligence Found</h3>
                  <p className="text-sm text-text-muted">No achievements found in this sector.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAchievements.map((ach) => {
                  const unlockedAt = unlockedIds.get(ach.id);
                  const unlocked = !!unlockedAt;
                  return (
                    <motion.div 
                      key={ach.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "card p-6 group h-full flex flex-col shadow-5",
                        unlocked 
                          ? "border-accent-primary/30 bg-accent-primary/5" 
                          : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                      )}
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Award size={80} className={unlocked ? "text-accent-primary" : "text-text-muted"} />
                      </div>
                      
                      <div className="flex flex-col h-full space-y-4 relative z-10">
                        <div className="flex items-start justify-between">
                          <div className="text-4xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-500">
                            {ach.icon_url || '🎯'}
                          </div>
                          {unlocked ? (
                             <div className="p-1.5 bg-accent-success/20 rounded-full">
                               <CheckCircle2 size={14} className="text-accent-success" />
                             </div>
                           ) : (
                             <div className="p-1.5 bg-surface-2 rounded-full border border-surface-3">
                               <Lock size={12} className="text-text-muted/50" />
                             </div>
                          )}
                        </div>

                         <div className="space-y-1 flex-1">
                           <h3 className="font-display font-bold text-lg text-text-primary uppercase tracking-tight group-hover:text-accent-primary transition-colors">
                             {ach.name}
                           </h3>
                           <p className="text-[11px] text-text-muted leading-relaxed font-medium italic">
                            "{ach.description}"
                          </p>

                          <div className="pt-3">
                             <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider mb-1">
                               <span className={unlocked ? "text-accent-primary" : "text-text-muted"}>Progress</span>
                               <span className={unlocked ? "text-accent-primary" : "text-text-muted"}>{unlocked ? '100%' : 'Locked'}</span>
                             </div>
                             <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-surface-3">
                               <motion.div
                                 initial={{ width: 0 }}
                                 animate={{ width: unlocked ? '100%' : '0%' }}
                                 transition={{ duration: 1, ease: "easeOut" }}
                                 className={cn("h-full", unlocked ? "bg-accent-primary shadow-glow-primary" : "bg-text-muted/30")}
                               />
                             </div>
                          </div>
                        </div>

                         <div className="flex items-center gap-3 pt-4 border-t border-surface-3">
                           <div className="flex items-center gap-1.5 px-2 py-1 bg-accent-primary/10 rounded-lg border border-accent-primary/20 text-[10px] font-bold text-accent-primary">
                             +{ach.xp_reward} XP
                           </div>
                           <div className="flex items-center gap-1.5 px-2 py-1 bg-accent-success/10 rounded-lg border border-accent-success/20 text-[10px] font-bold text-accent-success">
                             +{ach.coin_reward} CR
                           </div>
                         </div>
                        {unlockedAt && (
                          <div className="text-[10px] text-muted text-right font-medium italic">
                            Unlocked {new Date(unlockedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

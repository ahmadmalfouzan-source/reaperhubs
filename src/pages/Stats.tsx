import { useEffect, useState } from 'react';
import { getTacticalStats } from '../lib/reaperhub/queries';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Activity, Target, Clock, Star, TrendingUp, 
  LayoutGrid, Film, Gamepad2, Tv, Sparkles
} from 'lucide-react';
import Skeleton from '../components/Skeleton';
import { motion } from 'framer-motion';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { subDays } from 'date-fns';
import { cn } from '../lib/utils';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';

const COLORS = ['#8B5CF6', '#a78bfa', '#e63946', '#10b981', '#f59e0b', '#6d9eff'];

export default function Stats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTacticalStats().then(res => {
      setStats(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-12 py-12">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Skeleton className="h-[400px] rounded-[40px]" />
           <Skeleton className="h-[400px] rounded-[40px]" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const genreData = Object.entries(stats.genre_breakdown || {}).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 6);

  const activityData = stats.activity_heatmap || [];

  // Calculate current streak
  let currentStreak = 0;
  if (stats.activity_heatmap && stats.activity_heatmap.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityDates = new Set(
      stats.activity_heatmap
        .filter((d: any) => d.count > 0)
        .map((d: any) => {
          const date = new Date(d.date);
          date.setHours(0, 0, 0, 0);
          return date.getTime();
        })
    );

    let checkDate = today.getTime();

    if (!activityDates.has(checkDate)) {
      checkDate -= 86400000;
    }

    while (activityDates.has(checkDate)) {
      currentStreak++;
      checkDate -= 86400000;
    }
  }

  return (
    <div className="relative min-h-screen py-12 space-y-12">
      <ScanlineOverlay />
      <TacticalGrid />

      <div className="relative z-10 space-y-12">
        <div className="space-y-4 border-b border-surface-2 pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-primary/10 rounded-full border border-accent-primary/20 text-xs font-bold text-accent-primary uppercase tracking-[0.2em]">
            Tactical Analytics
          </div>
          <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-tighter text-text-primary italic">
            Performance
          </h1>
          <p className="text-text-muted text-sm font-medium italic">
            Visualizing unit deployment and operational efficiency across all sectors.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Tracked', value: stats.total_tracked, icon: <Target className="text-accent-primary" />, borderColor: 'border-l-accent-primary' },
            { label: 'Total Hours', value: Math.round(stats.total_hours_played), icon: <Clock className="text-accent-success" />, borderColor: 'border-l-accent-success' },
            { label: 'Avg Rating', value: stats.average_rating.toFixed(1), icon: <Star className="text-accent-warning" />, borderColor: 'border-l-accent-warning' },
            { label: 'Current Streak', value: `${currentStreak} Days`, icon: <Activity className="text-accent-secondary" />, borderColor: 'border-l-accent-secondary' },
          ].map((card, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "card p-6 group border-l-4",
                card.borderColor
              )}
            >
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity scale-150">
                 {card.icon}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">{card.label}</div>
              <div className="font-display font-bold text-4xl text-text-primary">{card.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Genre Breakdown */}
          <section className="card p-8 md:p-10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/5 blur-[100px] pointer-events-none group-hover:bg-accent-primary/10 transition-all duration-1000"></div>
            <div className="flex items-center gap-3 mb-10">
               <LayoutGrid className="text-accent-primary w-6 h-6" />
               <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-text-primary">Sector Distribution</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {genreData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--surface-3)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Top 5 Genres Bar Chart */}
          <section className="card p-8 md:p-10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-tertiary/5 blur-[100px] pointer-events-none group-hover:bg-accent-tertiary/10 transition-all duration-1000"></div>
            <div className="flex items-center gap-3 mb-10">
               <LayoutGrid className="text-accent-tertiary w-6 h-6" />
               <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-text-primary">Top 5 Genres</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genreData.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" vertical={false} />
                  <XAxis 
                    dataKey="name"
                    stroke="var(--text-muted)" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--surface-3)', borderRadius: '12px', fontSize: '12px' }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                  />
                  <Bar dataKey="value" fill="var(--accent-primary)" radius={[6, 6, 0, 0]}>
                    {
                      genreData.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Heatmap */}
          <section className="card p-8 md:p-10 group lg:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-tertiary/5 blur-[100px] pointer-events-none group-hover:bg-accent-tertiary/10 transition-all duration-1000"></div>

            <div className="flex items-center gap-3 mb-10">
               <TrendingUp className="text-accent-tertiary w-6 h-6" />
               <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-text-primary">Activity Heatmap</h3>
            </div>
            <div className="w-full overflow-x-auto pb-4">
              <div className="min-w-[700px]">
                <CalendarHeatmap
                  startDate={subDays(new Date(), 365)}
                  endDate={new Date()}
                  values={activityData.map((d: any) => ({
                    date: d.date,
                    count: d.count
                  }))}
                  classForValue={(value) => {
                    if (!value || value.count === 0) {
                      return 'color-empty';
                    }
                    if (value.count === 1) return 'fill-accent-primary opacity-40';
                    if (value.count === 2) return 'fill-accent-primary opacity-60';
                    if (value.count === 3) return 'fill-accent-primary opacity-80';
                    return 'fill-accent-primary';
                  }}
                  titleForValue={(value) => {
                    if (!value || !value.date) return 'No activity';
                    return `${value.date}: ${value.count} activity`;
                  }}
                />
              </div>
            </div>
            <p className="text-[10px] text-text-muted text-center font-bold uppercase tracking-widest mt-4">Activity over the last 365 days</p>
          </section>
        </div>

        {/* Top Rated Items */}
        <section className="space-y-8">
          <div className="flex items-center gap-3 border-b border-surface-2 pb-4">
             <Sparkles className="text-accent-warning w-6 h-6" />
             <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-text-primary">Top 10 Highest Rated Items</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {stats.top_rated.slice(0, 10).map((item: any, i: number) => (
               <div key={i} className="card card-interactive p-6 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-surface-1 flex items-center justify-center font-mono font-bold text-accent-primary border border-surface-3">
                        {i + 1}
                     </div>
                     <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-text-primary uppercase truncate max-w-[200px] italic">{item.title}</h4>
                        <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest">{item.media_type}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-accent-warning/10 rounded-full border border-accent-warning/20 text-accent-warning text-xs font-bold">
                     <Star size={12} className="fill-current" />
                     {item.rating}
                  </div>
               </div>
             ))}
          </div>
        </section>

        {/* 2026 Year-in-Review */}
        <section className="space-y-8 mt-12 pt-12 border-t border-surface-2">
          <div className="flex items-center gap-3 border-b border-surface-2 pb-4">
             <Activity className="text-accent-primary w-6 h-6" />
             <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-text-primary">2026 Year-in-Review</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="card p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 bg-accent-primary/20 text-accent-primary rounded-full flex items-center justify-center">
                   <Film className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Movies Watched</h4>
                  <p className="text-3xl font-display font-bold text-text-primary">{stats.total_tracked_movies || 0}</p>
                </div>
             </div>
             <div className="card p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 bg-accent-tertiary/20 text-accent-tertiary rounded-full flex items-center justify-center">
                   <Tv className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">TV Shows Binge</h4>
                  <p className="text-3xl font-display font-bold text-text-primary">{stats.total_tracked_tv || 0}</p>
                </div>
             </div>
             <div className="card p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 bg-accent-success/20 text-accent-success rounded-full flex items-center justify-center">
                   <Gamepad2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Games Played</h4>
                  <p className="text-3xl font-display font-bold text-text-primary">{stats.total_tracked_games || 0}</p>
                </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}

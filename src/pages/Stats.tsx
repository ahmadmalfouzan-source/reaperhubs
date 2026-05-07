import { useEffect, useState } from 'react';
import { getTacticalStats } from '../lib/reaperhub/queries';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
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

const COLORS = ['#00B7FF', '#7C5CFF', '#00FFA3', '#FF3D71', '#FFD600', '#FF9500'];

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
      <div className="space-y-12 max-w-6xl mx-auto px-4 py-12">
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

    // Create a map of dates with activity
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

    // If today has no activity, check if yesterday had activity (streak still alive)
    if (!activityDates.has(checkDate)) {
      checkDate -= 86400000; // subtract 1 day
    }

    while (activityDates.has(checkDate)) {
      currentStreak++;
      checkDate -= 86400000;
    }
  }

  const typeData = [
    { name: 'Movies', value: stats.total_tracked_movies || 0 },
    { name: 'TV Shows', value: stats.total_tracked_tv || 0 },
    { name: 'Games', value: stats.total_tracked_games || 0 },
  ].filter(t => t.value > 0);

  return (
    <div className="space-y-12 max-w-6xl mx-auto px-4 py-12 animate-in fade-in duration-700">
      <div className="space-y-4 border-b border-border/50 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
          Tactical Analytics
        </div>
        <h1 className="font-display font-bold text-5xl md:text-6xl uppercase tracking-tighter text-white italic">
          Performance
        </h1>
        <p className="text-muted text-sm font-medium italic">
          Visualizing unit deployment and operational efficiency across all sectors.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
          { label: 'Total Tracked', value: stats.total_tracked, icon: <Target className="text-primary" />, color: 'border-primary' },
          { label: 'Total Hours', value: Math.round(stats.total_hours_played), icon: <Clock className="text-success" />, color: 'border-success' },
          { label: 'Avg Rating', value: stats.average_rating.toFixed(1), icon: <Star className="text-yellow-400" />, color: 'border-yellow-400' },
          { label: 'Current Streak', value: `${currentStreak} Days`, icon: <Activity className="text-primary-2" />, color: 'border-primary-2' },
        ].map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "bg-surface border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden group",
              `border-l-4 ${card.color}`
            )}
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               {card.icon}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">{card.label}</div>
            <div className="font-display font-bold text-4xl text-white">{card.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Genre Breakdown */}
        <section className="bg-surface border-2 border-border/50 rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
          <div className="flex items-center gap-3 mb-10">
             <LayoutGrid className="text-primary w-6 h-6" />
             <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-white">Sector Distribution</h3>
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
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>


        {/* Top 5 Genres Bar Chart */}
        <section className="bg-surface border-2 border-border/50 rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-2/5 blur-[100px] pointer-events-none group-hover:bg-primary-2/10 transition-all duration-1000"></div>
          <div className="flex items-center gap-3 mb-10">
             <LayoutGrid className="text-primary-2 w-6 h-6" />
             <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-white">Top 5 Genres</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genreData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="name"
                  stroke="#666" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', fontSize: '12px' }}
                  cursor={{ fill: 'rgba(124, 92, 255, 0.1)' }}
                />
                <Bar dataKey="value" fill="#7C5CFF" radius={[6, 6, 0, 0]}>
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
        <section className="bg-surface border-2 border-border/50 rounded-[40px] p-8 md:p-10 shadow-2xl relative overflow-hidden group lg:col-span-2">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-2/5 blur-[100px] pointer-events-none group-hover:bg-primary-2/10 transition-all duration-1000"></div>

          <div className="flex items-center gap-3 mb-10">
             <TrendingUp className="text-primary-2 w-6 h-6" />
             <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-white">Activity Heatmap</h3>
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
                    return 'fill-surface-2';
                  }
                  if (value.count === 1) return 'fill-primary-2/40';
                  if (value.count === 2) return 'fill-primary-2/60';
                  if (value.count === 3) return 'fill-primary-2/80';
                  return 'fill-primary-2';
                }}
                titleForValue={(value) => {
                  if (!value || !value.date) return 'No activity';
                  return `${value.date}: ${value.count} activity`;
                }}
              />
            </div>
          </div>
          <p className="text-[10px] text-muted text-center font-bold uppercase tracking-widest mt-4">Activity over the last 365 days</p>
        </section>
      </div>

      {/* Top Rated Items */}
      <section className="space-y-8">
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
           <Sparkles className="text-yellow-400 w-6 h-6" />
           <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-white">Top 10 Highest Rated Items</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {stats.top_rated.slice(0, 10).map((item: any, i: number) => (
             <div key={i} className="flex items-center justify-between p-6 bg-surface-2/50 border border-border/50 rounded-2xl group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center font-mono font-bold text-primary">
                      {i + 1}
                   </div>
                   <div className="space-y-0.5">
                      <h4 className="text-sm font-bold text-white uppercase truncate max-w-[200px]">{item.title}</h4>
                      <p className="text-[9px] text-muted uppercase font-bold tracking-widest">{item.media_type}</p>
                   </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-400/10 rounded-full border border-yellow-400/20 text-yellow-400 text-xs font-bold">
                   <Star size={12} className="fill-current" />
                   {item.rating}
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* 2026 Year-in-Review */}
      <section className="space-y-8 mt-12 pt-12 border-t border-border/50">
        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
           <Activity className="text-primary w-6 h-6" />
           <h3 className="font-display font-bold text-2xl uppercase tracking-tight text-white">2026 Year-in-Review</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-6 bg-surface-2/50 border border-border/50 rounded-3xl flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-2">
                 <Film className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-muted uppercase tracking-widest">Movies Watched</h4>
              <p className="text-3xl font-display font-bold text-white">{stats.total_tracked_movies || 0}</p>
           </div>
           <div className="p-6 bg-surface-2/50 border border-border/50 rounded-3xl flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 bg-primary-2/20 text-primary-2 rounded-full flex items-center justify-center mb-2">
                 <Tv className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-muted uppercase tracking-widest">TV Shows Binge</h4>
              <p className="text-3xl font-display font-bold text-white">{stats.total_tracked_tv || 0}</p>
           </div>
           <div className="p-6 bg-surface-2/50 border border-border/50 rounded-3xl flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center mb-2">
                 <Gamepad2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-muted uppercase tracking-widest">Games Played</h4>
              <p className="text-3xl font-display font-bold text-white">{stats.total_tracked_games || 0}</p>
           </div>
        </div>
      </section>

    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

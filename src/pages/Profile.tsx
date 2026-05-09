import { useEffect, useState } from 'react';
import { Link,  useParams, useNavigate  } from 'react-router-dom';
import { 
    getProfileWithPosts,
  getUserAchievements, 
  getLibraryItems, 
  getCurrentUser, 
  updateProfile,
  followUser,
  unfollowUser,
  getFollowStats,
  getIsFollowing,
  getUserStreak
} from '../lib/reaperhub/queries';
import { Activity,
  Award, Lock, Camera, ExternalLink, 
  Loader2, Sparkles, Ghost, Library, UserPlus, UserMinus, Users, MessageSquare,
  Home, Trophy, Settings as SettingsIcon, Bell, LogOut, ChevronRight
 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { toast } from '../lib/toastUtils';
import Skeleton from '../components/Skeleton';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [library, setLibrary] = useState<any[]>([]);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [updating, setUpdating] = useState(false);
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 });
  const [streak, setStreak] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'archive' | 'transmissions'>('overview');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      let targetUsername = username;
      if (!targetUsername && currentUser) {
        const { data: userProfile } = await supabase
          .from('users')
          .select('username')
          .eq('id', currentUser.id)
          .single();
          
        if (userProfile?.username) {
           navigate(`/profile/${userProfile.username}`, { replace: true });
           return;
        }
      }

      if (targetUsername) {
        const res = await getProfileWithPosts(targetUsername);
        setData(res);
        
        if (res?.user) {
          setDisplayName(res.user.display_name || res.user.username);
          setBio(res.user.bio || '');
          
          if (currentUser && res.user.id === currentUser.id) {
            setIsCurrentUser(true);
          }
          const libData = await getLibraryItems(res.user.id);
          setLibrary(libData);
          
          const [achs, stats, followingStatus, userStreak] = await Promise.all([
            getUserAchievements(res.user.id),
            getFollowStats(res.user.id),
            getIsFollowing(res.user.id),
            getUserStreak(res.user.id)
          ]);
          setAchievements(achs);
          setFollowStats(stats);
          setIsFollowing(followingStatus);
          setStreak(userStreak);
        }
      }
      setLoading(false);
    }
    
    loadData();
  }, [username, navigate]);

  const handleUpdate = async () => {
    setUpdating(true);
    const res = await updateProfile({
      display_name: displayName,
      bio: bio
    });
    
    if (res.success) {
      toast.success("Profile recalibrated", "Dossier updated successfully.");
      setEditing(false);
      if (username) {
        const refreshed = await getProfileWithPosts(username);
        setData(refreshed);
      }
    } else {
      toast.error("Transmission error", "Failed to update profile registry.");
    }
    setUpdating(false);
  };

  const handleToggleFollow = async () => {
    if (!data?.user) return;
    setFollowLoading(true);

    // Optimistic update
    const previousIsFollowing = isFollowing;
    const previousFollowersCount = followStats.followersCount;

    setIsFollowing(!isFollowing);
    setFollowStats(prev => ({
      ...prev,
      followersCount: isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
    }));

    try {
      if (isFollowing) {
        await unfollowUser(data.user.id);
        toast.transmission.deleted();
      } else {
        await followUser(data.user.id);
        toast.transmission.sent();
      }
    } catch (err) {
      // Revert optimistic update
      setIsFollowing(previousIsFollowing);
      setFollowStats(prev => ({ ...prev, followersCount: previousFollowersCount }));
      toast.error("Link failed", "Field interference detected.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const ProfileSkeleton = () => (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-1000 px-4 sm:px-0 pb-20">
      <div className="bg-surface border-2 border-border/50 rounded-[32px] overflow-hidden">
        <Skeleton className="w-full h-48 md:h-64" />
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 relative">
          <div className="absolute -top-16 left-6 md:left-8">
            <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-surface" />
          </div>
          <div className="md:ml-44 mt-16 md:mt-0 flex-1 space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-6 w-full" />
            <div className="flex gap-4">
               <Skeleton className="h-10 w-24 rounded-full" />
               <Skeleton className="h-10 w-24 rounded-full" />
               <Skeleton className="h-10 w-24 rounded-full" />
               <Skeleton className="h-10 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center border-b border-border/50">
         <div className="flex gap-8">
             <Skeleton className="w-24 h-8" />
             <Skeleton className="w-24 h-8" />
             <Skeleton className="w-24 h-8" />
         </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        <div className="space-y-6">
           <Skeleton className="h-8 w-48" />
           <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
           </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
           <Skeleton className="h-8 w-64" />
           <div className="space-y-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)}
           </div>
        </div>
      </div>
    </div>
  );

  if (loading) return <ProfileSkeleton />;

  if (!data || !data.user) {
    return (
      <div className="text-center py-32 space-y-6">
        <div className="w-20 h-20 bg-surface-2 rounded-full flex items-center justify-center mx-auto border border-border">
          <Ghost className="w-10 h-10 text-muted opacity-20" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-white uppercase tracking-tight">Agent not found</h2>
          <p className="text-muted text-sm italic">The requested operative does not exist in the collective database.</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-primary text-black font-bold rounded-xl uppercase text-sm tracking-widest hover:scale-105 transition-all">
          Return to HQ
        </button>
      </div>
    );
  }

  const { user, posts } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-1000 px-4 sm:px-0 pb-20">
      {/* Redesigned Profile Header with Cover Image */}
      <div className="bg-surface border-2 border-border/50 rounded-[32px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        {/* Cover Area */}
        <div className="h-48 md:h-64 relative bg-surface-2">
          {user?.cover_url ? (
             <img src={user.cover_url} alt="Cover" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=1000&q=80'; }} />
          ) : (
             <div className="w-full h-full bg-gradient-to-r from-primary/20 via-surface-2 to-primary-2/20"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent"></div>
          {isCurrentUser && (
            <button 
              onClick={() => navigate('/settings')}
              className="absolute top-4 right-4 z-20 px-4 py-2 bg-black/50 hover:bg-black/80 backdrop-blur-md text-white rounded-full text-sm font-bold uppercase tracking-widest flex items-center gap-2 border border-white/10 transition-all hover:border-white/30"
            >
              <Camera size={12} /> Edit Cover
            </button>
          )}
        </div>

        {/* Profile Info Overlay */}
        <div className="relative px-6 md:px-8 pb-8 pt-4">
          <div className="flex flex-col md:flex-row gap-6 relative">
             <div className="absolute -top-20 left-0 md:relative md:-top-24 md:left-0">
               <div className="relative group">
                 <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-surface-2 border-4 border-surface flex items-center justify-center overflow-hidden flex-shrink-0 relative z-10 shadow-2xl transition-all duration-700 group-hover:scale-105">
                   {user?.avatar_url ? (
                     <img loading="lazy" src={user.avatar_url} alt={user?.username || 'Profile'} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
                   ) : (
                     <span className="text-primary-2 font-display font-bold text-5xl drop-shadow-lg">{user?.username?.[0]?.toUpperCase() || '?'}</span>
                   )}
                 </div>
                 {isCurrentUser && (
                   <button
                     onClick={() => navigate('/settings')}
                     className="absolute bottom-2 right-2 z-20 p-2.5 bg-primary text-black rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all border-4 border-surface"
                   >
                     <Camera size={14} />
                   </button>
                 )}
               </div>
             </div>

             <div className="flex-1 mt-14 md:mt-0 pt-2 space-y-6 w-full">
                <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                   <div className="space-y-1">
                     {editing ? (
                       <input
                         type="text"
                         inputMode="text"
                         value={displayName}
                         onChange={(e) => setDisplayName(e.target.value)}
                         className="bg-surface-2 border border-primary/50 rounded-xl px-4 py-2 text-xl md:text-2xl min-h-[44px] font-display font-bold focus:outline-none w-full text-white"
                       />
                     ) : (
                       <h1 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tighter break-words">{user.display_name || user.username}</h1>
                     )}
                     <p className="text-muted font-mono text-sm">@{user.username}</p>
                   </div>

                   {!isCurrentUser && (
                     <button
                       onClick={handleToggleFollow}
                       disabled={followLoading}
                       className={cn(
                         "px-8 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm shadow-xl border",
                         isFollowing
                           ? "bg-surface-2 border-border text-white hover:bg-danger/10 hover:border-danger hover:text-danger"
                           : "bg-white border-white text-black hover:bg-gray-200"
                       )}
                     >
                       {followLoading ? <Loader2 className="animate-spin" /> : isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
                       {isFollowing ? 'Following' : 'Follow'}
                     </button>
                   )}
                </div>

                {/* Inline Stats Row */}
                <div className="flex flex-wrap items-center gap-2 md:gap-4 border-t border-border/50 pt-4 mt-2">
                   {/* Rank */}
                   <span className="px-3 py-1.5 bg-primary/10 text-primary text-sm font-bold uppercase tracking-widest rounded-full border border-primary/20 flex items-center gap-1.5">
                     <Sparkles size={12} /> Rank {user.level || 1}
                   </span>
                   {/* XP */}
                   <span className="px-3 py-1.5 bg-surface-2 text-white text-sm font-bold uppercase tracking-widest rounded-full border border-border flex items-center gap-1.5">
                     <Activity size={12} className="text-primary-2" /> {user.xp?.toLocaleString() || 0} XP
                   </span>
                   {/* Credits */}
                   <span className="px-3 py-1.5 bg-surface-2 text-white text-sm font-bold uppercase tracking-widest rounded-full border border-border flex items-center gap-1.5">
                     <Award size={12} className="text-success" /> {user.coin_balance?.toLocaleString() || 0} CR
                   </span>
                   {/* Streak */}
                   <span className="px-3 py-1.5 bg-surface-2 text-white text-sm font-bold uppercase tracking-widest rounded-full border border-border flex items-center gap-1.5">
                     <Activity size={12} className="text-orange-500" /> {streak} Day Streak
                   </span>
                   {/* Achievements */}
                   <span className="px-3 py-1.5 bg-surface-2 text-white text-sm font-bold uppercase tracking-widest rounded-full border border-border flex items-center gap-1.5">
                     <Award size={12} className="text-yellow-500" /> {achievements.filter(a => a.unlocked).length} Unlocked
                   </span>

                   <div className="flex-1"></div>

                   <div className="flex items-center gap-4 text-sm">
                     <div className="flex gap-1 items-baseline">
                       <span className="font-bold text-white">{followStats.followersCount}</span>
                       <span className="text-muted">Followers</span>
                     </div>
                     <div className="flex gap-1 items-baseline">
                       <span className="font-bold text-white">{followStats.followingCount}</span>
                       <span className="text-muted">Following</span>
                     </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isCurrentUser && (
        <div className="md:hidden space-y-2 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Link to="/dashboard" className="flex items-center justify-between p-4 bg-surface-2/50 border border-border/50 rounded-[20px] hover:bg-surface-2 transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-white">Dashboard</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted" />
          </Link>
          
          <Link to="/leaderboard" className="flex items-center justify-between p-4 bg-surface-2/50 border border-border/50 rounded-[20px] hover:bg-surface-2 transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary-2/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary-2" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-white">Hall of Fame</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted" />
          </Link>
          
          <Link to="/achievements" className="flex items-center justify-between p-4 bg-surface-2/50 border border-border/50 rounded-[20px] hover:bg-surface-2 transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-500" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-white">Milestones</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted" />
          </Link>

          <Link to="/stats" className="flex items-center justify-between p-4 bg-surface-2/50 border border-border/50 rounded-[20px] hover:bg-surface-2 transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-white">Performance Stats</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted" />
          </Link>

          <Link to="/notifications" className="flex items-center justify-between p-4 bg-surface-2/50 border border-border/50 rounded-[20px] hover:bg-surface-2 transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-white">Notifications</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted" />
          </Link>

          <Link to="/settings" className="flex items-center justify-between p-4 bg-surface-2/50 border border-border/50 rounded-[20px] hover:bg-surface-2 transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-purple-500" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-white">Settings</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted" />
          </Link>

          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-danger/5 border border-danger/20 rounded-[20px] hover:bg-danger/10 transition-colors active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-danger" />
              </div>
              <span className="font-bold text-sm uppercase tracking-widest text-danger">Sign Out</span>
            </div>
            <ChevronRight className="w-5 h-5 text-danger/50" />
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex justify-center border-b border-border/50 mb-8">
         <div className="flex gap-8">
             <button
                onClick={() => setActiveTab('overview')}
                className={cn("pb-4 text-sm font-bold uppercase tracking-widest transition-all", activeTab === 'overview' ? "text-primary border-b-2 border-primary" : "text-muted hover:text-white")}
             >
                Overview
             </button>
             <button
                onClick={() => setActiveTab('archive')}
                className={cn("pb-4 text-sm font-bold uppercase tracking-widest transition-all", activeTab === 'archive' ? "text-primary border-b-2 border-primary" : "text-muted hover:text-white")}
             >
                Archive
             </button>
             <button
                onClick={() => setActiveTab('transmissions')}
                className={cn("pb-4 text-sm font-bold uppercase tracking-widest transition-all", activeTab === 'transmissions' ? "text-primary border-b-2 border-primary" : "text-muted hover:text-white")}
             >
                Transmissions
             </button>
         </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            <div className="space-y-8">
              <div className="bg-surface-2/30 backdrop-blur-xl border border-border/50 rounded-[24px] md:rounded-[32px] p-6 md:p-8 group/bio relative">
                <h3 className="text-sm md:text-sm font-bold uppercase tracking-[0.3em] text-primary-2 mb-3 flex items-center gap-2">
                   Classified Dossier <Sparkles size={10} className="animate-pulse" />
                </h3>
                {editing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-surface-2 border border-primary/30 rounded-xl p-4 text-sm focus:outline-none min-h-[100px] text-white"
                    placeholder="Update your operative bio..."
                  />
                ) : (
                  <p className="text-text/80 leading-relaxed text-sm md:text-base whitespace-pre-wrap font-medium">
                    {user.bio || "This operative has not yet populated their official dossier."}
                  </p>
                )}

                {editing && (
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleUpdate} disabled={updating} className="px-6 py-2 bg-primary text-black font-bold rounded-xl text-sm uppercase tracking-widest disabled:opacity-50">
                      {updating ? <Loader2 className="animate-spin" /> : "Save Changes"}
                    </button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 text-muted hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
                      Abort
                    </button>
                  </div>
                )}
                {isCurrentUser && !editing && (
                   <button onClick={() => setEditing(true)} className="absolute top-8 right-8 text-sm font-bold uppercase text-muted hover:text-primary transition-all opacity-0 group-hover/bio:opacity-100">
                     Recalibrate
                   </button>
                )}
              </div>

              <div className="bg-surface-2/30 border border-border/50 rounded-3xl p-6 flex flex-col items-center text-center">
                <Activity className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-display font-bold text-lg uppercase text-white mb-2">Tactical Analytics</h3>
                <p className="text-sm text-muted mb-4">View your complete performance history, heatmaps, and genre breakdowns.</p>
                <Link to="/stats" className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors">
                  View Stats
                </Link>
              </div>
            </div>

            <div className="space-y-8">
              <section className="space-y-6">
                <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                  <Award className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                  <h2 className="font-display font-bold text-xl md:text-2xl uppercase tracking-tighter">Killstreak Milestones</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {achievements.length === 0 ? (
                    [...Array(4)].map((_, i) => (
                      <div key={i} className="bg-surface-2/20 border border-border rounded-3xl h-24 flex items-center justify-center opacity-20"><Lock size={20} /></div>
                    ))
                  ) : (
                    achievements.slice(0, 4).map((badge) => (
                      <div
                        key={badge.id}
                        className={cn("relative overflow-hidden rounded-[24px] border p-4 text-center transition-all duration-500", badge.unlocked ? 'border-primary/40 bg-primary/5 shadow-lg grayscale-0 scale-100' : 'border-border bg-surface-2/30 grayscale opacity-40')}
                      >
                        <div className="text-3xl mb-3">{badge.icon}</div>
                        <h3 className="text-sm font-bold uppercase tracking-widest mb-1 text-white truncate px-1">{badge.title}</h3>
                        {!badge.unlocked && <div className="absolute top-2 right-2"><Lock size={10} className="text-muted/30" /></div>}
                      </div>
                    ))
                  )}
                </div>
                <button className="w-full py-3 text-sm font-bold uppercase tracking-[0.3em] text-muted hover:text-primary transition-all border border-dashed border-border rounded-xl">View All Milestones</button>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'archive' && (
          <section className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <Library className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase tracking-tighter">Current Archive</h2>
              </div>
              {isCurrentUser && (
                <button onClick={() => navigate('/library')} className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                   Deploy Full View <ExternalLink size={10} />
                </button>
              )}
            </div>

            {library.length === 0 ? (
              <div className="bg-surface/50 border border-dashed border-border p-12 rounded-[32px] text-center space-y-4">
                <Ghost className="w-12 h-12 mx-auto text-muted opacity-10" />
                <p className="text-muted italic text-sm">No data points saved in active archive.</p>
                {isCurrentUser && (
                  <button onClick={() => navigate('/search')} className="text-sm font-bold text-white bg-surface-2 px-6 py-2 rounded-full uppercase tracking-tighter border border-border hover:border-primary transition-all">Search Registry</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {library.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => {
                       const mediaType = item.media_type || item.media_items?.type || 'movie';
                       const mediaId = item.media_id || item.media_items?.tmdb_id || item.media_items?.rawg_id || item.id;
                       navigate(`/media/${mediaType}/${mediaId}`);
                    }}
                    className="aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden relative group cursor-pointer shadow-xl border border-border/50"
                  >
                    <img loading="lazy" src={item.poster_url || item.cover_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                    <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4">
                      <p className="text-sm md:text-sm font-bold text-primary uppercase tracking-widest mb-1">{item.media_type}</p>
                      <p className="text-sm md:text-sm font-bold text-white line-clamp-1 italic">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'transmissions' && (
          <section className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-500">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <h2 className="font-display font-bold text-xl md:text-2xl uppercase tracking-tighter">Transmission Registry</h2>
              <span className="text-sm text-muted font-bold uppercase tracking-widest">{posts.length} Transmissions</span>
            </div>
            {posts.length === 0 ? (
              <div className="bg-surface/50 border border-border rounded-[32px] p-10 text-center space-y-4">
                <MessageSquare className="w-12 h-12 mx-auto text-muted opacity-10" />
                <p className="text-muted text-sm italic">Zero radio chatter detected from this origin.</p>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {posts.map((post: any) => (
                  <div key={post.id} className="bg-surface border-l-4 border-primary border border-border rounded-2xl p-6 md:p-8 hover:bg-surface-2/50 transition-all duration-300 shadow-lg">
                    <p className="mb-4 text-text/90 italic leading-relaxed font-medium text-sm md:text-base">"{post.content}"</p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <span className="text-sm text-muted font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                         Secure Transmission Locked
                      </span>
                      <span className="text-sm text-muted font-bold uppercase">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

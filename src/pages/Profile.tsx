import { useEffect, useState } from 'react';
import { Link,  useParams, useNavigate  } from 'react-router-dom';
import { 
    getProfileWithPosts,
  getUserAchievements, 
  getLibraryItems, 
    getLibrary,
  getCurrentUser, 
  updateProfile,
  followUser,
  unfollowUser,
  getFollowStats,
  getIsFollowing,
  getUserStreak,
  getUserStats
} from "../lib/reaperhub/queries";
import { 
  Award, Lock, Camera, ExternalLink, 
  Loader2, Sparkles, Ghost, Library, UserPlus, UserMinus, Users, MessageSquare, Play, Flame, Star, Clock, Activity, List
} from "lucide-react";
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const [streak, setStreak] = useState(0);
  const [userStats, setUserStats] = useState({ averageRating: 0, totalHours: 0 });
  const [coverUploading, setCoverUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('library');

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
            const libData = await getLibrary();
            setLibrary(libData);
          }
          
          const [achs, stats, followingStatus, currentStreak, advancedStats] = await Promise.all([
            getUserAchievements(res.user.id),
            getFollowStats(res.user.id),
            getIsFollowing(res.user.id),
            getUserStreak(res.user.id),
            getUserStats(res.user.id)
          ]);
          setAchievements(achs);
          setFollowStats(stats);
          setIsFollowing(followingStatus);
          setStreak(currentStreak);
          setUserStats(advancedStats);
        }
      }
      setLoading(false);
    }
    
    loadData();
  }, [username, navigate]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !data?.user) return;

    setCoverUploading(true);
    try {
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `covers/${data.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const res = await updateProfile({ cover_url: publicUrl });
      if (res.success) {
        toast.success("Cover updated.");
        const refreshed = await getProfileWithPosts(data.user.username);
        setData(refreshed);
      } else {
        throw new Error("Failed to update profile record");
      }
    } catch (err: any) {
      toast.error(`Cover upload failed: ${err.message}`);
    } finally {
      setCoverUploading(false);
    }
  };

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
    const previousIsFollowing = isFollowing;
    const previousFollowStats = { ...followStats };

    // Optimistic Update
    setIsFollowing(!isFollowing);
    setFollowStats(prev => ({
      ...prev,
      followersCount: isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
    }));
    setFollowLoading(true);

    try {
      if (isFollowing) {
        const res = await unfollowUser(data.user.id);
        if (res && res.success === false) throw new Error();
        toast.transmission.deleted();
      } else {
        const res = await followUser(data.user.id);
        if (res && res.success === false) throw new Error();
        toast.transmission.sent();
      }
    } catch (err) {
      // Revert on error
      setIsFollowing(previousIsFollowing);
      setFollowStats(previousFollowStats);
      toast.error("Link failed", "Field interference detected.");
    } finally {
      setFollowLoading(false);
    }
  };

  const ProfileSkeleton = () => (
    <div className="max-w-5xl mx-auto space-y-12">
      <div className="bg-surface border border-border rounded-[48px] p-14 flex flex-col md:flex-row gap-10 items-center">
        <Skeleton className="w-48 h-48 rounded-[40px]" />
        <div className="flex-1 space-y-4 text-center md:text-left w-full">
          <Skeleton className="h-14 w-64 mx-auto md:mx-0" />
          <Skeleton className="h-4 w-32 mx-auto md:mx-0" />
          <Skeleton className="h-24 w-full rounded-3xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
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
        <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-primary text-black font-bold rounded-xl uppercase text-xs tracking-widest hover:scale-105 transition-all">
          Return to HQ
        </button>
      </div>
    );
  }

  const { user, posts } = data;

  const unlockedAchievementsCount = achievements.filter(a => a.unlocked).length;
  const levelThreshold = (user.level || 1) * 1000;
  const xpProgress = ((user.xp || 0) % 1000) / 1000 * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-1000 px-4 sm:px-0 pb-20">
      {/* Profile Header */}
      <div className="bg-surface border-2 border-border/50 rounded-[32px] md:rounded-[48px] p-6 md:p-14 flex flex-col md:flex-row gap-8 md:gap-10 items-center md:items-start text-center md:text-left relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        {user.cover_url && (
          <div className="absolute inset-0 z-0">
            <img src={user.cover_url} alt="Cover" className="w-full h-full object-cover opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
          </div>
        )}
        <div className="absolute top-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-primary/10 rounded-full blur-[80px] md:blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4 z-0"></div>
        
        {isCurrentUser && editing && (
          <label className="absolute top-4 right-4 z-20 cursor-pointer bg-surface-2/80 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-white border border-white/10 hover:border-primary transition-colors flex items-center gap-2 shadow-xl">
            <input type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} disabled={coverUploading} />
            {coverUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera size={14} />}
            Upload Cover
          </label>
        )}

        <div className="relative group z-10">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-[32px] md:rounded-[40px] bg-surface-2 border-4 border-primary-2/20 flex items-center justify-center overflow-hidden flex-shrink-0 relative z-10 shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-2">
            {user?.avatar_url ? (
              <img loading="lazy"  src={user.avatar_url} alt={user?.username || 'Profile'} className="w-full h-full object-cover"  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
            ) : (
              <span className="text-primary-2 font-display font-bold text-5xl md:text-6xl drop-shadow-lg">{user?.username?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          {isCurrentUser && (
            <button 
              onClick={() => navigate('/settings')}
              className="absolute -bottom-2 -right-2 z-20 p-3 md:p-4 bg-primary text-black rounded-2xl md:rounded-3xl shadow-xl hover:scale-110 active:scale-95 transition-all border-4 border-surface group-hover:rotate-6"
            >
              <Camera size={18} className="md:w-5 md:h-5" />
            </button>
          )}
        </div>
        
        <div className="flex-1 relative z-10 pt-2 space-y-6 w-full">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="space-y-1">
                {editing ? (
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-surface-2 border border-primary/50 rounded-xl px-4 py-2 text-xl md:text-2xl font-display font-bold focus:outline-none w-full text-white"
                  />
                ) : (
                  <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-6xl text-white tracking-tighter italic break-words">{user.display_name || user.username}</h1>
                )}
                <p className="text-muted font-mono text-xs md:text-sm">@{user.username}</p>
              </div>

              {!isCurrentUser && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={cn(
                    "px-6 md:px-8 py-2.5 md:py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border-2 shadow-xl text-xs md:text-sm",
                    isFollowing 
                      ? "bg-danger/10 border-danger/30 text-danger hover:bg-danger hover:text-white"
                      : "bg-primary border-primary text-black hover:bg-primary/90"
                  )}
                >
                  {followLoading ? <Loader2 className="animate-spin" /> : isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                  {isFollowing ? 'Sever Connection' : 'Sync Signal'}
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
              <div className="flex items-center gap-2 bg-surface-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-border">
                <Users size={14} className="text-primary md:w-4 md:h-4" />
                <div className="flex gap-1 items-baseline">
                  <span className="font-bold text-white text-sm md:text-base">{followStats.followersCount}</span>
                  <span className="text-[8px] md:text-[10px] text-muted uppercase font-bold tracking-widest font-sans">Followers</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-surface-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-border">
                <Users size={14} className="text-primary-2 md:w-4 md:h-4" />
                <div className="flex gap-1 items-baseline">
                  <span className="font-bold text-white text-sm md:text-base">{followStats.followingCount}</span>
                  <span className="text-[8px] md:text-[10px] text-muted uppercase font-bold tracking-widest font-sans">Following</span>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="flex flex-col bg-surface-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles size={10} className="text-primary md:w-3 md:h-3" />
                    <span className="text-[8px] md:text-[10px] text-muted uppercase font-bold tracking-widest font-sans">Rank {user.level || 1}</span>
                  </div>
                  <div className="w-24 md:w-32 h-1.5 bg-surface-2 rounded-full overflow-hidden border border-border/50">
                    <div className="h-full bg-primary shadow-[0_0_10px_rgba(0,183,255,0.5)]" style={{ width: `${xpProgress}%` }} />
                  </div>
                </div>

                <div className="flex flex-col justify-center bg-surface-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-border">
                   <div className="flex items-center gap-1.5">
                     <Flame size={12} className="text-danger md:w-3 md:h-3" />
                     <span className="font-bold text-white text-sm md:text-base leading-none">{streak}</span>
                   </div>
                   <span className="text-[8px] md:text-[10px] text-muted uppercase font-bold tracking-widest font-sans mt-0.5">Day Streak</span>
                </div>

                <div className="flex flex-col justify-center bg-surface-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-border">
                   <div className="flex items-center gap-1.5">
                     <Award size={12} className="text-yellow-400 md:w-3 md:h-3" />
                     <span className="font-bold text-white text-sm md:text-base leading-none">{unlockedAchievementsCount}</span>
                   </div>
                   <span className="text-[8px] md:text-[10px] text-muted uppercase font-bold tracking-widest font-sans mt-0.5">Unlocked</span>
                </div>
              </div>
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-border/50">
               <div className="flex items-center gap-2">
                 <Library size={14} className="text-primary" />
                 <div>
                   <div className="font-bold text-white text-sm leading-none">{library.length}</div>
                   <div className="text-[8px] text-muted uppercase tracking-widest mt-1">Total Tracked</div>
                 </div>
               </div>
               <div className="flex items-center gap-2 border-l border-border/50 pl-6">
                 <Clock size={14} className="text-primary-2" />
                 <div>
                   <div className="font-bold text-white text-sm leading-none">{userStats.totalHours}</div>
                   <div className="text-[8px] text-muted uppercase tracking-widest mt-1">Total Hours</div>
                 </div>
               </div>
               <div className="flex items-center gap-2 border-l border-border/50 pl-6">
                 <Star size={14} className="text-yellow-400 fill-current" />
                 <div>
                   <div className="font-bold text-white text-sm leading-none">{userStats.averageRating}</div>
                   <div className="text-[8px] text-muted uppercase tracking-widest mt-1">Avg Rating</div>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="bg-surface-2/30 backdrop-blur-xl border border-border/50 rounded-[24px] md:rounded-[32px] p-6 md:p-8 group/bio relative">
            <h3 className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-primary-2 mb-3 flex items-center gap-2">
               Classified Dossier
               <Sparkles size={10} className="animate-pulse" />
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
                <button 
                  onClick={handleUpdate}
                  disabled={updating}
                  className="px-6 py-2 bg-primary text-black font-bold rounded-xl text-[10px] uppercase tracking-widest disabled:opacity-50"
                >
                  {updating ? <Loader2 className="animate-spin" /> : "Save Changes"}
                </button>
                <button 
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-muted hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest"
                >
                  Abort
                </button>
              </div>
            )}
            {isCurrentUser && !editing && (
               <button 
                onClick={() => setEditing(true)}
                className="absolute top-8 right-8 text-[8px] font-bold uppercase text-muted hover:text-primary transition-all opacity-0 group-hover/bio:opacity-100"
               >
                 Recalibrate
               </button>
            )}
          </div>
        </div>
      </div>

      {/* Currently Watching / Playing Widget */}
      {library.filter(item => item.status === "watching" || item.status === "in_progress").length > 0 && (
        <div className="bg-surface border border-border/50 rounded-[32px] p-6 mb-8 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display font-bold text-lg text-white uppercase tracking-tighter flex items-center gap-2">
              <Play size={16} className="text-primary fill-current" />
              Active Operations
            </h3>
            <span className="text-[10px] text-muted uppercase font-bold tracking-widest">In Progress</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {library.filter(item => item.status === "watching" || item.status === "in_progress").slice(0, 3).map(item => (
              <div
                key={item.id}
                onClick={() => {
                   const mediaType = item.media_type || item.media_items?.type || "movie";
                   const mediaId = item.media_id || item.media_items?.tmdb_id || item.media_items?.rawg_id || item.id;
                   navigate(`/media/${mediaType}/${mediaId}`);
                }}
                className="flex items-center gap-4 bg-surface-2/50 border border-border/30 rounded-2xl p-3 cursor-pointer hover:bg-surface-2 hover:border-primary/50 transition-all group"
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <img src={item.media_items?.cover_url || item.poster_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-primary uppercase font-bold tracking-widest mb-1">{item.media_type}</p>
                  <p className="text-sm text-white font-bold truncate">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide border-b border-border/50">
        {[
          { id: "library", label: "Library", icon: <Library size={16} /> },
          { id: "reviews", label: "Reviews", icon: <Star size={16} /> },
          { id: "activity", label: "Activity Feed", icon: <Activity size={16} /> },
          { id: "achievements", label: "Achievements", icon: <Award size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary text-black shadow-lg shadow-primary/20"
                : "bg-surface-2/50 text-muted hover:text-white hover:bg-surface-2 border border-border/50"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {/* Tab Content: Library */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <Library className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                <h2 className="font-display font-bold text-xl md:text-2xl uppercase tracking-tighter">Current Archive</h2>
              </div>
              <button onClick={() => navigate('/library')} className="text-[8px] md:text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                 Deploy Full View <ExternalLink size={10} className="md:w-3 md:h-3" />
              </button>
            </div>

            {library.length === 0 ? (
              <div className="bg-surface/50 border border-dashed border-border p-8 md:p-12 rounded-[24px] md:rounded-[32px] text-center space-y-4">
                <Ghost className="w-12 h-12 mx-auto text-muted opacity-10" />
                <p className="text-muted italic text-xs md:text-sm">No data points saved in active archive.</p>
                <button onClick={() => navigate('/search')} className="text-[8px] md:text-[10px] font-bold text-white bg-surface-2 px-5 md:px-6 py-2 rounded-full uppercase tracking-tighter border border-border hover:border-primary transition-all">
                  Search Registry
                </button>
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
                    <img src={item.media_items?.cover_url || item.poster_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                    <div className="absolute bottom-3 md:bottom-4 left-3 md:left-4 right-3 md:right-4">
                      <p className="text-[7px] md:text-[9px] font-bold text-primary uppercase tracking-widest mb-1">{item.media_items?.type || item.media_type}</p>
                      <p className="text-[10px] md:text-xs font-bold text-white line-clamp-1 italic">{item.media_items?.title || item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Reviews */}
        {activeTab === 'reviews' && (
          <div className="bg-surface/50 border border-border rounded-[24px] md:rounded-[32px] p-8 md:p-10 text-center space-y-4">
            <Star className="w-12 h-12 mx-auto text-muted opacity-10" />
            <p className="text-muted text-xs md:text-sm italic">No reviews compiled in this dossier yet.</p>
          </div>
        )}

        {/* Tab Content: Activity Feed */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <h2 className="font-display font-bold text-xl md:text-2xl uppercase tracking-tighter">Transmission Registry</h2>
              <span className="text-[8px] md:text-[10px] text-muted font-bold uppercase tracking-widest">{posts.length} Transmissions</span>
            </div>
            {posts.length === 0 ? (
              <div className="bg-surface/50 border border-border rounded-[24px] md:rounded-[32px] p-8 md:p-10 text-center space-y-4">
                <MessageSquare className="w-12 h-12 mx-auto text-muted opacity-10" />
                <p className="text-muted text-xs md:text-sm italic">Zero radio chatter detected from this origin.</p>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {posts.map((post: any) => (
                  <div key={post.id} className="bg-surface border-l-4 border-primary border border-border rounded-xl md:rounded-2xl p-6 md:p-8 hover:bg-surface-2/50 transition-all duration-300 shadow-lg">
                    <p className="mb-4 text-text/90 italic leading-relaxed font-medium text-xs md:text-base">"{post.content}"</p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <span className="text-[7px] md:text-[9px] text-muted font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                         Secure Transmission Locked
                      </span>
                      <span className="text-[7px] md:text-[9px] text-muted font-bold uppercase">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Achievements */}
        {activeTab === 'achievements' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <Award className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              <h2 className="font-display font-bold text-xl md:text-2xl uppercase tracking-tighter">Killstreak</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.length === 0 ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="bg-surface-2/20 border border-border rounded-3xl h-24 flex items-center justify-center opacity-20">
                     <Lock size={20} />
                  </div>
                ))
              ) : (
                achievements.map((badge) => (
                  <div 
                    key={badge.id}
                    className={cn(
                      "relative overflow-hidden rounded-[24px] md:rounded-3xl border p-4 md:p-5 text-center transition-all duration-500",
                      badge.unlocked 
                        ? 'border-primary/40 bg-primary/5 shadow-lg grayscale-0 scale-100' 
                        : 'border-border bg-surface-2/30 grayscale opacity-40 hover:opacity-60 scale-95'
                    )}
                  >
                    <div className="text-3xl md:text-4xl mb-3">{badge.icon}</div>
                    <h3 className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest mb-1 text-white truncate px-1">
                      {badge.title}
                    </h3>
                    {!badge.unlocked && (
                      <div className="absolute top-2 right-2">
                        <Lock size={10} className="text-muted/30 md:w-3 md:h-3" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

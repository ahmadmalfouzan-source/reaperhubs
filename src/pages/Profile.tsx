import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getProfileByUsername, 
  getUserAchievements, 
  getLibraryItems, 
  getCurrentUser, 
  updateProfile,
  followUser,
  unfollowUser,
  getFollowStats,
  getIsFollowing
} from '../lib/reaperhub/queries';
import { 
  Award, Lock, Camera, ExternalLink, 
  Loader2, Sparkles, Ghost, Library, UserPlus, UserMinus, Users
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const currentUser = await getCurrentUser();
      
      let targetUsername = username;
      if (!targetUsername && currentUser) {
        // Find current user profile
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
        const res = await getProfileByUsername(targetUsername);
        setData(res);
        
        if (res?.user) {
          setDisplayName(res.user.display_name || res.user.username);
          setBio(res.user.bio || '');
          
          if (currentUser && res.user.id === currentUser.id) {
            setIsCurrentUser(true);
            const libData = await getLibrary();
            setLibrary(libData);
          }
          
          const [achs, stats, followingStatus] = await Promise.all([
            getUserAchievements(res.user.id),
            getFollowStats(res.user.id),
            getIsFollowing(res.user.id)
          ]);
          setAchievements(achs);
          setFollowStats(stats);
          setIsFollowing(followingStatus);
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
      toast.success("Profile updated successfully.");
      setEditing(false);
      // Refresh data
      if (username) {
        const refreshed = await getProfileByUsername(username);
        setData(refreshed);
      }
    } else {
      toast.error("Update failed. Error in data transmission.");
    }
    setUpdating(false);
  };

  const handleToggleFollow = async () => {
    if (!data?.user) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(data.user.id);
        setIsFollowing(false);
        setFollowStats(prev => ({ ...prev, followersCount: prev.followersCount - 1 }));
        toast.success(`Broadcasting signal disconnected from ${data.user.username}`);
      } else {
        await followUser(data.user.id);
        setIsFollowing(true);
        setFollowStats(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
        toast.success(`Broadcasting signal linked to ${data.user.username}`);
      }
    } catch (err) {
      toast.error("Connection failed.");
    } finally {
      setFollowLoading(false);
    }
  };

  const ProfileSkeleton = () => (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="bg-surface border border-border rounded-[40px] p-12 flex flex-col md:flex-row gap-10 items-center">
        <Skeleton className="w-40 h-40 rounded-full" />
        <div className="flex-1 space-y-4 text-center md:text-left">
          <Skeleton className="h-12 w-64 mx-auto md:mx-0" />
          <Skeleton className="h-4 w-48 mx-auto md:mx-0" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i}><Skeleton className="h-24 w-full rounded-2xl" /></div>)}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i}><Skeleton className="h-16 w-full rounded-2xl" /></div>)}
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
        <button onClick={() => navigate('/dashboard')} className="px-8 py-3 bg-surface border border-border rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-surface-2 transition-all">
          Return to HQ
        </button>
      </div>
    );
  }

  const { user, posts } = data;

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-1000">
      {/* Profile Header */}
      <div className="bg-surface border-2 border-border/50 rounded-[48px] p-8 md:p-14 flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
        
        <div className="relative group">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-[40px] bg-surface-2 border-4 border-primary-2/20 flex items-center justify-center overflow-hidden flex-shrink-0 relative z-10 shadow-2xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-2">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user?.username || 'Profile'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-2 font-display font-bold text-6xl drop-shadow-lg">{user?.username?.[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          {isCurrentUser && (
            <button className="absolute -bottom-2 -right-2 z-20 p-4 bg-primary text-black rounded-3xl shadow-xl hover:scale-110 active:scale-95 transition-all border-4 border-surface group-hover:rotate-6">
              <Camera size={20} />
            </button>
          )}
        </div>
        
        <div className="flex-1 relative z-10 pt-2 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
              <div className="space-y-1">
                {editing ? (
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-surface-2 border border-primary/50 rounded-xl px-4 py-2 text-2xl font-display font-bold focus:outline-none w-full"
                  />
                ) : (
                  <h1 className="font-display font-bold text-5xl md:text-6xl text-white tracking-tighter italic">{user.display_name || user.username}</h1>
                )}
                <p className="text-muted font-mono text-sm">@{user.username}</p>
              </div>

              {!isCurrentUser && (
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={cn(
                    "px-8 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 border-2 shadow-xl",
                    isFollowing 
                      ? "bg-danger/10 border-danger/30 text-danger hover:bg-danger hover:text-white"
                      : "bg-primary border-primary text-black hover:bg-primary/90"
                  )}
                >
                  {followLoading ? <Loader2 className="animate-spin" /> : isFollowing ? <UserMinus size={18} /> : <UserPlus size={18} />}
                  {isFollowing ? 'Sever Connection' : 'Sync Signal'}
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2 bg-surface-2 px-4 py-2 rounded-2xl border border-border">
                <Users size={16} className="text-primary" />
                <div className="flex gap-1 items-baseline">
                  <span className="font-bold text-white">{followStats.followersCount}</span>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-widest font-sans">Followers</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-surface-2 px-4 py-2 rounded-2xl border border-border">
                <Users size={16} className="text-primary-2" />
                <div className="flex gap-1 items-baseline">
                  <span className="font-bold text-white">{followStats.followingCount}</span>
                  <span className="text-[10px] text-muted uppercase font-bold tracking-widest font-sans">Following</span>
                </div>
              </div>
              <span className="px-4 py-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] rounded-2xl border border-primary/20 flex items-center gap-2">
                <Sparkles size={12} />
                Slayer Rank: {user.level || 1}
              </span>
            </div>
          </div>
          
          <div className="bg-surface-2/30 backdrop-blur-xl border border-border/50 rounded-[32px] p-8 group/bio relative">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary-2 mb-3 flex items-center gap-2">
               Classified Dossier
               <Sparkles size={10} className="animate-pulse" />
            </h3>
            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-surface-2 border border-primary/30 rounded-xl p-4 text-sm focus:outline-none min-h-[100px]"
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
                  className="px-6 py-2 bg-primary text-black font-bold rounded-xl text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {updating ? <Loader2 className="animate-spin" /> : "Save Changes"}
                </button>
                <button 
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-muted hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  Abort
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Achievements & Stats */}
        <div className="lg:col-span-1 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <Award className="w-6 h-6 text-primary" />
              <h2 className="font-display font-bold text-2xl uppercase tracking-tighter">Killstreak</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {achievements.slice(0, 4).map((badge) => (
                <div 
                  key={badge.id}
                  className={cn(
                    "relative overflow-hidden rounded-3xl border p-5 text-center transition-all duration-500",
                    badge.unlocked 
                      ? 'border-primary/40 bg-primary/5 shadow-lg grayscale-0 scale-100' 
                      : 'border-border bg-surface-2/30 grayscale opacity-40 hover:opacity-60 scale-95'
                  )}
                >
                  <div className="text-4xl mb-3">{badge.icon}</div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-white">
                    {badge.title}
                  </h3>
                  {!badge.unlocked && (
                    <div className="absolute top-2 right-2">
                      <Lock size={12} className="text-muted/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button className="w-full py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted hover:text-primary transition-all border border-dashed border-border rounded-2xl">
              View All Milestones
            </button>
          </section>

          <section className="bg-surface border border-border rounded-[32px] p-8 space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Field Logistics</h3>
              <div className="space-y-4">
                  <div className="flex justify-between items-center px-4 py-3 bg-surface-2 rounded-2xl">
                      <span className="text-xs font-bold text-muted uppercase">Credits</span>
                      <span className="text-success font-bold font-display text-xl">{user.coin_balance?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-surface-2 rounded-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover:translate-x-[0%] transition-transform duration-500"></div>
                      <span className="text-xs font-bold text-muted uppercase">XP Protocol</span>
                      <span className="text-primary font-bold font-display text-xl">{user.xp?.toLocaleString() || 0}</span>
                  </div>
              </div>
          </section>
        </div>

        {/* Library & Activity */}
        <div className="lg:col-span-2 space-y-12">
          {isCurrentUser && (
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <Library className="w-6 h-6 text-primary" />
                  <h2 className="font-display font-bold text-2xl uppercase tracking-tighter">Current Archive</h2>
                </div>
                <button onClick={() => navigate('/library')} className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                   Deploy Full View <ExternalLink size={12} />
                </button>
              </div>
              
              {library.length === 0 ? (
                <div className="bg-surface/50 border border-dashed border-border p-12 rounded-[32px] text-center space-y-4">
                  <p className="text-muted italic text-sm">No data points saved in active archive.</p>
                  <button onClick={() => navigate('/search')} className="text-[10px] font-bold text-white bg-surface-2 px-6 py-2 rounded-full uppercase tracking-tighter border border-border hover:border-primary transition-all">
                    Search Registry
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {library.slice(0, 3).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => navigate(`/search?q=${item.media_items?.title}`)}
                      className="aspect-[2/3] rounded-2xl overflow-hidden relative group cursor-pointer shadow-xl border border-border/50"
                    >
                      <img src={item.media_items?.cover_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">{item.media_items?.type}</p>
                        <p className="text-xs font-bold text-white line-clamp-1 italic">{item.media_items?.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <h2 className="font-display font-bold text-2xl uppercase tracking-tighter">Transmission Registry</h2>
              <span className="text-[10px] text-muted font-bold uppercase tracking-widest">{posts.length} Transmissions</span>
            </div>
            {posts.length === 0 ? (
              <div className="bg-surface/50 border border-border rounded-[32px] p-10 text-center">
                <p className="text-muted text-sm italic">Zero radio chatter detected from this origin.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {posts.map((post: any) => (
                  <div key={post.id} className="bg-surface border-l-4 border-primary border border-border rounded-2xl p-8 hover:bg-surface-2/50 transition-all duration-300 shadow-lg">
                    <p className="mb-4 text-text/90 italic leading-relaxed font-medium">"{post.content}"</p>
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <span className="text-[9px] text-muted font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                         Secure Transmission Locked
                      </span>
                      <span className="text-[9px] text-muted font-bold uppercase">{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

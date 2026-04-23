import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProfileByUsername, getUserAchievements } from '../lib/reaperhub/queries';
import { Award, Lock } from 'lucide-react';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      getProfileByUsername(username).then(res => {
        setData(res);
        if (res?.user?.id) {
          getUserAchievements(res.user.id).then(setAchievements);
        }
        setLoading(false);
      });
    }
  }, [username]);

  if (loading) return <div className="text-center py-20 text-muted">Loading profile...</div>;

  if (!data || !data.user) {
    return (
      <div className="text-center py-20 text-muted bg-surface rounded-[18px] border border-border">
        User not found.
      </div>
    );
  }

  const { user, posts } = data;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Profile Header Card */}
      <div className="bg-surface border border-border rounded-[24px] p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-2/10 rounded-full blur-[80px] pointer-events-none translate-y-1/2 -translate-x-1/3 opacity-30"></div>
        
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-surface-2 border-4 border-primary-2/30 flex items-center justify-center overflow-hidden flex-shrink-0 relative z-10 shadow-[0_0_30px_rgba(124,92,255,0.2)]">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
          ) : (
            <span className="text-primary-2 font-display font-bold text-5xl">{user.username?.[0]?.toUpperCase()}</span>
          )}
        </div>
        
        <div className="flex-1 relative z-10 pt-4">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
            <h1 className="font-display font-bold text-4xl md:text-5xl text-white tracking-tight">{user.username}</h1>
            <div className="flex justify-center md:justify-start">
              <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/30">
                Slayer Apprentice
              </span>
            </div>
          </div>
          
          <p className="text-muted text-sm mb-6 flex items-center justify-center md:justify-start gap-2">
            <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
            Member since {new Date(user.created_at).toLocaleDateString()}
          </p>
          
          <div className="bg-surface-2/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-2 mb-2">Biography</h3>
            {user.bio ? (
              <p className="text-text leading-relaxed text-sm md:text-base whitespace-pre-wrap">{user.bio}</p>
            ) : (
              <p className="text-muted italic text-sm">Target has not updated their dossier yet. Initializing default bio placeholder...</p>
            )}
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Award className="w-6 h-6 text-primary" />
          <h2 className="font-display font-bold text-2xl uppercase tracking-wide">Killstreak & Medals</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {achievements.map((badge) => (
            <div 
              key={badge.id}
              className={`relative overflow-hidden rounded-2xl border p-4 text-center transition-all duration-300 ${
                badge.unlocked 
                  ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(124,92,255,0.1)] grayscale-0 opacity-100' 
                  : 'border-border bg-surface-2/50 grayscale opacity-40'
              }`}
            >
              <div className="text-4xl mb-2 drop-shadow-md">{badge.icon}</div>
              <h3 className={`text-xs font-bold uppercase tracking-tighter mb-1 ${badge.unlocked ? 'text-text' : 'text-muted'}`}>
                {badge.title}
              </h3>
              <p className="text-[10px] text-muted leading-tight line-clamp-2">
                {badge.description}
              </p>
              {!badge.unlocked && (
                <div className="absolute top-2 right-2">
                  <Lock size={12} className="text-muted/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="font-display font-bold text-2xl uppercase tracking-wide">Public Activity</h2>
          <span className="text-xs text-muted font-bold uppercase">{posts.length} Posts</span>
        </div>
        {posts.length === 0 ? (
          <div className="bg-surface border border-border rounded-[18px] p-6 text-center text-muted">
            This user hasn't posted anything publicly yet.
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post: any) => (
              <div key={post.id} className="bg-surface border border-border rounded-[18px] p-[20px]">
                <p className="mb-2 whitespace-pre-wrap">{post.content}</p>
                <p className="text-xs text-muted">{new Date(post.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

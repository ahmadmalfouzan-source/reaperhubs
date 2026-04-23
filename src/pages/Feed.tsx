import { useEffect, useState, useCallback } from 'react';
import { getFeedItems, createPost, getCurrentUser } from '../lib/reaperhub/queries';
import { Link } from 'react-router-dom';
import { MessageSquare, Heart, Share2, Image as ImageIcon, Film, Gamepad2, Send, MoreHorizontal, User } from 'lucide-react';
import { cn } from '../lib/utils';

const TAGS = [
  { id: 'general', label: 'General', icon: <MessageSquare size={14} />, color: 'text-muted' },
  { id: 'movie', label: 'Movie', icon: <Film size={14} />, color: 'text-primary' },
  { id: 'series', label: 'TV Show', icon: <Zap className="w-3.5 h-3.5" />, color: 'text-primary-2' }, // Zap icon for series consistency
  { id: 'game', label: 'Game', icon: <Gamepad2 size={14} />, color: 'text-success' },
];

// Helper Zap icon since I can't import it easily here twice
function Zap({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M4 14.71 12 3.12l1 6.59L20 9.29l-8 11.59-1-6.59L4 14.71z" />
    </svg>
  );
}

export default function Feed() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [selectedTag, setSelectedTag] = useState('general');
  const [posting, setPosting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    const data = await getFeedItems();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    getCurrentUser().then(setUser);
    fetchFeed();
  }, [fetchFeed]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    
    // We'll append the tag to the content title-style for now as posts table might not have tag field
    const taggedContent = selectedTag !== 'general' ? `[${selectedTag.toUpperCase()}] ${content}` : content;
    
    const { error } = await createPost(taggedContent);
    setPosting(false);
    if (!error) {
      setContent('');
      setSelectedTag('general');
      fetchFeed();
    }
  };

  const toggleLike = (postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="font-display font-bold text-4xl uppercase tracking-tighter text-white">Transmission</h1>
        <p className="text-muted text-sm">Real-time status updates from the collective.</p>
      </div>

      {user && (
        <div className="bg-surface border border-border shadow-xl rounded-[32px] p-6 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] pointer-events-none"></div>
          
          <form onSubmit={handlePost} className="space-y-4 relative z-10">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Broadcast your status..."
                className="w-full bg-[#0e1430]/50 border border-border/50 rounded-2xl p-4 text-text focus:outline-none focus:border-primary transition-all min-h-[120px] resize-none shadow-inner"
              ></textarea>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                {TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setSelectedTag(tag.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all",
                      selectedTag === tag.id 
                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-surface-2 border-border text-muted hover:border-text/30"
                    )}
                  >
                    {tag.icon}
                    {tag.label}
                  </button>
                ))}
              </div>
              
              <button
                type="submit"
                disabled={posting || !content.trim()}
                className="bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl px-8 py-3 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20 group"
              >
                {posting ? 'Broadcasting...' : (
                  <>
                    <span>Post</span>
                    <Send size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-surface border border-border rounded-[32px] animate-pulse"></div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-24 text-muted bg-surface/50 rounded-[32px] border border-dashed border-border border-2 flex flex-col items-center justify-center">
          <MessageSquare className="w-16 h-16 mb-6 opacity-10" />
          <p className="text-lg font-medium opacity-50">Silence detected in this sector.</p>
          <p className="text-sm opacity-30 mt-2">Initialize your first transmission above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item) => (
            <div key={item.id} className="group bg-surface border border-border/50 hover:border-primary/30 shadow-2xl rounded-[32px] p-6 transition-all duration-300">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border flex items-center justify-center overflow-hidden shadow-lg">
                    {item.users?.avatar_url ? (
                      <img src={item.users.avatar_url} alt={item.users?.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <span className="text-primary font-bold text-xl">{item.users?.username?.[0]?.toUpperCase() || '?'}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Link to={`/profile/${item.users?.username || ''}`} className="font-display font-bold text-lg text-white hover:text-primary transition-colors block leading-tight">
                      {item.users?.username || 'Redacted Agent'}
                    </Link>
                    <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                      <span className="font-bold text-primary-2 uppercase tracking-widest">Slayer-X</span>
                      <span className="w-1 h-1 bg-border rounded-full"></span>
                      <span>{new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).getHours()}:00</span>
                    </div>
                  </div>
                </div>
                <button className="p-2 text-muted hover:text-text hover:bg-surface-2 rounded-xl transition-all">
                  <MoreHorizontal size={18} />
                </button>
              </div>

              <div className="pl-1 space-y-4">
                <p className="text-text leading-relaxed whitespace-pre-wrap text-base md:text-lg">
                  {item.content}
                </p>

                <div className="flex items-center gap-6 pt-4 border-t border-border/30">
                  <button 
                    onClick={() => toggleLike(item.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl transition-all group",
                      likedPosts.has(item.id) ? "text-danger bg-danger/10 shadow-inner" : "text-muted hover:text-danger hover:bg-danger/5"
                    )}
                  >
                    <Heart className={cn("w-5 h-5 transition-transform group-active:scale-125", likedPosts.has(item.id) && "fill-current")} />
                    <span className="text-xs font-bold">{likedPosts.has(item.id) ? 14 : 13}</span>
                  </button>
                  
                  <button className="flex items-center gap-2 px-3 py-2 text-muted hover:text-primary hover:bg-primary/5 rounded-xl transition-all group">
                    <MessageSquare size={18} className="transition-transform group-active:scale-110" />
                    <span className="text-xs font-bold">4</span>
                  </button>
                  
                  <button className="flex items-center gap-2 px-3 py-2 text-muted hover:text-success hover:bg-success/5 rounded-xl transition-all group">
                    <Share2 size={18} className="transition-transform group-active:scale-110" />
                    <span className="text-xs font-bold">Share</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

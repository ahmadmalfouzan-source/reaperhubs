import { useEffect, useState, useCallback } from 'react';
import { getFeedItems, getCurrentUser, createPost, toggleLike, getUserLikes, deletePost, updatePost } from '../lib/reaperhub/queries';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { MessageSquare, Heart, Share2, Film, Gamepad2, Send, MoreHorizontal, User, TrendingUp, Sparkles, Hash, Users, Zap as ZapIcon, Loader2, Calendar, Edit3, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from '../lib/toastUtils';
import CommentSection from '../components/CommentSection';

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
  const [activeComments, setActiveComments] = useState<Set<string>>(new Set());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    const [feedData, userLikes] = await Promise.all([
      getFeedItems(),
      getUserLikes()
    ]);
    setItems(feedData);
    setLikedPosts(new Set(userLikes));
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
    
    try {
      const postType = selectedTag === 'general' ? 'status' : selectedTag === 'movie' ? 'review_share' : selectedTag === 'series' ? 'review_share' : selectedTag === 'game' ? 'review_share' : 'status';
      const result = await createPost(content, postType);
      if (result.success) {
        setContent('');
        setSelectedTag('general');
        fetchFeed();
        toast.transmission.sent();
      } else {
        throw new Error(result.error || 'Failed to post');
      }
    } catch (error) {
      console.error('Post error:', error);
      toast.transmission.error();
    } finally {
      setPosting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    // Optimistic UI update
    const isLiked = likedPosts.has(postId);
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });

    // Update item like_count locally for immediate feedback
    setItems(prev => prev.map(item => 
      item.id === postId 
        ? { ...item, like_count: (item.like_count || 0) + (isLiked ? -1 : 1) } 
        : item
    ));

    const result = await toggleLike(postId);
    if (!result.success) {
      // Revert on failure
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (isLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setItems(prev => prev.map(item => 
        item.id === postId 
          ? { ...item, like_count: (item.like_count || 0) + (isLiked ? 1 : -1) } 
          : item
      ));
      toast.error("Like failed to sync.");
    }
  };

  const toggleComments = (postId: string) => {
    setActiveComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Abort this transmission? This action cannot be undone.")) return;
    
    const result = await deletePost(postId);
    if (result.success) {
      setItems(prev => prev.filter(item => item.id !== postId));
      toast.transmission.deleted();
    } else {
      toast.error("Failed to abort transmission.");
    }
    setMenuOpenId(null);
  };

  const startEditing = (post: any) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
    setMenuOpenId(null);
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostId || !editContent.trim()) return;

    setUpdating(true);
    const result = await updatePost(editingPostId, editContent.trim());
    if (result.success) {
      setItems(prev => prev.map(item => 
        item.id === editingPostId ? { ...item, content: editContent.trim(), body: editContent.trim() } : item
      ));
      setEditingPostId(null);
      setEditContent('');
      toast.transmission.updated();
    } else {
      toast.error("Failed to recalibrate transmission.");
    }
    setUpdating(false);
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 animate-in fade-in duration-700">
      <div className="lg:col-span-2 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-2">
            Collective Pulse
          </div>
          <h1 className="font-display font-bold text-4xl md:text-5xl uppercase tracking-tighter text-white">Transmission Feed</h1>
          <p className="text-muted text-sm font-medium">Monitoring secure radio updates from across the territories.</p>
        </div>

        {user && (
          <div className="bg-surface border-2 border-border/50 shadow-2xl rounded-[40px] p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
            
            <form onSubmit={handlePost} className="space-y-6 relative z-10">
              <div className="flex gap-5">
                <div className="w-14 h-14 rounded-3xl bg-surface-2 border-2 border-border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg group-hover:border-primary/30 transition-all">
                  {user.avatar_url ? (
                    <img loading="lazy"  src={user.avatar_url} alt="You" className="w-full h-full object-cover"  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Broadcast your status..."
                    className="w-full bg-surface-2/50 border border-border/50 rounded-2xl p-5 text-text focus:outline-none focus:border-primary transition-all min-h-[140px] resize-none shadow-inner text-lg italic font-medium placeholder:text-muted/30"
                  ></textarea>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-border/30">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {TAGS.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setSelectedTag(tag.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                        selectedTag === tag.id 
                          ? "bg-primary border-primary text-black shadow-xl shadow-primary/20 scale-105" 
                          : "bg-surface-2 border-border text-muted hover:border-text/30"
                      )}
                    >
                      <Hash size={12} />
                      {tag.label}
                    </button>
                  ))}
                </div>
                
                <button
                  type="submit"
                  disabled={posting || !content.trim()}
                  className="bg-primary hover:bg-primary/90 text-black font-bold rounded-2xl px-10 py-4 transition-all disabled:opacity-50 flex items-center gap-3 shadow-2xl shadow-primary/30 group/btn active:scale-95"
                >
                  {posting ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <>
                      <span>Transmit</span>
                      <Send size={18} className="transition-transform group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-surface border border-border rounded-[40px] animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32 bg-surface/30 rounded-[48px] border-2 border-dashed border-border/50 flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-surface-2 rounded-full flex items-center justify-center border border-border">
              <MessageSquare className="w-12 h-12 text-muted opacity-10" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-display font-bold text-white uppercase tracking-tight opacity-50">Radio Silence</p>
              <p className="text-sm text-muted italic max-w-xs mx-auto">No signals detected in this cluster. Initiate a broadcast to start the chain.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {items.map((item) => (
              <div key={item.id} className="group bg-surface border-2 border-border/30 hover:border-primary/50 shadow-2xl rounded-[48px] p-8 md:p-10 transition-all duration-500 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-5">
                    <Link to={`/profile/${item.users?.username || ''}`} className="relative group/avatar">
                      <div className="w-14 h-14 rounded-3xl bg-surface-2 border-2 border-border overflow-hidden shadow-2xl transition-all group-hover/avatar:border-primary/80 group-hover/avatar:shadow-[0_0_20px_rgba(0,183,255,0.3)]">
                        {item.users?.avatar_url ? (
                          <img loading="lazy"  src={item.users.avatar_url} alt={item.users?.username} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            <span className="text-primary font-display font-bold text-2xl">{item.users?.username?.[0]?.toUpperCase() || '?'}</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success border-4 border-surface rounded-full shadow-lg"></div>
                    </Link>
                    <div>
                      <Link to={`/profile/${item.users?.username || ''}`} className="font-display font-bold text-xl text-white hover:text-primary transition-colors block leading-tight tracking-tight uppercase">
                        {item.users?.username || 'Redacted Agent'}
                      </Link>
                      <div className="flex items-center gap-3 text-[10px] md:text-xs text-muted mt-1.5 font-bold uppercase tracking-widest">
                        <span className="text-primary-2">Field Operative</span>
                        <span className="w-1 h-1 bg-border rounded-full"></span>
                        <span className="flex items-center gap-1.5 opacity-60">
                           <Calendar size={12} />
                           {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                      className="p-3 text-muted hover:text-white hover:bg-surface-2 rounded-2xl transition-all border border-transparent hover:border-border"
                    >
                      <MoreHorizontal size={20} />
                    </button>

                    {menuOpenId === item.id && user && item.user_id === user.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button 
                          onClick={() => startEditing(item)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted hover:text-primary hover:bg-primary/5 transition-all"
                        >
                          <Edit3 size={14} />
                          Edit Signal
                        </button>
                        <button 
                          onClick={() => handleDeletePost(item.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted hover:text-danger hover:bg-danger/5 transition-all border-t border-border/50"
                        >
                          <Trash2 size={14} />
                          Abort Trans
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pl-1 space-y-6">
                  <div className="relative">
                    {editingPostId === item.id ? (
                      <form onSubmit={handleUpdatePost} className="space-y-4 animate-in fade-in duration-300">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-surface-2/50 border border-primary/30 rounded-2xl p-4 text-text focus:outline-none focus:border-primary transition-all min-h-[100px] resize-none italic font-medium"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={updating || !editContent.trim()}
                            className="bg-primary hover:bg-primary/90 text-black font-bold rounded-xl px-6 py-2 text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {updating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            Recalibrate
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPostId(null)}
                            className="bg-surface-2 border border-border text-muted hover:text-white font-bold rounded-xl px-6 py-2 text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <p className="text-text/90 leading-relaxed whitespace-pre-wrap text-lg md:text-xl font-medium italic border-l-4 border-primary/30 pl-6 py-2 bg-primary/5 rounded-r-3xl pr-6">
                          "{item.content}"
                        </p>
                        <Sparkles size={20} className="text-primary/10 absolute -top-4 -right-2 rotate-12" />
                      </>
                    )}
                  </div>

                  {item.media_type && (
                     <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-2/10 border border-primary-2/20 rounded-xl text-[10px] font-bold text-primary-2 uppercase tracking-[0.2em] shadow-lg">
                        <ZapIcon size={12} className="fill-current" />
                        Intel Sector: {item.media_type}
                     </div>
                  )}

                  <div className="flex flex-wrap items-center gap-6 pt-8 border-t border-border/30">
                    <button 
                      onClick={() => handleToggleLike(item.id)}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 rounded-2xl transition-all group/stat",
                        likedPosts.has(item.id) 
                          ? "text-danger bg-danger/10 shadow-inner border border-danger/20" 
                          : "text-muted hover:text-danger hover:bg-danger/5 border border-transparent hover:border-danger/10"
                      )}
                    >
                      <Heart className={cn("w-5 h-5 transition-transform group-active/stat:scale-150", likedPosts.has(item.id) && "fill-current")} />
                      <span className="text-xs font-bold leading-none">{item.like_count || 0}</span>
                    </button>
                    
                    <button 
                      onClick={() => toggleComments(item.id)}
                      className={cn(
                        "flex items-center gap-3 px-5 py-3 rounded-2xl transition-all group/stat",
                        activeComments.has(item.id) 
                          ? "text-primary bg-primary/10 border border-primary/20" 
                          : "text-muted hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10"
                      )}
                    >
                      <MessageSquare size={18} className="transition-transform group-active/stat:scale-125" />
                      <span className="text-xs font-bold leading-none">{item.comment_count || 0}</span>
                    </button>
                    
                    <button className="flex items-center gap-3 px-5 py-3 text-muted hover:text-success hover:bg-success/5 rounded-2xl transition-all group/stat border border-transparent hover:border-success/10 ml-auto">
                      <Share2 size={18} className="transition-transform group-active/stat:scale-125" />
                      <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Broadcast</span>
                    </button>
                  </div>

                  {activeComments.has(item.id) && (
                    <CommentSection 
                      postId={item.id} 
                      onCommentAdded={() => {
                        // Optimistically update comment count or refetch
                        setItems(prev => prev.map(i => 
                          i.id === item.id ? { ...i, comment_count: (i.comment_count || 0) + 1 } : i
                        ));
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block space-y-10 sticky top-28 h-fit">
        <section className="bg-surface border-2 border-border/50 rounded-[40px] p-8 space-y-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-2/5 blur-[80px] pointer-events-none group-hover:bg-primary-2/10 transition-all"></div>
          <div className="flex items-center gap-3 border-b border-border/30 pb-4">
             <TrendingUp className="text-primary-2 w-6 h-6" />
             <h3 className="font-display font-bold text-2xl uppercase tracking-tighter text-white">Registry Trends</h3>
          </div>
          <div className="space-y-5">
            {['#REAPERHAB', '#SUMMER_SLAY', '#TV_INTEL', '#GAME_ARCHIVE'].map((tag, i) => (
              <div key={tag} className="group/tag cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-muted/30 font-mono text-[10px] font-bold">0{i+1}</span>
                  <span className="text-muted group-hover/tag:text-primary transition-all font-bold text-sm uppercase tracking-widest">{tag}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[9px] text-muted font-mono uppercase">Signal</span>
                   <span className="text-[10px] text-primary-2 font-display font-bold">+ {Math.floor(Math.random() * 200)}%</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted hover:text-primary transition-all bg-surface-2/50 rounded-2xl border border-border/50 hover:border-primary/30">
            Monitor All Trends
          </button>
        </section>

        <section className="bg-surface border-2 border-border/50 rounded-[40px] p-8 space-y-8 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-border/30 pb-4">
             <Users className="text-success w-6 h-6" />
             <h3 className="font-display font-bold text-2xl uppercase tracking-tighter text-white">Active Agents</h3>
          </div>
          <div className="space-y-5">
             {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 group/agent cursor-pointer">
                  <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border group-hover/agent:border-success/50 transition-all flex items-center justify-center group-hover/agent:shadow-[0_0_15px_rgba(0,255,163,0.2)]">
                     <User size={20} className="text-muted group-hover/agent:text-success transition-colors" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-3/4 bg-surface-2 rounded-full overflow-hidden">
                       <div className="h-full bg-border w-full group-hover/agent:w-1/2 transition-all"></div>
                    </div>
                    <div className="h-2 w-1/2 bg-surface-2/50 rounded-full" />
                  </div>
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,163,0.5)]"></div>
                </div>
             ))}
          </div>
          <button className="w-full py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-success border border-success/20 rounded-2xl hover:bg-success/5 transition-all shadow-lg active:scale-95 transform">
            Secure Recruitment
          </button>
        </section>
      </div>
    </div>
  );
}

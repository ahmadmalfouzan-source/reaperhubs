import { useEffect, useState, useCallback } from 'react';
import { getFeedItems, getCurrentUser, createPost, toggleLike, getUserLikes, deletePost, updatePost } from '../lib/reaperhub/queries';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, Heart, Share2, Trash2, User, 
  Send, Zap, Sparkles, X, TrendingUp, Users, Loader2, Edit3, Check
} from 'lucide-react';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';
import { PostSkeleton } from '../components/Skeleton';
import { cn } from '../lib/utils';
import { toast } from '../lib/toastUtils';
import CommentSection from '../components/CommentSection';

export default function Feed() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [activeComments, setActiveComments] = useState<Set<string>>(new Set());
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFeed = useCallback(async () => {
    try {
      const [feedData, userLikes] = await Promise.all([
        getFeedItems(),
        getUserLikes()
      ]);
      setItems(feedData);
      setLikedPosts(new Set(userLikes));
    } catch (err) {
      console.error('Feed fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentUser().then(setUser);
    fetchFeed();
  }, [fetchFeed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const result = await createPost(newPost);
      if (result.success) {
        setNewPost('');
        fetchFeed();
        toast.transmission.sent();
      } else {
        toast.transmission.error();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    const isLiked = likedPosts.has(postId);
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    
    // Optimistic UI for like count
    setItems(prev => prev.map(item => {
      if (item.id === postId) {
        return {
          ...item,
          like_count: (item.like_count || 0) + (isLiked ? -1 : 1)
        };
      }
      return item;
    }));

    await toggleLike(postId);
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("Abort this transmission?")) return;
    try {
      await deletePost(postId);
      setItems(prev => prev.filter(i => i.id !== postId));
      toast.success("Transmission scrubbed.");
    } catch (err) {
      toast.error("Failed to scrub transmission.");
    }
  };

  const handleStartEdit = (post: any) => {
    setEditingPostId(post.id);
    setEditContent(post.content || post.body);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPostId || !editContent.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      const res = await updatePost(editingPostId, editContent);
      if (res.success) {
        setItems(prev => prev.map(item => 
          item.id === editingPostId ? { ...item, content: editContent, body: editContent } : item
        ));
        setEditingPostId(null);
        toast.success("Transmission recalibrated.");
      }
    } finally {
      setIsUpdating(false);
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

  return (
    <div className="min-h-screen pt-20 pb-20 px-4 md:px-8 relative overflow-hidden bg-bg-base">
      <ScanlineOverlay className="opacity-10" />
      <TacticalGrid className="opacity-5" />
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 relative z-10">
        <div className="space-y-8">
          <header className="space-y-2 border-b border-surface-3 pb-8">
            <div className="flex items-center gap-2 text-accent-purple text-[10px] font-bold uppercase tracking-[0.4em]">
              <Zap size={14} className="fill-current" />
              Satellite Uplink: Online
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-tighter italic text-white">Tactical Feed</h1>
            <p className="text-muted text-sm font-medium tracking-wide">Secure communications channel for all active operatives.</p>
          </header>

          {/* Post Composer */}
          {user && (
            <div className="card p-6 border-accent-purple/20 bg-accent-purple/5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center flex-shrink-0 border border-surface-3">
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User size={20} className="text-muted" />
                    )}
                  </div>
                  <textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="Broadcast intelligence to the network..."
                    className="input min-h-[100px] bg-surface-2/30 border-none focus:ring-0 resize-none py-3 italic"
                  />
                </div>
                <div className="flex justify-end pt-2 border-t border-surface-3/30">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newPost.trim()}
                    className="btn btn-primary px-8 h-10"
                  >
                    {isSubmitting ? (
                      <><Loader2 size={16} className="animate-spin" /> Transmitting...</>
                    ) : (
                      <><Send size={16} /> Broadcast</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Feed Items */}
          <div className="space-y-6">
            {loading ? (
              [...Array(5)].map((_, i) => <PostSkeleton key={i} />)
            ) : items.length === 0 ? (
              <div className="card h-64 flex flex-col items-center justify-center text-center p-8 space-y-4 border-dashed">
                <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center text-muted/20">
                  <MessageSquare size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold uppercase tracking-widest text-white">No Signals</h3>
                  <p className="text-xs text-muted max-w-xs">The frequency is quiet. Be the first to establish a transmission.</p>
                </div>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="card p-6 space-y-6 group animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center border border-surface-3 overflow-hidden shadow-lg">
                        {item.users?.avatar_url ? (
                          <img src={item.users.avatar_url} alt={item.users.username} className="w-full h-full object-cover" />
                        ) : (
                          <User size={24} className="text-muted" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white hover:text-accent-purple transition-colors cursor-pointer">
                            {item.users?.display_name || item.users?.username || 'Unknown Operative'}
                          </span>
                          {item.users?.is_verified && <Check size={12} className="text-accent-purple fill-current" />}
                        </div>
                        <span className="text-[10px] text-muted font-mono uppercase tracking-widest">
                          {new Date(item.created_at).toLocaleDateString()} // {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    
                    {user?.id === item.user_id && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleStartEdit(item)} className="btn btn-ghost !p-2 rounded-lg text-muted hover:text-white">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="btn btn-ghost !p-2 rounded-lg text-muted hover:text-accent-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pl-16 space-y-4">
                    {editingPostId === item.id ? (
                      <form onSubmit={handleUpdate} className="space-y-4">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="input min-h-[120px] bg-surface-3 border-accent-purple/30 italic"
                        />
                        <div className="flex gap-2">
                          <button type="submit" disabled={isUpdating} className="btn btn-primary h-9 px-6 text-xs">
                            {isUpdating ? <Loader2 size={14} className="animate-spin" /> : 'Update Transmission'}
                          </button>
                          <button type="button" onClick={() => setEditingPostId(null)} className="btn btn-ghost h-9 px-6 text-xs border border-surface-3">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-text/90 text-lg leading-relaxed italic border-l-2 border-accent-purple/20 pl-6">
                        "{item.content || item.body}"
                      </p>
                    )}

                    <div className="flex items-center gap-6 pt-4">
                      <button 
                        onClick={() => handleToggleLike(item.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest",
                          likedPosts.has(item.id) 
                            ? "bg-accent-danger/10 text-accent-danger border border-accent-danger/20" 
                            : "text-muted hover:text-accent-danger hover:bg-accent-danger/5"
                        )}
                      >
                        <Heart size={16} className={cn(likedPosts.has(item.id) && "fill-current")} />
                        {item.like_count || 0}
                      </button>
                      
                      <button 
                        onClick={() => toggleComments(item.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-xs font-bold uppercase tracking-widest",
                          activeComments.has(item.id) 
                            ? "bg-accent-purple/10 text-accent-purple border border-accent-purple/20" 
                            : "text-muted hover:text-accent-purple hover:bg-accent-purple/5"
                        )}
                      >
                        <MessageSquare size={16} />
                        {item.comment_count || 0}
                      </button>
                      
                      <button className="flex items-center gap-2 px-4 py-2 text-muted hover:text-white transition-all text-xs font-bold uppercase tracking-widest ml-auto">
                        <Share2 size={16} />
                        Broadcast
                      </button>
                    </div>

                    {activeComments.has(item.id) && (
                      <div className="pt-6 animate-in slide-in-from-top-4 duration-300">
                        <CommentSection 
                          postId={item.id} 
                          onCommentAdded={() => {
                            setItems(prev => prev.map(i => 
                              i.id === item.id ? { ...i, comment_count: (i.comment_count || 0) + 1 } : i
                            ));
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block space-y-8 sticky top-24 h-fit">
          <section className="card p-6 space-y-6 bg-surface-2/30">
            <div className="flex items-center gap-3 border-b border-surface-3 pb-4">
               <TrendingUp size={20} className="text-accent-purple" />
               <h3 className="font-display font-bold text-xl uppercase tracking-tighter text-white">Network Trends</h3>
            </div>
            <div className="space-y-4">
              {['#REAPERHUB', '#COVERT_OP', '#INTEL_SECURE', '#BATTLE_READY'].map((tag, i) => (
                <div key={tag} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-muted font-mono">0{i+1}</span>
                    <span className="text-xs font-bold text-muted group-hover:text-accent-purple transition-colors tracking-widest">{tag}</span>
                  </div>
                  <span className="text-[10px] text-accent-purple font-mono font-bold">+ {Math.floor(Math.random() * 200)}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6 space-y-6 bg-surface-2/30">
            <div className="flex items-center gap-3 border-b border-surface-3 pb-4">
               <Users size={20} className="text-accent-purple" />
               <h3 className="font-display font-bold text-xl uppercase tracking-tighter text-white">Active Agents</h3>
            </div>
            <div className="space-y-4">
               {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center border border-surface-3">
                       <User size={18} className="text-muted" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="h-2 w-3/4 bg-surface-3 rounded-full overflow-hidden">
                         <div className="h-full bg-accent-purple w-1/2"></div>
                      </div>
                      <div className="h-1.5 w-1/2 bg-surface-3/50 rounded-full" />
                    </div>
                    <div className="w-2 h-2 bg-accent-purple rounded-full animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.5)]"></div>
                  </div>
               ))}
            </div>
            <button className="btn btn-ghost w-full text-[10px] uppercase tracking-[0.2em] h-10 border border-surface-3">
              Secure Recruitment
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

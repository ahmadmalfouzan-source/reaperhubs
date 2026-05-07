import { useState, useEffect } from 'react';
import { getComments, addComment } from '../lib/reaperhub/queries';
import { User, Send, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface CommentSectionProps {
  postId: string;
  onCommentAdded?: () => void;
}

export default function CommentSection({ postId, onCommentAdded }: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchComments() {
      setLoading(true);
      const data = await getComments(postId);
      setComments(data);
      setLoading(false);
    }
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    const result = await addComment(postId, newComment.trim());
    if (result.success) {
      setComments([...comments, result.data]);
      setNewComment('');
      if (onCommentAdded) onCommentAdded();
      toast.success("Response recorded.");
    } else {
      toast.error("Failed to transmit comment.");
    }
    setSubmitting(false);
  };

  return (
    <div className="mt-6 pt-6 border-t border-border/30 animate-in slide-in-from-top duration-500">
      <div className="space-y-6 mb-8">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 opacity-40 italic text-sm">
            No secure messages in this thread.
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4 group/comment animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-2xl bg-surface-2 border border-border overflow-hidden flex-shrink-0">
                {comment.users?.avatar_url ? (
                  <img loading="lazy" src={comment.users.avatar_url} alt={comment.users?.username} className="w-full h-full object-cover"  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=300&q=80'; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm text-white uppercase tracking-tight">
                    {comment.users?.username || 'Unknown Agent'}
                  </span>
                  <span className="text-[10px] text-muted uppercase tracking-widest font-bold opacity-50">
                    {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-text/80 leading-relaxed italic bg-surface-2/30 p-3 rounded-2xl border border-border/20">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative group/form">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-2xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 shadow-lg group-focus-within/form:border-primary/50 transition-all">
            <MessageSquare size={16} className="text-primary opacity-50" />
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Encrypted response..."
              className="flex-1 bg-surface-2/50 border border-border/50 rounded-2xl px-5 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50 transition-all italic font-medium placeholder:text-muted/30"
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-primary hover:bg-primary/90 text-black font-bold rounded-2xl px-4 transition-all disabled:opacity-50 active:scale-95 shadow-lg shadow-primary/20"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

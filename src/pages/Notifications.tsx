import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getCurrentUser, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/reaperhub/queries';
import { Bell, Heart, UserPlus, Zap, Award, CheckCheck, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Skeleton from '../components/Skeleton';

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const data = await getNotifications();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    let subscription: any;

    getCurrentUser().then(user => {
      if (!user) {
        navigate('/login');
        return;
      }

      fetchNotifications();

      // Simple real-time listener (DISABLED)
      /*
      subscription = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => fetchNotifications()
        )
        .subscribe();
      */
    });

    return () => {
      // if (subscription) supabase.removeChannel(subscription);
    };
  }, [navigate]);

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    const success = await markNotificationAsRead(id);
    if (success) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, is_read: true } : item));
    }
  };

  const handleMarkAllAsRead = async () => {
    const success = await markAllNotificationsAsRead();
    if (success) {
      setItems(prev => prev.map(item => ({ ...item, is_read: true })));
    }
  };

  const getIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'like': return <Heart className="w-5 h-5 text-danger" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'level_up': return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'achievement': return <Award className="w-5 h-5 text-primary" />;
      default: return <Bell className="w-5 h-5 text-primary-2" />;
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-2xl" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-[24px]" />
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = items.filter(i => !i.is_read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-surface border border-border rounded-2xl shadow-lg">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl uppercase tracking-tighter">Communications</h1>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface-2 border border-border rounded-xl text-sm md:text-xs font-bold transition-all group"
          >
            <CheckCheck size={14} className="group-hover:text-primary transition-colors" />
            Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-24 text-muted bg-surface/50 rounded-[32px] border border-dashed border-border flex flex-col items-center justify-center space-y-2">
          <Bell className="w-16 h-16 mb-4 opacity-10" />
          <p className="text-sm text-muted italic">All clear. No new transmissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleMarkAsRead(item.id, item.is_read)}
              className={`group bg-surface border rounded-[24px] p-5 flex gap-5 transition-all duration-300 relative cursor-pointer ${
                !item.is_read ? 'border-primary/30 shadow-[0_0_20px_rgba(124,92,255,0.05)]' : 'border-border/50 opacity-70 hover:opacity-100 grayscale hover:grayscale-0'
              }`}
            >
              <div className={`p-3 rounded-2xl flex-shrink-0 self-start transition-colors ${
                !item.is_read ? 'bg-primary/10' : 'bg-surface-2'
              }`}>
                {getIcon(item.type)}
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm md:text-sm md:text-xs font-bold uppercase tracking-widest ${
                    !item.is_read ? 'text-primary' : 'text-muted'
                  }`}>
                    {item.type?.replace('_', ' ') || 'Intel'}
                  </span>
                  <span className="w-1 h-1 bg-border rounded-full"></span>
                  <div className="flex items-center gap-1 text-sm md:text-sm md:text-xs text-muted">
                    <Clock size={10} />
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <p className={`text-sm leading-relaxed ${!item.is_read ? 'text-text font-medium' : 'text-muted'}`}>
                  {item.content}
                </p>
              </div>

              {!item.is_read && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]"></div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

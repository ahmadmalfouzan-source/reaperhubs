import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getCurrentUser, markNotificationAsRead, markAllNotificationsAsRead } from '../lib/reaperhub/queries';
import { Bell, Heart, UserPlus, Zap, Award, CheckCheck, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Skeleton from '../components/Skeleton';
import { TacticalGrid, ScanlineOverlay } from '../components/Decorative';

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
      case 'like': return <Heart className="w-5 h-5 text-accent-danger" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-accent-primary" />;
      case 'level_up': return <Zap className="w-5 h-5 text-accent-warning" />;
      case 'achievement': return <Award className="w-5 h-5 text-accent-primary" />;
      default: return <Bell className="w-5 h-5 text-accent-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-24 px-4 md:px-8 relative overflow-hidden bg-bg-base">
        <ScanlineOverlay className="opacity-10" />
        <TacticalGrid className="opacity-5" />
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
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
      </div>
    );
  }

  const unreadCount = items.filter(i => !i.is_read).length;

  return (
    <div className="min-h-screen pt-24 pb-24 px-4 md:px-8 relative overflow-hidden bg-bg-base">
      <ScanlineOverlay className="opacity-10" />
      <TacticalGrid className="opacity-5" />
      <div className="max-w-2xl mx-auto space-y-8 relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-surface-2 border border-surface-3 rounded-2xl shadow-5">
            <Bell className="w-6 h-6 text-accent-primary" />
          </div>
          <h1 className="font-display font-bold text-3xl uppercase tracking-tighter text-text-primary">Communications</h1>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllAsRead}
            className="btn btn-secondary py-2"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card p-24 text-text-muted flex flex-col items-center justify-center space-y-4 border-dashed shadow-none bg-surface-1/50">
          <Bell className="w-16 h-16 mb-4 opacity-10" />
          <p className="text-sm text-text-muted italic">All clear. No new transmissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleMarkAsRead(item.id, item.is_read)}
              className={`card p-5 flex gap-5 transition-all duration-300 relative cursor-pointer group ${
                !item.is_read 
                  ? 'border-accent-primary/30 bg-accent-primary/5 shadow-glow-primary/5' 
                  : 'opacity-70 hover:opacity-100 grayscale hover:grayscale-0 shadow-3'
              }`}
            >
              <div className={`p-3 rounded-2xl flex-shrink-0 self-start transition-colors ${
                !item.is_read ? 'bg-accent-primary/10' : 'bg-surface-2'
              }`}>
                {getIcon(item.type)}
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    !item.is_read ? 'text-accent-primary' : 'text-text-muted'
                  }`}>
                    {item.type?.replace('_', ' ') || 'Intel'}
                  </span>
                  <span className="w-1 h-1 bg-surface-3 rounded-full"></span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    <Clock size={10} />
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <p className={`text-sm leading-relaxed ${!item.is_read ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                  {item.content}
                </p>
              </div>

              {!item.is_read && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent-primary animate-pulse shadow-glow-primary"></div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

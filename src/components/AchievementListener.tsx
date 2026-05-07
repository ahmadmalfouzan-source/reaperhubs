import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toastUtils';
import { getCurrentUser } from '../lib/reaperhub/queries';

export default function AchievementListener() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const u = await getCurrentUser();
      if (u) setUserId(u.id);
    }
    getUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('public:user_achievements')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const achievementId = payload.new.achievement_id;

          // Fetch achievement details
          const { data, error } = await supabase
            .from('achievements')
            .select('name, icon_url')
            .eq('id', achievementId)
            .single();

          if (!error && data) {
            toast.achievement(data.name, data.icon_url || '🏆');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}

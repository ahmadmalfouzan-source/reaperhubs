import { supabase } from '../supabase';

export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getDashboardData() {
  try {
    const user = await getCurrentUser();
    if (!user) return { user: null, xp: 0, coins: 0, recentPosts: [], notifications: [] };

    const [xpRes, coinsRes, postsRes, notifRes] = await Promise.all([
      supabase.from('user_xp').select('xp_total, xp_current_level').eq('user_id', user.id).single(),
      supabase.from('user_coins').select('coins').eq('user_id', user.id).single(),
      supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
    ]);

    return {
      user,
      xp: xpRes.data?.xp_total || 0,
      level: xpRes.data?.xp_current_level || 1,
      coins: coinsRes.data?.coins || 0,
      recentPosts: postsRes.data || [],
      notifications: notifRes.data || []
    };
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    return { user: null, xp: 0, level: 1, coins: 0, recentPosts: [], notifications: [] };
  }
}

export async function getLibraryTitles() {
  try {
    const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
    const guestTitles = guestLib.map((item: any) => item.title).filter(Boolean);

    const user = await getCurrentUser();
    if (!user) {
      return guestTitles;
    }

    const { data } = await supabase
      .from('library_items')
      .select('title')
      .eq('user_id', user.id);

    const dbTitles = (data || []).map((item: any) => item.title).filter(Boolean);
    return [...new Set([...guestTitles, ...dbTitles])];
  } catch {
    return [];
  }
}

export async function awardXPAndCoins(
  xp: number,
  coins: number,
  reason: string = 'Action award',
  eventType: string = 'add_to_library'
) {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data: xpData } = await supabase
      .from('user_xp')
      .select('xp_total, xp_current_level')
      .eq('user_id', user.id)
      .single();

    const currentLevel = xpData?.xp_current_level || 1;

    const xpRpc = await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_event_type: eventType,
      p_xp_amount: xp
    });

    if (xpRpc.error) {
      console.error('award_xp RPC error:', xpRpc.error);
    }

    if (coins > 0) {
      const coinsRpc = await supabase.rpc('increment_coins', { uid: user.id, amount: coins });
      if (coinsRpc.error) {
        console.error('increment_coins RPC error:', coinsRpc.error);
      }
    }

    const { data: newXpData } = await supabase
      .from('user_xp')
      .select('xp_total, xp_current_level')
      .eq('user_id', user.id)
      .single();

    const newLevel = newXpData?.xp_current_level || 1;

    return {
      success: true,
      earnedXp: xp,
      earnedCoins: coins,
      currentLevel,
      newLevel,
      levelUp: newLevel > currentLevel
    };
  } catch (err) {
    console.error('Error awarding rewards:', err);
    return { success: false, earnedXp: 0, earnedCoins: 0 };
  }
}

export async function addToLibrary(
  title: string,
  type: string,
  status: string = 'plan_to_watch',
  metadata: any = {},
  mediaIdStr: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const existing = JSON.parse(localStorage.getItem('guest_library') || '[]');
      const alreadyExists = existing.some((item: any) => item.media_id === mediaIdStr);
      if (alreadyExists) return { success: false, message: 'Already in library' };
      existing.push({ title, media_type: type, status, poster_url: metadata.cover_url || '', media_id: mediaIdStr });
      localStorage.setItem('guest_library', JSON.stringify(existing));
      return { success: true, rewards: null };
    }

    const { data: existing } = await supabase
      .from('library_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('media_id', mediaIdStr)
      .single();

    if (existing) return { success: false, message: 'Already in library' };

    const { error } = await supabase.from('library_items').insert({
      user_id: user.id,
      title: title || 'Unknown',
      media_type: type,
      media_id: mediaIdStr,
      status,
      poster_url: metadata.cover_url || metadata.poster_url || ''
    });

    if (error) throw error;

    const rewards = await awardXPAndCoins(
      status === 'completed' ? 35 : 10,
      status === 'completed' ? 15 : 5,
      status === 'completed' ? 'Completed title award' : 'Added to library',
      status === 'completed' ? 'complete_title' : 'add_to_library'
    );

    return { success: true, rewards };
  } catch (err: any) {
    console.error('Error adding to library:', err);
    return { success: false, message: err.message };
  }
}

export async function getLibraryItems() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return JSON.parse(localStorage.getItem('guest_library') || '[]');
    }

    const { data, error } = await supabase
      .from('library_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function getFeedItems() {
  try {
    // posts table uses: user_id, body, post_type, is_private
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*, users!user_id(username, display_name, avatar_url)')
      .eq('is_private', false)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (postsData || []).map((p: any) => ({
      ...p,
      content: p.body,
      author_id: p.user_id,
    }));
  } catch (err) {
    console.error('Error fetching feed:', err);
    return [];
  }
}

export async function createPost(content: string, postType: string = 'status') {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        body: content,
        post_type: postType,
        is_private: false,
        is_deleted: false,
        contains_spoilers: false,
        like_count: 0,
        comment_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    await awardXPAndCoins(5, 2, 'Posted a transmission', 'post_created');
    return { data, error: null, success: true };
  } catch (error: any) {
    console.error('Error creating post:', error);
    return { data: null, error: error.message, success: false };
  }
}

export async function getLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('user_xp')
      .select(`
        xp_total,
        xp_current_level,
        user_id,
        users!user_xp_user_id_fkey (
          username,
          avatar_url,
          display_name
        )
      `)
      .order('xp_total', { ascending: false })
      .limit(50);

    if (error) throw error;
    return (data || []).map((item: any) => ({
      ...item,
      xp: item.xp_total,
      level: item.xp_current_level,
      users: item.users
    }));
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return [];
  }
}

export async function getUserProfile(username: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  } catch {
    return null;
  }
}

export async function updateProfile(updates: { display_name?: string; bio?: string; avatar_url?: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error updating profile:', err);
    return { success: false, message: err.message };
  }
}

export async function searchMedia(query: string) {
  try {
    let q = supabase.from('library_items').select('*').order('created_at', { ascending: false }).limit(20);
    if (query) {
      q = q.ilike('title', `%${query}%`);
    }
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function updateLibraryItemStatus(itemId: string, status: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    const { error } = await supabase
      .from('library_items')
      .update({ status })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw error;

    if (status === 'completed') {
      await awardXPAndCoins(25, 10, 'Completed a title', 'complete_title');
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}


export async function getNotifications() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false };
  }
}

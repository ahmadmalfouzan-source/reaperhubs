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
      .maybeSingle();

    if (existing) return { success: false, message: 'Already in library' };

    const { data: newData, error } = await supabase.from('library_items').insert({
      user_id: user.id,
      title: title || 'Unknown',
      media_type: type,
      media_id: mediaIdStr,
      status,
      poster_url: metadata.cover_url || metadata.poster_url || ''
    }).select().single();

    if (error) throw error;

    const rewards = await awardXPAndCoins(
      status === 'completed' ? 35 : 10,
      status === 'completed' ? 15 : 5,
      status === 'completed' ? 'Completed title award' : 'Added to library',
      status === 'completed' ? 'complete_title' : 'add_to_library'
    );

    return { success: true, rewards, data: newData };
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
    // Specify the exact foreign key relationship to avoid ambiguity
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*, users!posts_user_id_fkey(username, display_name, avatar_url)')
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

export async function getComments(postId: string) {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users!inner(username, display_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching comments:', err);
    return [];
  }
}

export async function addComment(postId: string, content: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content
      })
      .select('*, users!inner(username, display_name, avatar_url)')
      .single();

    if (error) throw error;

    // Increment comment_count in posts table
    await supabase.rpc('increment_comment_count', { post_id_param: postId });

    return { data, error: null, success: true };
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return { data: null, error: error.message || 'Unknown database error', success: false };
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
        is_deleted: false
      })

    if (error) throw error;

    // Optional rewards
    try { await awardXPAndCoins(5, 2, 'Posted a transmission', 'post_created'); } catch(e) {}
    
    return { data, error: null, success: true };
  } catch (error: any) {
    console.error('Error creating post:', error);
    return { data: null, error: error.message || 'Unknown database error', success: false };
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


// Alias for getUserProfile
export async function getProfileByUsername(username: string) {
  return getUserProfile(username);
}

export async function getUserAchievements(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function followUser(targetUserId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetUserId });
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function unfollowUser(targetUserId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);
    if (error) throw error;
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getFollowStats(userId: string) {
  try {
    const [followersRes, followingRes] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId)
    ]);
    return {
      followersCount: followersRes.count || 0,
      followingCount: followingRes.count || 0,
      followers: followersRes.count || 0,
      following: followingRes.count || 0
    };
  } catch {
    return { followersCount: 0, followingCount: 0, followers: 0, following: 0 };
  }
}

export async function getIsFollowing(targetUserId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const { data } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();
    return !!data;
  } catch {
    return false;
  }
}


export async function signUp(email: string, password: string, username: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) return { success: false, error: error.message };
    if (data.user) {
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        username,
        display_name: username,
        created_at: new Date().toISOString()
      });
      await supabase.from('user_xp').upsert({
        user_id: data.user.id,
        xp_total: 0,
        xp_current_level: 1
      });
      await supabase.from('user_coins').upsert({
        user_id: data.user.id,
        coins: 0
      });
    }
    return { success: true, user: data.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function removeFromLibrary(itemId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const lib = JSON.parse(localStorage.getItem('guest_library') || '[]');
      const updated = lib.filter((i: any) => i.id !== itemId && i.media_id !== itemId);
      localStorage.setItem('guest_library', JSON.stringify(updated));
      return { success: true };
    }
    const { error } = await supabase
      .from('library_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error removing from library:', err);
    return { success: false, message: err.message };
  }
}

export async function updateMediaEntry(
  itemId: string,
  updates: { status?: string; rating?: number; review?: string }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };
    const { error } = await supabase
      .from('library_items')
      .update(updates)
      .eq('id', itemId)
      .eq('user_id', user.id);
    if (error) throw error;
    if (updates.status === 'completed') {
      await awardXPAndCoins(25, 10, 'Completed a title', 'complete_title');
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error updating media entry:', err);
    return { success: false, message: err.message };
  }
}


export async function getUnreadNotificationCount() {
  try {
    const user = await getCurrentUser();
    if (!user) return 0;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) throw error;
    return count || 0;
  } catch {
    return 0;
  }
}


// Alias for backwards compatibility
export const getLibrary = getLibraryItems;

// Override getProfileByUsername to return { user, posts } for Profile.tsx
export async function getProfileWithPosts(username: string) {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (error || !user) return null;
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);
    const { data: xpData } = await supabase
      .from('user_xp')
      .select('xp_total, xp_current_level')
      .eq('user_id', user.id)
      .single();
    const { data: coinsData } = await supabase
      .from('user_coins')
      .select('coins')
      .eq('user_id', user.id)
      .single();
    return {
      user: {
        ...user,
        xp: xpData?.xp_total || 0,
        level: xpData?.xp_current_level || 1,
        coin_balance: coinsData?.coins || 0,
      },
      posts: (posts || []).map((p: any) => ({ ...p, content: p.body }))
    };
  } catch (err) {
    console.error('Error fetching profile with posts:', err);
    return null;
  }
}

import { supabase } from '../supabase';


export async function logActivity(userId: string, actionType: string) {
  try {
    const { error } = await supabase
      .from('activity_logs')
      .insert({ user_id: userId, action_type: actionType });
    if (error) console.error('Error logging activity:', error);
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

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

    // Log the activity
    await logActivity(user.id, eventType);

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

    const result = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        body: content,
        post_type: postType,
        is_private: false,
        is_deleted: false
      });

    const { data, error } = result;

    if (error) throw error;
    
    return { data, error: null, success: true };
  } catch (error: any) {
    console.error('Error creating post:', error);
    return { data: null, error: error.message || 'Unknown database error', success: false };
  }
}

export async function updatePost(postId: string, content: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { data, error } = await supabase
      .from('posts')
      .update({ body: content })
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { data, error: null, success: true };
  } catch (error: any) {
    console.error('Error updating post:', error);
    return { data: null, error: error.message || 'Unknown database error', success: false };
  }
}

export async function deletePost(postId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserLikes() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id);

    if (error) throw error;
    return (data || []).map((l: any) => l.post_id);
  } catch (err) {
    console.error('Error fetching user likes:', err);
    return [];
  }
}

export async function toggleLike(postId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    // Check if like exists
    const { data: existing } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);
      if (error) throw error;
      return { success: true, action: 'unliked' };
    } else {
      // Like
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, post_id: postId });
      if (error) throw error;
      return { success: true, action: 'liked' };
    }
  } catch (error: any) {
    console.error('Error toggling like:', error);
    return { success: false, error: error.message };
  }
}

export async function getEpisodeWatches(tmdbMediaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('episode_watches')
      .select('season_number, episode_number')
      .eq('user_id', user.id)
      .eq('tmdb_media_id', tmdbMediaId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching episode watches:', err);
    return [];
  }
}

export async function toggleEpisodeWatch(tmdbMediaId: string, seasonNumber: number, episodeNumber: number) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    // Check if watch exists
    const { data: existing } = await supabase
      .from('episode_watches')
      .select('*')
      .eq('user_id', user.id)
      .eq('tmdb_media_id', tmdbMediaId)
      .eq('season_number', seasonNumber)
      .eq('episode_number', episodeNumber)
      .maybeSingle();

    if (existing) {
      // Unwatch
      const { error } = await supabase
        .from('episode_watches')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      return { success: true, action: 'unwatched' };
    } else {
      // Watch
      const { error } = await supabase
        .from('episode_watches')
        .insert({
          user_id: user.id,
          tmdb_media_id: tmdbMediaId,
          season_number: seasonNumber,
          episode_number: episodeNumber
        });
      if (error) throw error;
      
      // Award small XP for tracking
      try { await awardXPAndCoins(2, 0, 'Watched an episode', 'complete_episode'); } catch(e) {}
      
      return { success: true, action: 'watched' };
    }
  } catch (error: any) {
    console.error('Error toggling episode watch:', error);
    return { success: false, error: error.message };
  }
}

export async function getSeasonRatings(tmdbMediaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('season_ratings')
      .select('season_number, rating')
      .eq('user_id', user.id)
      .eq('tmdb_media_id', tmdbMediaId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching season ratings:', err);
    return [];
  }
}

export async function updateSeasonRating(tmdbMediaId: string, seasonNumber: number, rating: number) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { data, error } = await supabase
      .from('season_ratings')
      .upsert({
        user_id: user.id,
        tmdb_media_id: tmdbMediaId,
        season_number: seasonNumber,
        rating: rating
      }, { onConflict: 'user_id, tmdb_media_id, season_number' })
      .select()
      .single();

    if (error) throw error;
    
    // Small XP reward for rating
    try { await awardXPAndCoins(3, 0, 'Rated a season', 'season_rated'); } catch(e) {}
    
    return { data, success: true };
  } catch (error: any) {
    console.error('Error updating season rating:', error);
    return { success: false, error: error.message };
  }
}

export async function getGameBossesProgress(gameId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('game_bosses_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('game_id', gameId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching boss progress:', err);
    return [];
  }
}

export async function toggleBossDefeated(gameId: string, bossName: string, isDefeated: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { data, error } = await supabase
      .from('game_bosses_progress')
      .upsert({
        user_id: user.id,
        game_id: gameId,
        boss_name: bossName,
        is_defeated: isDefeated,
        defeated_at: isDefeated ? new Date().toISOString() : null
      }, { onConflict: 'user_id, game_id, boss_name' })
      .select()
      .single();

    if (error) throw error;
    
    if (isDefeated) {
      try { await awardXPAndCoins(10, 2, 'Defeated a priority target', 'boss_defeated'); } catch(e) {}
    }
    
    return { data, success: true };
  } catch (error: any) {
    console.error('Error toggling boss:', error);
    return { success: false, error: error.message };
  }
}

export async function getGameSessions(gameId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching game sessions:', err);
    return [];
  }
}

export async function logGameSession(gameId: string, activityType: string, playtimeHours: number, summary?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        user_id: user.id,
        game_id: gameId,
        activity_type: activityType,
        playtime_hours: playtimeHours,
        summary: summary
      })
      .select()
      .single();

    if (error) throw error;
    
    try { await awardXPAndCoins(15, 5, 'Logged a tactical session', 'session_logged'); } catch(e) {}
    
    return { data, success: true };
  } catch (error: any) {
    console.error('Error logging session:', error);
    return { success: false, error: error.message };
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

export async function updateProfile(updates: { display_name?: string; bio?: string; avatar_url?: string; cover_url?: string }) {
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

export async function getAllAchievements() {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('category', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching achievements:', err);
    return [];
  }
}

export async function getUserAchievements(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievements!inner(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function awardAchievement(achievementSlug: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false };

    const { data, error } = await supabase.rpc('check_and_award_achievement', {
      user_id_param: user.id,
      achievement_slug_param: achievementSlug
    });

    if (error) throw error;
    return { success: !!data };
  } catch (err) {
    console.error('Error awarding achievement:', err);
    return { success: false };
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

export async function getTacticalStats() {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Fetch data manually instead of relying on the broken RPC
    const [libRes, sessionRes, activityRes] = await Promise.all([
      supabase.from('library_items').select('*').eq('user_id', user.id),
      supabase.from('game_sessions').select('playtime_hours').eq('user_id', user.id),
      supabase.from('activity_logs').select('created_at').eq('user_id', user.id)
    ]);

    const libraryItems = libRes.data || [];
    const gameSessions = sessionRes.data || [];
    const activities = activityRes.data || [];

    const totalTracked = libraryItems.length;
    let totalHoursPlayed = 0;

    // Sum hours from game sessions
    gameSessions.forEach((session: any) => {
      totalHoursPlayed += (parseFloat(session.playtime_hours) || 0);
    });

    // Add 0.5h for each completed TV/Movie item as an approximation if we wanted,
    // but the DB only stores playtime in game_sessions and maybe some default tracking.

    let sumRating = 0;
    let ratingCount = 0;

    let totalTrackedMovies = 0;
    let totalTrackedTv = 0;
    let totalTrackedGames = 0;

    const genreBreakdown: Record<string, number> = {};
    const topRatedMap = new Map();

    libraryItems.forEach((item: any) => {
       if (item.rating && item.rating > 0) {
           sumRating += item.rating;
           ratingCount++;

           topRatedMap.set(item.id, {
               title: item.title,
               rating: item.rating,
               media_type: item.media_type
           });
       }

       if (item.media_type === 'movie') totalTrackedMovies++;
       else if (item.media_type === 'tv') totalTrackedTv++;
       else if (item.media_type === 'game') totalTrackedGames++;

       // Just use media_type as pseudo-genres for the chart since true genres aren't stored in library_items here
       const type = item.media_type || 'unknown';
       genreBreakdown[type] = (genreBreakdown[type] || 0) + 1;
    });

    const averageRating = ratingCount > 0 ? (sumRating / ratingCount) : 0;

    // Sort top rated
    const topRated = Array.from(topRatedMap.values()).sort((a, b) => b.rating - a.rating);

    // Heatmap
    const heatmapCounts: Record<string, number> = {};
    activities.forEach((act: any) => {
        if (!act.created_at) return;
        try {
            const date = new Date(act.created_at).toISOString().split('T')[0];
            heatmapCounts[date] = (heatmapCounts[date] || 0) + 1;
        } catch (e) {
            // ignore invalid dates
        }
    });
    const activityHeatmap = Object.keys(heatmapCounts).map(date => ({
        date,
        count: heatmapCounts[date]
    }));

    return {
      total_tracked: totalTracked,
      total_hours_played: totalHoursPlayed,
      average_rating: averageRating,
      genre_breakdown: genreBreakdown,
      top_rated: topRated,
      activity_heatmap: activityHeatmap,
      total_tracked_movies: totalTrackedMovies,
      total_tracked_tv: totalTrackedTv,
      total_tracked_games: totalTrackedGames
    };
  } catch (err) {
    console.error('Error fetching tactical stats:', err);
    return null;
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
      .maybeSingle();
    const { data: coinsData } = await supabase
      .from('user_coins')
      .select('coins')
      .eq('user_id', user.id)
      .maybeSingle();
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


export async function getUserStreak(userId: string) {
  try {
    // Get all dates where user had activity, ordered descending
    const { data, error } = await supabase
      .from('activity_logs')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return 0;

    let streak = 0;

    // Convert to unique UTC dates (YYYY-MM-DD)
    const dates = [...new Set(data.map((log: any) => new Date(log.created_at).toISOString().split('T')[0]))];

    if (dates.length === 0) return 0;

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if the first date is today or yesterday
    let currentDateObj = new Date(dates[0] + 'T00:00:00Z');
    let todayObj = new Date(todayStr + 'T00:00:00Z');

    // Calculate difference in days between today and the most recent activity
    const diffTime = Math.abs(todayObj.getTime() - currentDateObj.getTime());
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
       return 0; // Streak broken
    }

    streak = 1;

    // Count consecutive days
    for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1] + 'T00:00:00Z');
        const currDate = new Date(dates[i] + 'T00:00:00Z');

        // Difference should be exactly 1 day
        const diffT = Math.abs(prevDate.getTime() - currDate.getTime());
        const diffD = Math.round(diffT / (1000 * 60 * 60 * 24));

        if (diffD === 1) {
            streak++;
        } else if (diffD > 1) {
            break; // Gap found, streak ends
        }
    }

    return streak;
  } catch (err) {
    console.error('Error fetching user streak:', err);
    return 0;
  }
}

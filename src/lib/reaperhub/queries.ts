/**
 * SUPABASE SQL MIGRATION REQUIRED:
 * 
 * ALTER TABLE user_media_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'plan_to_watch';
 * ALTER TABLE user_media_entries ADD COLUMN IF NOT EXISTS user_rating INTEGER;
 * ALTER TABLE user_media_entries ADD COLUMN IF NOT EXISTS rating INTEGER; -- Backup if rating was used
 * ALTER TABLE user_media_entries ADD COLUMN IF NOT EXISTS review TEXT;
 */

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
      supabase.from('user_xp').select('xp, level').eq('user_id', user.id).single(),
      supabase.from('user_coins').select('balance').eq('user_id', user.id).single(),
      supabase.from('posts').select('*').eq('author_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
    ]);

    return {
      user,
      xp: xpRes.data?.xp || 0,
      level: xpRes.data?.level || 1,
      coins: coinsRes.data?.balance || 0,
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
    const user = await getCurrentUser();
    if (!user) return [];
    
    const { data } = await supabase
      .from('user_media_entries')
      .select('media_items(title)')
      .eq('user_id', user.id);
      
    return data?.map((item: any) => item.media_items?.title).filter(Boolean) || [];
  } catch {
    return [];
  }
}

export async function addToLibrary(title: string, type: string, status: string = 'plan_to_watch', metadata: any = {}) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    // First try to find if media_item already exists
    let { data: mediaItem } = await supabase
      .from('media_items')
      .select('id')
      .eq('title', title)
      .eq('type', type)
      .single();

    if (!mediaItem) {
      // Create media item if it doesn't exist
      const { data: newMedia, error: createError } = await supabase
        .from('media_items')
        .insert({ 
          title, 
          type, 
          description: metadata.overview || `AI recommended ${type}`,
          cover_url: metadata.cover_url || `https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=500&q=80`
        })
        .select('id')
        .single();
        
      if (createError) throw createError;
      mediaItem = newMedia;
    }

    if (!mediaItem) throw new Error('Failed to handle media item');

    // Check if it's already in the library
    const { data: existingEntry } = await supabase
      .from('user_media_entries')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('media_id', mediaItem.id)
      .single();

    if (existingEntry) {
      if (existingEntry.status !== status) {
        await supabase
          .from('user_media_entries')
          .update({ status })
          .eq('id', existingEntry.id);
        
        let rewards = null;
        if (status === 'completed') {
          rewards = await awardXPAndCoins(25, 10, 'Completed title award');
        }
        return { success: true, message: `Status updated to ${status}`, rewards };
      }
      return { success: true, message: 'Already in library' };
    }

    // Fallback-safe insert
    let insertError;
    try {
      const { error } = await supabase
        .from('user_media_entries')
        .insert({
          user_id: user.id,
          media_id: mediaItem.id,
          status: status,
          user_rating: null,
          rating: null
        });
      insertError = error;
    } catch (e) {
      // If full insert fails, try basic insert
      const { error } = await supabase
        .from('user_media_entries')
        .insert({
          user_id: user.id,
          media_id: mediaItem.id
        });
      insertError = error;
    }

    if (insertError) {
      // Last resort: very basic insert
      const { error } = await supabase
        .from('user_media_entries')
        .insert({
          user_id: user.id,
          media_id: mediaItem.id
        });
      if (error) throw error;
    }
    
    // Feature 4: Award XP and coins
    const initialRewards = await awardXPAndCoins(10, 5, 'Added to library award');
    let additionalRewards = null;
    if (status === 'completed') {
      additionalRewards = await awardXPAndCoins(25, 10, 'Completed title award');
    }

    return { 
      success: true, 
      message: 'Added to library', 
      id: mediaItem.id, 
      rewards: initialRewards,
      additionalRewards 
    };
  } catch (err: any) {
    console.error('Error adding to library:', err);
    return { success: false, message: err.message };
  }
}

export async function removeFromLibrary(mediaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { error } = await supabase
      .from('user_media_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('media_id', mediaId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error removing from library:', err);
    return { success: false, message: err.message };
  }
}

export async function isItemInLibrary(mediaId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const { data } = await supabase
      .from('user_media_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('media_id', mediaId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

export async function getMediaItemByExternalId(externalId: string, type: string) {
  try {
    // This assumes we might store external IDs eventually, but for now we search by title/type
    // or just return from TMDB. If it's already in our DB, we return it.
    const { data } = await supabase
      .from('media_items')
      .select('*')
      .eq('title', externalId) // Using title as a proxy for external ID if we don't have a dedicated field
      .eq('type', type)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function getFeedItems() {
  try {
    // Try to get feed items first
    const { data: feedData, error: feedError } = await supabase
      .from('feed_items')
      .select('*, posts(*, users(username, avatar_url))')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!feedError && feedData && feedData.length > 0) {
      return feedData.map(item => item.posts).filter(Boolean);
    }
    
    // Fall back to posts
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (postsError) return [];
    return postsData || [];
  } catch {
    return [];
  }
}

export async function searchMedia(query: string) {
  try {
    let q = supabase.from('media_items').select('*').order('created_at', { ascending: false }).limit(20);
    
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

export async function getLibrary() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    
    // In lovables' version it joins with media_items, handled as nested select
    const { data, error } = await supabase
      .from('user_media_entries')
      .select('*, media_items(*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
      
    if (error) return [];
    return data || [];
  } catch {
    return [];
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
      
    if (error) return [];
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
    return true;
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return false;
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    return false;
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

export async function createNotification(userId: string, type: string, content: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        content,
        is_read: false
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error creating notification:', err);
    return false;
  }
}

export async function getProfileByUsername(username: string) {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
      
    if (userError || !userData) return null;
    
    // Fetch XP and Coins
    const [{ data: xpData }, { data: coinData }] = await Promise.all([
      supabase.from('user_xp').select('xp, level').eq('user_id', userData.id).single(),
      supabase.from('user_coins').select('balance').eq('user_id', userData.id).single()
    ]);

    const userWithStats = {
      ...userData,
      xp: xpData?.xp || 0,
      level: xpData?.level || 1,
      coin_balance: coinData?.balance || 0
    };
    
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userData.id)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(20);
      
    return {
      user: userWithStats,
      posts: postsData || []
    };
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

export async function createPost(content: string, mediaType: string | null = null) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');
    
    // We'll append the tag to the content title-style as posts table might not have tag field or join it
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        content,
        media_type: mediaType, // Assuming table was updated or using it as extra field
        is_private: false
      })
      .select()
      .single();
      
    if (error) {
      // Retry without media_type if column doesn't exist
      const { data: retryData, error: retryError } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: mediaType ? `[${mediaType}] ${content}` : content,
          is_private: false
        })
        .select()
        .single();
      
      if (retryError) throw retryError;
      return { data: retryData, error: null, success: true };
    }
    
    return { data, error: null, success: true };
  } catch (error: any) {
    console.error('Error creating post:', error);
    return { data: null, error: error.message, success: false };
  }
}

export async function signUp(email: string, password: string, username: string) {
  try {
    // 1. Auth SignUp
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create user');

    // 2. Create User Profile
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      username,
      email,
    });

    if (profileError) throw profileError;

    // 3. Setup Initial XP & Coins
    await Promise.all([
      supabase.from('user_xp').insert({ user_id: authData.user.id, xp: 0, level: 1 }),
      supabase.from('user_coins').insert({ user_id: authData.user.id, balance: 100 }), // Starter gift
    ]);

    return { success: true, error: null };
  } catch (err: any) {
    console.error('SignUp Error:', err);
    return { success: false, error: err.message };
  }
}

export async function getLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('user_xp')
      .select(`
        xp,
        level,
        user_id,
        users!user_id (
          username,
          avatar_url,
          display_name
        ),
        user_coins!user_id (
          balance
        )
      `)
      .order('xp', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return [];
  }
}

// New Features: XP, Coins, Followers, Ratings

/**
 * Feature 4: Award XP and Coins
 */
export async function awardXPAndCoins(xp: number, coins: number, reason: string = 'Action award') {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    // Fetch current state
    const [xpRes, coinsRes] = await Promise.all([
      supabase.from('user_xp').select('xp, level').eq('user_id', user.id).single(),
      supabase.from('user_coins').select('balance').eq('user_id', user.id).single()
    ]);

    const currentXp = xpRes.data?.xp || 0;
    const currentCoins = coinsRes.data?.balance || 0;
    const currentLevel = xpRes.data?.level || 1;
    
    const newXp = currentXp + xp;
    const newCoins = currentCoins + coins;
    const newLevel = Math.floor(newXp / 100) + 1; // Every 100 XP = 1 level
    
    await Promise.all([
      supabase.from('user_xp').upsert({ user_id: user.id, xp: newXp, level: newLevel }),
      supabase.from('user_coins').upsert({ user_id: user.id, balance: newCoins }),
      supabase.from('notifications').insert({
        user_id: user.id,
        type: 'reward',
        title: 'Rewards Secured',
        message: `+${xp} XP, +${coins} Credits earned! (${reason})`,
        is_read: false
      })
    ]);

    return { 
      success: true, 
      earnedXp: xp, 
      earnedCoins: coins, 
      currentLevel: currentLevel,
      newLevel: newLevel,
      levelUp: newLevel > currentLevel 
    };
  } catch (err) {
    console.error('Error awarding rewards:', err);
    return { success: false, earnedXp: 0, earnedCoins: 0 };
  }
}

/**
 * Feature 2: Update rating and review
 */
export async function updateMediaEntry(mediaId: string, updates: any) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { data: existing } = await supabase
      .from('user_media_entries')
      .select('id, rating, user_rating, review, status')
      .eq('user_id', user.id)
      .eq('media_id', mediaId)
      .maybeSingle();

    if (!existing) throw new Error('Item not in library');

    // Try multiple column names for rating if needed
    const finalUpdates: any = { ...updates };
    if (updates.rating) {
      finalUpdates.user_rating = updates.rating;
    }

    const { error } = await supabase
      .from('user_media_entries')
      .update(finalUpdates)
      .eq('id', existing.id);

    if (error) {
      // If it fails, try with just provided keys minus status or rating if they are missing columns
      console.warn('Update failed, attempting fallback update', error);
      const basicUpdates: any = {};
      if (updates.status) basicUpdates.status = updates.status;
      
      await supabase
        .from('user_media_entries')
        .update(basicUpdates)
        .eq('id', existing.id);
    }

    // Capture last reward for UI feedback
    let rewards = null;
    
    if (updates.rating && !existing.rating) {
      rewards = await awardXPAndCoins(5, 3, 'Rated a title');
    }
    if (updates.review && !existing.review) {
      rewards = await awardXPAndCoins(15, 8, 'Wrote a review');
    }
    if (updates.status === 'completed' && existing.status !== 'completed') {
      rewards = await awardXPAndCoins(25, 10, 'Completed title');
    }

    return { success: true, rewards };
  } catch (err: any) {
    console.error('Error updating media entry:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Feature 5: Social Follow System
 */
export async function followUser(followingId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');
    if (user.id === followingId) throw new Error('Cannot follow yourself');

    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: followingId });

    if (error) throw error;
    
    await awardXPAndCoins(10, 5, 'Network expansion');
    return { success: true };
  } catch (err: any) {
    console.error('Error following user:', err);
    return { success: false, message: err.message };
  }
}

export async function unfollowUser(followingId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error unfollowing user:', err);
    return { success: false, message: err.message };
  }
}

export async function getFollowStats(userId: string) {
  try {
    const [followers, following] = await Promise.all([
      supabase.from('follows').select('follower_id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact' }).eq('follower_id', userId)
    ]);

    return {
      followersCount: followers.count || 0,
      followingCount: following.count || 0
    };
  } catch {
    return { followersCount: 0, followingCount: 0 };
  }
}

export async function getIsFollowing(userId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

export async function getUserProfile(username: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, user_xp(xp, level), user_coins(balance)')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error fetching profile:', err);
    return null;
  }
}

export async function getUserAchievements(userId: string) {
  try {
    const [libraryRes, postsRes, xpRes] = await Promise.all([
      supabase.from('user_media_entries').select('id, media_items(type)').eq('user_id', userId),
      supabase.from('posts').select('id').eq('author_id', userId),
      supabase.from('user_xp').select('level').eq('user_id', userId).single()
    ]);

    const library = libraryRes.data || [];
    const posts = postsRes.data || [];
    const level = xpRes.data?.level || 1;

    const moviesWatched = library.filter((item: any) => item.media_items?.type === 'movie').length;

    return [
      {
        id: 'first-track',
        title: 'Slayer Initiate',
        description: 'Track your first media item',
        icon: '🎯',
        unlocked: library.length >= 1
      },
      {
        id: 'level-5',
        title: 'Veteran Reaper',
        description: 'Reach level 5',
        icon: '⚔️',
        unlocked: level >= 5
      },
      {
        id: '10-movies',
        title: 'Cinephile',
        description: 'Watch 10 movies',
        icon: '🎬',
        unlocked: moviesWatched >= 10
      },
      {
        id: 'social-butterfly',
        title: 'Socialite',
        description: 'Share 5 public posts',
        icon: '🦋',
        unlocked: posts.length >= 5
      }
    ];
  } catch (err) {
    console.error('Error fetching achievements:', err);
    return [];
  }
}

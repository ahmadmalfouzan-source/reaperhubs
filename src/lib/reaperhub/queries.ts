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
      
    const userTitles = data?.map((item: any) => item.title).filter(Boolean) || [];
    return Array.from(new Set([...guestTitles, ...userTitles]));
  } catch {
    return [];
  }
}

function saveToGuestLibrary(title: string, type: string, status: string, metadata: any, mediaIdStr: string) {
  const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
  const existingIdx = guestLib.findIndex((i: any) => i.media_id === mediaIdStr);
  
  if (existingIdx >= 0) {
    guestLib[existingIdx].status = status;
    guestLib[existingIdx].poster_url = metadata.cover_url || guestLib[existingIdx].poster_url;
  } else {
    guestLib.push({
      id: `guest_${Date.now()}`,
      user_id: 'guest',
      media_id: mediaIdStr,
      media_type: type,
      title: title,
      poster_url: metadata.cover_url || '',
      status: status,
      rating: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  localStorage.setItem('guest_library', JSON.stringify(guestLib));
}

export async function addToLibrary(title: string, type: string, status: string = 'plan_to_watch', metadata: any = {}, mediaIdStr: string) {
  try {
    const user = await getCurrentUser();
    
    let initialRewards = null;
    let additionalRewards = null;
    
    if (!user) {
      // Guest Mode
      console.log('addToLibrary: Guest mode, saving to localStorage');
      saveToGuestLibrary(title, type, status, metadata, mediaIdStr);
      initialRewards = { earnedXp: 10, earnedCoins: 5 }; // Fake rewards for guest
      if (status === 'completed') {
        additionalRewards = { earnedXp: 25, earnedCoins: 10 };
      }
      
      return { 
        success: true, 
        message: 'Added to library', 
        id: mediaIdStr, 
        rewards: initialRewards,
        additionalRewards 
      };
    }

    console.log(`addToLibrary: Logged in, saving to Supabase for ${user.id}`);
    // Logged-in mode
    const { error } = await supabase
      .from('library_items')
      .upsert({
        user_id: user.id,
        media_id: mediaIdStr,
        media_type: type,
        title: title,
        poster_url: metadata.cover_url || '',
        status: status
      }, { onConflict: 'user_id, media_id' }); 

    if (error) {
      console.error('addToLibrary Supabase error, falling back to localStorage:', error);
      saveToGuestLibrary(title, type, status, metadata, mediaIdStr);
      initialRewards = { earnedXp: 10, earnedCoins: 5 };
      return { 
        success: true, 
        message: 'Added to local library (sync failed)', 
        id: mediaIdStr, 
        rewards: initialRewards,
        additionalRewards 
      };
    }
    
    // Feature 4: Award XP and coins
    initialRewards = await awardXPAndCoins(10, 5, 'Added to library award');
    if (status === 'completed') {
      additionalRewards = await awardXPAndCoins(25, 10, 'Completed title award');
    }

    return { 
      success: true, 
      message: 'Added to library', 
      id: mediaIdStr, 
      rewards: initialRewards,
      additionalRewards 
    };
  } catch (err: any) {
    console.error('Error adding to library, doing ultimate fallback:', err);
    saveToGuestLibrary(title, type, status, metadata, mediaIdStr);
    return { 
      success: true, 
      message: 'Added to local library (sync error)', 
      id: mediaIdStr, 
      rewards: { earnedXp: 10, earnedCoins: 5 } 
    };
  }
}

export async function removeFromLibrary(mediaId: string) {
  try {
    const user = await getCurrentUser();
    
    const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
    const filtered = guestLib.filter((i: any) => i.media_id !== mediaId);
    localStorage.setItem('guest_library', JSON.stringify(filtered));

    if (!user) {
      console.log('removeFromLibrary: Guest mode');
      return { success: true };
    }

    const { error } = await supabase
      .from('library_items')
      .delete()
      .eq('user_id', user.id)
      .eq('media_id', mediaId);

    if (error) console.warn('Supabase remove failed:', error);
    return { success: true };
  } catch (err: any) {
    console.error('Error removing from library:', err);
    return { success: false, message: err.message };
  }
}

export async function isItemInLibrary(mediaId: string) {
  try {
    const user = await getCurrentUser();
    
    const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
    const inGuest = guestLib.some((i: any) => i.media_id === mediaId);

    if (!user) {
      return inGuest;
    }

    const { data } = await supabase
      .from('library_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('media_id', mediaId)
      .maybeSingle();

    return !!data || inGuest;
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
    
    // Always fetch guest library to be safe or to merge
    const guestLibRaw = JSON.parse(localStorage.getItem('guest_library') || '[]');
    const guestLib = guestLibRaw.map((item: any) => ({
      id: item.media_id,
      status: item.status,
      rating: item.rating,
      user_rating: item.rating,
      review: item.review,
      updated_at: item.updated_at,
      media_items: {
        title: item.title,
        type: item.media_type,
        cover_url: item.poster_url || item.poster_path
      }
    }));
      
    if (!user) {
      console.log('getLibrary: Guest mode');
      return guestLib;
    }
    
    console.log(`getLibrary: Logged in as ${user.id}`);
    const { data, error } = await supabase
      .from('library_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('getLibrary Supabase error, returning guest limit:', error);
      return guestLib;
    }
    
    const userLib = data?.map((item: any) => ({
      id: item.media_id,
      status: item.status,
      rating: item.rating,
      user_rating: item.rating,
      review: item.review,
      updated_at: item.created_at,
      media_items: {
        title: item.title,
        type: item.media_type,
        cover_url: item.poster_url
      }
    })) || [];
    
    // Return user library and any items from guest library not present
    return [...userLib, ...guestLib.filter((g: any) => !userLib.some((u: any) => u.id === g.id))];
  } catch (err: any) {
    console.error('Error getting library:', err);
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
    
    if (!user) {
      console.log('updateMediaEntry: Guest mode');
      const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
      const existingIdx = guestLib.findIndex((i: any) => i.media_id === mediaId);
      if (existingIdx < 0) throw new Error('Item not in library');
      
      const existing = guestLib[existingIdx];
      
      if (updates.rating !== undefined) guestLib[existingIdx].rating = updates.rating;
      if (updates.review !== undefined) guestLib[existingIdx].review = updates.review;
      if (updates.status !== undefined) guestLib[existingIdx].status = updates.status;
      guestLib[existingIdx].updated_at = new Date().toISOString();
      
      localStorage.setItem('guest_library', JSON.stringify(guestLib));

      let rewards = null;
      if (updates.rating && !existing.rating) {
        rewards = { earnedXp: 5, earnedCoins: 3 };
      }
      if (updates.review && !existing.review) {
        rewards = { earnedXp: 15, earnedCoins: 8 };
      }
      if (updates.status === 'completed' && existing.status !== 'completed') {
        rewards = { earnedXp: 25, earnedCoins: 10 };
      }

      return { success: true, rewards };
    }

    const { data: existing } = await supabase
      .from('library_items')
      .select('id, rating, review, status')
      .eq('user_id', user.id)
      .eq('media_id', mediaId)
      .maybeSingle();

    if (!existing) {
      // Check guest library fallback
      const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
      const existingIdx = guestLib.findIndex((i: any) => i.media_id === mediaId);
      if (existingIdx >= 0) {
        if (updates.rating !== undefined) guestLib[existingIdx].rating = updates.rating;
        if (updates.review !== undefined) guestLib[existingIdx].review = updates.review;
        if (updates.status !== undefined) guestLib[existingIdx].status = updates.status;
        guestLib[existingIdx].updated_at = new Date().toISOString();
        localStorage.setItem('guest_library', JSON.stringify(guestLib));
        return { success: true, rewards: null, message: "Updated locally" };
      }
      throw new Error('Item not in library');
    }

    const finalUpdates: any = { ...updates };
    
    const { error } = await supabase
      .from('library_items')
      .update(finalUpdates)
      .eq('id', existing.id);

    if (error) {
      console.warn('Update failed, attempting fallback update', error);
      const basicUpdates: any = {};
      if (updates.status) basicUpdates.status = updates.status;
      if (updates.rating) basicUpdates.rating = updates.rating;
      
      await supabase
        .from('library_items')
        .update(basicUpdates)
        .eq('id', existing.id);
    }

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
      supabase.from('user_library').select('id, media_type').eq('user_id', userId),
      supabase.from('posts').select('id').eq('author_id', userId),
      supabase.from('user_xp').select('level').eq('user_id', userId).single()
    ]);

    const library = libraryRes.data || [];
    const posts = postsRes.data || [];
    const level = xpRes.data?.level || 1;

    const moviesWatched = library.filter((item: any) => item.media_type === 'movie').length;

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

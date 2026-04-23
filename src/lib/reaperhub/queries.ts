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

export async function addToLibrary(title: string, type: string) {
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
          description: `AI recommended ${type}`,
          cover_url: `https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=500&q=80` // Placeholder for AI items
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
      .select('id')
      .eq('user_id', user.id)
      .eq('media_id', mediaItem.id)
      .single();

    if (existingEntry) return { success: true, message: 'Already in library' };

    const { error: insertError } = await supabase
      .from('user_media_entries')
      .insert({
        user_id: user.id,
        media_id: mediaItem.id,
        status: 'plan_to_watch',
        rating: null
      });

    if (insertError) throw insertError;
    return { success: true, message: 'Added to library' };
  } catch (err: any) {
    console.error('Error adding to library:', err);
    return { success: false, message: err.message };
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
    
    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', userData.id)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(20);
      
    return {
      user: userData,
      posts: postsData || []
    };
  } catch {
    return null;
  }
}

export async function createPost(content: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not logged in');
    
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        content,
        is_private: false
      })
      .select()
      .single();
      
    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
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
          avatar_url
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

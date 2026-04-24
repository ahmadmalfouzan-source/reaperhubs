/**
 * SUPABASE SQL MIGRATION REQUIRED:
 * 
 * ALTER TABLE library_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'plan_to_watch';
 * ALTER TABLE library_items ADD COLUMN IF NOT EXISTS rating INTEGER;
 * ALTER TABLE library_items ADD COLUMN IF NOT EXISTS review TEXT;
 */

import { supabase } from '../supabase';

// --- Auth & User ---

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
    if (!user) return { user: null, xp: 0, level: 1, coins: 0, recentPosts: [], notifications: [] };

    const [xpRes, coinsRes, postsRes, notifRes] = await Promise.all([
      supabase.from('user_xp').select('xp, level').eq('user_id', user.id).maybeSingle(),
      supabase.from('user_coins').select('balance').eq('user_id', user.id).maybeSingle(),
      supabase.from('posts').select('*, users(username, avatar_url)').eq('author_id', user.id).order('created_at', { ascending: false }).limit(5),
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

// --- Library System ---

export async function getLibrary() {
  try {
    const user = await getCurrentUser();
    const guestLibRaw = JSON.parse(localStorage.getItem('guest_library') || '[]');
    const guestLib = guestLibRaw.map((item: any) => ({
      id: item.media_id,
      status: item.status,
      rating: item.rating,
      review: item.review,
      updated_at: item.updated_at,
      media_items: {
        title: item.title,
        type: item.media_type,
        cover_url: item.poster_url
      }
    }));

    if (!user) return guestLib;

    const { data, error } = await supabase
      .from('library_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return guestLib;

    const userLib = data?.map((item: any) => ({
      id: item.media_id,
      status: item.status,
      rating: item.rating,
      review: item.review,
      updated_at: item.created_at,
      media_items: {
        title: item.title,
        type: item.media_type,
        cover_url: item.poster_url
      }
    })) || [];

    // Merge: User library items override guest items with same media_id
    const merged = [...userLib];
    guestLib.forEach((g: any) => {
      if (!merged.some(u => u.id === g.id)) merged.push(g);
    });
    return merged;
  } catch (err) {
    console.error('getLibrary error:', err);
    return [];
  }
}

export async function addToLibrary(title: string, type: string, status: string = 'plan_to_watch', metadata: any = {}, mediaId: string) {
  try {
    const user = await getCurrentUser();
    const poster_url = metadata.cover_url || metadata.poster_path || '';

    if (!user) {
      const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
      const existingIdx = guestLib.findIndex((i: any) => i.media_id === mediaId);
      if (existingIdx === -1) {
        guestLib.push({
          media_id: mediaId,
          media_type: type,
          title,
          poster_url,
          status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        localStorage.setItem('guest_library', JSON.stringify(guestLib));
      }
      return { success: true, rewards: { earnedXp: 10, earnedCoins: 5 } };
    }

    const { error } = await supabase.from('library_items').upsert({
      user_id: user.id,
      media_id: mediaId,
      media_type: type,
      title,
      poster_url,
      status
    }, { onConflict: 'user_id, media_id' });

    if (error) throw error;

    const rewards = await awardXPAndCoins(10, 5, 'Added to library');
    return { success: true, rewards };
  } catch (err: any) {
    console.error('addToLibrary error:', err);
    return { success: false, message: err.message };
  }
}

export async function updateMediaEntry(mediaId: string, updates: { status?: string; rating?: number; review?: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
      const idx = guestLib.findIndex((i: any) => i.media_id === mediaId);
      if (idx !== -1) {
        Object.assign(guestLib[idx], updates);
        guestLib[idx].updated_at = new Date().toISOString();
        localStorage.setItem('guest_library', JSON.stringify(guestLib));
        return { success: true };
      }
      return { success: false, message: 'Item not found' };
    }

    const { error } = await supabase.from('library_items')
      .update(updates)
      .eq('user_id', user.id)
      .eq('media_id', mediaId);

    if (error) throw error;

    // Award bonus for completion/rating/review
    let rewards = null;
    if (updates.status === 'completed') rewards = await awardXPAndCoins(20, 10, 'Completed title');
    else if (updates.rating) rewards = await awardXPAndCoins(5, 2, 'Rated title');
    
    return { success: true, rewards };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function removeFromLibrary(mediaId: string) {
  try {
    const user = await getCurrentUser();
    const guestLib = JSON.parse(localStorage.getItem('guest_library') || '[]');
    localStorage.setItem('guest_library', JSON.stringify(guestLib.filter((i: any) => i.media_id !== mediaId)));

    if (user) {
      await supabase.from('library_items').delete().eq('user_id', user.id).eq('media_id', mediaId);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// --- Social & Feed ---

export async function getFeedItems() {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, users(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(30);
    return error ? [] : (data || []);
  } catch {
    return [];
  }
}

export async function createPost(content: string, mediaType: string | null = null) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');

    const { data, error } = await supabase.from('posts').insert({
      author_id: user.id,
      content,
      media_type: mediaType
    }).select().single();

    if (error) throw error;
    await awardXPAndCoins(15, 5, 'Shared a post');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function followUser(targetUserId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Unauthorized');
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: targetUserId });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// --- Notifications ---

export async function getNotifications() {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    return true;
  } catch {
    return false;
  }
}

// --- Rewards System ---

export async function awardXPAndCoins(xp: number, coins: number, reason: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const { data: current } = await supabase.from('user_xp').select('xp, level').eq('user_id', user.id).maybeSingle();
    const oldXp = current?.xp || 0;
    const newXp = oldXp + xp;
    const newLevel = Math.floor(newXp / 100) + 1;

    await Promise.all([
      supabase.from('user_xp').upsert({ user_id: user.id, xp: newXp, level: newLevel }),
      supabase.rpc('increment_coins', { uid: user.id, amount: coins })
    ]);

    return { earnedXp: xp, earnedCoins: coins, levelUp: newLevel > (current?.level || 1) };
  } catch (err) {
    console.error('awardRewards error:', err);
    return null;
  }
}

export async function getLeaderboard() {
  try {
    const { data } = await supabase
      .from('user_xp')
      .select('xp, level, users(username, avatar_url)')
      .order('xp', { ascending: false })
      .limit(10);
    return data || [];
  } catch {
    return [];
  }
}


export async function getLibraryTitles(): Promise<string[]> {
  try {
    const items = await getLibrary();
    return items.map((item: any) => item.media_items?.title || item.title || '').filter(Boolean);
  } catch {
    return [];
  }
}

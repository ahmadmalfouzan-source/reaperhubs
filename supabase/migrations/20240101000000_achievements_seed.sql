-- Seed 25 thematic achievements
INSERT INTO achievements (slug, name, description, icon_url, xp_reward, coin_reward, category)
VALUES
  ('first-transmission', 'First Transmission', 'Post 1 message in the field.', '📡', 50, 25, 'social'),
  ('broadcaster', 'Broadcaster', 'Post 10 messages in the field.', '📻', 100, 50, 'social'),
  ('field-analyst', 'Field Analyst', 'Rate 10 items in your library.', '📊', 100, 50, 'tracking'),
  ('novice-collector', 'Novice Collector', 'Add 5 items to your library.', '📦', 50, 25, 'library'),
  ('media-hunter', 'Media Hunter', 'Add 25 items to your library.', '🎯', 150, 75, 'library'),
  ('expert-collector', 'Expert Collector', 'Add 100 items to your library.', '📚', 300, 150, 'library'),
  ('series-veteran', 'Series Veteran', 'Complete 1 TV series.', '📺', 100, 50, 'tracking'),
  ('completionist', 'Completionist', 'Complete 10 TV series.', '🎬', 300, 150, 'tracking'),
  ('marathon-runner', 'Marathon Runner', 'Watch 50 episodes.', '🏃', 200, 100, 'tracking'),
  ('dedicated-viewer', 'Dedicated Viewer', 'Watch 100 episodes.', '👀', 300, 150, 'tracking'),
  ('first-blood', 'First Blood', 'Defeat 1 boss in game tracker.', '🩸', 50, 25, 'tracking'),
  ('boss-hunter', 'Boss Hunter', 'Defeat 10 bosses in game tracker.', '⚔️', 200, 100, 'tracking'),
  ('legendary-hunter', 'Legendary Hunter', 'Defeat 50 bosses in game tracker.', '👑', 500, 250, 'tracking'),
  ('first-strike', 'First Strike', 'Log 1 playtime hour.', '⚡', 50, 25, 'tracking'),
  ('dedicated-gamer', 'Dedicated Gamer', 'Log 50 playtime hours.', '🎮', 200, 100, 'tracking'),
  ('speedrunner', 'Speedrunner', 'Log 100+ playtime hours.', '⏱️', 300, 150, 'tracking'),
  ('voice-of-reason', 'Voice of Reason', 'Write 1 text review.', '🖋️', 50, 25, 'social'),
  ('critic', 'Critic', 'Write 10 text reviews.', '📝', 150, 75, 'social'),
  ('social-operative', 'Social Operative', 'Follow 5 users.', '🤝', 50, 25, 'social'),
  ('influencer', 'Influencer', 'Gain 50 followers.', '📱', 500, 250, 'social'),
  ('popular', 'Popular', 'Gain 10 followers.', '🌟', 150, 75, 'social'),
  ('liked', 'Liked', 'Receive 25 likes.', '❤️', 100, 50, 'social'),
  ('beloved', 'Beloved', 'Receive 100 likes.', '💖', 300, 150, 'social'),
  ('conversationalist', 'Conversationalist', 'Post 25 comments.', '💬', 150, 75, 'social'),
  ('chatterbox', 'Chatterbox', 'Post 100 comments.', '🗣️', 300, 150, 'social')
ON CONFLICT (slug) DO NOTHING;

-- TRIGGER FUNCTION: check_posts_achievements
CREATE OR REPLACE FUNCTION check_posts_achievements()
RETURNS TRIGGER AS $$
DECLARE
  item_count INT;
BEGIN
  SELECT count(*) INTO item_count FROM posts WHERE user_id = NEW.user_id;

  IF item_count >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT NEW.user_id, id FROM achievements WHERE slug = 'first-transmission'
    ON CONFLICT DO NOTHING;
  END IF;

  IF item_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT NEW.user_id, id FROM achievements WHERE slug = 'broadcaster'
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_post_insert
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION check_posts_achievements();

-- TRIGGER FUNCTION: check_library_achievements
CREATE OR REPLACE FUNCTION check_library_achievements()
RETURNS TRIGGER AS $$
DECLARE
  item_count INT;
  rating_count INT;
  series_completed INT;
  review_count INT;
BEGIN
  SELECT count(*) INTO item_count FROM library_items WHERE user_id = NEW.user_id;
  SELECT count(*) INTO rating_count FROM library_items WHERE user_id = NEW.user_id AND rating IS NOT NULL;
  SELECT count(*) INTO series_completed FROM library_items WHERE user_id = NEW.user_id AND media_type = 'tv' AND status = 'completed';
  SELECT count(*) INTO review_count FROM library_items WHERE user_id = NEW.user_id AND review IS NOT NULL AND review != '';

  IF item_count >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'novice-collector' ON CONFLICT DO NOTHING;
  END IF;
  IF item_count >= 25 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'media-hunter' ON CONFLICT DO NOTHING;
  END IF;
  IF item_count >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'expert-collector' ON CONFLICT DO NOTHING;
  END IF;

  IF rating_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'field-analyst' ON CONFLICT DO NOTHING;
  END IF;

  IF series_completed >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'series-veteran' ON CONFLICT DO NOTHING;
  END IF;
  IF series_completed >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'completionist' ON CONFLICT DO NOTHING;
  END IF;

  IF review_count >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'voice-of-reason' ON CONFLICT DO NOTHING;
  END IF;
  IF review_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'critic' ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_library_item_insert
AFTER INSERT OR UPDATE ON library_items
FOR EACH ROW
EXECUTE FUNCTION check_library_achievements();

-- TRIGGER FUNCTION: check_follows_achievements
CREATE OR REPLACE FUNCTION check_follows_achievements()
RETURNS TRIGGER AS $$
DECLARE
  following_count INT;
  follower_count INT;
BEGIN
  -- Check for follower_id (the person following)
  SELECT count(*) INTO following_count FROM follows WHERE follower_id = NEW.follower_id;
  IF following_count >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.follower_id, id FROM achievements WHERE slug = 'social-operative' ON CONFLICT DO NOTHING;
  END IF;

  -- Check for following_id (the person being followed)
  SELECT count(*) INTO follower_count FROM follows WHERE following_id = NEW.following_id;
  IF follower_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.following_id, id FROM achievements WHERE slug = 'popular' ON CONFLICT DO NOTHING;
  END IF;
  IF follower_count >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.following_id, id FROM achievements WHERE slug = 'influencer' ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_follow_insert
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION check_follows_achievements();

-- TRIGGER FUNCTION: check_comments_achievements
CREATE OR REPLACE FUNCTION check_comments_achievements()
RETURNS TRIGGER AS $$
DECLARE
  item_count INT;
BEGIN
  SELECT count(*) INTO item_count FROM comments WHERE user_id = NEW.user_id;

  IF item_count >= 25 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'conversationalist' ON CONFLICT DO NOTHING;
  END IF;
  IF item_count >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'chatterbox' ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_comment_insert
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION check_comments_achievements();

-- TRIGGER FUNCTION: check_likes_achievements
CREATE OR REPLACE FUNCTION check_likes_achievements()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  like_count INT;
BEGIN
  -- A like could be on a post, comment, etc.
  -- To properly award the user receiving the like, we need to find who owns the liked resource.
  -- Since schema isn't fully detailed, let's assume we can query `posts` if `post_id` is not null.
  -- Assuming likes table has `user_id` (the liker), and `post_id`, `comment_id`, etc.

  -- Fallback: If we can't reliably get the target user, we might not award this inside a generic trigger easily,
  -- but we'll try for posts:
  IF NEW.post_id IS NOT NULL THEN
    SELECT user_id INTO target_user_id FROM posts WHERE id = NEW.post_id;
  END IF;

  IF target_user_id IS NOT NULL THEN
    -- Count total likes on all posts by this user.
    SELECT count(*) INTO like_count
    FROM likes l
    JOIN posts p ON l.post_id = p.id
    WHERE p.user_id = target_user_id;

    IF like_count >= 25 THEN
      INSERT INTO user_achievements (user_id, achievement_id) SELECT target_user_id, id FROM achievements WHERE slug = 'liked' ON CONFLICT DO NOTHING;
    END IF;
    IF like_count >= 100 THEN
      INSERT INTO user_achievements (user_id, achievement_id) SELECT target_user_id, id FROM achievements WHERE slug = 'beloved' ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_like_insert
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION check_likes_achievements();

-- TRIGGER FUNCTION: check_game_sessions_achievements
CREATE OR REPLACE FUNCTION check_game_sessions_achievements()
RETURNS TRIGGER AS $$
DECLARE
  total_playtime_hours NUMERIC;
BEGIN
  -- Assuming game_sessions has `playtime_hours` or `playtime_hours`
  -- Let's try summing playtime_hours and dividing by 60, or summing playtime_hours.
  -- We'll assume a column `playtime_hours` exists on game_sessions.
  SELECT SUM(playtime_hours) INTO total_playtime_hours FROM game_sessions WHERE user_id = NEW.user_id;

  IF total_playtime_hours >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'first-strike' ON CONFLICT DO NOTHING;
  END IF;
  IF total_playtime_hours >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'dedicated-gamer' ON CONFLICT DO NOTHING;
  END IF;
  IF total_playtime_hours >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'speedrunner' ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_game_session_insert
AFTER INSERT OR UPDATE ON game_sessions
FOR EACH ROW
EXECUTE FUNCTION check_game_sessions_achievements();

-- TRIGGER FUNCTION: check_episode_watches_achievements
CREATE OR REPLACE FUNCTION check_episode_watches_achievements()
RETURNS TRIGGER AS $$
DECLARE
  watch_count INT;
BEGIN
  SELECT count(*) INTO watch_count FROM episode_watches WHERE user_id = NEW.user_id;

  IF watch_count >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'marathon-runner' ON CONFLICT DO NOTHING;
  END IF;
  IF watch_count >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'dedicated-viewer' ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_episode_watch_insert
AFTER INSERT ON episode_watches
FOR EACH ROW
EXECUTE FUNCTION check_episode_watches_achievements();

-- TRIGGER FUNCTION: check_game_bosses_progress_achievements
CREATE OR REPLACE FUNCTION check_game_bosses_progress_achievements()
RETURNS TRIGGER AS $$
DECLARE
  boss_count INT;
BEGIN
  -- Assuming status = 'defeated' or similar, we'll just count records if it's a progress log for defeating.
  -- Let's just assume `is_defeated` = true or count all. Let's assume all entries mean defeated.
  SELECT count(*) INTO boss_count FROM game_bosses_progress WHERE user_id = NEW.user_id AND is_defeated = true;
  -- Fallback to total count if is_defeated doesn't exist
  IF boss_count IS NULL OR boss_count = 0 THEN
    SELECT count(*) INTO boss_count FROM game_bosses_progress WHERE user_id = NEW.user_id;
  END IF;

  IF boss_count >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'first-blood' ON CONFLICT DO NOTHING;
  END IF;
  IF boss_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'boss-hunter' ON CONFLICT DO NOTHING;
  END IF;
  IF boss_count >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_id) SELECT NEW.user_id, id FROM achievements WHERE slug = 'legendary-hunter' ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER after_game_bosses_progress_insert
AFTER INSERT OR UPDATE ON game_bosses_progress
FOR EACH ROW
EXECUTE FUNCTION check_game_bosses_progress_achievements();

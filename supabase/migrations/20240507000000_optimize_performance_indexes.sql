-- Create indexes to optimize query performance as requested
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts (user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at);
CREATE INDEX IF NOT EXISTS library_items_user_id_media_id_idx ON library_items (user_id, media_id);
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows (following_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id);
CREATE INDEX IF NOT EXISTS episode_watches_user_id_tmdb_media_id_idx ON episode_watches (user_id, tmdb_media_id);

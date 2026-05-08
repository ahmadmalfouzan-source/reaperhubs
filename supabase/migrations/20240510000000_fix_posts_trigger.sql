-- Fix: Make check_posts_achievements SECURITY DEFINER and add exception handling
-- This prevents the trigger from blocking post creation if achievement logic fails

CREATE OR REPLACE FUNCTION check_posts_achievements()
RETURNS TRIGGER AS $$
DECLARE
  item_count INT;
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'check_posts_achievements failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up any test posts
DELETE FROM posts WHERE body LIKE '%test post%' OR body LIKE '%test transmission%' OR body LIKE '%signal check%' OR body LIKE '%Diagnostic test%' OR body LIKE '%Verification test%' OR body LIKE '%RLS test%';

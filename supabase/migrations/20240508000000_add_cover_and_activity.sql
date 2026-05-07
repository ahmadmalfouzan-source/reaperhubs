-- Add cover_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS activity_logs_user_id_created_at_idx ON activity_logs (user_id, created_at DESC);

-- Add RLS to activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Activity logs are viewable by everyone" ON activity_logs
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own activity logs" ON activity_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

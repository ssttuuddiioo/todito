-- Asana OAuth connections table
-- Stores OAuth tokens for each user's Asana connection

CREATE TABLE IF NOT EXISTS asana_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  asana_user_id TEXT,
  asana_user_name TEXT,
  asana_user_email TEXT,
  default_workspace_id TEXT,
  default_project_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_asana_connections_user_id ON asana_connections(user_id);

-- Trigger to update updated_at on changes
CREATE OR REPLACE FUNCTION update_asana_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asana_connections_updated_at
  BEFORE UPDATE ON asana_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_asana_connections_updated_at();

-- RLS policies
ALTER TABLE asana_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own asana connections"
  ON asana_connections FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can insert own asana connections"
  ON asana_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own asana connections"
  ON asana_connections FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own asana connections"
  ON asana_connections FOR DELETE
  USING (auth.uid() = user_id);


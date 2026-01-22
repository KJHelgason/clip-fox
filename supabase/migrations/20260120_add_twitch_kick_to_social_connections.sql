-- Migration: Add Twitch and Kick platforms to social_connections
-- Run this if you have an existing database with the old platform constraint

-- Step 1: Drop the old constraint
ALTER TABLE social_connections
DROP CONSTRAINT IF EXISTS social_connections_platform_check;

-- Step 2: Add the new constraint with twitch and kick
ALTER TABLE social_connections
ADD CONSTRAINT social_connections_platform_check
CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'twitter', 'facebook', 'twitch', 'kick'));

-- Step 3: Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_social_connections_user_platform
ON social_connections(user_id, platform);

CREATE INDEX IF NOT EXISTS idx_social_connections_platform
ON social_connections(platform);

-- Step 4: Add comment for documentation
COMMENT ON TABLE social_connections IS 'Stores OAuth connections for social media platforms. Supports YouTube, TikTok, Twitch, Kick, Instagram, Twitter, and Facebook.';

COMMENT ON COLUMN social_connections.platform IS 'Social platform identifier: tiktok, youtube, instagram, twitter, facebook, twitch, kick';
COMMENT ON COLUMN social_connections.access_token IS 'OAuth access token (encrypted at rest by Supabase)';
COMMENT ON COLUMN social_connections.refresh_token IS 'OAuth refresh token for token renewal';
COMMENT ON COLUMN social_connections.token_expires_at IS 'When the access token expires';
COMMENT ON COLUMN social_connections.scopes IS 'Array of OAuth scopes granted by the user';

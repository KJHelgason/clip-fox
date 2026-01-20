-- ClipFox / AI Clipper - Supabase Database Setup
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. Create profiles table (for user roles)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 2. Create clips table
-- ============================================
CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  video_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration REAL,
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  -- Edit state (JSON stringified)
  edited BOOLEAN DEFAULT FALSE,
  edit_data JSONB,
  -- Metadata
  source_platform TEXT, -- 'twitch', 'youtube', 'upload'
  source_url TEXT,
  tags TEXT[],
  -- Status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'exported', 'error')),
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

-- Policies for clips
CREATE POLICY "Users can view their own clips" 
  ON clips FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clips" 
  ON clips FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clips" 
  ON clips FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clips" 
  ON clips FOR DELETE 
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Create exports table (for tracking exports)
-- ============================================
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Export settings
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  quality TEXT NOT NULL DEFAULT 'high',
  format TEXT NOT NULL DEFAULT 'mp4',
  resolution TEXT NOT NULL DEFAULT '1080p',
  fps INTEGER NOT NULL DEFAULT 30,
  -- Output
  output_path TEXT,
  output_size BIGINT,
  -- Processing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- Policies for exports
CREATE POLICY "Users can view their own exports" 
  ON exports FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exports" 
  ON exports FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. Create captions table (for AI-generated captions)
-- ============================================
CREATE TABLE IF NOT EXISTS captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Caption data
  language TEXT DEFAULT 'en',
  segments JSONB NOT NULL DEFAULT '[]',
  -- Processing
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE captions ENABLE ROW LEVEL SECURITY;

-- Policies for captions
CREATE POLICY "Users can view their own captions" 
  ON captions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own captions" 
  ON captions FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- 5. Create templates table (for saved user templates)
-- ============================================
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Template data
  aspect_ratio TEXT NOT NULL DEFAULT '9:16',
  layout_data JSONB,
  overlay_presets JSONB,
  caption_style JSONB,
  -- Visibility
  is_public BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policies for templates
CREATE POLICY "Users can view their own templates" 
  ON templates FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" 
  ON templates FOR SELECT 
  USING (is_public = TRUE);

CREATE POLICY "Users can manage their own templates" 
  ON templates FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- 6. Create function to auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, role)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 7. Create function to update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clips_updated_at
  BEFORE UPDATE ON clips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_captions_updated_at
  BEFORE UPDATE ON captions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. Create custom_elements table (for user uploaded images)
-- ============================================
CREATE TABLE IF NOT EXISTS custom_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT NOT NULL DEFAULT 'image', -- 'image' or 'gif'
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE custom_elements ENABLE ROW LEVEL SECURITY;

-- Policies for custom_elements
CREATE POLICY "Users can view their own custom elements" 
  ON custom_elements FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own custom elements" 
  ON custom_elements FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom elements" 
  ON custom_elements FOR DELETE 
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_custom_elements_user_id ON custom_elements(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_elements_created_at ON custom_elements(created_at DESC);

-- ============================================
-- 9. Create social_usernames table (for social sticker customization)
-- ============================================
CREATE TABLE IF NOT EXISTS social_usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube TEXT,
  tiktok TEXT,
  instagram TEXT,
  twitch TEXT,
  kick TEXT,
  twitter TEXT,
  facebook TEXT,
  discord TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE social_usernames ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own social usernames" 
  ON social_usernames FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert their own social usernames" 
  ON social_usernames FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social usernames" 
  ON social_usernames FOR UPDATE 
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_social_usernames_updated_at
  BEFORE UPDATE ON social_usernames
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. Create storage buckets (run in Storage section)
-- ============================================
-- NOTE: Create these buckets manually in Supabase Dashboard -> Storage:
-- 
-- Bucket 1: "clips" (for video files)
--   - Public: false
--   - File size limit: 500MB
--   - Allowed mime types: video/mp4, video/webm, video/quicktime
--
-- Bucket 2: "exports" (for exported videos)
--   - Public: false  
--   - File size limit: 500MB
--   - Allowed mime types: video/mp4, video/webm
--
-- Bucket 3: "thumbnails" (for video thumbnails)
--   - Public: true
--   - File size limit: 5MB
--   - Allowed mime types: image/jpeg, image/png, image/webp
--
-- Bucket 5: "audio" (for sound effects and music)
--   - Public: true (default sounds need public access)
--   - File size limit: 10MB
--   - Allowed mime types: audio/mpeg, audio/mp3, audio/wav, audio/ogg, audio/aac, audio/m4a

-- ============================================
-- 9. Storage bucket policies (after creating buckets)
-- ============================================

-- Clips bucket policies
CREATE POLICY "Users can upload clips"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'clips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own clips"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'clips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own clips"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'clips' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Exports bucket policies
CREATE POLICY "Users can upload exports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own exports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Thumbnails bucket policies (public read)
CREATE POLICY "Anyone can view thumbnails"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'thumbnails');

CREATE POLICY "Users can upload thumbnails"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'thumbnails' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Audio bucket policies (public read for all, write for authenticated users)
CREATE POLICY "Anyone can view audio files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio');

CREATE POLICY "Users can upload audio files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own audio files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 11. Create sounds table (for sound effects library)
-- ============================================
CREATE TABLE IF NOT EXISTS sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL for default sounds
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  duration REAL NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('full-songs', 'ambient', 'gaming', 'spooky', 'reactions', 'uploaded')),
  is_default BOOLEAN DEFAULT FALSE, -- TRUE for admin-uploaded default sounds
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE sounds ENABLE ROW LEVEL SECURITY;

-- Policies for sounds
-- Everyone can view default sounds
CREATE POLICY "Anyone can view default sounds"
  ON sounds FOR SELECT
  USING (is_default = TRUE);

-- Users can view their own uploaded sounds
CREATE POLICY "Users can view their own uploaded sounds"
  ON sounds FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sounds
CREATE POLICY "Users can insert their own sounds"
  ON sounds FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_default = FALSE);

-- Users can update their own sounds (e.g., rename)
CREATE POLICY "Users can update their own sounds"
  ON sounds FOR UPDATE
  USING (auth.uid() = user_id AND is_default = FALSE);

-- Users can delete their own uploaded sounds
CREATE POLICY "Users can delete their own uploaded sounds"
  ON sounds FOR DELETE
  USING (auth.uid() = user_id AND is_default = FALSE);

-- Admins can manage all sounds (including defaults)
CREATE POLICY "Admins can manage all sounds"
  ON sounds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_sounds_category ON sounds(category);
CREATE INDEX IF NOT EXISTS idx_sounds_user_id ON sounds(user_id);
CREATE INDEX IF NOT EXISTS idx_sounds_is_default ON sounds(is_default);

-- ============================================
-- 12. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clips_user_id ON clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status);
CREATE INDEX IF NOT EXISTS idx_exports_clip_id ON exports(clip_id);
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_captions_clip_id ON captions(clip_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- ============================================
-- 13. Subscription Plans (for Stripe billing)
-- ============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY, -- 'free', 'pro', 'business'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0, -- in cents
  price_yearly INTEGER NOT NULL DEFAULT 0, -- in cents
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  features JSONB NOT NULL DEFAULT '[]', -- array of feature strings
  limits JSONB NOT NULL DEFAULT '{}', -- { exports_per_month, resolution, storage_gb, etc }
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, limits) VALUES
  ('free', 'Free', 'Get started with basic features', 0, 0,
    '["3 exports/month", "720p max resolution", "Watermark on exports", "Basic elements", "Email support"]'::jsonb,
    '{"exports_per_month": 3, "max_resolution": "720p", "watermark": true, "ai_captions": false, "clipgpt": false, "social_publishing": false, "storage_gb": 1}'::jsonb),
  ('pro', 'Pro', 'Perfect for growing creators', 1200, 9600,
    '["30 exports/month", "1080p resolution", "No watermark", "AI captions", "All elements & stickers", "Priority support"]'::jsonb,
    '{"exports_per_month": 30, "max_resolution": "1080p", "watermark": false, "ai_captions": true, "clipgpt": false, "social_publishing": false, "storage_gb": 10}'::jsonb),
  ('business', 'Business', 'For professional content creators', 2900, 23200,
    '["Unlimited exports", "4K resolution", "No watermark", "ClipGPT AI analysis", "Social publishing", "Analytics dashboard", "Auto-clip pipeline", "Dedicated support"]'::jsonb,
    '{"exports_per_month": -1, "max_resolution": "4k", "watermark": false, "ai_captions": true, "clipgpt": true, "social_publishing": true, "auto_clip": true, "analytics": true, "storage_gb": 100}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits;

-- ============================================
-- 14. User Subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id) DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  billing_interval TEXT DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for subscriptions
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- ============================================
-- 15. Usage Logs (track exports, AI calls, etc)
-- ============================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('export', 'ai_transcription', 'ai_caption', 'ai_censor', 'ai_hook', 'clipgpt_analysis', 'social_publish', 'download')),
  resource_id UUID, -- clip_id, export_id, etc.
  metadata JSONB DEFAULT '{}',
  credits_used INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own usage logs"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action_type ON usage_logs(action_type);

-- ============================================
-- 16. Auto-Clip Pipeline Settings
-- ============================================
CREATE TABLE IF NOT EXISTS auto_clip_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'twitch', 'kick')),
  enabled BOOLEAN DEFAULT FALSE,
  channel_id TEXT, -- platform-specific channel identifier
  monitor_types TEXT[] DEFAULT '{}', -- ['vods', 'clips', 'uploads', 'highlights']
  edit_preferences JSONB DEFAULT '{"captions": true, "zoom_facecam": false, "silence_removal": false, "censoring": false}',
  output_settings JSONB DEFAULT '{"aspect_ratio": "9:16", "quality": "1080p", "watermark": false}',
  auto_publish BOOLEAN DEFAULT FALSE,
  publish_destinations TEXT[] DEFAULT '{}', -- ['tiktok', 'youtube_shorts', 'instagram_reels']
  approval_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE auto_clip_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own auto clip settings"
  ON auto_clip_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own auto clip settings"
  ON auto_clip_settings FOR ALL
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_auto_clip_settings_updated_at
  BEFORE UPDATE ON auto_clip_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 17. Auto-Clip Queue
-- ============================================
CREATE TABLE IF NOT EXISTS auto_clip_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_platform TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('vod', 'clip', 'upload', 'highlight')),
  detected_moments JSONB DEFAULT '[]', -- [{start: 120, end: 150, virality_score: 0.85, title: '...'}]
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'awaiting_approval', 'approved', 'rejected', 'published', 'failed')),
  edit_result_url TEXT,
  scheduled_publish_at TIMESTAMP WITH TIME ZONE,
  published_urls JSONB DEFAULT '{}', -- {tiktok: 'url', youtube: 'url'}
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE auto_clip_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own auto clip queue"
  ON auto_clip_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own auto clip queue"
  ON auto_clip_queue FOR ALL
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_auto_clip_queue_updated_at
  BEFORE UPDATE ON auto_clip_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auto_clip_queue_user_id ON auto_clip_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_clip_queue_status ON auto_clip_queue(status);

-- ============================================
-- 18. ClipGPT Projects (AI VOD Analysis)
-- ============================================
CREATE TABLE IF NOT EXISTS clipgpt_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  vod_url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'twitch', 'kick')),
  vod_duration INTEGER, -- in seconds
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'analyzing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0, -- 0-100
  clips_found INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clipgpt_projects ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own clipgpt projects"
  ON clipgpt_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own clipgpt projects"
  ON clipgpt_projects FOR ALL
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_clipgpt_projects_updated_at
  BEFORE UPDATE ON clipgpt_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 19. ClipGPT Moments (detected highlights)
-- ============================================
CREATE TABLE IF NOT EXISTS clipgpt_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES clipgpt_projects(id) ON DELETE CASCADE,
  start_time INTEGER NOT NULL, -- in seconds
  end_time INTEGER NOT NULL,
  duration INTEGER GENERATED ALWAYS AS (end_time - start_time) STORED,
  virality_score REAL DEFAULT 0, -- 0-1
  title TEXT,
  description TEXT,
  hashtags TEXT[],
  thumbnail_url TEXT,
  category TEXT, -- 'funny', 'epic', 'fail', 'clutch', etc
  exported BOOLEAN DEFAULT FALSE,
  export_id UUID REFERENCES exports(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clipgpt_moments ENABLE ROW LEVEL SECURITY;

-- Policies (inherit from project)
CREATE POLICY "Users can view moments from their projects"
  ON clipgpt_moments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM clipgpt_projects
    WHERE id = clipgpt_moments.project_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can manage moments from their projects"
  ON clipgpt_moments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clipgpt_projects
    WHERE id = clipgpt_moments.project_id AND user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clipgpt_moments_project_id ON clipgpt_moments(project_id);
CREATE INDEX IF NOT EXISTS idx_clipgpt_moments_virality ON clipgpt_moments(virality_score DESC);

-- ============================================
-- 20. Social Connections (OAuth for publishing)
-- ============================================
CREATE TABLE IF NOT EXISTS social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube', 'instagram', 'twitter', 'facebook')),
  platform_user_id TEXT,
  platform_username TEXT,
  platform_display_name TEXT,
  platform_avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own social connections"
  ON social_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own social connections"
  ON social_connections FOR ALL
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 21. Scheduled Posts
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES clips(id) ON DELETE SET NULL,
  export_id UUID REFERENCES exports(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  connection_id UUID REFERENCES social_connections(id) ON DELETE SET NULL,
  title TEXT,
  description TEXT,
  hashtags TEXT[],
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'publishing', 'published', 'failed', 'canceled')),
  published_url TEXT,
  platform_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own scheduled posts"
  ON scheduled_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own scheduled posts"
  ON scheduled_posts FOR ALL
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);

-- ============================================
-- 22. Montages
-- ============================================
CREATE TABLE IF NOT EXISTS montages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  clip_ids UUID[] NOT NULL,
  transitions JSONB DEFAULT '[]', -- [{type: 'fade', duration: 0.5}, ...]
  output_path TEXT,
  output_url TEXT,
  total_duration INTEGER, -- in seconds
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE montages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own montages"
  ON montages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own montages"
  ON montages FOR ALL
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_montages_updated_at
  BEFORE UPDATE ON montages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 23. Stream Schedules
-- ============================================
CREATE TABLE IF NOT EXISTS stream_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  schedule JSONB NOT NULL DEFAULT '{}', -- {monday: [{start: '10:00', end: '14:00', title: 'Gaming'}], ...}
  style_settings JSONB DEFAULT '{}', -- colors, fonts, background
  output_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stream_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own stream schedules"
  ON stream_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own stream schedules"
  ON stream_schedules FOR ALL
  USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_stream_schedules_updated_at
  BEFORE UPDATE ON stream_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 24. Function to create free subscription on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating subscription for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create free subscription
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();

-- ============================================
-- 25. Function to get user's current usage this month
-- ============================================
CREATE OR REPLACE FUNCTION get_monthly_usage(p_user_id UUID, p_action_type TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  usage_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(credits_used), 0) INTO usage_count
  FROM usage_logs
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('month', CURRENT_DATE)
    AND (p_action_type IS NULL OR action_type = p_action_type);
  RETURN usage_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 26. Function to check if user can perform action
-- ============================================
CREATE OR REPLACE FUNCTION can_perform_action(p_user_id UUID, p_action_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan_id TEXT;
  plan_limits JSONB;
  monthly_limit INTEGER;
  current_usage INTEGER;
BEGIN
  -- Get user's plan
  SELECT plan_id INTO user_plan_id
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active';

  IF user_plan_id IS NULL THEN
    user_plan_id := 'free';
  END IF;

  -- Get plan limits
  SELECT limits INTO plan_limits
  FROM subscription_plans
  WHERE id = user_plan_id;

  -- Check based on action type
  CASE p_action_type
    WHEN 'export' THEN
      monthly_limit := (plan_limits->>'exports_per_month')::INTEGER;
    WHEN 'clipgpt_analysis' THEN
      IF NOT (plan_limits->>'clipgpt')::BOOLEAN THEN
        RETURN FALSE;
      END IF;
      monthly_limit := -1; -- unlimited if feature enabled
    WHEN 'social_publish' THEN
      IF NOT (plan_limits->>'social_publishing')::BOOLEAN THEN
        RETURN FALSE;
      END IF;
      monthly_limit := -1;
    ELSE
      monthly_limit := -1;
  END CASE;

  -- -1 means unlimited
  IF monthly_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Check current usage
  current_usage := get_monthly_usage(p_user_id, p_action_type);

  RETURN current_usage < monthly_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Done! Your database is ready.
-- ============================================

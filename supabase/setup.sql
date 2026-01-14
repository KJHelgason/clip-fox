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
-- 8. Create storage buckets (run in Storage section)
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
-- Bucket 4: "stickers" (for custom stickers)
--   - Public: true
--   - File size limit: 2MB
--   - Allowed mime types: image/png, image/gif, image/webp

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

-- ============================================
-- 10. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_clips_user_id ON clips(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_created_at ON clips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status);
CREATE INDEX IF NOT EXISTS idx_exports_clip_id ON exports(clip_id);
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON exports(user_id);
CREATE INDEX IF NOT EXISTS idx_captions_clip_id ON captions(clip_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

-- ============================================
-- Done! Your database is ready.
-- ============================================

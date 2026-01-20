// Shared types for the clip editor

// ============================================
// Subscription & Billing Types
// ============================================

export type PlanId = 'free' | 'pro' | 'business'

export type BillingInterval = 'monthly' | 'yearly'

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'

export type SubscriptionPlan = {
  id: PlanId
  name: string
  description: string
  price_monthly: number // in cents
  price_yearly: number // in cents
  stripe_price_id_monthly?: string
  stripe_price_id_yearly?: string
  features: string[]
  limits: PlanLimits
  is_active: boolean
}

export type PlanLimits = {
  exports_per_month: number // -1 for unlimited
  max_resolution: '720p' | '1080p' | '1440p' | '4k'
  watermark: boolean
  ai_captions: boolean
  clipgpt: boolean
  social_publishing: boolean
  auto_clip?: boolean
  analytics?: boolean
  storage_gb: number
}

export type Subscription = {
  id: string
  user_id: string
  plan_id: PlanId
  stripe_customer_id?: string
  stripe_subscription_id?: string
  status: SubscriptionStatus
  billing_interval: BillingInterval
  current_period_start?: string
  current_period_end?: string
  cancel_at_period_end: boolean
  canceled_at?: string
  created_at: string
  updated_at: string
}

export type UsageLogAction =
  | 'export'
  | 'ai_transcription'
  | 'ai_caption'
  | 'ai_censor'
  | 'ai_hook'
  | 'clipgpt_analysis'
  | 'social_publish'
  | 'download'

export type UsageLog = {
  id: string
  user_id: string
  action_type: UsageLogAction
  resource_id?: string
  metadata?: Record<string, unknown>
  credits_used: number
  created_at: string
}

// ============================================
// Auto-Clip Pipeline Types
// ============================================

export type AutoClipPlatform = 'youtube' | 'twitch' | 'kick'

export type AutoClipMonitorType = 'vods' | 'clips' | 'uploads' | 'highlights'

export type AutoClipEditPreferences = {
  captions: boolean
  zoom_facecam: boolean
  silence_removal: boolean
  censoring: boolean
  stickers?: string[]
}

export type AutoClipOutputSettings = {
  aspect_ratio: AspectRatio
  quality: '720p' | '1080p' | '1440p' | '4k'
  watermark: boolean
}

export type AutoClipSettings = {
  id: string
  user_id: string
  platform: AutoClipPlatform
  enabled: boolean
  channel_id?: string
  monitor_types: AutoClipMonitorType[]
  edit_preferences: AutoClipEditPreferences
  output_settings: AutoClipOutputSettings
  auto_publish: boolean
  publish_destinations: string[]
  approval_required: boolean
  created_at: string
  updated_at: string
}

export type AutoClipQueueStatus =
  | 'pending'
  | 'processing'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'failed'

export type DetectedMoment = {
  start: number
  end: number
  virality_score: number
  title: string
  category?: string
}

export type AutoClipQueueItem = {
  id: string
  user_id: string
  source_platform: string
  source_url: string
  source_type: 'vod' | 'clip' | 'upload' | 'highlight'
  detected_moments: DetectedMoment[]
  status: AutoClipQueueStatus
  edit_result_url?: string
  scheduled_publish_at?: string
  published_urls?: Record<string, string>
  error_message?: string
  created_at: string
  updated_at: string
}

// ============================================
// ClipGPT Types
// ============================================

export type ClipGPTProjectStatus =
  | 'pending'
  | 'downloading'
  | 'analyzing'
  | 'completed'
  | 'failed'

export type ClipGPTProject = {
  id: string
  user_id: string
  title?: string
  vod_url: string
  platform: 'youtube' | 'twitch' | 'kick'
  vod_duration?: number
  status: ClipGPTProjectStatus
  progress: number
  clips_found: number
  error_message?: string
  created_at: string
  updated_at: string
}

export type ClipGPTMoment = {
  id: string
  project_id: string
  start_time: number
  end_time: number
  duration: number
  virality_score: number
  title?: string
  description?: string
  hashtags?: string[]
  thumbnail_url?: string
  category?: string
  exported: boolean
  export_id?: string
  created_at: string
}

// ============================================
// Social Publishing Types
// ============================================

export type SocialPublishPlatform = 'tiktok' | 'youtube' | 'instagram' | 'twitter' | 'facebook'

export type SocialConnection = {
  id: string
  user_id: string
  platform: SocialPublishPlatform
  platform_user_id?: string
  platform_username?: string
  platform_display_name?: string
  platform_avatar_url?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: string
  scopes?: string[]
  is_active: boolean
  last_used_at?: string
  created_at: string
  updated_at: string
}

export type ScheduledPostStatus = 'scheduled' | 'publishing' | 'published' | 'failed' | 'canceled'

export type ScheduledPost = {
  id: string
  user_id: string
  clip_id?: string
  export_id?: string
  platform: string
  connection_id?: string
  title?: string
  description?: string
  hashtags?: string[]
  scheduled_for: string
  status: ScheduledPostStatus
  published_url?: string
  platform_post_id?: string
  error_message?: string
  created_at: string
  updated_at: string
}

// ============================================
// Montage Types
// ============================================

export type MontageTransition = {
  type: 'fade' | 'slide' | 'zoom' | 'dissolve' | 'wipe'
  duration: number
}

export type Montage = {
  id: string
  user_id: string
  title: string
  clip_ids: string[]
  transitions: MontageTransition[]
  output_path?: string
  output_url?: string
  total_duration?: number
  status: 'draft' | 'processing' | 'completed' | 'failed'
  progress: number
  error_message?: string
  created_at: string
  updated_at: string
}

// ============================================
// Stream Schedule Types
// ============================================

export type ScheduleSlot = {
  start: string // HH:MM format
  end: string
  title: string
  color?: string
}

export type WeeklySchedule = {
  monday?: ScheduleSlot[]
  tuesday?: ScheduleSlot[]
  wednesday?: ScheduleSlot[]
  thursday?: ScheduleSlot[]
  friday?: ScheduleSlot[]
  saturday?: ScheduleSlot[]
  sunday?: ScheduleSlot[]
}

export type StreamSchedule = {
  id: string
  user_id: string
  template_name: string
  timezone: string
  schedule: WeeklySchedule
  style_settings?: {
    background_color?: string
    text_color?: string
    accent_color?: string
    font_family?: string
  }
  output_url?: string
  created_at: string
  updated_at: string
}

// Animation types available for elements
export type AnimationType = 
  | 'none' | 'reveal' | 'fade-in' | 'slide-right' | 'slide-left' | 'slide-top' | 'slide-bottom'
  | 'shrink' | 'bounce-in' | 'slide' | 'rotate' | 'sway'
  // Text-only animations
  | 'stick' | 'appear' | 'land' | 'pop' | 'unfold' | 'emerge' | 'burst' | 'jump' | 'glide'
  | 'flip' | 'float' | 'impact' | 'hop' | 'drift' | 'groove' | 'bounce' | 'shake' | 'whirl'

export type OverlayAnimation = {
  in: AnimationType
  out: AnimationType
  inDuration?: number // in seconds
  outDuration?: number // in seconds
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

// Fill types for text styling
export type FillType = {
  type: 'solid' | 'gradient'
  color?: string // for solid
  gradient?: {
    type: 'linear' | 'radial'
    angle?: number // for linear (0-360)
    stops: Array<{ position: number; color: string }> // position 0-100
  }
}

// Text style properties
export type TextStyle = {
  fontFamily: string
  fill: FillType
  outline?: {
    color: string
    width: number
  }
  shadow?: {
    color: string
    blur: number
    x: number
    y: number
  }
  glow?: {
    color: string
    strength: number
  }
  background?: {
    color: string
    opacity: number
    radius: number
  }
}

// Social sticker types
export type SocialPlatform = 'youtube' | 'tiktok' | 'instagram' | 'twitch' | 'kick' | 'twitter' | 'facebook' | 'discord'

// Sticker template types
export type StickerTemplate =
  | 'basic'           // Icon + username
  | 'follow'          // "Follow" label + icon + username
  | 'subscribe'       // "Subscribe" button style
  | 'banner'          // Wide banner with gradient
  | 'badge'           // Compact badge style
  | 'card'            // Card with icon and text
  | 'minimal'         // Just icon and text, no background

export type SocialSticker = {
  id: string
  name: string
  platform: SocialPlatform | 'multiple'
  platforms?: SocialPlatform[] // for 'multiple' type
  type: 'image' | 'animated'
  category: 'animated' | 'multiple' | SocialPlatform
  styles: string[] // available style variants
  defaultStyle: string
  thumbnailSrc: string
  // Template for rendering
  template: StickerTemplate
  // For animated stickers
  animationSrc?: string
  animation?: string // animation type: fadeIn, slideRight, bounceIn, etc.
}

// Custom element from user upload
export type CustomElement = {
  id: string
  user_id: string
  name: string
  file_path: string
  file_url: string
  file_type: 'image' | 'gif'
  width?: number
  height?: number
  file_size?: number
  created_at: string
}

// Social usernames for sticker customization
export type SocialUsernames = {
  id?: string
  user_id?: string
  youtube?: string
  tiktok?: string
  instagram?: string
  twitch?: string
  kick?: string
  twitter?: string
  facebook?: string
  discord?: string
}

// Reaction platform types
export type ReactionPlatform = 'twitch' | 'tiktok' | 'instagram' | 'twitter'

export type OverlayElement = {
  id: string
  type: 'text' | 'image' | 'sticker' | 'caption' | 'social-sticker' | 'reaction'
  // Position on video canvas (percentage, relative to video container)
  videoLeft: number
  videoTop: number
  videoWidth: number
  videoHeight: number
  // Original aspect ratio (for fixed aspect ratio elements)
  aspectRatio?: number
  // Position on timeline (px)
  timelineLeft: number
  timelineTop: number
  timelineWidth: number
  timelineHeight: number
  // Timing
  startTime: number
  endTime: number
  row: number
  // Content
  content?: string
  src?: string
  // Text styling
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  color?: string
  backgroundColor?: string
  textAlign?: 'left' | 'center' | 'right'
  textStroke?: string
  textShadow?: string
  letterSpacing?: number
  lineHeight?: number
  // Advanced text style
  textStyle?: TextStyle
  // Social sticker specific
  socialStickerId?: string
  socialPlatforms?: SocialPlatform[]
  stickerStyle?: string
  stickerTemplate?: StickerTemplate
  stickerAnimated?: boolean
  stickerAnimation?: string
  // Reaction specific
  reactionPlatform?: ReactionPlatform
  reactionUsername?: string
  reactionMessage?: string
  reactionDarkMode?: boolean
  // Visual effects
  opacity?: number
  rotation?: number
  zIndex?: number
  borderRadius?: number
  // Animation
  animation?: OverlayAnimation
}

export type Clip = {
  id: string
  title: string | null
  video_path: string
  signedUrl: string | null
  thumbnail_path?: string
  duration?: number
  width?: number
  height?: number
  created_at?: string
  edited?: boolean
  edit_data?: string // JSON stringified edit state
}

// Aspect ratio presets for different platforms
export const ASPECT_RATIOS = {
  '9:16': { width: 9, height: 16, label: 'TikTok / Reels', resolution: '1080×1920' },
  '16:9': { width: 16, height: 9, label: 'YouTube', resolution: '1920×1080' },
  '1:1': { width: 1, height: 1, label: 'Square', resolution: '1080×1080' },
  '4:5': { width: 4, height: 5, label: 'Instagram', resolution: '1080×1350' },
  '4:3': { width: 4, height: 3, label: 'Classic', resolution: '1440×1080' },
} as const

export type AspectRatio = keyof typeof ASPECT_RATIOS

// Layout templates for quick setup
export type LayoutTemplate = {
  id: string
  name: string
  description: string
  thumbnail: string
  aspectRatio: AspectRatio
  regions: LayoutRegion[]
}

export type LayoutRegion = {
  id: string
  name: string
  type: 'video' | 'facecam' | 'overlay' | 'chat'
  // Position as percentage of canvas (0-100)
  x: number
  y: number
  width: number
  height: number
  // Optional styling
  borderRadius?: number
  border?: string
  background?: string
  zIndex?: number
}

// Preset layouts
export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: 'full-vertical',
    name: 'Full Vertical',
    description: 'Full video cropped to vertical',
    thumbnail: '/layouts/full-vertical.png',
    aspectRatio: '9:16',
    regions: [
      { id: 'main', name: 'Main Video', type: 'video', x: 0, y: 0, width: 100, height: 100 }
    ]
  },
  {
    id: 'split-horizontal',
    name: 'Split Screen',
    description: 'Game on top, facecam on bottom',
    thumbnail: '/layouts/split-horizontal.png',
    aspectRatio: '9:16',
    regions: [
      { id: 'game', name: 'Gameplay', type: 'video', x: 0, y: 0, width: 100, height: 55 },
      { id: 'facecam', name: 'Facecam', type: 'facecam', x: 0, y: 55, width: 100, height: 45, borderRadius: 0 }
    ]
  },
  {
    id: 'pip-bottom-right',
    name: 'Picture in Picture',
    description: 'Facecam in corner',
    thumbnail: '/layouts/pip-bottom-right.png',
    aspectRatio: '9:16',
    regions: [
      { id: 'main', name: 'Main Video', type: 'video', x: 0, y: 0, width: 100, height: 100 },
      { id: 'facecam', name: 'Facecam', type: 'facecam', x: 60, y: 70, width: 35, height: 25, borderRadius: 12, border: '3px solid white' }
    ]
  },
  {
    id: 'gaming-vertical',
    name: 'Gaming Vertical',
    description: 'Optimized for gaming clips',
    thumbnail: '/layouts/gaming-vertical.png',
    aspectRatio: '9:16',
    regions: [
      { id: 'game', name: 'Gameplay', type: 'video', x: 0, y: 10, width: 100, height: 50 },
      { id: 'facecam', name: 'Facecam', type: 'facecam', x: 25, y: 62, width: 50, height: 35, borderRadius: 16, border: '4px solid #8B5CF6' }
    ]
  },
  {
    id: 'reaction',
    name: 'Reaction Style',
    description: 'Content on top, reaction below',
    thumbnail: '/layouts/reaction.png',
    aspectRatio: '9:16',
    regions: [
      { id: 'content', name: 'Content', type: 'video', x: 5, y: 5, width: 90, height: 45, borderRadius: 12 },
      { id: 'reaction', name: 'Your Reaction', type: 'facecam', x: 5, y: 52, width: 90, height: 43, borderRadius: 12 }
    ]
  },
  {
    id: 'triple-split',
    name: 'Triple Split',
    description: 'Three regions stacked',
    thumbnail: '/layouts/triple-split.png',
    aspectRatio: '9:16',
    regions: [
      { id: 'top', name: 'Top', type: 'video', x: 0, y: 0, width: 100, height: 33 },
      { id: 'middle', name: 'Middle', type: 'facecam', x: 0, y: 33, width: 100, height: 34 },
      { id: 'bottom', name: 'Bottom', type: 'overlay', x: 0, y: 67, width: 100, height: 33, background: '#1a1a2e' }
    ]
  }
]

// Sticker categories and items
export type StickerCategory = {
  id: string
  name: string
  icon: string
  stickers: Sticker[]
}

export type Sticker = {
  id: string
  name: string
  src: string
  category: string
}

export const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: 'social',
    name: 'Social',
    icon: '📱',
    stickers: [
      { id: 'twitch', name: 'Twitch', src: '/stickers/twitch.png', category: 'social' },
      { id: 'youtube', name: 'YouTube', src: '/stickers/youtube.png', category: 'social' },
      { id: 'tiktok', name: 'TikTok', src: '/stickers/tiktok.png', category: 'social' },
      { id: 'instagram', name: 'Instagram', src: '/stickers/instagram.png', category: 'social' },
      { id: 'twitter', name: 'Twitter/X', src: '/stickers/twitter.png', category: 'social' },
      { id: 'discord', name: 'Discord', src: '/stickers/discord.png', category: 'social' },
    ]
  },
  {
    id: 'reactions',
    name: 'Reactions',
    icon: '😂',
    stickers: [
      { id: 'fire', name: 'Fire', src: '/stickers/fire.png', category: 'reactions' },
      { id: 'laugh', name: 'Laugh', src: '/stickers/laugh.png', category: 'reactions' },
      { id: 'wow', name: 'Wow', src: '/stickers/wow.png', category: 'reactions' },
      { id: 'skull', name: 'Skull', src: '/stickers/skull.png', category: 'reactions' },
      { id: 'heart', name: 'Heart', src: '/stickers/heart.png', category: 'reactions' },
      { id: '100', name: '100', src: '/stickers/100.png', category: 'reactions' },
    ]
  },
  {
    id: 'gaming',
    name: 'Gaming',
    icon: '🎮',
    stickers: [
      { id: 'gg', name: 'GG', src: '/stickers/gg.png', category: 'gaming' },
      { id: 'victory', name: 'Victory', src: '/stickers/victory.png', category: 'gaming' },
      { id: 'defeat', name: 'Defeat', src: '/stickers/defeat.png', category: 'gaming' },
      { id: 'headshot', name: 'Headshot', src: '/stickers/headshot.png', category: 'gaming' },
      { id: 'combo', name: 'Combo', src: '/stickers/combo.png', category: 'gaming' },
    ]
  },
  {
    id: 'arrows',
    name: 'Pointers',
    icon: '👆',
    stickers: [
      { id: 'arrow-down', name: 'Arrow Down', src: '/stickers/arrow-down.png', category: 'arrows' },
      { id: 'arrow-up', name: 'Arrow Up', src: '/stickers/arrow-up.png', category: 'arrows' },
      { id: 'circle', name: 'Circle', src: '/stickers/circle.png', category: 'arrows' },
      { id: 'highlight', name: 'Highlight', src: '/stickers/highlight.png', category: 'arrows' },
    ]
  }
]

// Caption/Subtitle styles
export type CaptionStyle = {
  id: string
  name: string
  fontFamily: string
  fontSize: number
  fontWeight: string
  color: string
  backgroundColor: string
  textStroke?: string
  textShadow?: string
  borderRadius: number
  padding: string
}

export const CAPTION_STYLES: CaptionStyle[] = [
  {
    id: 'default',
    name: 'Default',
    fontFamily: 'Inter, sans-serif',
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: '8px 16px'
  },
  {
    id: 'tiktok',
    name: 'TikTok Style',
    fontFamily: 'Proxima Nova, sans-serif',
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    backgroundColor: 'transparent',
    textStroke: '2px #000000',
    textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
    borderRadius: 0,
    padding: '4px 8px'
  },
  {
    id: 'youtube',
    name: 'YouTube Style',
    fontFamily: 'Roboto, sans-serif',
    fontSize: 22,
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 4,
    padding: '6px 12px'
  },
  {
    id: 'neon',
    name: 'Neon Glow',
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 26,
    fontWeight: '700',
    color: '#00ff88',
    backgroundColor: 'transparent',
    textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88',
    borderRadius: 0,
    padding: '8px 16px'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    fontFamily: 'SF Pro Display, system-ui, sans-serif',
    fontSize: 20,
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: 'transparent',
    textShadow: '1px 1px 4px rgba(0,0,0,0.9)',
    borderRadius: 0,
    padding: '4px 8px'
  }
]

// Zoom keyframe for video effects
export type ZoomKeyframe = {
  id: string
  segmentId: string // Groups start/end keyframes together as one segment
  time: number // seconds
  scale: number // 1 = 100%, 1.5 = 150%
  x: number // 0-100, pan position
  y: number // 0-100, pan position
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
}

// Visual effect types
export type VisualEffectType = 'zoom-blur' | 'shake' | 'slide-shake' | 'morph' | 'slide' | 'glitch' | 'pixelate'

export type VisualEffect = {
  id: string
  type: VisualEffectType
  startTime: number // seconds
  endTime: number // seconds
}

// Audio track for timeline
export type AudioTrack = {
  id: string
  soundId: string
  name: string
  url: string // Blob URL or remote URL
  startTime: number // When it starts on timeline (seconds)
  duration: number // Full duration of audio (seconds)
  trimStart: number // Trim from beginning (seconds)
  trimEnd: number // Trim from end (seconds, relative to end)
  volume: number // 0-100
  isUserUploaded: boolean
  category: 'uploaded' | 'full-songs' | 'ambient' | 'gaming' | 'spooky' | 'reactions'
}

// Sound effect in library
export type SoundEffect = {
  id: string
  name: string
  duration: number // in seconds
  category: 'uploaded' | 'full-songs' | 'ambient' | 'gaming' | 'spooky' | 'reactions'
  url: string
  isUserUploaded?: boolean
}

// Export settings
export type ExportSettings = {
  aspectRatio: AspectRatio
  quality: 'low' | 'medium' | 'high' | 'ultra'
  format: 'mp4' | 'webm' | 'mov'
  fps: 24 | 30 | 60
  resolution: '720p' | '1080p' | '1440p' | '4k'
  includeAudio: boolean
  audioBitrate: 128 | 192 | 256 | 320
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  aspectRatio: '9:16',
  quality: 'high',
  format: 'mp4',
  fps: 30,
  resolution: '1080p',
  includeAudio: true,
  audioBitrate: 256
}

// Editor state for save/restore
export type EditorState = {
  aspectRatio: AspectRatio
  cropPosition: { x: number, y: number }
  overlays: OverlayElement[]
  startTime: number
  endTime: number
  thumbs: number[]
  zoomKeyframes: ZoomKeyframe[]
  selectedLayoutId?: string
}

// Helper functions
export function findAvailableRow(
  overlays: OverlayElement[],
  candidate: { startTime: number; endTime: number; id?: string }
): number {
  let row = 0
  while (true) {
    const overlaps = overlays.some(
      o =>
        o.row === row &&
        o.id !== candidate.id &&
        Math.max(o.startTime, candidate.startTime) < Math.min(o.endTime, candidate.endTime)
    )
    if (!overlaps) return row
    row++
  }
}

export function timeToPosition(t: number, duration: number, barWidth: number) {
  return (t / duration) * barWidth
}

export function positionToTime(pos: number, duration: number, barWidth: number) {
  return (pos / barWidth) * duration
}

export function durationToWidth(d: number, totalDuration: number, barWidth: number) {
  return (d / totalDuration) * barWidth
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

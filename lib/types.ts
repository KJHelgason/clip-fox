// Shared types for the clip editor

export type OverlayElement = {
  id: string
  type: 'text' | 'image' | 'sticker' | 'caption'
  // Position on video canvas (px, relative to video container)
  videoLeft: number
  videoTop: number
  videoWidth: number
  videoHeight: number
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
  // Visual effects
  opacity?: number
  rotation?: number
  zIndex?: number
  borderRadius?: number
  // Animation
  animation?: OverlayAnimation
}

export type OverlayAnimation = {
  type: 'none' | 'fade-in' | 'fade-out' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'bounce' | 'zoom-in' | 'zoom-out' | 'typewriter'
  duration?: number // in seconds
  delay?: number // in seconds
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
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
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  time: number // seconds
  scale: number // 1 = 100%, 1.5 = 150%
  x: number // 0-100, pan position
  y: number // 0-100, pan position
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
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

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type DownloadRequest = {
  url: string
  quality?: '360p' | '480p' | '720p' | '1080p'
}

type PlatformInfo = {
  platform: 'twitch' | 'youtube' | 'kick' | 'unknown'
  videoId: string | null
  type: 'clip' | 'vod' | 'video' | 'unknown'
}

// Parse URL to determine platform and video ID
function parseVideoUrl(url: string): PlatformInfo {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Twitch
    if (hostname.includes('twitch.tv') || hostname.includes('twitch.com')) {
      // Clip: clips.twitch.tv/ClipName or twitch.tv/channel/clip/ClipName
      if (hostname.includes('clips.') || urlObj.pathname.includes('/clip/')) {
        const clipMatch = urlObj.pathname.match(/\/([^/]+)$/)
        return {
          platform: 'twitch',
          videoId: clipMatch?.[1] || null,
          type: 'clip',
        }
      }
      // VOD: twitch.tv/videos/123456
      if (urlObj.pathname.includes('/videos/')) {
        const vodMatch = urlObj.pathname.match(/\/videos\/(\d+)/)
        return {
          platform: 'twitch',
          videoId: vodMatch?.[1] || null,
          type: 'vod',
        }
      }
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId = null

      if (hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.slice(1)
      } else {
        videoId = urlObj.searchParams.get('v')
        if (!videoId && urlObj.pathname.includes('/shorts/')) {
          videoId = urlObj.pathname.split('/shorts/')[1]
        }
      }

      return {
        platform: 'youtube',
        videoId,
        type: 'video',
      }
    }

    // Kick
    if (hostname.includes('kick.com')) {
      // Clip: kick.com/channel?clip=clipId
      const clipId = urlObj.searchParams.get('clip')
      if (clipId) {
        return {
          platform: 'kick',
          videoId: clipId,
          type: 'clip',
        }
      }
      // VOD: kick.com/video/vodId
      if (urlObj.pathname.includes('/video/')) {
        const vodMatch = urlObj.pathname.match(/\/video\/([^/]+)/)
        return {
          platform: 'kick',
          videoId: vodMatch?.[1] || null,
          type: 'vod',
        }
      }
    }

    return {
      platform: 'unknown',
      videoId: null,
      type: 'unknown',
    }
  } catch {
    return {
      platform: 'unknown',
      videoId: null,
      type: 'unknown',
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url, quality = '720p' } = await req.json() as DownloadRequest

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Parse the URL
    const videoInfo = parseVideoUrl(url)

    if (videoInfo.platform === 'unknown' || !videoInfo.videoId) {
      return NextResponse.json(
        { error: 'Unsupported URL. Please provide a valid Twitch, YouTube, or Kick link.' },
        { status: 400 }
      )
    }

    // Optional: Get user for tracking (downloads can work without auth for free tier)
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value
    let userId: string | null = null

    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      userId = user?.id || null
    }

    // Log download usage if user is authenticated
    if (userId) {
      await supabaseAdmin
        .from('usage_logs')
        .insert({
          user_id: userId,
          action_type: 'download',
          metadata: {
            url,
            platform: videoInfo.platform,
            video_id: videoInfo.videoId,
            type: videoInfo.type,
            quality,
          },
        })
    }

    // TODO: Implement actual video download
    // In production, you would:
    // 1. Use yt-dlp or similar to download the video
    // 2. Upload to temporary storage (24h expiry)
    // 3. Return download URL

    // For now, return a placeholder response
    return NextResponse.json({
      success: true,
      platform: videoInfo.platform,
      videoId: videoInfo.videoId,
      type: videoInfo.type,
      quality,
      message: 'Download functionality requires yt-dlp backend. This is a placeholder response.',
      // In production:
      // downloadUrl: signedUrl,
      // expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}

// Get download info without actually downloading
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 })
  }

  const videoInfo = parseVideoUrl(url)

  if (videoInfo.platform === 'unknown') {
    return NextResponse.json(
      { error: 'Unsupported URL' },
      { status: 400 }
    )
  }

  return NextResponse.json({
    platform: videoInfo.platform,
    videoId: videoInfo.videoId,
    type: videoInfo.type,
    supportedQualities: ['360p', '480p', '720p', '1080p'],
  })
}

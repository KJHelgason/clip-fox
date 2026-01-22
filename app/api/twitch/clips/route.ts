import { NextRequest, NextResponse } from 'next/server'

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET

// Twitch API clip response type
interface TwitchApiClip {
  id: string
  url: string
  embed_url: string
  broadcaster_id: string
  broadcaster_name: string
  creator_id: string
  creator_name: string
  video_id: string
  game_id: string
  language: string
  title: string
  view_count: number
  created_at: string
  thumbnail_url: string
  duration: number
  vod_offset: number | null
}

// Cache for the app access token
let cachedToken: { token: string; expiresAt: number } | null = null

// Get an app access token from Twitch
async function getAppAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error('Twitch credentials not configured')
    return null
  }

  try {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: TWITCH_CLIENT_ID,
        client_secret: TWITCH_CLIENT_SECRET,
        grant_type: 'client_credentials',
      }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()

    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    }

    return data.access_token
  } catch (error) {
    console.error('Error getting Twitch access token:', error)
    return null
  }
}

// Get broadcaster ID from username
async function getBroadcasterId(username: string, accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/users?login=${encodeURIComponent(username)}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': TWITCH_CLIENT_ID!,
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.data?.[0]?.id || null
  } catch (error) {
    console.error('Error getting broadcaster ID:', error)
    return null
  }
}

// GET /api/twitch/clips?username=channel&limit=20&period=all
// period: 24h, 7d, 30d, all
export async function GET(request: NextRequest) {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Twitch API credentials not configured' },
      { status: 500 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const username = searchParams.get('username')
  const broadcasterId = searchParams.get('broadcaster_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const period = searchParams.get('period') || 'all' // 24h, 7d, 30d, all
  const cursor = searchParams.get('cursor') // For pagination

  if (!username && !broadcasterId) {
    return NextResponse.json(
      { error: 'Either username or broadcaster_id parameter is required' },
      { status: 400 }
    )
  }

  try {
    const accessToken = await getAppAccessToken()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with Twitch' },
        { status: 500 }
      )
    }

    // Get broadcaster ID if username provided
    let finalBroadcasterId = broadcasterId
    if (!finalBroadcasterId && username) {
      finalBroadcasterId = await getBroadcasterId(username.toLowerCase(), accessToken)
      if (!finalBroadcasterId) {
        return NextResponse.json(
          { error: 'Channel not found', username },
          { status: 404 }
        )
      }
    }

    // Build query params
    const params = new URLSearchParams({
      broadcaster_id: finalBroadcasterId!,
      first: limit.toString(),
    })

    // Add time filter based on period
    if (period !== 'all') {
      const now = new Date()
      let startedAt: Date

      switch (period) {
        case '24h':
          startedAt = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startedAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startedAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startedAt = new Date(0) // Beginning of time
      }

      params.set('started_at', startedAt.toISOString())
      params.set('ended_at', now.toISOString())
    }

    if (cursor) {
      params.set('after', cursor)
    }

    const clipsResponse = await fetch(
      `https://api.twitch.tv/helix/clips?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      }
    )

    if (!clipsResponse.ok) {
      const errorText = await clipsResponse.text()
      console.error('Failed to get clips:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch clips from Twitch' },
        { status: clipsResponse.status }
      )
    }

    const clipsData = await clipsResponse.json()

    // Transform clips data
    const clips = clipsData.data.map((clip: TwitchApiClip) => ({
      id: clip.id,
      url: clip.url,
      embed_url: clip.embed_url,
      broadcaster_id: clip.broadcaster_id,
      broadcaster_name: clip.broadcaster_name,
      creator_id: clip.creator_id,
      creator_name: clip.creator_name,
      video_id: clip.video_id,
      game_id: clip.game_id,
      language: clip.language,
      title: clip.title,
      view_count: clip.view_count,
      created_at: clip.created_at,
      thumbnail_url: clip.thumbnail_url,
      duration: clip.duration,
      vod_offset: clip.vod_offset,
    }))

    return NextResponse.json({
      data: clips,
      pagination: clipsData.pagination,
      total: clips.length,
    })
  } catch (error) {
    console.error('Error fetching Twitch clips:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

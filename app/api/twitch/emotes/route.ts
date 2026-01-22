import { NextRequest, NextResponse } from 'next/server'

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET

// Cache for the app access token
let cachedToken: { token: string; expiresAt: number } | null = null

// Get an app access token from Twitch
async function getAppAccessToken(): Promise<string | null> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token
  }

  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    console.error('Twitch credentials not configured')
    return null
  }

  try {
    console.log('Attempting Twitch OAuth with client_id:', TWITCH_CLIENT_ID?.substring(0, 8) + '...')

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

    const responseText = await response.text()

    if (!response.ok) {
      console.error('Failed to get Twitch access token. Status:', response.status)
      console.error('Response:', responseText)
      return null
    }

    const data = JSON.parse(responseText)

    // Cache the token (expires_in is in seconds, subtract 60 seconds for safety margin)
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    }

    console.log('Successfully obtained Twitch access token')
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

// GET /api/twitch/emotes?channel=username
export async function GET(request: NextRequest) {
  if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
    return NextResponse.json(
      { error: 'Twitch API credentials not configured' },
      { status: 500 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const channel = searchParams.get('channel')

  if (!channel) {
    return NextResponse.json(
      { error: 'Channel parameter is required' },
      { status: 400 }
    )
  }

  try {
    // Get app access token
    const accessToken = await getAppAccessToken()
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to authenticate with Twitch' },
        { status: 500 }
      )
    }

    // Get broadcaster ID from username
    const broadcasterId = await getBroadcasterId(channel.toLowerCase(), accessToken)
    if (!broadcasterId) {
      return NextResponse.json(
        { error: 'Channel not found', channel },
        { status: 404 }
      )
    }

    // Get channel emotes
    const emotesResponse = await fetch(
      `https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${broadcasterId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': TWITCH_CLIENT_ID,
        },
      }
    )

    if (!emotesResponse.ok) {
      const errorText = await emotesResponse.text()
      console.error('Failed to get emotes:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch emotes from Twitch' },
        { status: emotesResponse.status }
      )
    }

    const emotesData = await emotesResponse.json()

    // Transform the emotes data for easier consumption
    const emotes = emotesData.data.map((emote: { id: string; name: string; format: string[]; scale: string[]; theme_mode: string[]; tier?: string; emote_type?: string }) => {
      // Build the URL using the template
      // Template: https://static-cdn.jtvnw.net/emoticons/v2/{{id}}/{{format}}/{{theme_mode}}/{{scale}}
      const format = emote.format.includes('animated') ? 'animated' : 'static'
      const theme = 'dark' // Use dark theme by default
      const scale = '3.0' // Use largest scale for quality

      return {
        id: emote.id,
        name: emote.name,
        url: `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/${format}/${theme}/${scale}`,
        // Also provide smaller versions
        url_1x: `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/${format}/${theme}/1.0`,
        url_2x: `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/${format}/${theme}/2.0`,
        url_4x: `https://static-cdn.jtvnw.net/emoticons/v2/${emote.id}/${format}/${theme}/3.0`,
        tier: emote.tier,
        emote_type: emote.emote_type,
        format: emote.format,
        isAnimated: emote.format.includes('animated'),
      }
    })

    return NextResponse.json({
      data: emotes,
      channel: channel,
      broadcaster_id: broadcasterId,
      total: emotes.length,
    })
  } catch (error) {
    console.error('Error fetching Twitch emotes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

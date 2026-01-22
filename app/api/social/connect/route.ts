import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Supported OAuth providers through Supabase
const SUPABASE_PROVIDERS = ['google', 'twitch', 'discord'] as const

// Platform to Supabase provider mapping
const PLATFORM_PROVIDER_MAP: Record<string, string> = {
  youtube: 'google', // YouTube uses Google OAuth
  twitch: 'twitch',
}

// Platforms requiring custom OAuth (not through Supabase)
const CUSTOM_OAUTH_PLATFORMS = ['tiktok', 'instagram', 'facebook', 'kick'] as const

export async function POST(req: NextRequest) {
  try {
    const { platform, returnUrl } = await req.json()

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
    }

    // Get user from auth header/cookie
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    // Get user session from Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already has this platform connected
    const { data: existingConnection } = await supabaseAdmin
      .from('social_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .single()

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Platform already connected', connectionId: existingConnection.id },
        { status: 400 }
      )
    }

    // Determine OAuth approach based on platform
    const supabaseProvider = PLATFORM_PROVIDER_MAP[platform]
    const isCustomOAuth = CUSTOM_OAUTH_PLATFORMS.includes(platform)

    if (supabaseProvider) {
      // Use Supabase OAuth for supported providers
      // The actual OAuth is initiated client-side, this returns the config
      return NextResponse.json({
        method: 'supabase',
        provider: supabaseProvider,
        platform,
        scopes: getProviderScopes(supabaseProvider, platform),
      })
    } else if (isCustomOAuth) {
      // Return custom OAuth URL for platforms not supported by Supabase
      const oauthUrl = getCustomOAuthUrl(platform, user.id, returnUrl || '/dashboard/connections')

      if (!oauthUrl) {
        return NextResponse.json(
          { error: `${platform} OAuth is not yet configured` },
          { status: 501 }
        )
      }

      return NextResponse.json({
        method: 'custom',
        platform,
        url: oauthUrl,
      })
    } else {
      return NextResponse.json(
        { error: `Platform ${platform} is not supported` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    )
  }
}

// Get OAuth scopes for each provider
function getProviderScopes(provider: string, platform: string): string[] {
  switch (provider) {
    case 'google':
      if (platform === 'youtube') {
        // YouTube-specific scopes for video upload and channel management
        return [
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube.readonly',
          'https://www.googleapis.com/auth/userinfo.profile',
        ]
      }
      return ['profile', 'email']

    case 'twitch':
      // Twitch scopes for clips and channel info
      return [
        'user:read:email',
        'clips:edit',
        'channel:read:stream_key',
      ]

    case 'discord':
      return ['identify', 'email']

    default:
      return []
  }
}

// Generate custom OAuth URLs for platforms not in Supabase
function getCustomOAuthUrl(platform: string, userId: string, returnUrl: string): string | null {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const state = Buffer.from(JSON.stringify({ userId, returnUrl, platform })).toString('base64')

  switch (platform) {
    case 'tiktok': {
      const clientKey = process.env.TIKTOK_CLIENT_KEY
      if (!clientKey) return null

      const params = new URLSearchParams({
        client_key: clientKey,
        response_type: 'code',
        scope: 'user.info.basic,video.upload,video.publish',
        redirect_uri: `${baseUrl}/api/social/callback/tiktok`,
        state,
      })
      return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
    }

    case 'instagram': {
      const clientId = process.env.INSTAGRAM_CLIENT_ID
      if (!clientId) return null

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${baseUrl}/api/social/callback/instagram`,
        scope: 'instagram_basic,instagram_content_publish',
        response_type: 'code',
        state,
      })
      return `https://api.instagram.com/oauth/authorize?${params.toString()}`
    }

    case 'facebook': {
      const appId = process.env.FACEBOOK_APP_ID
      if (!appId) return null

      const params = new URLSearchParams({
        client_id: appId,
        redirect_uri: `${baseUrl}/api/social/callback/facebook`,
        scope: 'pages_manage_posts,pages_read_engagement',
        response_type: 'code',
        state,
      })
      return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
    }

    case 'kick':
      // Kick doesn't have a public OAuth API yet
      return null

    default:
      return null
  }
}

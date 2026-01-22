import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Missing authorization code`)
  }

  try {
    // Decode state to get user ID and return URL
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const { userId, returnUrl } = stateData

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!)
    tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET!)
    tokenUrl.searchParams.set('redirect_uri', `${baseUrl}/api/social/callback/facebook`)
    tokenUrl.searchParams.set('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Facebook token error:', tokenData)
      return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=${encodeURIComponent(tokenData.error.message)}`)
    }

    const { access_token, expires_in } = tokenData

    // Exchange for long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!)
    longLivedUrl.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET!)
    longLivedUrl.searchParams.set('fb_exchange_token', access_token)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    const longLivedData = await longLivedResponse.json()

    const longLivedToken = longLivedData.access_token || access_token
    const tokenExpiry = longLivedData.expires_in || expires_in

    // Get user profile
    const profileResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,picture&access_token=${longLivedToken}`
    )

    const profileData = await profileResponse.json()

    // Calculate token expiration
    const expiresAt = tokenExpiry
      ? new Date(Date.now() + tokenExpiry * 1000).toISOString()
      : null

    // Save connection to database
    const { error: upsertError } = await supabaseAdmin
      .from('social_connections')
      .upsert(
        {
          user_id: userId,
          platform: 'facebook',
          platform_user_id: profileData.id,
          platform_username: null, // Facebook doesn't have usernames
          platform_display_name: profileData.name || null,
          platform_avatar_url: profileData.picture?.data?.url || null,
          access_token: longLivedToken,
          refresh_token: null,
          token_expires_at: expiresAt,
          scopes: ['pages_manage_posts', 'pages_read_engagement'],
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      )

    if (upsertError) {
      console.error('Error saving Facebook connection:', upsertError)
      return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Failed to save connection`)
    }

    return NextResponse.redirect(`${returnUrl || baseUrl + '/dashboard/connections'}?connected=facebook`)
  } catch (err) {
    console.error('Facebook callback error:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Connection failed`)
  }
}

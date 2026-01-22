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
  const errorReason = searchParams.get('error_reason')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=${encodeURIComponent(errorReason || error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Missing authorization code`)
  }

  try {
    // Decode state to get user ID and return URL
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const { userId, returnUrl } = stateData

    // Exchange code for short-lived access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        redirect_uri: `${baseUrl}/api/social/callback/instagram`,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error_message) {
      console.error('Instagram token error:', tokenData)
      return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=${encodeURIComponent(tokenData.error_message)}`)
    }

    const { access_token: shortLivedToken, user_id: instagramUserId } = tokenData

    // Exchange short-lived token for long-lived token
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&access_token=${shortLivedToken}`
    )

    const longLivedData = await longLivedResponse.json()
    const { access_token, expires_in } = longLivedData

    // Get user profile
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${access_token}`
    )

    const profileData = await profileResponse.json()

    // Calculate token expiration (long-lived tokens last ~60 days)
    const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000).toISOString()

    // Save connection to database
    const { error: upsertError } = await supabaseAdmin
      .from('social_connections')
      .upsert(
        {
          user_id: userId,
          platform: 'instagram',
          platform_user_id: instagramUserId || profileData.id,
          platform_username: profileData.username || null,
          platform_display_name: profileData.username || null,
          platform_avatar_url: null, // Instagram Basic Display API doesn't provide avatar
          access_token,
          refresh_token: null, // Instagram uses token refresh endpoint instead
          token_expires_at: expiresAt,
          scopes: ['instagram_basic', 'instagram_content_publish'],
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      )

    if (upsertError) {
      console.error('Error saving Instagram connection:', upsertError)
      return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Failed to save connection`)
    }

    return NextResponse.redirect(`${returnUrl || baseUrl + '/dashboard/connections'}?connected=instagram`)
  } catch (err) {
    console.error('Instagram callback error:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Connection failed`)
  }
}

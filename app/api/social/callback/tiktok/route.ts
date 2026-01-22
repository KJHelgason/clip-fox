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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error) {
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Missing authorization code`)
  }

  try {
    // Decode state to get user ID and return URL
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const { userId, returnUrl } = stateData

    // Exchange code for access token
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${baseUrl}/api/social/callback/tiktok`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('TikTok token error:', tokenData)
      return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=${encodeURIComponent(tokenData.error.message || 'Failed to get access token')}`)
    }

    const { access_token, refresh_token, expires_in, open_id } = tokenData

    // Get user info from TikTok
    const userResponse = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    })

    const userData = await userResponse.json()
    const userInfo = userData.data?.user || {}

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()

    // Save connection to database
    const { error: upsertError } = await supabaseAdmin
      .from('social_connections')
      .upsert(
        {
          user_id: userId,
          platform: 'tiktok',
          platform_user_id: open_id,
          platform_username: userInfo.username || null,
          platform_display_name: userInfo.display_name || null,
          platform_avatar_url: userInfo.avatar_url || null,
          access_token,
          refresh_token,
          token_expires_at: expiresAt,
          scopes: ['user.info.basic', 'video.upload', 'video.publish'],
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      )

    if (upsertError) {
      console.error('Error saving TikTok connection:', upsertError)
      return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Failed to save connection`)
    }

    return NextResponse.redirect(`${returnUrl || baseUrl + '/dashboard/connections'}?connected=tiktok`)
  } catch (err) {
    console.error('TikTok callback error:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard/connections?error=Connection failed`)
  }
}

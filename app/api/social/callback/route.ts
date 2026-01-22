import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// This route handles Supabase OAuth callbacks for identity linking
// It's called after Supabase completes the OAuth flow
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const platform = searchParams.get('platform')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const returnUrl = `${baseUrl}/dashboard/connections`

  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${returnUrl}?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (!platform) {
    return NextResponse.redirect(`${returnUrl}?error=Missing platform parameter`)
  }

  // Redirect to connections page - the page will handle saving the connection
  return NextResponse.redirect(`${returnUrl}?connected=${platform}`)
}

// POST handler for saving connection data after successful OAuth
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      platform,
      platformUserId,
      platformUsername,
      platformDisplayName,
      platformAvatarUrl,
      accessToken,
      refreshToken,
      expiresAt,
      scopes,
    } = body

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

    // Upsert the connection (update if exists, insert if not)
    const { data: connection, error: upsertError } = await supabaseAdmin
      .from('social_connections')
      .upsert(
        {
          user_id: user.id,
          platform,
          platform_user_id: platformUserId,
          platform_username: platformUsername,
          platform_display_name: platformDisplayName,
          platform_avatar_url: platformAvatarUrl,
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: expiresAt,
          scopes: scopes || [],
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Error saving connection:', upsertError)
      return NextResponse.json({ error: 'Failed to save connection' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      connection,
    })
  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    )
  }
}

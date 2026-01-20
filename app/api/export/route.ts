import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ExportSettings, EditorState } from '@/lib/types'

// Create admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // Get user from auth
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json() as {
      clipId: string
      exportSettings: ExportSettings
      editorState: EditorState
    }

    const { clipId, exportSettings, editorState } = body

    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID required' }, { status: 400 })
    }

    // Check if user owns the clip
    const { data: clip, error: clipError } = await supabaseAdmin
      .from('clips')
      .select('*')
      .eq('id', clipId)
      .eq('user_id', user.id)
      .single()

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Check subscription limits
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .single()

    const planId = subscription?.plan_id || 'free'

    // Get plan limits
    const { data: planData } = await supabaseAdmin
      .from('subscription_plans')
      .select('limits')
      .eq('id', planId)
      .single()

    const limits = planData?.limits as { exports_per_month?: number; max_resolution?: string; watermark?: boolean } || {}

    // Check export limit
    if (limits.exports_per_month && limits.exports_per_month !== -1) {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count } = await supabaseAdmin
        .from('usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action_type', 'export')
        .gte('created_at', startOfMonth.toISOString())

      if ((count || 0) >= limits.exports_per_month) {
        return NextResponse.json(
          { error: 'Export limit reached. Please upgrade your plan.' },
          { status: 403 }
        )
      }
    }

    // Validate resolution against plan
    const resolutionOrder = ['720p', '1080p', '1440p', '4k']
    const maxRes = limits.max_resolution || '720p'
    const requestedRes = exportSettings.resolution

    if (resolutionOrder.indexOf(requestedRes) > resolutionOrder.indexOf(maxRes)) {
      return NextResponse.json(
        { error: `Your plan only allows up to ${maxRes}. Please upgrade for higher resolutions.` },
        { status: 403 }
      )
    }

    // Create export record
    const { data: exportRecord, error: exportError } = await supabaseAdmin
      .from('exports')
      .insert({
        clip_id: clipId,
        user_id: user.id,
        aspect_ratio: exportSettings.aspectRatio,
        quality: exportSettings.quality,
        format: exportSettings.format,
        resolution: exportSettings.resolution,
        fps: exportSettings.fps,
        status: 'pending',
        progress: 0,
      })
      .select()
      .single()

    if (exportError) {
      console.error('Error creating export record:', exportError)
      return NextResponse.json({ error: 'Failed to create export' }, { status: 500 })
    }

    // Log usage
    await supabaseAdmin
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action_type: 'export',
        resource_id: exportRecord.id,
        metadata: {
          clip_id: clipId,
          settings: exportSettings,
          watermark: limits.watermark || false,
        },
      })

    // TODO: Queue the actual FFmpeg export job
    // For now, we'll return the export ID and the client will poll for status
    // In production, you would:
    // 1. Send job to a background worker (Vercel background functions, AWS Lambda, etc.)
    // 2. Worker processes video with FFmpeg
    // 3. Upload result to Supabase Storage
    // 4. Update export record with output_path

    // Simulate starting the export (in production, this would be a queue job)
    await supabaseAdmin
      .from('exports')
      .update({ status: 'processing', progress: 10 })
      .eq('id', exportRecord.id)

    return NextResponse.json({
      exportId: exportRecord.id,
      status: 'processing',
      message: 'Export started. Check status at /api/export/{exportId}',
      watermark: limits.watermark || false,
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}

// Get all exports for user
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: exports, error } = await supabaseAdmin
      .from('exports')
      .select('*, clips(title, thumbnail_path)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching exports:', error)
      return NextResponse.json({ error: 'Failed to fetch exports' }, { status: 500 })
    }

    return NextResponse.json({ exports })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to fetch exports' }, { status: 500 })
  }
}

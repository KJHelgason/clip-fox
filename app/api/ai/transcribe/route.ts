import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Create admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Lazy-load OpenAI client to avoid build-time errors when API key is missing
let _openai: OpenAI | null = null
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) {
    return null
  }
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return _openai
}

type TranscribeRequest = {
  clipId: string
  language?: string
}

export async function POST(req: NextRequest) {
  try {
    // Get user from auth
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clipId, language = 'en' } = await req.json() as TranscribeRequest

    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID required' }, { status: 400 })
    }

    // Check subscription for AI captions access
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', user.id)
      .single()

    const planId = subscription?.plan_id || 'free'

    const { data: planData } = await supabaseAdmin
      .from('subscription_plans')
      .select('limits')
      .eq('id', planId)
      .single()

    const limits = planData?.limits as { ai_captions?: boolean } || {}

    if (!limits.ai_captions) {
      return NextResponse.json(
        { error: 'AI captions require Pro plan or higher. Please upgrade.' },
        { status: 403 }
      )
    }

    // Get the clip
    const { data: clip, error: clipError } = await supabaseAdmin
      .from('clips')
      .select('*')
      .eq('id', clipId)
      .eq('user_id', user.id)
      .single()

    if (clipError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Check if caption already exists
    const { data: existingCaption } = await supabaseAdmin
      .from('captions')
      .select('id, segments, status')
      .eq('clip_id', clipId)
      .single()

    if (existingCaption?.status === 'completed') {
      return NextResponse.json({
        captionId: existingCaption.id,
        segments: existingCaption.segments,
        status: 'completed',
        message: 'Caption already exists',
      })
    }

    // Create or update caption record
    let captionId = existingCaption?.id

    if (!captionId) {
      const { data: newCaption, error: createError } = await supabaseAdmin
        .from('captions')
        .insert({
          clip_id: clipId,
          user_id: user.id,
          language,
          status: 'processing',
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating caption:', createError)
        return NextResponse.json({ error: 'Failed to create caption record' }, { status: 500 })
      }

      captionId = newCaption.id
    } else {
      await supabaseAdmin
        .from('captions')
        .update({ status: 'processing' })
        .eq('id', captionId)
    }

    // Log usage
    await supabaseAdmin
      .from('usage_logs')
      .insert({
        user_id: user.id,
        action_type: 'ai_transcription',
        resource_id: captionId,
        metadata: { clip_id: clipId, language },
      })

    // Get signed URL for the video
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from('clips')
      .createSignedUrl(clip.video_path, 3600)

    if (!signedUrlData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to access video file' }, { status: 500 })
    }

    // TODO: In production, extract audio and send to Whisper API
    // For now, return a placeholder response

    // Simulated transcription response
    const mockSegments = [
      { start: 0, end: 2.5, text: 'Hello everyone, welcome to my stream!' },
      { start: 2.5, end: 5.0, text: 'Today we are going to play some games.' },
      { start: 5.0, end: 8.0, text: "Let's get started!" },
    ]

    // Update caption with results
    await supabaseAdmin
      .from('captions')
      .update({
        segments: mockSegments,
        status: 'completed',
      })
      .eq('id', captionId)

    return NextResponse.json({
      captionId,
      segments: mockSegments,
      status: 'completed',
      language,
      message: 'Transcription completed (mock data - connect Whisper API for real transcription)',
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}

// Get captions for a clip
export async function GET(req: NextRequest) {
  try {
    const clipId = req.nextUrl.searchParams.get('clipId')

    if (!clipId) {
      return NextResponse.json({ error: 'Clip ID required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: caption, error } = await supabaseAdmin
      .from('captions')
      .select('*')
      .eq('clip_id', clipId)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ caption: null, message: 'No captions found' })
      }
      throw error
    }

    return NextResponse.json({ caption })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to get captions' }, { status: 500 })
  }
}

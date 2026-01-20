import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteParams = { params: Promise<{ id: string }> }

// Get a single clip
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: clipId } = await params

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: clip, error } = await supabaseAdmin
      .from('clips')
      .select('*')
      .eq('id', clipId)
      .eq('user_id', user.id)
      .single()

    if (error || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Generate signed URL for the video
    let signedUrl = null
    if (clip.video_path) {
      const { data: signedData } = await supabaseAdmin.storage
        .from('clips')
        .createSignedUrl(clip.video_path, 3600)
      signedUrl = signedData?.signedUrl
    }

    return NextResponse.json({
      ...clip,
      signedUrl,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to get clip' }, { status: 500 })
  }
}

// Update a clip
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: clipId } = await params

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const allowedFields = ['title', 'description', 'edit_data', 'edited', 'tags', 'status']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: clip, error } = await supabaseAdmin
      .from('clips')
      .update(updates)
      .eq('id', clipId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating clip:', error)
      return NextResponse.json({ error: 'Failed to update clip' }, { status: 500 })
    }

    return NextResponse.json(clip)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to update clip' }, { status: 500 })
  }
}

// Delete a clip
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: clipId } = await params

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get clip to delete associated files
    const { data: clip, error: fetchError } = await supabaseAdmin
      .from('clips')
      .select('video_path, thumbnail_path')
      .eq('id', clipId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Delete files from storage
    const filesToDelete = [clip.video_path, clip.thumbnail_path].filter(Boolean) as string[]
    if (filesToDelete.length > 0) {
      await supabaseAdmin.storage.from('clips').remove(filesToDelete)
    }

    // Delete clip record (cascades to exports, captions)
    const { error: deleteError } = await supabaseAdmin
      .from('clips')
      .delete()
      .eq('id', clipId)

    if (deleteError) {
      console.error('Error deleting clip:', deleteError)
      return NextResponse.json({ error: 'Failed to delete clip' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Clip deleted' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to delete clip' }, { status: 500 })
  }
}

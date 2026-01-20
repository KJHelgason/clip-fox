import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: exportId } = await params

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: exportData, error } = await supabaseAdmin
      .from('exports')
      .select('*')
      .eq('id', exportId)
      .eq('user_id', user.id)
      .single()

    if (error || !exportData) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    // If completed, generate a signed URL for download
    let downloadUrl = null
    if (exportData.status === 'completed' && exportData.output_path) {
      const { data: signedData } = await supabaseAdmin.storage
        .from('exports')
        .createSignedUrl(exportData.output_path, 3600) // 1 hour expiry

      downloadUrl = signedData?.signedUrl
    }

    return NextResponse.json({
      id: exportData.id,
      status: exportData.status,
      progress: exportData.progress,
      error_message: exportData.error_message,
      output_size: exportData.output_size,
      download_url: downloadUrl,
      created_at: exportData.created_at,
      completed_at: exportData.completed_at,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to get export status' }, { status: 500 })
  }
}

// Cancel an export
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: exportId } = await params

    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow canceling pending/processing exports
    const { data: exportData, error: fetchError } = await supabaseAdmin
      .from('exports')
      .select('status')
      .eq('id', exportId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !exportData) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 })
    }

    if (!['pending', 'processing'].includes(exportData.status)) {
      return NextResponse.json({ error: 'Cannot cancel completed export' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('exports')
      .update({ status: 'failed', error_message: 'Canceled by user' })
      .eq('id', exportId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel export' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Export canceled' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Failed to cancel export' }, { status: 500 })
  }
}

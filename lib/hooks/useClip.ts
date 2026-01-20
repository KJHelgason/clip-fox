import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

export type Clip = {
  id: string
  user_id: string
  title: string | null
  video_path: string
  signedUrl: string | null
  edit_data?: string | null
}

type EditData = {
  aspectRatio?: string
  cropPosition?: { x: number; y: number }
  overlays?: unknown[]
  zoomKeyframes?: unknown[]
  thumbs?: number[]
  startTime?: number
  endTime?: number
}

async function fetchClip(clipId: string): Promise<Clip | null> {
  const { data, error } = await supabase
    .from('clips')
    .select('*')
    .eq('id', clipId)
    .single()

  if (error || !data) {
    console.error('Clip not found:', error)
    return null
  }

  const { data: signed } = await supabase.storage
    .from('clips')
    .createSignedUrl(data.video_path, 3600)

  return {
    ...data,
    signedUrl: signed?.signedUrl || null
  }
}

export function useClip(clipId: string | string[] | undefined) {
  const id = Array.isArray(clipId) ? clipId[0] : clipId
  
  const { data, error, isLoading, mutate } = useSWR<Clip | null>(
    id ? `clip-${id}` : null,
    () => fetchClip(id!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute deduplication
    }
  )

  return {
    clip: data,
    isLoading,
    isError: error,
    mutate,
  }
}

export function parseEditData(editDataString: string | null | undefined): EditData | null {
  if (!editDataString) return null
  try {
    return JSON.parse(editDataString)
  } catch (e) {
    console.error('Failed to parse edit data:', e)
    return null
  }
}

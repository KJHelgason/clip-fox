import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { SoundEffect } from '@/lib/types'

type AudioCategory = 'uploaded' | 'memes' | 'reactions' | 'gaming' | 'full-songs' | 'ambient'

type SoundsData = {
  defaultSounds: Record<AudioCategory, SoundEffect[]>
  uploadedSounds: SoundEffect[]
}

const EMPTY_CATEGORIES: Record<AudioCategory, SoundEffect[]> = {
  'uploaded': [],
  'memes': [],
  'reactions': [],
  'gaming': [],
  'full-songs': [],
  'ambient': [],
}

async function fetchDefaultSounds(): Promise<Record<AudioCategory, SoundEffect[]>> {
  const { data, error } = await supabase
    .from('sounds')
    .select('*')
    .eq('is_default', true)
    .order('name')

  if (error) {
    console.error('Error fetching default sounds:', error)
    return EMPTY_CATEGORIES
  }

  // Organize by category
  const organized: Record<AudioCategory, SoundEffect[]> = { ...EMPTY_CATEGORIES }

  data?.forEach((sound) => {
    const category = sound.category as AudioCategory
    if (organized[category]) {
      organized[category].push({
        id: sound.id,
        name: sound.name,
        duration: sound.duration,
        category: category,
        url: sound.file_url || '',
        isUserUploaded: false,
      })
    }
  })

  return organized
}

async function fetchUserSounds(userId: string): Promise<SoundEffect[]> {
  const { data, error } = await supabase
    .from('sounds')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', false)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user sounds:', error)
    return []
  }

  return data?.map((sound) => ({
    id: sound.id,
    name: sound.name,
    duration: sound.duration,
    category: 'uploaded' as AudioCategory,
    url: sound.file_url || '',
    isUserUploaded: true,
  })) || []
}

// Hook for default sounds (available to all users, cached globally)
export function useDefaultSounds() {
  const { data, error, isLoading } = useSWR<Record<AudioCategory, SoundEffect[]>>(
    'default-sounds',
    fetchDefaultSounds,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes deduplication
      revalidateIfStale: false,
    }
  )

  return {
    defaultSounds: data || EMPTY_CATEGORIES,
    isLoading,
    isError: error,
  }
}

// Hook for user-uploaded sounds (cached per user)
export function useUserSounds(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<SoundEffect[]>(
    userId ? `user-sounds-${userId}` : null,
    () => fetchUserSounds(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1 minute deduplication
    }
  )

  return {
    uploadedSounds: data || [],
    isLoading,
    isError: error,
    mutate, // For updating after upload/delete
  }
}

// Combined hook for convenience
export function useSounds(userId: string | null) {
  const { defaultSounds, isLoading: defaultLoading } = useDefaultSounds()
  const { uploadedSounds, isLoading: uploadedLoading, mutate } = useUserSounds(userId)

  return {
    defaultSounds,
    uploadedSounds,
    isLoading: defaultLoading || uploadedLoading,
    mutateUploaded: mutate,
  }
}

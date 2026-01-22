'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Play, Pause, Search, Trash2, Plus, Volume2, X, Check, Loader2 } from 'lucide-react'
import { AudioTrack, SoundEffect } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { useSounds } from '@/lib/hooks/useSounds'

type AudioCategory = 'uploaded' | 'memes' | 'reactions' | 'gaming' | 'full-songs' | 'ambient'

type Props = {
  onAddAudioTrack: (track: AudioTrack) => void
  currentTime: number
  duration: number
  selectedAudioTrack?: AudioTrack | null
  onUpdateAudioTrack?: (track: AudioTrack) => void
  onOpenTrimModal?: (track: AudioTrack) => void
  userId?: string | null
}

const CATEGORY_INFO: Record<AudioCategory, { title: string; gradient: string }> = {
  'uploaded': { title: 'Uploaded', gradient: 'from-purple-500 to-pink-500' },
  'memes': { title: 'Memes & Humor', gradient: 'from-pink-500 to-rose-500' },
  'reactions': { title: 'Reaction Sounds', gradient: 'from-yellow-500 to-orange-500' },
  'gaming': { title: 'Gaming', gradient: 'from-orange-500 to-red-500' },
  'full-songs': { title: 'Full Songs', gradient: 'from-blue-500 to-cyan-500' },
  'ambient': { title: 'Ambient Sounds', gradient: 'from-green-500 to-teal-500' },
}

const ALL_CATEGORIES: AudioCategory[] = ['uploaded', 'memes', 'reactions', 'gaming', 'full-songs', 'ambient']

const MAX_UPLOADED_SOUNDS = 10

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Skeleton loader for sound items
function SoundItemSkeleton() {
  return (
    <div className="flex items-center gap-2 p-2 bg-[#1a1a2e] rounded-lg animate-pulse">
      <div className="w-8 h-8 rounded-full bg-gray-700" />
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-1" />
        <div className="h-3 bg-gray-800 rounded w-1/2" />
      </div>
      <div className="h-3 bg-gray-700 rounded w-8" />
    </div>
  )
}

// Skeleton loader for category section
function CategorySkeleton() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-gray-700" />
        <div className="h-3 bg-gray-700 rounded w-24" />
      </div>
      <div className="space-y-1">
        <SoundItemSkeleton />
        <SoundItemSkeleton />
        <SoundItemSkeleton />
      </div>
    </div>
  )
}

export default function AudioPanel({
  onAddAudioTrack,
  currentTime,
  duration,
  selectedAudioTrack,
  onUpdateAudioTrack,
  onOpenTrimModal,
  userId,
}: Props) {
  // Use SWR-cached sounds hook
  const { defaultSounds, uploadedSounds, isLoading, mutateUploaded } = useSounds(userId || null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<AudioCategory | 'all'>('all')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [hoveredSoundId, setHoveredSoundId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Focus input when editing name
  useEffect(() => {
    if (editingNameId && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingNameId])

  const handlePlay = useCallback((sound: SoundEffect) => {
    if (playingId === sound.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      audioRef.current = new Audio(sound.url)
      audioRef.current.play().catch(() => {})
      audioRef.current.onended = () => setPlayingId(null)
      setPlayingId(sound.id)
    }
  }, [playingId])

  const handleAddToTimeline = useCallback((sound: SoundEffect) => {
    const newTrack: AudioTrack = {
      id: `audio-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      soundId: sound.id,
      name: sound.name,
      url: sound.url,
      startTime: currentTime,
      duration: sound.duration,
      trimStart: 0,
      trimEnd: 0,
      volume: 100,
      isUserUploaded: sound.isUserUploaded || false,
      category: sound.category,
    }
    onAddAudioTrack(newTrack)
  }, [currentTime, onAddAudioTrack])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || !userId) return

    // Check max upload limit
    if (uploadedSounds.length + files.length > MAX_UPLOADED_SOUNDS) {
      alert(`Maximum ${MAX_UPLOADED_SOUNDS} uploaded sounds allowed. Delete some to make space.`)
      return
    }

    setIsUploading(true)

    const newSounds: SoundEffect[] = []

    for (const file of Array.from(files)) {
      try {
        // Get actual audio duration first
        const tempUrl = URL.createObjectURL(file)
        const audio = new Audio(tempUrl)

        const audioDuration = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () => {
            resolve(audio.duration)
            URL.revokeObjectURL(tempUrl)
          }
          audio.onerror = () => {
            URL.revokeObjectURL(tempUrl)
            resolve(0)
          }
        })

        if (audioDuration === 0) {
          console.error('Could not determine audio duration')
          continue
        }

        // Generate unique file name
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Error uploading file:', uploadError)
          continue
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('audio')
          .getPublicUrl(uploadData.path)

        // Insert into sounds table
        const soundName = file.name.replace(/\.[^/.]+$/, '') // Remove extension
        const { data: soundData, error: soundError } = await supabase
          .from('sounds')
          .insert({
            user_id: userId,
            name: soundName,
            file_path: uploadData.path,
            file_url: publicUrl,
            duration: audioDuration,
            category: 'uploaded',
            is_default: false,
            file_size: file.size,
          })
          .select()
          .single()

        if (soundError) {
          console.error('Error saving sound record:', soundError)
          // Clean up uploaded file if database insert fails
          await supabase.storage.from('audio').remove([uploadData.path])
          continue
        }

        // Collect new sound for batch update
        newSounds.push({
          id: soundData.id,
          name: soundName,
          duration: audioDuration,
          category: 'uploaded',
          url: publicUrl,
          isUserUploaded: true,
        })
      } catch (err) {
        console.error('Error processing file:', err)
      }
    }

    // Update SWR cache with new sounds (optimistic update)
    if (newSounds.length > 0) {
      mutateUploaded((current) => [...newSounds, ...(current || [])], false)
    }

    setIsUploading(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadedSounds.length, userId, mutateUploaded])

  const handleDeleteUploaded = useCallback(async (id: string) => {
    try {
      // Get file path from the database first
      const { data: soundData, error: fetchError } = await supabase
        .from('sounds')
        .select('file_path')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching sound:', fetchError)
        return
      }

      // Delete from database
      const { error: deleteError } = await supabase
        .from('sounds')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting sound:', deleteError)
        return
      }

      // Delete from storage
      if (soundData?.file_path) {
        await supabase.storage.from('audio').remove([soundData.file_path])
      }

      // Update SWR cache (optimistic update)
      mutateUploaded((current) => current?.filter(s => s.id !== id) || [], false)
    } catch (err) {
      console.error('Error deleting sound:', err)
    }
  }, [mutateUploaded])

  const handleStartRename = useCallback((sound: SoundEffect) => {
    setEditingNameId(sound.id)
    setEditingName(sound.name)
  }, [])

  const handleSaveRename = useCallback(async () => {
    if (editingNameId && editingName.trim()) {
      // Update in Supabase
      const { error } = await supabase
        .from('sounds')
        .update({ name: editingName.trim() })
        .eq('id', editingNameId)

      if (error) {
        console.error('Error renaming sound:', error)
      } else {
        // Update SWR cache
        mutateUploaded(
          (current) => current?.map(s =>
            s.id === editingNameId ? { ...s, name: editingName.trim() } : s
          ) || [],
          false
        )
      }
    }
    setEditingNameId(null)
    setEditingName('')
  }, [editingNameId, editingName, mutateUploaded])

  const handleCancelRename = useCallback(() => {
    setEditingNameId(null)
    setEditingName('')
  }, [])

  // Filter sounds based on search
  const getFilteredSounds = useCallback((sounds: SoundEffect[]) => {
    if (!searchQuery) return sounds
    return sounds.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [searchQuery])

  // Render a sound item
  const renderSoundItem = (sound: SoundEffect, showDelete: boolean = false) => {
    const isPlaying = playingId === sound.id
    const isHovered = hoveredSoundId === sound.id
    const isEditing = editingNameId === sound.id
    const gradient = CATEGORY_INFO[sound.category].gradient

    return (
      <div
        key={sound.id}
        className="flex items-center gap-2 p-2 bg-[#1a1a2e] hover:bg-[#252538] rounded-lg group transition-colors"
        onMouseEnter={() => setHoveredSoundId(sound.id)}
        onMouseLeave={() => setHoveredSoundId(null)}
      >
        {/* Play Button with gradient */}
        <button
          onClick={() => handlePlay(sound)}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all bg-gradient-to-br ${gradient}`}
          style={{
            boxShadow: isPlaying ? `0 0 12px rgba(139, 92, 246, 0.5)` : undefined,
          }}
          aria-label={isPlaying ? `Pause ${sound.name}` : `Play ${sound.name}`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 text-white" />
          ) : (
            <Play className="w-4 h-4 text-white ml-0.5" />
          )}
        </button>

        {/* Sound Info */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameInputRef}
                type="text"
                name="sound-name"
                autoComplete="off"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename()
                  if (e.key === 'Escape') handleCancelRename()
                }}
                onBlur={handleSaveRename}
                className="flex-1 bg-gray-800 text-white text-sm px-2 py-0.5 rounded border border-purple-500 outline-none"
                aria-label="Sound name"
              />
              <button
                onClick={handleSaveRename}
                className="p-1 hover:bg-green-600/20 rounded"
              >
                <Check className="w-3 h-3 text-green-400" />
              </button>
              <button
                onClick={handleCancelRename}
                className="p-1 hover:bg-red-600/20 rounded"
              >
                <X className="w-3 h-3 text-red-400" />
              </button>
            </div>
          ) : (
            <p
              className={`text-sm text-white truncate ${showDelete ? 'cursor-pointer hover:text-purple-300' : ''}`}
              onDoubleClick={() => showDelete && handleStartRename(sound)}
              title={showDelete ? 'Double-click to rename' : undefined}
            >
              {sound.name}
            </p>
          )}
          <p className="text-xs text-gray-500">
            {showDelete ? 'Uploaded' : CATEGORY_INFO[sound.category].title}
          </p>
        </div>

        {/* Duration */}
        <span className="text-xs text-gray-500 shrink-0">{formatDuration(sound.duration)}</span>

        {/* Delete button for uploaded sounds (on hover) */}
        {showDelete && isHovered && !isEditing && (
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${sound.name}"?`)) {
                handleDeleteUploaded(sound.id)
              }
            }}
            className="w-7 h-7 rounded bg-red-600/20 hover:bg-red-600/40 flex items-center justify-center shrink-0 transition-colors"
            title="Delete sound"
            aria-label={`Delete ${sound.name}`}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        )}

        {/* Add Button (visible on hover) */}
        <button
          onClick={() => handleAddToTimeline(sound)}
          className="w-7 h-7 rounded bg-purple-600 hover:bg-purple-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="Add to timeline"
          aria-label={`Add ${sound.name} to timeline`}
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>
    )
  }

  // Render category section
  const renderCategorySection = (category: AudioCategory, sounds: SoundEffect[]) => {
    const filteredSounds = getFilteredSounds(sounds)
    if (filteredSounds.length === 0 && searchQuery) return null

    const { title, gradient } = CATEGORY_INFO[category]
    const isUploaded = category === 'uploaded'

    return (
      <div key={category} className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${gradient}`} />
          <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            {title}
          </h4>
          {isUploaded && (
            <span className="text-xs text-gray-500">
              ({uploadedSounds.length}/{MAX_UPLOADED_SOUNDS})
            </span>
          )}
        </div>

        <div className="space-y-1">
          {filteredSounds.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">
              {isUploaded ? 'No uploaded sounds yet' : 'No sounds found'}
            </p>
          ) : (
            filteredSounds.map(sound => renderSoundItem(sound, isUploaded))
          )}
        </div>
      </div>
    )
  }

  // Check if a category should be shown based on filter
  const shouldShowCategory = (category: AudioCategory) => {
    return selectedCategory === 'all' || selectedCategory === category
  }

  return (
    <div className="flex flex-col h-full">
      {/* Category Filter Pills - Horizontal scroll, single line */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }`}
          >
            All
          </button>
          {ALL_CATEGORIES.map((category) => {
            const { title, gradient } = CATEGORY_INFO[category]
            const isSelected = selectedCategory === category
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors shrink-0 ${
                  isSelected
                    ? `bg-gradient-to-r ${gradient} text-white`
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}
              >
                {title}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-3 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            name="search"
            autoComplete="off"
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            aria-label="Search sounds"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Sound Library - Scrollable (includes upload section) */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar">
        {/* Upload Area - Now scrolls with content */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.mp4,.wav,.aac,.ogg,.m4a"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadedSounds.length >= MAX_UPLOADED_SOUNDS || isUploading || !userId}
            className="w-full border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-purple-500/50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mx-auto mb-2 text-purple-400 animate-spin" />
                <p className="text-sm text-purple-400">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-400">Upload a sound</p>
                <p className="text-xs text-gray-600">Max 10 MB | .mp3, .wav, .aac, .ogg</p>
              </>
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="pt-2">
            <CategorySkeleton />
            <CategorySkeleton />
            <CategorySkeleton />
          </div>
        ) : (
          <>
            {/* Uploaded section first */}
            {shouldShowCategory('uploaded') && (uploadedSounds.length > 0 || !searchQuery) &&
              renderCategorySection('uploaded', uploadedSounds)
            }

            {/* Other categories from Supabase */}
            {shouldShowCategory('memes') && renderCategorySection('memes', defaultSounds['memes'])}
            {shouldShowCategory('reactions') && renderCategorySection('reactions', defaultSounds['reactions'])}
            {shouldShowCategory('gaming') && renderCategorySection('gaming', defaultSounds['gaming'])}
            {shouldShowCategory('full-songs') && renderCategorySection('full-songs', defaultSounds['full-songs'])}
            {shouldShowCategory('ambient') && renderCategorySection('ambient', defaultSounds['ambient'])}

            {/* Show message if no default sounds available */}
            {Object.values(defaultSounds).every(arr => arr.length === 0) && uploadedSounds.length === 0 && !searchQuery && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No sounds available yet.</p>
                <p className="text-xs text-gray-500 mt-1">Upload your own or wait for default sounds to be added.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Audio Properties (when an audio track is selected) */}
      {selectedAudioTrack && (
        <div className="border-t border-gray-800 p-3 bg-[#0d0d1a]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Selected: {selectedAudioTrack.name}
            </h4>
          </div>

          {/* Volume Control */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                Volume
              </label>
              <span className="text-xs text-purple-400 font-medium">
                {selectedAudioTrack.volume}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedAudioTrack.volume}
              onChange={(e) => {
                if (onUpdateAudioTrack) {
                  onUpdateAudioTrack({
                    ...selectedAudioTrack,
                    volume: parseInt(e.target.value),
                  })
                }
              }}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Trim Audio Button */}
          <button
            onClick={() => onOpenTrimModal?.(selectedAudioTrack)}
            className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            Trim Audio
          </button>
        </div>
      )}
    </div>
  )
}

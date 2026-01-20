'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Play, Pause, Search, Trash2, Plus, Volume2, X, Check, Loader2 } from 'lucide-react'
import { AudioTrack, SoundEffect } from '@/lib/types'
import { supabase } from '@/lib/supabase'

type AudioCategory = 'uploaded' | 'full-songs' | 'ambient' | 'gaming' | 'spooky' | 'reactions'

type Props = {
  onAddAudioTrack: (track: AudioTrack) => void
  currentTime: number
  duration: number
  selectedAudioTrack?: AudioTrack | null
  onUpdateAudioTrack?: (track: AudioTrack) => void
  onOpenTrimModal?: (track: AudioTrack) => void
}

const CATEGORY_INFO: Record<AudioCategory, { title: string; gradient: string }> = {
  'uploaded': { title: 'Uploaded', gradient: 'from-purple-500 to-pink-500' },
  'full-songs': { title: 'Full Songs', gradient: 'from-blue-500 to-cyan-500' },
  'ambient': { title: 'Ambient Sounds', gradient: 'from-green-500 to-teal-500' },
  'gaming': { title: 'Gaming', gradient: 'from-orange-500 to-red-500' },
  'spooky': { title: 'Spooky', gradient: 'from-purple-600 to-violet-800' },
  'reactions': { title: 'Reaction Sounds', gradient: 'from-yellow-500 to-orange-500' },
}

const MAX_UPLOADED_SOUNDS = 10

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function AudioPanel({
  onAddAudioTrack,
  currentTime,
  duration,
  selectedAudioTrack,
  onUpdateAudioTrack,
  onOpenTrimModal,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [uploadedSounds, setUploadedSounds] = useState<SoundEffect[]>([])
  const [defaultSounds, setDefaultSounds] = useState<Record<AudioCategory, SoundEffect[]>>({
    'uploaded': [],
    'full-songs': [],
    'ambient': [],
    'gaming': [],
    'spooky': [],
    'reactions': [],
  })
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [hoveredSoundId, setHoveredSoundId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Fetch user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    getUser()
  }, [])

  // Fetch sounds from Supabase
  useEffect(() => {
    const fetchSounds = async () => {
      setIsLoading(true)
      try {
        // Fetch default sounds (available to all users)
        const { data: defaultData, error: defaultError } = await supabase
          .from('sounds')
          .select('*')
          .eq('is_default', true)
          .order('name')

        if (defaultError) {
          console.error('Error fetching default sounds:', defaultError)
        } else if (defaultData) {
          // Organize by category
          const organized: Record<AudioCategory, SoundEffect[]> = {
            'uploaded': [],
            'full-songs': [],
            'ambient': [],
            'gaming': [],
            'spooky': [],
            'reactions': [],
          }
          defaultData.forEach((sound) => {
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
          setDefaultSounds(organized)
        }

        // Fetch user's uploaded sounds
        if (userId) {
          const { data: userData, error: userError } = await supabase
            .from('sounds')
            .select('*')
            .eq('user_id', userId)
            .eq('is_default', false)
            .order('created_at', { ascending: false })

          if (userError) {
            console.error('Error fetching user sounds:', userError)
          } else if (userData) {
            setUploadedSounds(
              userData.map((sound) => ({
                id: sound.id,
                name: sound.name,
                duration: sound.duration,
                category: 'uploaded' as AudioCategory,
                url: sound.file_url || '',
                isUserUploaded: true,
              }))
            )
          }
        }
      } catch (err) {
        console.error('Error loading sounds:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSounds()
  }, [userId])

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
      id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`

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

        // Add to local state
        const newSound: SoundEffect = {
          id: soundData.id,
          name: soundName,
          duration: audioDuration,
          category: 'uploaded',
          url: publicUrl,
          isUserUploaded: true,
        }
        setUploadedSounds(prev => {
          if (prev.length >= MAX_UPLOADED_SOUNDS) return prev
          return [newSound, ...prev]
        })
      } catch (err) {
        console.error('Error processing file:', err)
      }
    }

    setIsUploading(false)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadedSounds.length, userId])

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

      // Update local state
      setUploadedSounds(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Error deleting sound:', err)
    }
  }, [])

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
        // Update local state
        setUploadedSounds(prev =>
          prev.map(s => s.id === editingNameId ? { ...s, name: editingName.trim() } : s)
        )
      }
    }
    setEditingNameId(null)
    setEditingName('')
  }, [editingNameId, editingName])

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
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename()
                  if (e.key === 'Escape') handleCancelRename()
                }}
                onBlur={handleSaveRename}
                className="flex-1 bg-gray-800 text-white text-sm px-2 py-0.5 rounded border border-purple-500 outline-none"
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
            onClick={() => handleDeleteUploaded(sound.id)}
            className="w-7 h-7 rounded bg-red-600/20 hover:bg-red-600/40 flex items-center justify-center shrink-0 transition-colors"
            title="Delete sound"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        )}

        {/* Add Button (visible on hover) */}
        <button
          onClick={() => handleAddToTimeline(sound)}
          className="w-7 h-7 rounded bg-purple-600 hover:bg-purple-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="Add to timeline"
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-white mb-1">Sound Effects</h3>
        <p className="text-xs text-gray-500">Add sound effects and music to enhance your video.</p>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
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

      {/* Upload Area */}
      <div className="px-3 pb-3">
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

      {/* Sound Library - Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            <span className="ml-2 text-sm text-gray-400">Loading sounds...</span>
          </div>
        ) : (
          <>
            {/* Uploaded section first */}
            {(uploadedSounds.length > 0 || !searchQuery) &&
              renderCategorySection('uploaded', uploadedSounds)
            }

            {/* Other categories from Supabase */}
            {renderCategorySection('full-songs', defaultSounds['full-songs'])}
            {renderCategorySection('ambient', defaultSounds['ambient'])}
            {renderCategorySection('gaming', defaultSounds['gaming'])}
            {renderCategorySection('spooky', defaultSounds['spooky'])}
            {renderCategorySection('reactions', defaultSounds['reactions'])}

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

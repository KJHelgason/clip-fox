'use client'

import { useState, useRef } from 'react'
import { Upload, Play, Pause, Search, Trash2, Plus } from 'lucide-react'

type SoundEffect = {
  id: string
  name: string
  duration: string
  category: 'uploaded' | 'memes' | 'alerts'
  url?: string
}

type AudioTrack = {
  id: string
  soundId: string
  name: string
  startTime: number
  duration: number
}

type Props = {
  onAddAudioTrack: (track: Partial<AudioTrack>) => void
  currentTime: number
  duration: number
}

// Sample sound effects library
const SOUND_EFFECTS: SoundEffect[] = [
  { id: 'tindeck', name: 'tindeck_1_AOGAIhY.mp3', duration: '0:02', category: 'uploaded' },
  { id: 'aocf', name: 'a00cf452-415c-4185-a1e4-46631dd6f543.mp3', duration: '0:03', category: 'uploaded' },
  { id: 'cod-zombie', name: 'call-of-duty-zombie-yell-meme-sound-effect...', duration: '0:04', category: 'memes' },
  { id: 'cricket', name: 'cricket_1.mp3', duration: '0:02', category: 'memes' },
  { id: 'heavenly', name: 'heavenly-music-gaming-sound-effect-hd-mp...', duration: '0:12', category: 'memes' },
  { id: 'whoosh', name: 'whoosh-sfx.mp3', duration: '0:01', category: 'uploaded' },
  { id: 'why-running', name: 'why-are-you-running-original-vine-audiotrim...', duration: '0:03', category: 'memes' },
  { id: 'ceeday', name: 'ceeday-huh-sound-effect.mp3', duration: '0:02', category: 'memes' },
  { id: 'my-leg', name: 'my-leg_gtcfNMu.mp3', duration: '0:01', category: 'memes' },
  { id: 'gta-wasted', name: 'gta-v-wasted-death-sound.mp3', duration: '0:08', category: 'memes' },
  { id: 'audio-trimmer', name: '-audiotrimmer_6I1UY0j.mp3', duration: '0:01', category: 'uploaded' },
  { id: 'hitsound', name: 'hitsound-online-audio-converter_x1T2cXH.mp3', duration: '0:01', category: 'alerts' },
  { id: 'notification', name: 'notification-ping.mp3', duration: '0:01', category: 'alerts' },
  { id: 'ding', name: 'ding-sound-effect.mp3', duration: '0:01', category: 'alerts' },
  { id: 'bruh', name: 'bruh-sound-effect.mp3', duration: '0:01', category: 'memes' },
  { id: 'vine-boom', name: 'vine-boom.mp3', duration: '0:01', category: 'memes' },
]

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'uploaded', label: 'Uploaded' },
  { id: 'memes', label: 'Memes & Humor' },
  { id: 'alerts', label: 'Alerts & Notifications' },
]

export default function AudioPanel({ onAddAudioTrack, currentTime, duration }: Props) {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<SoundEffect[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filter sounds based on tab and search
  const filteredSounds = [...SOUND_EFFECTS, ...uploadedFiles].filter(sound => {
    const matchesTab = activeTab === 'all' || sound.category === activeTab || 
      (activeTab === 'uploaded' && uploadedFiles.some(u => u.id === sound.id))
    const matchesSearch = sound.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const handlePlay = (sound: SoundEffect) => {
    if (playingId === sound.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      // In real app, play actual audio
      setPlayingId(sound.id)
      // Simulate play duration
      setTimeout(() => setPlayingId(null), 2000)
    }
  }

  const handleAddToTimeline = (sound: SoundEffect) => {
    onAddAudioTrack({
      id: `audio-${Date.now()}`,
      soundId: sound.id,
      name: sound.name,
      startTime: currentTime,
      duration: parseDuration(sound.duration),
    })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const newSound: SoundEffect = {
        id: `uploaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        duration: '0:03', // Would need actual audio duration detection
        category: 'uploaded',
        url: URL.createObjectURL(file),
      }
      setUploadedFiles(prev => [...prev, newSound])
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-white mb-1">Sound effects</h3>
        <p className="text-xs text-gray-500">Add cool sound effects to your video to keep your audience engaged.</p>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-3 flex gap-1 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-black'
                : 'text-gray-400 hover:text-white bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search for sound effects"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded transition-colors">
            Search →
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="px-3 pb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.mp4,.wav,.aac"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-gray-500 transition-colors cursor-pointer"
        >
          <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-400">Upload a file</p>
          <p className="text-xs text-gray-600">Max 5 MB files are allowed</p>
          <p className="text-xs text-gray-600">Supported formats: .mp4, .mp3, .wav, .aac</p>
        </button>
      </div>

      {/* Sound List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pb-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {activeTab === 'uploaded' ? 'Uploaded' : 'Sound Effects'}
          </h4>
        </div>
        
        <div className="space-y-1 px-3 pb-3">
          {filteredSounds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No sound effects found</p>
              {activeTab === 'uploaded' && uploadedFiles.length === 0 && (
                <p className="text-xs mt-1">Upload your first sound effect above</p>
              )}
            </div>
          ) : (
            filteredSounds.map((sound) => (
              <div
                key={sound.id}
                className="flex items-center gap-2 p-2 bg-[#1a1a2e] hover:bg-[#252538] rounded-lg group transition-colors"
              >
                {/* Play Button */}
                <button
                  onClick={() => handlePlay(sound)}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center shrink-0 transition-colors"
                >
                  {playingId === sound.id ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white ml-0.5" />
                  )}
                </button>

                {/* Sound Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{sound.name}</p>
                  <p className="text-xs text-gray-500">
                    {uploadedFiles.some(u => u.id === sound.id) ? 'Uploaded' : 'Library'}
                  </p>
                </div>

                {/* Duration */}
                <span className="text-xs text-gray-500 shrink-0">{sound.duration}</span>

                {/* Add Button (visible on hover) */}
                <button
                  onClick={() => handleAddToTimeline(sound)}
                  className="w-7 h-7 rounded bg-purple-600 hover:bg-purple-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Add to timeline"
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer with navigation hint */}
      <div className="p-3 border-t border-gray-800">
        <button
          onClick={() => {/* Navigate to previous step */}}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
        >
          ← Effects
        </button>
      </div>
    </div>
  )
}

// Helper to parse duration string to seconds
function parseDuration(duration: string): number {
  const parts = duration.split(':').map(Number)
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0]
}

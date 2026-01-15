'use client'

import { useState } from 'react'
import { CAPTION_STYLES, CaptionStyle, OverlayElement } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Scissors, RefreshCw, Trash2, AlertCircle, Smile, Settings } from 'lucide-react'

type CaptionSegment = {
  id: string
  text: string
  startTime: number
  endTime: number
  hasIssue?: boolean // AI detected issue (profanity, etc.)
  sentiment?: 'neutral' | 'positive' | 'negative' | 'funny'
}

type Props = {
  captions: CaptionSegment[]
  onCaptionsChange: (captions: CaptionSegment[]) => void
  onAddCaptionOverlay: (caption: CaptionSegment, style: CaptionStyle) => void
  duration: number
  currentTime: number
  onSeek: (time: number) => void
}

// Caption style presets with preview
const STYLE_PRESETS = [
  { id: 'default', name: 'Default', bgColor: 'rgba(0,0,0,0.7)', color: '#fff', stroke: false },
  { id: 'tiktok', name: 'TikTok', bgColor: 'transparent', color: '#fff', stroke: true },
  { id: 'youtube', name: 'YouTube', bgColor: 'rgba(0,0,0,0.8)', color: '#fff', stroke: false },
  { id: 'neon', name: 'Neon', bgColor: 'transparent', color: '#00ff88', stroke: false, glow: true },
  { id: 'bold', name: 'Bold Pop', bgColor: '#FFD700', color: '#000', stroke: false },
  { id: 'minimal', name: 'Minimal', bgColor: 'transparent', color: '#fff', stroke: false, shadow: true },
]

export default function CaptionEditor({
  captions,
  onCaptionsChange,
  onAddCaptionOverlay,
  duration,
  currentTime,
  onSeek
}: Props) {
  const [selectedStyle, setSelectedStyle] = useState<CaptionStyle>(CAPTION_STYLES[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<'text' | 'styles'>('text')
  const [selectedPreset, setSelectedPreset] = useState('default')

  // Get current caption based on time
  const currentCaption = captions.find(
    c => currentTime >= c.startTime && currentTime <= c.endTime
  )

  const handleAddCaption = () => {
    const newCaption: CaptionSegment = {
      id: `caption-${Date.now()}`,
      text: 'New caption text...',
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + 3),
      sentiment: 'neutral'
    }
    onCaptionsChange([...captions, newCaption].sort((a, b) => a.startTime - b.startTime))
    setEditingId(newCaption.id)
  }

  const handleUpdateCaption = (id: string, updates: Partial<CaptionSegment>) => {
    onCaptionsChange(
      captions.map(c => c.id === id ? { ...c, ...updates } : c)
    )
  }

  const handleDeleteCaption = (id: string) => {
    onCaptionsChange(captions.filter(c => c.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const handleGenerateCaptions = async () => {
    setIsGenerating(true)
    // Simulate AI caption generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Demo: Generate sample captions with different sentiments
    const sampleCaptions: CaptionSegment[] = [
      { id: `caption-${Date.now()}-1`, text: "This is kara that's a karambit doppler.", startTime: 0, endTime: 2.5, hasIssue: true, sentiment: 'neutral' },
      { id: `caption-${Date.now()}-2`, text: "karambit doppler in the kitchen?", startTime: 3, endTime: 5, sentiment: 'funny' },
      { id: `caption-${Date.now()}-3`, text: "Sure, how you gonna cut the fucking banana with that?", startTime: 5.5, endTime: 8, hasIssue: true, sentiment: 'funny' },
      { id: `caption-${Date.now()}-4`, text: "know, you-", startTime: 8.5, endTime: 10, sentiment: 'neutral' },
      { id: `caption-${Date.now()}-5`, text: "You'd be better get stuck in microwave in this game.", startTime: 10.5, endTime: 14, hasIssue: true, sentiment: 'negative' },
      { id: `caption-${Date.now()}-6`, text: "Mi- microwave doppler.", startTime: 14.5, endTime: 17, sentiment: 'neutral' },
    ]
    
    onCaptionsChange(sampleCaptions)
    setIsGenerating(false)
  }

  const handleApplyToTimeline = () => {
    captions.forEach(caption => {
      onAddCaptionOverlay(caption, selectedStyle)
    })
  }

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'funny':
        return <Smile className="w-4 h-4 text-yellow-400" />
      case 'negative':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="px-3 pt-3 flex gap-1">
        <button
          onClick={() => setActiveTab('text')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'text'
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-base">T</span>
          Text
        </button>
        <button
          onClick={() => setActiveTab('styles')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'styles'
              ? 'bg-gray-800 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Styles
        </button>
        
        {/* Regenerate Button */}
        <button
          onClick={handleGenerateCaptions}
          disabled={isGenerating}
          className="ml-auto p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Regenerate captions"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Text Tab Content */}
      {activeTab === 'text' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {captions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🎤</span>
              </div>
              <p className="text-sm text-white mb-2">No captions yet</p>
              <p className="text-xs text-gray-500 mb-4">Generate captions with AI or add them manually</p>
              <Button
                onClick={handleGenerateCaptions}
                disabled={isGenerating}
                className="bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>✨ Generate with AI</>
                )}
              </Button>
            </div>
          ) : (
            <>
              {captions.map((caption, index) => (
                <div
                  key={caption.id}
                  className={`bg-[#1a1a2e] rounded-lg p-3 border transition-all cursor-pointer ${
                    editingId === caption.id
                      ? 'border-purple-500'
                      : currentCaption?.id === caption.id
                      ? 'border-purple-700'
                      : 'border-transparent hover:border-gray-700'
                  }`}
                  onClick={() => {
                    setEditingId(caption.id)
                    onSeek(caption.startTime)
                  }}
                >
                  {editingId === caption.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={caption.text}
                        onChange={(e) => handleUpdateCaption(caption.id, { text: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                        rows={2}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex gap-2">
                          <input
                            type="number"
                            step={0.1}
                            min={0}
                            max={caption.endTime - 0.1}
                            value={caption.startTime.toFixed(1)}
                            onChange={(e) => handleUpdateCaption(caption.id, { startTime: parseFloat(e.target.value) || 0 })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                          />
                          <span className="text-gray-500 self-center">→</span>
                          <input
                            type="number"
                            step={0.1}
                            min={caption.startTime + 0.1}
                            max={duration}
                            value={caption.endTime.toFixed(1)}
                            onChange={(e) => handleUpdateCaption(caption.id, { endTime: parseFloat(e.target.value) || 0 })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-20 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCaption(caption.id)
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{caption.text}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Issue indicator */}
                        {caption.hasIssue && (
                          <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center" title="Contains flagged content">
                            <Scissors className="w-3 h-3 text-red-400" />
                          </div>
                        )}
                        {/* Sentiment indicator */}
                        {caption.sentiment && caption.sentiment !== 'neutral' && (
                          <div className="w-6 h-6 rounded bg-gray-800 flex items-center justify-center">
                            {getSentimentIcon(caption.sentiment)}
                          </div>
                        )}
                        {/* Refresh button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Regenerate single caption
                          }}
                          className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteCaption(caption.id)
                          }}
                          className="w-6 h-6 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Styles Tab Content */}
      {activeTab === 'styles' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Style Presets */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Style Presets</h4>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    selectedPreset === preset.id
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600 bg-[#1a1a2e]'
                  }`}
                >
                  <div
                    className="px-2 py-1 rounded text-sm mb-2 inline-block"
                    style={{
                      backgroundColor: preset.bgColor,
                      color: preset.color,
                      WebkitTextStroke: preset.stroke ? '1px black' : undefined,
                      textShadow: preset.glow ? `0 0 10px ${preset.color}` : preset.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : undefined,
                    }}
                  >
                    Sample
                  </div>
                  <div className="text-xs text-gray-400">{preset.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Typography Settings */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Typography</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Font Size</label>
                <input
                  type="range"
                  min={16}
                  max={48}
                  defaultValue={24}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Font Weight</label>
                <div className="flex gap-1">
                  {['Normal', 'Medium', 'Bold', 'Extra Bold'].map((weight) => (
                    <button
                      key={weight}
                      className="flex-1 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                    >
                      {weight}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Position Settings */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Position</h4>
            <div className="grid grid-cols-3 gap-1">
              {['Top', 'Middle', 'Bottom'].map((pos) => (
                <button
                  key={pos}
                  className="py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-800 space-y-2">
        {/* Delete All Button */}
        {captions.length > 0 && (
          <button
            onClick={() => onCaptionsChange([])}
            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete all captions
          </button>
        )}
        
        {/* Apply Button */}
        {captions.length > 0 && (
          <Button
            onClick={handleApplyToTimeline}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Apply to Timeline
          </Button>
        )}
      </div>
    </div>
  )
}

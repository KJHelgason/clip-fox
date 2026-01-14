'use client'

import { useState } from 'react'
import { CAPTION_STYLES, CaptionStyle, OverlayElement } from '@/lib/types'
import { Button } from '@/components/ui/button'

type CaptionSegment = {
  id: string
  text: string
  startTime: number
  endTime: number
}

type Props = {
  captions: CaptionSegment[]
  onCaptionsChange: (captions: CaptionSegment[]) => void
  onAddCaptionOverlay: (caption: CaptionSegment, style: CaptionStyle) => void
  duration: number
  currentTime: number
  onSeek: (time: number) => void
}

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

  // Get current caption based on time
  const currentCaption = captions.find(
    c => currentTime >= c.startTime && currentTime <= c.endTime
  )

  const handleAddCaption = () => {
    const newCaption: CaptionSegment = {
      id: `caption-${Date.now()}`,
      text: 'New caption text...',
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + 3)
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
    
    // Demo: Generate sample captions
    const sampleCaptions: CaptionSegment[] = [
      { id: `caption-${Date.now()}-1`, text: 'Welcome to the stream!', startTime: 0, endTime: 2.5 },
      { id: `caption-${Date.now()}-2`, text: "Let's get started", startTime: 3, endTime: 5 },
      { id: `caption-${Date.now()}-3`, text: 'This is going to be epic', startTime: 5.5, endTime: 8 },
    ]
    
    onCaptionsChange(sampleCaptions)
    setIsGenerating(false)
  }

  const handleApplyToTimeline = () => {
    captions.forEach(caption => {
      onAddCaptionOverlay(caption, selectedStyle)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Captions & Subtitles</h3>
          <p className="text-xs text-gray-500">{captions.length} caption segments</p>
        </div>
        <Button
          onClick={handleAddCaption}
          size="sm"
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          + Add Caption
        </Button>
      </div>

      {/* AI Generation */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-700/30">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center text-lg">
            🤖
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-white">Auto-Generate Captions</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Use AI to automatically transcribe and generate captions from your video's audio.
            </p>
            <Button
              onClick={handleGenerateCaptions}
              disabled={isGenerating}
              className="mt-3 bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin mr-2">⚡</span>
                  Generating...
                </>
              ) : (
                <>✨ Generate with AI</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Style Selector */}
      <div>
        <label className="text-xs text-gray-400 mb-2 block">Caption Style</label>
        <div className="grid grid-cols-2 gap-2">
          {CAPTION_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style)}
              className={`p-3 rounded-lg border transition-all text-left ${
                selectedStyle.id === style.id
                  ? 'bg-purple-900/30 border-purple-500'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              }`}
            >
              <div
                className="px-2 py-1 rounded text-sm mb-2 inline-block"
                style={{
                  fontFamily: style.fontFamily,
                  fontSize: 12,
                  fontWeight: style.fontWeight as any,
                  color: style.color,
                  backgroundColor: style.backgroundColor,
                  WebkitTextStroke: style.textStroke,
                  textShadow: style.textShadow,
                }}
              >
                Sample
              </div>
              <div className="text-xs text-gray-400">{style.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Caption Preview */}
      {currentCaption && (
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Now Playing</span>
            <span className="text-xs text-purple-400">
              {currentCaption.startTime.toFixed(1)}s - {currentCaption.endTime.toFixed(1)}s
            </span>
          </div>
          <div
            className="px-3 py-2 rounded text-center"
            style={{
              fontFamily: selectedStyle.fontFamily,
              fontSize: selectedStyle.fontSize * 0.75,
              fontWeight: selectedStyle.fontWeight as any,
              color: selectedStyle.color,
              backgroundColor: selectedStyle.backgroundColor,
              WebkitTextStroke: selectedStyle.textStroke,
              textShadow: selectedStyle.textShadow,
              borderRadius: selectedStyle.borderRadius,
            }}
          >
            {currentCaption.text}
          </div>
        </div>
      )}

      {/* Caption List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {captions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm mb-2">No captions yet</p>
            <p className="text-xs">Add captions manually or generate them with AI</p>
          </div>
        ) : (
          captions.map((caption) => (
            <div
              key={caption.id}
              className={`bg-gray-800 rounded-lg p-3 border transition-colors cursor-pointer ${
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
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500">Start (s)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        max={caption.endTime - 0.1}
                        value={caption.startTime.toFixed(1)}
                        onChange={(e) => handleUpdateCaption(caption.id, { startTime: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500">End (s)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={caption.startTime + 0.1}
                        max={duration}
                        value={caption.endTime.toFixed(1)}
                        onChange={(e) => handleUpdateCaption(caption.id, { endTime: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCaption(caption.id)
                      }}
                      className="self-end px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{caption.text}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {caption.startTime.toFixed(1)}s → {caption.endTime.toFixed(1)}s
                      <span className="ml-2 text-gray-600">
                        ({(caption.endTime - caption.startTime).toFixed(1)}s)
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCaption(caption.id)
                    }}
                    className="p-1 text-gray-500 hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      {captions.length > 0 && (
        <div className="flex gap-2 pt-2 border-t border-gray-700">
          <Button
            onClick={handleApplyToTimeline}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            size="sm"
          >
            Apply to Timeline
          </Button>
          <Button
            onClick={() => onCaptionsChange([])}
            variant="outline"
            className="border-gray-600 text-gray-400 hover:bg-gray-800"
            size="sm"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}

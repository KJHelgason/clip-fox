'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomKeyframe, formatTime } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { 
  ZoomIn, 
  Sparkles, 
  ShieldAlert, 
  Volume2, 
  Scissors, 
  Type,
  ChevronRight,
  X
} from 'lucide-react'

type Props = {
  keyframes: ZoomKeyframe[]
  onKeyframesChange: (keyframes: ZoomKeyframe[]) => void
  duration: number
  currentTime: number
  onSeek: (time: number) => void
}

// Effect items matching StreamLadder
const EFFECT_ITEMS = [
  { 
    id: 'zoom', 
    icon: ZoomIn, 
    title: 'Zoom', 
    description: 'Add a zoom effect to your clip',
    hasPanel: true
  },
  { 
    id: 'effects', 
    icon: Sparkles, 
    title: 'Effects', 
    description: 'Add special effects to your video',
    hasPanel: true
  },
  { 
    id: 'word-censoring', 
    icon: ShieldAlert, 
    title: 'AI - Word censoring', 
    description: 'Make your videos TikTok friendly',
    isAI: true
  },
  { 
    id: 'text-to-speech', 
    icon: Volume2, 
    title: 'Text to speech', 
    description: 'Turn your text into speech',
    hasPanel: true
  },
  { 
    id: 'remove-silences', 
    icon: Scissors, 
    title: 'AI - Remove silences', 
    description: 'Remove silent moments from your clip',
    isAI: true
  },
  { 
    id: 'hook-intro', 
    icon: Type, 
    title: 'AI - Hook intro title', 
    description: 'Adds a intro hook title to the start of your clip',
    isAI: true
  },
]

// Visual effects presets
const VISUAL_EFFECTS = [
  { id: 'none', name: 'None', preview: '🚫' },
  { id: 'vhs', name: 'VHS', preview: '📼' },
  { id: 'glitch', name: 'Glitch', preview: '⚡' },
  { id: 'blur', name: 'Motion Blur', preview: '🌀' },
  { id: 'shake', name: 'Camera Shake', preview: '📳' },
  { id: 'flash', name: 'Flash', preview: '💥' },
  { id: 'rgb', name: 'RGB Split', preview: '🌈' },
  { id: 'cinematic', name: 'Cinematic', preview: '🎬' },
]

export default function ZoomEffects({
  keyframes,
  onKeyframesChange,
  duration,
  currentTime,
  onSeek
}: Props) {
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [selectedEffect, setSelectedEffect] = useState('none')
  const [isProcessingAI, setIsProcessingAI] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const selectedKeyframe = keyframes.find(k => k.id === selectedKeyframeId)

  // Add a new keyframe at current time
  const handleAddKeyframe = () => {
    const sortedKeyframes = [...keyframes].sort((a, b) => a.time - b.time)
    let currentScale = 1
    let currentX = 50
    let currentY = 50

    for (const kf of sortedKeyframes) {
      if (kf.time <= currentTime) {
        currentScale = kf.scale
        currentX = kf.x
        currentY = kf.y
      }
    }

    const newKeyframe: ZoomKeyframe = {
      id: `zoom-${Date.now()}`,
      time: currentTime,
      scale: currentScale,
      x: currentX,
      y: currentY,
      easing: 'ease-out'
    }

    onKeyframesChange([...keyframes, newKeyframe].sort((a, b) => a.time - b.time))
    setSelectedKeyframeId(newKeyframe.id)
  }

  const handleUpdateKeyframe = (id: string, updates: Partial<ZoomKeyframe>) => {
    onKeyframesChange(
      keyframes.map(k => k.id === id ? { ...k, ...updates } : k)
    )
  }

  const handleDeleteKeyframe = (id: string) => {
    onKeyframesChange(keyframes.filter(k => k.id !== id))
    if (selectedKeyframeId === id) {
      setSelectedKeyframeId(null)
    }
  }

  const getCurrentZoom = useCallback(() => {
    if (keyframes.length === 0) {
      return { scale: 1, x: 50, y: 50 }
    }

    const sorted = [...keyframes].sort((a, b) => a.time - b.time)
    
    if (currentTime <= sorted[0].time) {
      return { scale: sorted[0].scale, x: sorted[0].x, y: sorted[0].y }
    }

    if (currentTime >= sorted[sorted.length - 1].time) {
      const last = sorted[sorted.length - 1]
      return { scale: last.scale, x: last.x, y: last.y }
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentTime >= sorted[i].time && currentTime <= sorted[i + 1].time) {
        const from = sorted[i]
        const to = sorted[i + 1]
        const progress = (currentTime - from.time) / (to.time - from.time)
        const easedProgress = applyEasing(progress, to.easing)
        
        return {
          scale: lerp(from.scale, to.scale, easedProgress),
          x: lerp(from.x, to.x, easedProgress),
          y: lerp(from.y, to.y, easedProgress)
        }
      }
    }

    return { scale: 1, x: 50, y: 50 }
  }, [keyframes, currentTime])

  const currentZoom = getCurrentZoom()

  const handleAIEffect = async (effectId: string) => {
    setIsProcessingAI(effectId)
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsProcessingAI(null)
    // Show success message
    alert(`${effectId === 'word-censoring' ? 'Word censoring' : effectId === 'remove-silences' ? 'Silence removal' : 'Hook intro'} applied successfully!`)
  }

  // Render effect item
  const renderEffectItem = (item: typeof EFFECT_ITEMS[0]) => {
    const Icon = item.icon
    const isActive = activePanel === item.id
    const isProcessing = isProcessingAI === item.id

    return (
      <button
        key={item.id}
        onClick={() => {
          if (item.isAI) {
            handleAIEffect(item.id)
          } else if (item.hasPanel) {
            setActivePanel(isActive ? null : item.id)
          }
        }}
        disabled={isProcessing}
        className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
          isActive
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-gray-700 hover:border-gray-600 bg-[#1a1a2e]'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          item.isAI ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gray-800'
        }`}>
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon className="w-5 h-5 text-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white">{item.title}</div>
          <div className="text-xs text-gray-500 truncate">{item.description}</div>
        </div>
        {item.hasPanel && (
          <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isActive ? 'rotate-90' : ''}`} />
        )}
      </button>
    )
  }

  // Zoom Panel
  const renderZoomPanel = () => (
    <div className="p-3 border-t border-gray-800 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white">Zoom Keyframes</h4>
        <Button
          onClick={handleAddKeyframe}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 h-8 text-xs"
        >
          + Add Keyframe
        </Button>
      </div>

      {/* Current Zoom Preview */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Current State</span>
          <span className="text-xs text-purple-400">{formatTime(currentTime)}</span>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-500">Scale:</span>
            <span className="text-white ml-1">{(currentZoom.scale * 100).toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-gray-500">X:</span>
            <span className="text-white ml-1">{currentZoom.x.toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-gray-500">Y:</span>
            <span className="text-white ml-1">{currentZoom.y.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Keyframe Timeline */}
      <div
        ref={timelineRef}
        className="relative h-12 bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (!timelineRef.current) return
          const rect = timelineRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left
          const time = (x / rect.width) * duration
          onSeek(time)
        }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-700"
            style={{ left: `${(i + 1) * 10}%` }}
          />
        ))}

        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />

        {keyframes.map((kf) => (
          <div
            key={kf.id}
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full cursor-pointer transition-all ${
              selectedKeyframeId === kf.id
                ? 'bg-purple-500 ring-2 ring-purple-300 scale-125'
                : 'bg-purple-600 hover:bg-purple-500'
            }`}
            style={{ left: `calc(${(kf.time / duration) * 100}% - 8px)` }}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedKeyframeId(kf.id)
              onSeek(kf.time)
            }}
            title={`${formatTime(kf.time)} - ${(kf.scale * 100).toFixed(0)}%`}
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 whitespace-nowrap">
              {(kf.scale * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      {/* Selected Keyframe Editor */}
      {selectedKeyframe && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-white">Edit Keyframe</h5>
            <button
              onClick={() => handleDeleteKeyframe(selectedKeyframe.id)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Delete
            </button>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 flex justify-between">
              <span>Zoom Scale</span>
              <span>{(selectedKeyframe.scale * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={selectedKeyframe.scale}
              onChange={(e) => handleUpdateKeyframe(selectedKeyframe.id, { scale: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 flex justify-between">
                <span>Pan X</span>
                <span>{selectedKeyframe.x.toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedKeyframe.x}
                onChange={(e) => handleUpdateKeyframe(selectedKeyframe.id, { x: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 flex justify-between">
                <span>Pan Y</span>
                <span>{selectedKeyframe.y.toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedKeyframe.y}
                onChange={(e) => handleUpdateKeyframe(selectedKeyframe.id, { y: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Easing</label>
            <div className="grid grid-cols-4 gap-1">
              {(['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const).map((easing) => (
                <button
                  key={easing}
                  onClick={() => handleUpdateKeyframe(selectedKeyframe.id, { easing })}
                  className={`py-1 text-[10px] rounded transition-colors ${
                    selectedKeyframe.easing === easing
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {easing.split('-').map(w => w.charAt(0).toUpperCase()).join('')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {keyframes.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          <p className="text-xs">Add keyframes to create zoom effects</p>
        </div>
      )}

      {keyframes.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => onKeyframesChange([])}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded border border-gray-700"
          >
            Clear All
          </button>
          <button
            onClick={() => {
              const mid = duration / 2
              onKeyframesChange([
                { id: `zoom-${Date.now()}-1`, time: 0, scale: 1, x: 50, y: 50, easing: 'ease-out' },
                { id: `zoom-${Date.now()}-2`, time: mid, scale: 1.5, x: 50, y: 50, easing: 'ease-in-out' },
                { id: `zoom-${Date.now()}-3`, time: duration, scale: 1, x: 50, y: 50, easing: 'ease-in' },
              ])
            }}
            className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs rounded border border-purple-600/50"
          >
            Auto Zoom
          </button>
        </div>
      )}
    </div>
  )

  // Effects Panel
  const renderEffectsPanel = () => (
    <div className="p-3 border-t border-gray-800 space-y-3">
      <h4 className="text-sm font-medium text-white">Visual Effects</h4>
      <div className="grid grid-cols-4 gap-2">
        {VISUAL_EFFECTS.map((effect) => (
          <button
            key={effect.id}
            onClick={() => setSelectedEffect(effect.id)}
            className={`aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
              selectedEffect === effect.id
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-[#1a1a2e]'
            }`}
          >
            <span className="text-lg">{effect.preview}</span>
            <span className="text-[9px] text-gray-400">{effect.name}</span>
          </button>
        ))}
      </div>
      {selectedEffect !== 'none' && (
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">Effect Intensity</p>
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={50}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Subtle</span>
            <span>Intense</span>
          </div>
        </div>
      )}
    </div>
  )

  // Text to Speech Panel
  const renderTTSPanel = () => (
    <div className="p-3 border-t border-gray-800 space-y-3">
      <h4 className="text-sm font-medium text-white">Text to Speech</h4>
      <textarea
        placeholder="Enter text to convert to speech..."
        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
        rows={3}
      />
      <div className="grid grid-cols-3 gap-2">
        {['Male', 'Female', 'Robot'].map((voice) => (
          <button
            key={voice}
            className="py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700"
          >
            {voice}
          </button>
        ))}
      </div>
      <Button className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
        Generate Speech
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Effect Items List */}
      <div className="p-3 space-y-2">
        {EFFECT_ITEMS.map(renderEffectItem)}
      </div>

      {/* Active Panel Content */}
      {activePanel === 'zoom' && renderZoomPanel()}
      {activePanel === 'effects' && renderEffectsPanel()}
      {activePanel === 'text-to-speech' && renderTTSPanel()}
    </div>
  )
}

// Helper functions
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function applyEasing(t: number, easing: ZoomKeyframe['easing']): number {
  switch (easing) {
    case 'linear':
      return t
    case 'ease-in':
      return t * t
    case 'ease-out':
      return 1 - (1 - t) * (1 - t)
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    default:
      return t
  }
}

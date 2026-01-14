'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomKeyframe, formatTime } from '@/lib/types'
import { Button } from '@/components/ui/button'

type Props = {
  keyframes: ZoomKeyframe[]
  onKeyframesChange: (keyframes: ZoomKeyframe[]) => void
  duration: number
  currentTime: number
  onSeek: (time: number) => void
}

export default function ZoomEffects({
  keyframes,
  onKeyframesChange,
  duration,
  currentTime,
  onSeek
}: Props) {
  const [selectedKeyframeId, setSelectedKeyframeId] = useState<string | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const selectedKeyframe = keyframes.find(k => k.id === selectedKeyframeId)

  // Add a new keyframe at current time
  const handleAddKeyframe = () => {
    // Find the current zoom state from existing keyframes
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

  // Update a keyframe
  const handleUpdateKeyframe = (id: string, updates: Partial<ZoomKeyframe>) => {
    onKeyframesChange(
      keyframes.map(k => k.id === id ? { ...k, ...updates } : k)
    )
  }

  // Delete a keyframe
  const handleDeleteKeyframe = (id: string) => {
    onKeyframesChange(keyframes.filter(k => k.id !== id))
    if (selectedKeyframeId === id) {
      setSelectedKeyframeId(null)
    }
  }

  // Calculate current zoom state based on keyframes
  const getCurrentZoom = useCallback(() => {
    if (keyframes.length === 0) {
      return { scale: 1, x: 50, y: 50 }
    }

    const sorted = [...keyframes].sort((a, b) => a.time - b.time)
    
    // Before first keyframe
    if (currentTime <= sorted[0].time) {
      return { scale: sorted[0].scale, x: sorted[0].x, y: sorted[0].y }
    }

    // After last keyframe
    if (currentTime >= sorted[sorted.length - 1].time) {
      const last = sorted[sorted.length - 1]
      return { scale: last.scale, x: last.x, y: last.y }
    }

    // Between keyframes - interpolate
    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentTime >= sorted[i].time && currentTime <= sorted[i + 1].time) {
        const from = sorted[i]
        const to = sorted[i + 1]
        const progress = (currentTime - from.time) / (to.time - from.time)
        
        // Apply easing
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Zoom & Pan Effects</h3>
          <p className="text-xs text-gray-500">Add keyframes to create dynamic zoom effects</p>
        </div>
        <Button
          onClick={handleAddKeyframe}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700"
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
        {/* Grid lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gray-700"
            style={{ left: `${(i + 1) * 10}%` }}
          />
        ))}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />

        {/* Keyframes */}
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
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">Edit Keyframe</h4>
            <button
              onClick={() => handleDeleteKeyframe(selectedKeyframe.id)}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Delete
            </button>
          </div>

          {/* Time */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Time (seconds)</label>
            <input
              type="number"
              step={0.1}
              min={0}
              max={duration}
              value={selectedKeyframe.time.toFixed(2)}
              onChange={(e) => handleUpdateKeyframe(selectedKeyframe.id, { time: parseFloat(e.target.value) || 0 })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
            />
          </div>

          {/* Scale */}
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
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>50%</span>
              <span>100%</span>
              <span>200%</span>
              <span>300%</span>
            </div>
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Easing */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Easing</label>
            <div className="grid grid-cols-4 gap-1">
              {(['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const).map((easing) => (
                <button
                  key={easing}
                  onClick={() => handleUpdateKeyframe(selectedKeyframe.id, { easing })}
                  className={`py-1.5 text-xs rounded transition-colors ${
                    selectedKeyframe.easing === easing
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {easing.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Quick Presets</label>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => handleUpdateKeyframe(selectedKeyframe.id, { scale: 1, x: 50, y: 50 })}
                className="py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
              >
                Reset
              </button>
              <button
                onClick={() => handleUpdateKeyframe(selectedKeyframe.id, { scale: 1.5, x: 50, y: 50 })}
                className="py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
              >
                Zoom 150%
              </button>
              <button
                onClick={() => handleUpdateKeyframe(selectedKeyframe.id, { scale: 2, x: 50, y: 50 })}
                className="py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded"
              >
                Zoom 200%
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {keyframes.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm mb-2">No zoom keyframes yet</p>
          <p className="text-xs">Add a keyframe to start creating zoom effects</p>
        </div>
      )}

      {/* Quick Actions */}
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
              // Add a simple zoom in -> zoom out effect
              const mid = duration / 2
              onKeyframesChange([
                { id: `zoom-${Date.now()}-1`, time: 0, scale: 1, x: 50, y: 50, easing: 'ease-out' },
                { id: `zoom-${Date.now()}-2`, time: mid, scale: 1.5, x: 50, y: 50, easing: 'ease-in-out' },
                { id: `zoom-${Date.now()}-3`, time: duration, scale: 1, x: 50, y: 50, easing: 'ease-in' },
              ])
            }}
            className="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 text-xs rounded border border-purple-600/50"
          >
            Auto Zoom Effect
          </button>
        </div>
      )}
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

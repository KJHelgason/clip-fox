'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomKeyframe, VisualEffectType, formatTime } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  ZoomIn,
  Sparkles,
  ShieldAlert,
  Volume2,
  Scissors,
  Type,
  ChevronRight,
  ArrowLeft,
  Plus,
  Minus,
  Search,
  X
} from 'lucide-react'

type Props = {
  keyframes: ZoomKeyframe[]
  onKeyframesChange: (keyframes: ZoomKeyframe[]) => void
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  videoSrc?: string // Video source URL for the preview
  openZoomPanel?: boolean // If true, opens the zoom panel on mount
  onZoomPanelOpened?: () => void // Called when zoom panel is opened to reset the trigger
  closeZoomPanel?: boolean // If true, closes the zoom panel and returns to effects menu
  onZoomPanelClosed?: () => void // Called when zoom panel is closed to reset the trigger
  onDeselectZoom?: () => void // Called when user clicks "Back to Effects" to deselect zoom in parent
  onAddVisualEffect?: (effectType: VisualEffectType) => void // Called when user adds a visual effect
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
  { id: 'zoom-blur', name: 'Zoom Blur' },
  { id: 'shake', name: 'Shake' },
  { id: 'slide-shake', name: 'Slide Shake' },
  { id: 'morph', name: 'Morph' },
  { id: 'slide', name: 'Slide' },
  { id: 'glitch', name: 'Glitch' },
  { id: 'pixelate', name: 'Pixelate' },
]

// Animated Effect Preview Component - demonstrates each effect
function EffectPreview({ effectId }: { effectId: string }) {
  // Sample image for the preview - a colorful gradient scene
  const previewContent = (
    <div className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-sm" />
    </div>
  )

  if (effectId === 'zoom-blur') {
    // Zoom Blur: Starts zoomed/blurred, settles to clear
    return (
      <div className="w-full h-full overflow-hidden rounded-xl">
        <div
          className="w-full h-full"
          style={{
            animation: 'zoomBlurEffect 2s ease-out infinite',
          }}
        >
          {previewContent}
        </div>
      </div>
    )
  }

  if (effectId === 'shake') {
    // Shake: Subtle camera shake
    return (
      <div className="w-full h-full overflow-hidden rounded-xl">
        <div
          className="w-[110%] h-[110%] -ml-[5%] -mt-[5%]"
          style={{
            animation: 'shakeEffect 1s ease-in-out infinite',
          }}
        >
          {previewContent}
        </div>
      </div>
    )
  }

  if (effectId === 'slide-shake') {
    // Slide Shake: Vertical slam with bounce
    return (
      <div className="w-full h-full overflow-hidden rounded-xl">
        <div
          className="w-[115%] h-[115%] -ml-[7.5%] -mt-[7.5%]"
          style={{
            animation: 'slideShakeEffect 1.5s ease-out infinite',
          }}
        >
          {previewContent}
        </div>
      </div>
    )
  }

  if (effectId === 'morph') {
    // Morph: Wave/ripple distortion
    return (
      <div className="w-full h-full overflow-hidden rounded-xl">
        <div
          className="w-full h-full"
          style={{
            animation: 'morphEffect 2s ease-in-out infinite',
          }}
        >
          {previewContent}
        </div>
      </div>
    )
  }

  if (effectId === 'slide') {
    // Slide: Push transition
    return (
      <div className="w-full h-full overflow-hidden rounded-xl">
        <div
          className="w-[105%] h-full -ml-[2.5%]"
          style={{
            animation: 'slideEffect 1.5s ease-in-out infinite',
          }}
        >
          {previewContent}
        </div>
      </div>
    )
  }

  if (effectId === 'glitch') {
    // Glitch: RGB split and jitter
    return (
      <div className="w-full h-full overflow-hidden rounded-xl relative">
        {/* Base layer */}
        <div className="absolute inset-0" style={{ animation: 'glitchJitter 0.5s steps(10) infinite' }}>
          {previewContent}
        </div>
        {/* Red channel */}
        <div
          className="absolute inset-0 mix-blend-screen opacity-50"
          style={{
            animation: 'glitchRGB 0.3s steps(5) infinite',
            background: 'linear-gradient(90deg, rgba(255,0,0,0.4) 0%, transparent 50%, rgba(255,0,0,0.4) 100%)',
          }}
        />
        {/* Blue channel */}
        <div
          className="absolute inset-0 mix-blend-screen opacity-50"
          style={{
            animation: 'glitchRGB 0.3s steps(5) infinite reverse',
            background: 'linear-gradient(90deg, rgba(0,0,255,0.4) 0%, transparent 50%, rgba(0,0,255,0.4) 100%)',
          }}
        />
        {/* Scanline */}
        <div
          className="absolute left-0 right-0 h-0.5 bg-white/60"
          style={{
            animation: 'glitchScanline 0.8s linear infinite',
          }}
        />
      </div>
    )
  }

  if (effectId === 'pixelate') {
    // Pixelate: Mosaic effect (simulated with blur steps)
    return (
      <div className="w-full h-full overflow-hidden rounded-xl">
        <div
          className="w-full h-full"
          style={{
            animation: 'pixelateEffect 2s ease-in-out infinite',
            imageRendering: 'pixelated',
          }}
        >
          {previewContent}
        </div>
      </div>
    )
  }

  // Default fallback for unknown effects
  return (
    <div className="w-full h-full rounded-xl overflow-hidden">
      {previewContent}
    </div>
  )
}

// Saved zoom presets
interface SavedZoom {
  id: string
  name: string
  zoomLevel: number
  x: number
  y: number
}

export default function ZoomEffects({
  keyframes,
  onKeyframesChange,
  duration,
  currentTime,
  onSeek,
  videoSrc,
  openZoomPanel,
  onZoomPanelOpened,
  closeZoomPanel,
  onZoomPanelClosed,
  onDeselectZoom,
  onAddVisualEffect
}: Props) {
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null)
  const [isProcessingAI, setIsProcessingAI] = useState<string | null>(null)

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1.5)
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 })
  const [savedZooms, setSavedZooms] = useState<SavedZoom[]>([])
  const [isDraggingZoom, setIsDraggingZoom] = useState(false)

  const zoomPreviewRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Open zoom panel when requested from parent
  useEffect(() => {
    if (openZoomPanel && activePanel !== 'zoom') {
      setActivePanel('zoom')
      onZoomPanelOpened?.()
    }
  }, [openZoomPanel, activePanel, onZoomPanelOpened])

  // Close zoom panel when requested from parent (e.g., when zoom is deleted)
  useEffect(() => {
    if (closeZoomPanel && activePanel !== null) {
      setActivePanel(null)
      onZoomPanelClosed?.()
    }
  }, [closeZoomPanel, activePanel, onZoomPanelClosed])

  // Calculate crop box dimensions based on zoom level
  // The crop box maintains 9:16 aspect ratio and scales down with zoom
  // At zoom=1, box fills the full height; at higher zoom, box gets smaller
  const getCropBoxDimensions = (zoom: number) => {
    // Height percentage: at zoom=1 it's 100%, scales down with zoom
    const heightPercent = 100 / zoom
    // Width is calculated from height to maintain 9:16 aspect ratio
    // In a 16:9 container, 9:16 box width = height * (9/16) * (16/9) = height * 1
    // But we need to account for the container aspect ratio
    // Container is 16:9, box is 9:16
    // If box height = H% of container height, box width in container = H% * (9/16) / (16/9) = H% * (9*9)/(16*16) = H% * 81/256
    // Simplified: width% = height% * (9/16) * (9/16) = height% * 0.316...
    const widthPercent = heightPercent * (9 / 16) / (16 / 9)
    return { widthPercent, heightPercent }
  }

  // Add zoom to timeline at current position
  const addZoomToTimeline = useCallback(() => {
    // Generate unique segment ID to group start/end keyframes together
    const segmentId = `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create start keyframe (zoomed in)
    const startKeyframe: ZoomKeyframe = {
      id: `${segmentId}-start`,
      segmentId,
      time: currentTime,
      scale: zoomLevel,
      x: zoomPosition.x,
      y: zoomPosition.y,
      easing: 'ease-out'
    }

    // Create end keyframe after 2 seconds (zoom out)
    const endTime = Math.min(currentTime + 2, duration)
    const endKeyframe: ZoomKeyframe = {
      id: `${segmentId}-end`,
      segmentId,
      time: endTime,
      scale: 1,
      x: 50,
      y: 50,
      easing: 'ease-in'
    }

    onKeyframesChange([...keyframes, startKeyframe, endKeyframe].sort((a, b) => a.time - b.time))
  }, [currentTime, zoomLevel, zoomPosition, duration, keyframes, onKeyframesChange])

  // Handle zoom position drag - constrained to keep crop box within bounds
  const handleZoomDrag = useCallback((e: React.MouseEvent) => {
    if (!zoomPreviewRef.current || !isDraggingZoom) return

    const { widthPercent, heightPercent } = getCropBoxDimensions(zoomLevel)

    const rect = zoomPreviewRef.current.getBoundingClientRect()
    // Constrain X to keep crop box within bounds
    const x = Math.max(widthPercent / 2, Math.min(100 - widthPercent / 2, ((e.clientX - rect.left) / rect.width) * 100))
    // Constrain Y to keep crop box within bounds (centered by default)
    const y = Math.max(heightPercent / 2, Math.min(100 - heightPercent / 2, ((e.clientY - rect.top) / rect.height) * 100))
    setZoomPosition({ x, y })
  }, [isDraggingZoom, zoomLevel])

  // Save current zoom as preset
  const saveCurrentZoom = useCallback(() => {
    const newZoom: SavedZoom = {
      id: `zoom-${Date.now()}`,
      name: `Zoom ${savedZooms.length + 1}`,
      zoomLevel,
      x: zoomPosition.x,
      y: zoomPosition.y
    }
    setSavedZooms([...savedZooms, newZoom])
  }, [savedZooms, zoomLevel, zoomPosition])

  // Apply saved zoom
  const applySavedZoom = useCallback((zoom: SavedZoom) => {
    // Generate unique segment ID to group start/end keyframes together
    const segmentId = `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Add zoom keyframe at current time
    const startKeyframe: ZoomKeyframe = {
      id: `${segmentId}-start`,
      segmentId,
      time: currentTime,
      scale: zoom.zoomLevel,
      x: zoom.x,
      y: zoom.y,
      easing: 'ease-out'
    }

    // Add end keyframe after 2 seconds (or at video end)
    const endTime = Math.min(currentTime + 2, duration)
    const endKeyframe: ZoomKeyframe = {
      id: `${segmentId}-end`,
      segmentId,
      time: endTime,
      scale: 1,
      x: 50,
      y: 50,
      easing: 'ease-in'
    }

    onKeyframesChange([...keyframes, startKeyframe, endKeyframe].sort((a, b) => a.time - b.time))
  }, [currentTime, duration, keyframes, onKeyframesChange])

  // Delete saved zoom
  const deleteSavedZoom = useCallback((id: string) => {
    setSavedZooms(prev => prev.filter(z => z.id !== id))
  }, [])

  const handleAIEffect = async (effectId: string) => {
    setIsProcessingAI(effectId)
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsProcessingAI(null)
    alert(`${effectId === 'word-censoring' ? 'Word censoring' : effectId === 'remove-silences' ? 'Silence removal' : 'Hook intro'} applied successfully!`)
  }

  // Add effect to timeline
  const addEffectToTimeline = (effectId: string) => {
    // Call parent handler to add visual effect
    if (onAddVisualEffect) {
      onAddVisualEffect(effectId as VisualEffectType)
    }
    setSelectedEffect(null)
    setActivePanel(null)
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
          } else if (item.id === 'zoom') {
            // For zoom: add zoom to timeline immediately and open panel
            addZoomToTimeline()
            setActivePanel('zoom')
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
          item.isAI ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-purple-600 to-pink-600'
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

  // Zoom Panel - Full source video with vertical mobile crop overlay
  const renderZoomPanel = () => {
    // 9:16 aspect ratio for mobile - calculate box dimensions based on zoom level
    // As zoom increases, the crop box gets smaller (showing a more zoomed-in area)
    const { widthPercent: cropBoxWidthPercent, heightPercent: cropBoxHeightPercent } = getCropBoxDimensions(zoomLevel)

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={() => {
              setActivePanel(null)
              onDeselectZoom?.() // Deselect zoom in parent to prevent panel from reopening
            }}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Effects</span>
          </button>

          <h3 className="text-lg font-semibold text-white">Choose where to zoom</h3>
          <p className="text-sm text-gray-500 mt-1">
            Drag the vertical box to select the zoom target area in your video.
          </p>
        </div>

        {/* Full Source Video with Vertical Crop Overlay */}
        <div className="p-3">
          <div
            ref={zoomPreviewRef}
            className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video cursor-crosshair"
            onMouseDown={(e) => {
              setIsDraggingZoom(true)
              // Set position immediately on click
              if (zoomPreviewRef.current) {
                const rect = zoomPreviewRef.current.getBoundingClientRect()
                const x = Math.max(cropBoxWidthPercent / 2, Math.min(100 - cropBoxWidthPercent / 2, ((e.clientX - rect.left) / rect.width) * 100))
                const y = Math.max(cropBoxHeightPercent / 2, Math.min(100 - cropBoxHeightPercent / 2, ((e.clientY - rect.top) / rect.height) * 100))
                setZoomPosition({ x, y })
              }
            }}
            onMouseMove={handleZoomDrag}
            onMouseUp={() => setIsDraggingZoom(false)}
            onMouseLeave={() => setIsDraggingZoom(false)}
          >
            {/* Full source video background */}
            {videoSrc && (
              <video
                src={videoSrc}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
              />
            )}

            {/* Darkened overlay outside crop area - using CSS mask for complex shape */}
            <div
              className="absolute inset-0 pointer-events-none bg-black/60"
              style={{
                clipPath: `polygon(
                  0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                  ${zoomPosition.x - cropBoxWidthPercent / 2}% ${zoomPosition.y - cropBoxHeightPercent / 2}%,
                  ${zoomPosition.x - cropBoxWidthPercent / 2}% ${zoomPosition.y + cropBoxHeightPercent / 2}%,
                  ${zoomPosition.x + cropBoxWidthPercent / 2}% ${zoomPosition.y + cropBoxHeightPercent / 2}%,
                  ${zoomPosition.x + cropBoxWidthPercent / 2}% ${zoomPosition.y - cropBoxHeightPercent / 2}%,
                  ${zoomPosition.x - cropBoxWidthPercent / 2}% ${zoomPosition.y - cropBoxHeightPercent / 2}%
                )`
              }}
            />

            {/* Vertical mobile crop box (9:16 aspect ratio) */}
            <div
              className="absolute border-2 border-purple-500 bg-transparent pointer-events-none"
              style={{
                width: `${cropBoxWidthPercent}%`,
                height: `${cropBoxHeightPercent}%`,
                left: `${zoomPosition.x - cropBoxWidthPercent / 2}%`,
                top: `${zoomPosition.y - cropBoxHeightPercent / 2}%`,
              }}
            >
              {/* Corner markers */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-purple-500" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-purple-500" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-purple-500" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-purple-500" />

              {/* Center crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-0.5 bg-purple-500/50" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-purple-500/50" />
            </div>

            {/* Label showing zoom level */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 rounded text-xs text-gray-300">
              9:16 • {(zoomLevel * 100).toFixed(0)}% Zoom
            </div>
          </div>
        </div>

        {/* Zoom Level Control */}
        <div className="p-3 border-t border-gray-800">
          <h4 className="text-sm font-medium text-white mb-1">Zoom level</h4>
          <p className="text-xs text-gray-500 mb-3">How close to zoom during the zoom effect.</p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoomLevel(Math.max(1.1, zoomLevel - 0.1))}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700"
            >
              <Minus className="w-4 h-4 text-gray-400" />
            </button>
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min={1.1}
                max={3}
                step={0.1}
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="text-center text-xs text-gray-400">{(zoomLevel * 100).toFixed(0)}%</div>
            </div>
            <button
              onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
              className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Saved Zooms */}
        <div className="p-3 border-t border-gray-800 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Saved zooms</h4>
            <button
              onClick={saveCurrentZoom}
              className="w-7 h-7 flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-700"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>

        {savedZooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-white">No zooms saved yet</p>
            <p className="text-xs text-gray-500 mt-1">Save a zoom to get started</p>
            <button
              onClick={saveCurrentZoom}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg"
            >
              Save zoom
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {savedZooms.map((zoom) => (
              <div
                key={zoom.id}
                className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg group"
              >
                <div className="w-12 h-8 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                  {(zoom.zoomLevel * 100).toFixed(0)}%
                </div>
                <span className="flex-1 text-sm text-white">{zoom.name}</span>
                <button
                  onClick={() => applySavedZoom(zoom)}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
                >
                  Apply
                </button>
                <button
                  onClick={() => deleteSavedZoom(zoom.id)}
                  className="p-1 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    )
  }

  // Effects Panel (matches StreamLadder screenshot)
  const renderEffectsPanel = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={() => setActivePanel(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Effects</span>
        </button>

        <h3 className="text-lg font-semibold text-white">Effects</h3>
        <p className="text-sm text-gray-500 mt-1">Add effects to your video</p>
      </div>

      {/* Effects Grid */}
      <div className="p-3 flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-3">
          {VISUAL_EFFECTS.map((effect) => (
            <button
              key={effect.id}
              onClick={() => addEffectToTimeline(effect.id)}
              className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all ${
                selectedEffect === effect.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-transparent hover:bg-gray-800'
              }`}
            >
              {/* Animated effect thumbnail */}
              <div className="w-full aspect-square rounded-xl overflow-hidden">
                <EffectPreview effectId={effect.id} />
              </div>
              <span className="text-xs font-medium text-gray-300">{effect.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // Text to Speech Panel
  const renderTTSPanel = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={() => setActivePanel(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back to Effects</span>
        </button>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Text to Speech</h3>
        <p className="text-sm text-gray-500 mt-1">Convert text to natural-sounding speech</p>
      </div>

      <div className="p-3 space-y-4 flex-1">
        <textarea
          placeholder="Enter text to convert to speech..."
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          rows={4}
        />

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Voice</h4>
          <div className="grid grid-cols-3 gap-2">
            {['Male', 'Female', 'Robot'].map((voice) => (
              <button
                key={voice}
                className="py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg border border-gray-300 dark:border-gray-700"
              >
                {voice}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Speed</h4>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            defaultValue={1}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x</span>
            <span>1x</span>
            <span>2x</span>
          </div>
        </div>

        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" size="lg">
          Generate Speech
        </Button>
      </div>
    </div>
  )

  // Main view vs Panel view
  if (activePanel === 'zoom') {
    return renderZoomPanel()
  }

  if (activePanel === 'effects') {
    return renderEffectsPanel()
  }

  if (activePanel === 'text-to-speech') {
    return renderTTSPanel()
  }

  // Main Effects List
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-3 space-y-2">
        {EFFECT_ITEMS.map(renderEffectItem)}
      </div>
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

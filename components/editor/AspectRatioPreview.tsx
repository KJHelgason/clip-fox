'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { AspectRatio, ASPECT_RATIOS, LayoutTemplate, OverlayElement } from '@/lib/types'

type Props = {
  videoSrc: string | null
  aspectRatio: AspectRatio
  cropPosition: { x: number; y: number }
  onCropPositionChange: (pos: { x: number; y: number }) => void
  currentTime: number
  videoRef: HTMLVideoElement | null
  overlays: OverlayElement[]
  layout?: LayoutTemplate | null
}

export default function AspectRatioPreview({
  videoSrc,
  aspectRatio,
  cropPosition,
  onCropPositionChange,
  currentTime,
  videoRef,
  overlays,
  layout
}: Props) {
  const previewRef = useRef<HTMLDivElement>(null)
  const previewVideoRef = useRef<HTMLVideoElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, startCrop: { x: 0, y: 0 } })

  const config = ASPECT_RATIOS[aspectRatio]

  // Sync preview video with main video
  useEffect(() => {
    if (previewVideoRef.current && videoRef) {
      previewVideoRef.current.currentTime = videoRef.currentTime
    }
  }, [currentTime, videoRef])

  // Calculate preview dimensions
  const getPreviewDimensions = useCallback(() => {
    const maxWidth = 200
    const maxHeight = 356
    const targetAspect = config.width / config.height

    let width, height
    if (targetAspect > maxWidth / maxHeight) {
      width = maxWidth
      height = width / targetAspect
    } else {
      height = maxHeight
      width = height * targetAspect
    }
    return { width, height }
  }, [config])

  const dims = getPreviewDimensions()

  // Handle drag to adjust crop position
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      startCrop: { ...cropPosition }
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    const dx = (e.clientX - dragStart.x) / dims.width
    const dy = (e.clientY - dragStart.y) / dims.height

    const newX = Math.max(0, Math.min(1, dragStart.startCrop.x - dx * 0.5))
    const newY = Math.max(0, Math.min(1, dragStart.startCrop.y - dy * 0.5))

    onCropPositionChange({ x: newX, y: newY })
  }, [isDragging, dragStart, dims, onCropPositionChange])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Design resolution used in the main editor for overlay coordinates
  const DESIGN_WIDTH = 640
  const DESIGN_HEIGHT = 360

  // Get visible overlays for current time
  const visibleOverlays = overlays.filter(
    o => currentTime >= o.startTime && currentTime <= o.endTime
  )

  return (
    <div className="flex flex-col items-center">
      {/* Preview Label */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-400">Preview</span>
        <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-[10px] rounded-full">
          {config.label}
        </span>
      </div>

      {/* Preview Container */}
      <div
        ref={previewRef}
        className={`
          relative overflow-hidden rounded-lg bg-black
          border-2 transition-colors
          ${isDragging ? 'border-purple-500 cursor-grabbing' : 'border-gray-700 hover:border-gray-600 cursor-grab'}
        `}
        style={{ width: dims.width, height: dims.height }}
        onMouseDown={handleMouseDown}
      >
        {/* Phone Frame */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-b-lg" />
          {/* Home indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Video Layer */}
        {layout ? (
          // Layout mode - render regions
          <div className="absolute inset-0">
            {layout.regions.map((region) => (
              <div
                key={region.id}
                className="absolute overflow-hidden"
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  borderRadius: region.borderRadius || 0,
                  border: region.border || 'none',
                  background: region.background || 'transparent',
                }}
              >
                {(region.type === 'video' || region.type === 'facecam') && videoSrc && (
                  <video
                    src={videoSrc}
                    className="w-full h-full object-cover"
                    style={{
                      objectPosition: `${cropPosition.x * 100}% ${cropPosition.y * 100}%`
                    }}
                    muted
                    ref={region.type === 'video' ? previewVideoRef : undefined}
                  />
                )}
                {region.type === 'overlay' && (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                    Overlay Area
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Simple crop mode
          <video
            ref={previewVideoRef}
            src={videoSrc || ''}
            className="w-full h-full object-cover"
            style={{
              objectPosition: `${cropPosition.x * 100}% ${cropPosition.y * 100}%`
            }}
            muted
          />
        )}

        {/* Overlay Elements (scaled down) */}
        {visibleOverlays.map((overlay) => {
          // Scale overlay positions for preview using same design resolution
          const scaleX = dims.width / DESIGN_WIDTH
          const scaleY = (dims.height / DESIGN_HEIGHT)
          const scale = Math.min(scaleX, scaleY)
          return (
            <div
              key={overlay.id}
              className="absolute pointer-events-none"
              style={{
                left: overlay.videoLeft * scale,
                top: overlay.videoTop * scale,
                width: overlay.videoWidth * scale,
                height: overlay.videoHeight * scale,
                fontSize: (overlay.fontSize || 16) * scale * 0.5,
                fontFamily: overlay.fontFamily,
                fontWeight: overlay.fontWeight,
                fontStyle: overlay.fontStyle,
                color: overlay.color || '#fff',
                backgroundColor: overlay.backgroundColor || (overlay.type === 'text' ? 'rgba(0,0,0,0.6)' : 'transparent'),
                borderRadius: (overlay.borderRadius || 4) * scale,
                opacity: overlay.opacity ?? 1,
                transform: overlay.rotation ? `rotate(${overlay.rotation}deg)` : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: overlay.textAlign || 'center',
                WebkitTextStroke: overlay.textStroke,
                textShadow: overlay.textShadow,
                overflow: 'hidden',
              }}
            >
              {overlay.type === 'text' || overlay.type === 'caption' ? (
                <span className="truncate px-1">{overlay.content}</span>
              ) : (
                <img
                  src={overlay.src}
                  alt=""
                  className="w-full h-full object-contain"
                  draggable={false}
                />
              )}
            </div>
          )
        })}

        {/* Drag hint */}
        {!isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors z-10">
            <div className="opacity-0 hover:opacity-100 transition-opacity text-white text-xs bg-black/50 px-2 py-1 rounded">
              Drag to adjust crop
            </div>
          </div>
        )}
      </div>

      {/* Crop Position Info */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
        <span>X: {Math.round(cropPosition.x * 100)}%</span>
        <span>Y: {Math.round(cropPosition.y * 100)}%</span>
        <button
          onClick={() => onCropPositionChange({ x: 0.5, y: 0.5 })}
          className="text-purple-400 hover:text-purple-300"
        >
          Reset
        </button>
      </div>

      {/* Quick Position Presets */}
      <div className="mt-2 grid grid-cols-3 gap-1 w-full max-w-[120px]">
        {[
          { x: 0, y: 0, label: '↖' },
          { x: 0.5, y: 0, label: '↑' },
          { x: 1, y: 0, label: '↗' },
          { x: 0, y: 0.5, label: '←' },
          { x: 0.5, y: 0.5, label: '•' },
          { x: 1, y: 0.5, label: '→' },
          { x: 0, y: 1, label: '↙' },
          { x: 0.5, y: 1, label: '↓' },
          { x: 1, y: 1, label: '↘' },
        ].map((pos, i) => (
          <button
            key={i}
            onClick={() => onCropPositionChange({ x: pos.x, y: pos.y })}
            className={`
              w-8 h-8 rounded text-xs transition-colors
              ${cropPosition.x === pos.x && cropPosition.y === pos.y
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }
            `}
          >
            {pos.label}
          </button>
        ))}
      </div>

      {/* Resolution Info */}
      <div className="mt-3 text-[10px] text-gray-600 text-center">
        Output: {config.resolution}
      </div>
    </div>
  )
}

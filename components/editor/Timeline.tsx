'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Scissors, 
  Volume2, 
  VolumeX,
  Volume1,
  Trash2,
  ChevronRight,
  ChevronUp,
  Minus,
  Plus,
  Keyboard,
  X,
  AlignStartVertical,
  AlignEndVertical,
  SlidersHorizontal
} from 'lucide-react'

function formatTimeSmooth(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`
}

function formatTimeDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export type VideoSegment = {
  id: string
  startTime: number
  endTime: number
  trimStart: number
  trimEnd: number
  muted: boolean
  volume: number
}

type Props = {
  duration: number
  currentTime: number
  playing: boolean
  muted: boolean
  volume: number
  videoRef: HTMLVideoElement | null
  onPlayPause: () => void
  onSeek: (time: number) => void
  onToggleMute: () => void
  onVolumeChange: (volume: number) => void
  onSplit?: (time: number) => void
  onDelete?: () => void
  onTrimStart?: (time: number) => void
  onTrimEnd?: (time: number) => void
  clipName?: string
  thumbnailUrl?: string
  onNextStep?: () => void
  nextStepLabel?: string
  onOpenCaptions?: () => void
  hasCaptions?: boolean
  overlays?: Array<{
    id: string
    type: string
    startTime: number
    endTime: number
    content?: string
  }>
  selectedOverlayId?: string | null
  onSelectOverlay?: (id: string | null) => void
  onUpdateOverlayTiming?: (id: string, startTime: number, endTime: number) => void
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  segments?: VideoSegment[]
  onSegmentsChange?: (segments: VideoSegment[]) => void
  selectedSegmentId?: string | null
  onSelectSegment?: (id: string | null) => void
  trimStart?: number
  trimEnd?: number
}

const KEYBOARD_SHORTCUTS = {
  EDITING: [
    { action: 'Undo', keys: 'Ctrl Z' },
    { action: 'Redo', keys: 'Ctrl Y' },
    { action: 'Delete', keys: 'Delete or Backspace' },
    { action: 'Duplicate', keys: 'Ctrl D' },
    { action: 'Trim Start', keys: '[' },
    { action: 'Trim End', keys: ']' },
    { action: 'Split', keys: 'S' },
    { action: 'Deselect', keys: 'Escape' },
  ],
  LAYERING: [
    { action: 'Bring To Foreground', keys: 'Ctrl]' },
    { action: 'Send To Background', keys: 'Ctrl[' },
    { action: 'Bring Forwards', keys: 'Ctrl]' },
    { action: 'Send Backwards', keys: 'Ctrl[' },
  ],
  RESIZING: [
    { action: 'Resize From Center', keys: 'Alt' },
    { action: 'Resize Maintain Aspect Ratio', keys: 'Shift' },
    { action: 'Resize Maintain Aspect Ratio From Center', keys: 'Shift Alt' },
  ],
  TIMELINE: [
    { action: 'Go To Start', keys: 'Ctrl Left or Home' },
    { action: 'Go To End', keys: 'Ctrl Right or End' },
    { action: 'Go To 0%', keys: '0' },
    { action: 'Go To 10%', keys: '1' },
    { action: 'Go To 20%', keys: '2' },
    { action: 'Go To 30%', keys: '3' },
    { action: 'Go To 40%', keys: '4' },
    { action: 'Go To 50%', keys: '5' },
    { action: 'Go To 60%', keys: '6' },
    { action: 'Go To 70%', keys: '7' },
    { action: 'Go To 80%', keys: '8' },
    { action: 'Go To 90%', keys: '9' },
  ],
  MOVEMENT: [
    { action: 'Up', keys: 'Up or W' },
    { action: 'Down', keys: 'Down or S' },
    { action: 'Left', keys: 'Left or A' },
    { action: 'Right', keys: 'Right or D' },
  ],
  PLAYBACK: [
    { action: 'Mute/Unmute', keys: 'M' },
    { action: 'Play/Pause', keys: 'K or Space' },
    { action: 'Skip Backward', keys: 'J or Left' },
    { action: 'Skip Forward', keys: 'L or Right' },
    { action: 'Skip Backward 10', keys: 'Shift J or Shift Left' },
    { action: 'Skip Forward 10', keys: 'Shift L or Shift Right' },
  ],
}

export default function Timeline({
  duration,
  currentTime,
  playing,
  muted,
  volume,
  videoRef,
  onPlayPause,
  onSeek,
  onToggleMute,
  onVolumeChange,
  onSplit,
  onDelete,
  onTrimStart,
  onTrimEnd,
  clipName = '',
  thumbnailUrl,
  onNextStep,
  nextStepLabel = 'Elements',
  onOpenCaptions,
  hasCaptions = false,
  overlays = [],
  selectedOverlayId,
  onSelectOverlay,
  onUpdateOverlayTiming,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  segments: externalSegments,
  onSegmentsChange,
  selectedSegmentId: externalSelectedSegmentId,
  onSelectSegment,
  trimStart = 0,
  trimEnd,
}: Props) {
  const timelineContainerRef = useRef<HTMLDivElement>(null)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const volumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showClipVolumeSlider, setShowClipVolumeSlider] = useState(false)
  const clipVolumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false)
  
  const [internalSegments, setInternalSegments] = useState<VideoSegment[]>([
    {
      id: 'segment-1',
      startTime: 0,
      endTime: duration || 10,
      trimStart: 0,
      trimEnd: duration || 10,
      muted: false,
      volume: 100,
    }
  ])
  const [internalSelectedSegmentId, setInternalSelectedSegmentId] = useState<string | null>(null)
  
  const segments = externalSegments || internalSegments
  const setSegments = onSegmentsChange || setInternalSegments
  const selectedSegmentId = externalSelectedSegmentId !== undefined ? externalSelectedSegmentId : internalSelectedSegmentId
  const setSelectedSegmentId = onSelectSegment || setInternalSelectedSegmentId
  
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null)
  
  // Drag state - using refs for performance
  const isDraggingPlayhead = useRef(false)
  const visualPlayheadTime = useRef<number | null>(null) // For instant visual feedback
  const lastSeekTime = useRef(0) // Throttle video seeks
  const seekThrottleMs = 50 // Seek video every 50ms max during drag
  const trimDragState = useRef<{
    segmentId: string
    edge: 'start' | 'end'
    startX: number
    originalTrimStart: number
    originalTrimEnd: number
  } | null>(null)
  
  // For forcing re-renders when needed
  const [, forceUpdate] = useState({})
  const forceRenderRef = useRef(0)
  
  const [displayTime, setDisplayTime] = useState(currentTime)
  const lastDraggedTime = useRef<number | null>(null) // Track last dragged position to prevent snap-back
  const animationFrameRef = useRef<number | null>(null)
  
  // Generate thumbnails
  useEffect(() => {
    if (!videoRef || duration <= 0 || isGeneratingThumbnails || thumbnails.length > 0) return
    
    const generateThumbnails = async () => {
      setIsGeneratingThumbnails(true)
      const thumbCount = Math.min(60, Math.ceil(duration * 2))
      const newThumbnails: string[] = []
      
      const tempVideo = document.createElement('video')
      tempVideo.src = videoRef.src
      tempVideo.crossOrigin = 'anonymous'
      tempVideo.muted = true
      tempVideo.preload = 'metadata'
      
      await new Promise<void>((resolve) => {
        tempVideo.onloadedmetadata = () => resolve()
        tempVideo.onerror = () => resolve()
      })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 80
      canvas.height = 64
      
      for (let i = 0; i < thumbCount; i++) {
        const time = (i / thumbCount) * duration
        try {
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => resolve(), 1500)
            tempVideo.currentTime = time
            tempVideo.onseeked = () => {
              clearTimeout(timeout)
              if (ctx) {
                ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height)
                newThumbnails.push(canvas.toDataURL('image/jpeg', 0.5))
              }
              resolve()
            }
            tempVideo.onerror = () => {
              clearTimeout(timeout)
              resolve()
            }
          })
        } catch {
          // Skip failed frames
        }
      }
      
      tempVideo.remove()
      canvas.remove()
      
      if (newThumbnails.length > 0) {
        setThumbnails(newThumbnails)
      }
      setIsGeneratingThumbnails(false)
    }
    
    generateThumbnails()
  }, [videoRef, duration, isGeneratingThumbnails, thumbnails.length])
  
  useEffect(() => {
    if (duration > 0 && segments.length === 1 && segments[0].endTime !== duration) {
      setSegments([{
        ...segments[0],
        endTime: duration,
        trimEnd: trimEnd ?? duration,
      }])
    }
  }, [duration])
  
  useEffect(() => {
    if (playing) {
      // Clear any pending drag time when playing starts
      lastDraggedTime.current = null
      const updateDisplayTime = () => {
        if (videoRef) {
          setDisplayTime(videoRef.currentTime)
        }
        animationFrameRef.current = requestAnimationFrame(updateDisplayTime)
      }
      animationFrameRef.current = requestAnimationFrame(updateDisplayTime)
    } else {
      // Only update displayTime when NOT dragging and no pending drag position
      // This prevents snapping back during seek
      if (!isDraggingPlayhead.current && lastDraggedTime.current === null) {
        setDisplayTime(currentTime)
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [playing, currentTime, videoRef])

  // Handle segment transitions during playback
  useEffect(() => {
    if (!videoRef || !playing) return
    
    // Sort segments by trimStart for proper playback order
    const sortedSegments = [...segments].sort((a, b) => a.trimStart - b.trimStart)
    
    const checkTrimRegions = () => {
      const time = videoRef.currentTime
      
      // Find which segment we're currently in or between
      for (let i = 0; i < sortedSegments.length; i++) {
        const segment = sortedSegments[i]
        
        // Skip trimmed beginning of segment
        if (time >= segment.startTime && time < segment.trimStart) {
          videoRef.currentTime = segment.trimStart
          return
        }
        
        // Check if we've passed the trimEnd of this segment
        if (time >= segment.trimEnd - 0.05) {  // Small buffer for timing precision
          // Find the next segment that we should jump to
          const nextSegment = sortedSegments[i + 1]
          
          if (nextSegment) {
            // Jump to next segment's trimStart (skip the gap)
            if (time < nextSegment.trimStart) {
              videoRef.currentTime = nextSegment.trimStart
              return
            }
          } else {
            // No more segments, check if we should pause at the very end
            if (time >= segment.trimEnd) {
              videoRef.pause()
              videoRef.currentTime = segment.trimEnd
              return
            }
          }
        }
      }
    }
    
    const interval = setInterval(checkTrimRegions, 30) // Faster interval for smoother transitions
    return () => clearInterval(interval)
  }, [videoRef, playing, segments])

  const timeMarkers = useMemo(() => generateTimeMarkers(duration, zoomLevel), [duration, zoomLevel])

  // Convert clientX to time - optimized
  const clientXToTime = useCallback((clientX: number): number => {
    if (!timelineContainerRef.current || duration <= 0) return 0
    const rect = timelineContainerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    return Math.min((x / rect.width) * duration / zoomLevel, duration)
  }, [duration, zoomLevel])

  // Global mouse handlers using useEffect for better performance
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead.current) {
        const time = clientXToTime(e.clientX)
        // Update visual position instantly
        visualPlayheadTime.current = time
        forceRenderRef.current++
        forceUpdate({})
        
        // Throttle video seeks for real-time preview
        // When paused, seek less frequently to avoid "play interrupted" errors
        const now = Date.now()
        const throttle = playing ? seekThrottleMs : 100 // Slower throttle when paused
        if (now - lastSeekTime.current >= throttle) {
          lastSeekTime.current = now
          // Only seek if video is ready
          if (videoRef && videoRef.readyState >= 2) {
            onSeek(time)
          }
        }
        return
      }
      
      if (trimDragState.current) {
        const state = trimDragState.current
        if (!timelineContainerRef.current) return
        
        const rect = timelineContainerRef.current.getBoundingClientRect()
        const deltaX = e.clientX - state.startX
        const deltaTime = (deltaX / rect.width) * duration / zoomLevel
        
        // Find and update segment directly (mutate for performance, then trigger render)
        const segmentIndex = segments.findIndex(s => s.id === state.segmentId)
        if (segmentIndex === -1) return
        
        const segment = segments[segmentIndex]
        let newTrimStart = state.originalTrimStart
        let newTrimEnd = state.originalTrimEnd
        
        if (state.edge === 'start') {
          newTrimStart = Math.max(
            segment.startTime,
            Math.min(state.originalTrimStart + deltaTime, state.originalTrimEnd - 0.1)
          )
        } else {
          newTrimEnd = Math.min(
            segment.endTime,
            Math.max(state.originalTrimEnd + deltaTime, state.originalTrimStart + 0.1)
          )
        }
        
        // Update segments with new values
        const newSegments = [...segments]
        newSegments[segmentIndex] = {
          ...segment,
          trimStart: newTrimStart,
          trimEnd: newTrimEnd,
        }
        setSegments(newSegments)
      }
    }

    const handleMouseUp = () => {
      // On mouse up, do a final seek to ensure we're at exact position
      if (isDraggingPlayhead.current && visualPlayheadTime.current !== null) {
        const finalTime = visualPlayheadTime.current
        // Store the final dragged time to prevent snap-back
        lastDraggedTime.current = finalTime
        // Update displayTime immediately to the final position
        setDisplayTime(finalTime)
        // Small delay to avoid race conditions with video events
        setTimeout(() => {
          onSeek(finalTime)
          // Clear lastDraggedTime after seek completes
          setTimeout(() => {
            lastDraggedTime.current = null
          }, 100)
        }, 10)
      }
      isDraggingPlayhead.current = false
      visualPlayheadTime.current = null
      trimDragState.current = null
      forceUpdate({})
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [clientXToTime, onSeek, duration, zoomLevel, segments, setSegments, playing, videoRef])

  // Use visual playhead time during drag for instant feedback
  // Use lastDraggedTime to prevent snap-back after drag ends
  // Otherwise use displayTime
  const effectiveTime = visualPlayheadTime.current !== null 
    ? visualPlayheadTime.current 
    : lastDraggedTime.current !== null 
      ? lastDraggedTime.current 
      : displayTime
  const playheadPosition = duration > 0 ? (effectiveTime / duration) * 100 * zoomLevel : 0

  const frameBack = () => {
    if (videoRef) videoRef.currentTime = Math.max(0, videoRef.currentTime - (1/30))
  }

  const frameForward = () => {
    if (videoRef) videoRef.currentTime = Math.min(duration, videoRef.currentTime + (1/30))
  }

  const zoomIn = () => setZoomLevel(prev => Math.min(4, prev + 0.25))
  const zoomOut = () => setZoomLevel(prev => Math.max(0.5, prev - 0.25))

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  const handleTimeRulerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDraggingPlayhead.current = true
    const time = clientXToTime(e.clientX)
    // Set visual position instantly AND seek video immediately
    visualPlayheadTime.current = time
    lastSeekTime.current = Date.now()
    onSeek(time)
    forceUpdate({})
  }

  const handleTrimHandleMouseDown = (
    e: React.MouseEvent,
    segmentId: string,
    edge: 'start' | 'end',
    originalTrimStart: number,
    originalTrimEnd: number
  ) => {
    e.preventDefault()
    e.stopPropagation()
    trimDragState.current = {
      segmentId,
      edge,
      startX: e.clientX,
      originalTrimStart,
      originalTrimEnd,
    }
    forceUpdate({})
  }

  const handleSplit = () => {
    const time = currentTime
    const segmentIndex = segments.findIndex(s => time >= s.trimStart && time < s.trimEnd)
    if (segmentIndex === -1) return
    
    const segment = segments[segmentIndex]
    if (time - segment.trimStart < 0.1 || segment.trimEnd - time < 0.1) return
    
    const newSegment1: VideoSegment = {
      ...segment,
      id: `${segment.id}-a`,
      trimEnd: time,
      endTime: time,
    }
    
    const newSegment2: VideoSegment = {
      id: `${segment.id}-b`,
      startTime: time,
      endTime: segment.endTime,
      trimStart: time,
      trimEnd: segment.trimEnd,
      muted: segment.muted,
      volume: segment.volume,
    }
    
    setSegments([
      ...segments.slice(0, segmentIndex),
      newSegment1,
      newSegment2,
      ...segments.slice(segmentIndex + 1),
    ])
    onSplit?.(time)
  }

  const handleTrimStartClick = () => {
    const targetId = selectedSegmentId || segments.find(s => currentTime >= s.startTime && currentTime < s.endTime)?.id
    if (targetId) {
      setSegments(prev => prev.map(seg => 
        seg.id === targetId 
          ? { ...seg, trimStart: Math.min(currentTime, seg.trimEnd - 0.1) }
          : seg
      ))
    }
    onTrimStart?.(currentTime)
  }

  const handleTrimEndClick = () => {
    const targetId = selectedSegmentId || segments.find(s => currentTime >= s.startTime && currentTime < s.endTime)?.id
    if (targetId) {
      setSegments(prev => prev.map(seg => 
        seg.id === targetId 
          ? { ...seg, trimEnd: Math.max(currentTime, seg.trimStart + 0.1) }
          : seg
      ))
    }
    onTrimEnd?.(currentTime)
  }

  const handleDeleteClick = () => {
    if (selectedOverlayId) {
      onDelete?.()
      return
    }
    if (selectedSegmentId && segments.length > 1) {
      setSegments(prev => prev.filter(s => s.id !== selectedSegmentId))
      setSelectedSegmentId(null)
    }
  }

  const handleSegmentVolumeChange = (newVolume: number) => {
    if (selectedSegmentId) {
      setSegments(prev => prev.map(seg => 
        seg.id === selectedSegmentId ? { ...seg, volume: newVolume } : seg
      ))
    }
  }

  const selectedSegment = segments.find(s => s.id === selectedSegmentId)

  if (isCollapsed) {
    return (
      <div className="border-t border-gray-800 bg-[#12121f]">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full py-2 px-4 flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
          <span className="text-sm">Show Timeline</span>
        </button>
      </div>
    )
  }

  // Calculate active regions for the overlay mask
  const activeRegions = segments.map(seg => ({
    start: (seg.trimStart / duration) * 100,
    end: (seg.trimEnd / duration) * 100,
  }))

  return (
    <div className="bg-[#12121f] relative">
      {/* Top Controls */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2 min-w-[140px]">
          <span className="text-sm font-mono text-white tabular-nums">
            {formatTimeSmooth(effectiveTime)}
          </span>
          <span className="text-gray-600">/</span>
          <span className="text-sm font-mono text-gray-400">
            {formatTimeDuration(duration)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={frameBack}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Previous frame (1/30s)"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={onPlayPause}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button
            onClick={frameForward}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Next frame (1/30s)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 min-w-[280px] justify-end">
          <div 
            className="relative"
            onMouseEnter={() => {
              if (volumeTimeout.current) clearTimeout(volumeTimeout.current)
              setShowVolumeSlider(true)
            }}
            onMouseLeave={() => {
              volumeTimeout.current = setTimeout(() => setShowVolumeSlider(false), 300)
            }}
          >
            <button
              onClick={onToggleMute}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Toggle mute"
            >
              <VolumeIcon className="w-4 h-4" />
            </button>
            {showVolumeSlider && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-24 accent-purple-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          <button
            onClick={zoomOut}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full border border-gray-500 text-gray-400 hover:text-white transition-colors"
            title="Zoom out"
          >
            <Minus className="w-3 h-3" />
          </button>
          <div className="relative w-16 mx-1">
            <input
              type="range"
              min={0.5}
              max={4}
              step={0.25}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
          <button
            onClick={zoomIn}
            className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded-full border border-gray-500 text-gray-400 hover:text-white transition-colors"
            title="Zoom in"
          >
            <Plus className="w-3 h-3" />
          </button>

          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors ml-1"
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Hide timeline"
          >
            <ChevronUp className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Secondary Toolbar */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0a0a12]">
        <button
          onClick={handleSplit}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-sm"
          title="Split clip at current time (S)"
        >
          <Scissors className="w-4 h-4" />
          <span className="hidden sm:inline">Split</span>
        </button>
        
        <button
          onClick={handleTrimStartClick}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-sm"
          title="Trim start to current time ([)"
        >
          <AlignStartVertical className="w-4 h-4" />
          <span className="hidden sm:inline">Trim start</span>
        </button>
        
        <button
          onClick={handleTrimEndClick}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-sm"
          title="Trim end to current time (])"
        >
          <AlignEndVertical className="w-4 h-4" />
          <span className="hidden sm:inline">Trim end</span>
        </button>
        
        <div 
          className="relative"
          onMouseEnter={() => {
            if (clipVolumeTimeout.current) clearTimeout(clipVolumeTimeout.current)
            setShowClipVolumeSlider(true)
          }}
          onMouseLeave={() => {
            clipVolumeTimeout.current = setTimeout(() => setShowClipVolumeSlider(false), 300)
          }}
        >
          <button
            className={`flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg transition-colors text-sm ${
              selectedSegmentId ? 'text-purple-400' : 'text-gray-400 hover:text-white'
            }`}
            title="Change clip volume"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Clip volume</span>
          </button>
          {showClipVolumeSlider && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-gray-800 rounded-lg shadow-lg border border-gray-700 min-w-[180px]">
              <div className="text-xs text-gray-400 mb-2">
                {selectedSegmentId ? 'Selected clip volume' : 'Select a clip first'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">0%</span>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={selectedSegment?.volume ?? 100}
                  onChange={(e) => handleSegmentVolumeChange(parseInt(e.target.value))}
                  disabled={!selectedSegmentId}
                  className="flex-1 accent-purple-500 cursor-pointer disabled:opacity-50"
                />
                <span className="text-xs text-gray-400 w-10">{selectedSegment?.volume ?? 100}%</span>
              </div>
            </div>
          )}
        </div>
        
        <button
          onClick={handleDeleteClick}
          disabled={!selectedOverlayId && !selectedSegmentId}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors text-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
          title="Delete selected (Delete)"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Delete selected</span>
        </button>
      </div>

      {/* Timeline Area */}
      <div className="relative px-4 pt-0 pb-4 overflow-x-auto">
        <div 
          ref={timelineContainerRef}
          style={{ width: `${100 * zoomLevel}%`, minWidth: '100%' }}
          className="relative"
        >
          {/* Time Ruler - ONLY area for playhead dragging */}
          <div 
            className="relative h-6 mb-1 cursor-ew-resize select-none"
            onMouseDown={handleTimeRulerMouseDown}
          >
            {timeMarkers.map((marker) => (
              <div
                key={marker.time}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${(marker.time / duration) * 100}%` }}
              >
                <span className="text-[10px] text-gray-500 transform -translate-x-1/2">
                  {marker.label}
                </span>
                <div className="w-px h-2 bg-gray-600 mt-0.5" />
              </div>
            ))}
            
            {/* Playhead in time ruler */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
              style={{ left: `${playheadPosition}%` }}
            />
          </div>

          {/* Timeline Tracks Container */}
          <div className="relative select-none">
            {/* Element Tracks */}
            {overlays.map((overlay) => (
              <div key={overlay.id} className="relative h-8 mb-1">
                <div
                  className={`absolute h-full rounded transition-all cursor-pointer ${
                    selectedOverlayId === overlay.id 
                      ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-[#12121f]' 
                      : hoveredTrackId === overlay.id 
                        ? 'ring-1 ring-white/30' 
                        : ''
                  }`}
                  style={{ 
                    left: `${(overlay.startTime / duration) * 100}%`,
                    width: `${((overlay.endTime - overlay.startTime) / duration) * 100}%`,
                    backgroundColor: overlay.type === 'text' ? '#3b82f6' : 
                                    overlay.type === 'sticker' ? '#f59e0b' : 
                                    overlay.type === 'image' ? '#10b981' : '#8b5cf6',
                  }}
                  onMouseEnter={() => setHoveredTrackId(overlay.id)}
                  onMouseLeave={() => setHoveredTrackId(null)}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectOverlay?.(overlay.id)
                  }}
                >
                  <div className="flex items-center h-full px-2 text-white text-xs font-medium truncate">
                    <span className="truncate">
                      {overlay.type === 'text' ? '📝' : overlay.type === 'sticker' ? '🎨' : overlay.type === 'image' ? '🖼️' : '💬'} 
                      {' '}{overlay.content || overlay.type}
                    </span>
                  </div>
                  
                  {selectedOverlayId === overlay.id && (
                    <>
                      <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/40 hover:bg-white/60 cursor-pointer rounded-l z-10" />
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 hover:bg-white/60 cursor-pointer rounded-r z-10" />
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* Captions Track */}
            {hasCaptions && (
              <div className="relative h-8 mb-1 rounded overflow-hidden">
                <div 
                  className="absolute inset-0 bg-purple-600 rounded flex items-center justify-center cursor-pointer transition-all hover:bg-purple-500"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenCaptions?.()
                  }}
                >
                  <div className="flex items-center gap-2 text-white text-xs font-medium">
                    <span>💬</span>
                    <span>Edit Captions</span>
                  </div>
                </div>
              </div>
            )}

            {/* Video Segments Track */}
            <div className="relative h-16 rounded overflow-hidden bg-gray-900">
              {/* Full timeline thumbnails */}
              <div className="absolute inset-0 flex">
                {thumbnails.length > 0 ? (
                  thumbnails.map((thumb, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 h-full border-r border-gray-700/20 overflow-hidden"
                      style={{ width: `${100 / thumbnails.length}%` }}
                    >
                      <img 
                        src={thumb} 
                        alt="" 
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  ))
                ) : (
                  <div className="w-full h-full bg-gray-800" />
                )}
              </div>
              
              {/* Dark overlay for trimmed regions - using CSS gradient for precise edges */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: activeRegions.length > 0
                    ? `linear-gradient(to right, ${activeRegions.map((region, i) => {
                        const parts = []
                        // Before this region (dark)
                        if (i === 0 && region.start > 0) {
                          parts.push(`rgba(0,0,0,0.7) 0%`)
                          parts.push(`rgba(0,0,0,0.7) ${region.start}%`)
                        }
                        // This region (clear)
                        parts.push(`transparent ${region.start}%`)
                        parts.push(`transparent ${region.end}%`)
                        // After this region (dark) - only for last region
                        if (i === activeRegions.length - 1 && region.end < 100) {
                          parts.push(`rgba(0,0,0,0.7) ${region.end}%`)
                          parts.push(`rgba(0,0,0,0.7) 100%`)
                        }
                        // Gap between regions (dark)
                        if (i < activeRegions.length - 1) {
                          const nextRegion = activeRegions[i + 1]
                          parts.push(`rgba(0,0,0,0.7) ${region.end}%`)
                          parts.push(`rgba(0,0,0,0.7) ${nextRegion.start}%`)
                        }
                        return parts.join(', ')
                      }).join(', ')})`
                    : 'rgba(0,0,0,0.7)',
                }}
              />
              
              {/* Segment borders and trim handles */}
              {segments.map((segment, index) => {
                const isSelected = selectedSegmentId === segment.id
                const isHovered = hoveredTrackId === segment.id
                
                const segmentLeft = (segment.trimStart / duration) * 100
                const segmentWidth = ((segment.trimEnd - segment.trimStart) / duration) * 100
                
                return (
                  <div
                    key={segment.id}
                    className="absolute top-0 bottom-0 cursor-pointer rounded"
                    style={{
                      left: `${segmentLeft}%`,
                      width: `${segmentWidth}%`,
                      border: isSelected 
                        ? '3px solid #a855f7' // Purple-500 - matches trim handles
                        : isHovered 
                          ? '2px solid rgba(255,255,255,0.7)' 
                          : '2px solid rgba(255,255,255,0.5)',
                      boxShadow: isSelected 
                        ? '0 0 12px rgba(168, 85, 247, 0.6), inset 0 0 0 1px rgba(168, 85, 247, 0.3)' 
                        : 'none',
                    }}
                    onMouseEnter={() => setHoveredTrackId(segment.id)}
                    onMouseLeave={() => setHoveredTrackId(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedSegmentId(segment.id)
                      onSelectOverlay?.(null)
                    }}
                  >
                    {/* Segment label */}
                    <div className="absolute bottom-1 left-2 flex items-center gap-1 text-white text-xs font-medium pointer-events-none z-10">
                      <span className="text-[10px]">🎬</span>
                      <span className="truncate max-w-[150px]">
                        {segments.length > 1 ? `${clipName || 'Clip'} (${index + 1})` : clipName || 'Video Clip'}
                      </span>
                    </div>
                    
                    {/* Trim handles - only when selected */}
                    {isSelected && (
                      <>
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 bg-purple-500 hover:bg-purple-400 cursor-ew-resize flex items-center justify-center rounded-l z-20 -ml-[3px]"
                          onMouseDown={(e) => handleTrimHandleMouseDown(e, segment.id, 'start', segment.trimStart, segment.trimEnd)}
                        >
                          <div className="w-0.5 h-8 bg-white rounded-full" />
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 bg-purple-500 hover:bg-purple-400 cursor-ew-resize flex items-center justify-center rounded-r z-20 -mr-[3px]"
                          onMouseDown={(e) => handleTrimHandleMouseDown(e, segment.id, 'end', segment.trimStart, segment.trimEnd)}
                        >
                          <div className="w-0.5 h-8 bg-white rounded-full" />
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Playhead - continuous line through all tracks */}
            <div
              className="absolute bg-red-500 pointer-events-none"
              style={{ 
                left: `${playheadPosition}%`,
                top: '-28px',
                bottom: '0',
                width: '2px',
                zIndex: 50,
              }}
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        {onNextStep && (
          <div className="flex justify-end mt-3">
            <button
              onClick={onNextStep}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              {nextStepLabel}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {Object.entries(KEYBOARD_SHORTCUTS).map(([category, shortcuts]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {shortcuts.map((shortcut, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <span className="text-gray-700 text-sm">{shortcut.action}</span>
                        <span className="text-gray-500 text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                          {shortcut.keys}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function generateTimeMarkers(duration: number, zoomLevel: number): { time: number; label: string }[] {
  const markers: { time: number; label: string }[] = []
  const effectiveDuration = duration / zoomLevel
  let interval = 1
  
  if (effectiveDuration > 300) interval = 30
  else if (effectiveDuration > 120) interval = 15
  else if (effectiveDuration > 60) interval = 10
  else if (effectiveDuration > 30) interval = 5
  else if (effectiveDuration > 15) interval = 2
  else interval = 1
  
  if (zoomLevel < 1) interval = Math.ceil(interval / zoomLevel)

  for (let t = 0; t <= duration; t += interval) {
    const mins = Math.floor(t / 60)
    const secs = Math.floor(t % 60)
    markers.push({
      time: t,
      label: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    })
  }

  return markers
}

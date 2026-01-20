'use client'

import React, { useEffect, useState, useRef, useCallback, Suspense, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useClip, parseEditData, type Clip } from '@/lib/hooks/useClip'
import Timeline from '@/components/editor/Timeline'
import LayoutTemplates from '@/components/editor/LayoutTemplates'
import { usePreviewCropDrag, CropRegion } from '@/lib/hooks/usePreviewCropDrag'
import { PreviewCropRegion } from '@/components/editor/PreviewCropRegion'
import { ZoomOverlay } from '@/components/editor/ZoomOverlay'
import { EffectOverlay, useEffectTransform } from '@/components/editor/EffectOverlay'
import { CropToolbar } from '@/components/editor/CropToolbar'
import StickerRenderer, { StickerConfig, StickerStyle, PLATFORM_STYLES } from '@/components/editor/stickers/StickerRenderer'
import { SocialPlatform, StickerTemplate } from '@/lib/types'

// Dynamic imports for heavy editor panels - only loaded when their tab is active
// This reduces initial bundle size and improves Time to Interactive
const ElementsPanel = dynamic(() => import('@/components/editor/ElementsPanel'), {
  loading: () => <PanelSkeleton />,
  ssr: false,
})

const ZoomEffects = dynamic(() => import('@/components/editor/ZoomEffects'), {
  loading: () => <PanelSkeleton />,
  ssr: false,
})

const AudioPanel = dynamic(() => import('@/components/editor/AudioPanel'), {
  loading: () => <PanelSkeleton />,
  ssr: false,
})

const TrimAudioModal = dynamic(() => import('@/components/editor/TrimAudioModal'), {
  ssr: false,
})

const CaptionEditor = dynamic(() => import('@/components/editor/CaptionEditor'), {
  loading: () => <PanelSkeleton />,
  ssr: false,
})

const ExportPanel = dynamic(() => import('@/components/editor/ExportPanel'), {
  loading: () => <PanelSkeleton />,
  ssr: false,
})

const OverlayProperties = dynamic(() => import('@/components/editor/OverlayProperties'), {
  ssr: false,
})

// Loading skeleton for panels
function PanelSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-3/4" />
      <div className="h-32 bg-gray-800 rounded" />
      <div className="h-8 bg-gray-800 rounded w-1/2" />
      <div className="h-24 bg-gray-800 rounded" />
    </div>
  )
}

import {
  OverlayElement,
  AspectRatio,
  LayoutTemplate,
  ZoomKeyframe,
  VisualEffect,
  VisualEffectType,
  CaptionStyle,
  AudioTrack,
  findAvailableRow,
  timeToPosition,
  durationToWidth
} from '@/lib/types'
import {
  Layout,
  Sparkles,
  Wand2,
  Music,
  MessageSquare,
  Download,
  Undo2,
  Redo2,
  Trash2,
  Layers,
  Pencil
} from 'lucide-react'

// Clip type imported from useClip hook

type SidebarTab = 'layouts' | 'elements' | 'effects' | 'audio' | 'captions' | 'export'
type PreviewPlatform = 'none' | 'youtube' | 'tiktok' | 'instagram'

/**
 * Z-INDEX HIERARCHY PLAN
 * ========================
 * This ensures proper layering of all editor elements in the preview:
 * 
 * BASE LAYERS (0-99):
 * - 0-9: Blurred background video
 * - 10-49: Crop regions (video content) - each crop uses zIndex + 10
 * - 50-59: Crop selection/hover states
 * - 60-69: Resize handles for crops
 * 
 * CONTENT LAYERS (100-199):
 * - 100-119: Elements (stickers, images) - based on timeline row
 * - 120-139: Effects overlays
 * - 140-159: Caption text overlays
 * 
 * UI LAYERS (200-299):
 * - 200-249: Platform preview UI (YouTube, TikTok, Instagram buttons/labels)
 * - 250-299: Editor-only indicators (snap lines, guides)
 * 
 * CONTROLS (300+):
 * - 300+: Toolbars, menus, dialogs
 */

type CaptionSegment = {
  id: string
  text: string
  startTime: number
  endTime: number
}

// Note: CropRegion is imported from usePreviewCropDrag hook

// Sidebar menu items matching StreamLadder
const SIDEBAR_ITEMS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  { id: 'layouts', label: 'Layouts', icon: <Layout className="w-5 h-5" /> },
  { id: 'elements', label: 'Elements', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'effects', label: 'Effects', icon: <Wand2 className="w-5 h-5" /> },
  { id: 'audio', label: 'Audio', icon: <Music className="w-5 h-5" /> },
  { id: 'captions', label: 'Captions', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'export', label: 'Export', icon: <Download className="w-5 h-5" /> },
]

export default function EditClipPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()

  // Clip data - using SWR for optimized fetching with caching
  const { clip, isLoading: loading, mutate: mutateClip } = useClip(id)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [editDataLoaded, setEditDataLoaded] = useState(false)

  // Video state
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [thumbs, setThumbs] = useState<number[]>([0])

  // Layout & Aspect Ratio
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16')
  const [cropPosition, setCropPosition] = useState({ x: 0.5, y: 0.5 })
  const [selectedLayout, setSelectedLayout] = useState<LayoutTemplate | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  // Overlays
  const [overlays, setOverlays] = useState<OverlayElement[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [requestElementEditView, setRequestElementEditView] = useState(false) // Triggers edit view in ElementsPanel
  const videoContainerRef = useRef<HTMLDivElement>(null)

  // Overlay dragging
  const [dragOverlayId, setDragOverlayId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'move' | 'resize' | 'resize-tr' | 'resize-bl' | 'resize-tl' | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragStartOverlay, setDragStartOverlay] = useState<OverlayElement | null>(null)

  // Effects
  const [zoomKeyframes, setZoomKeyframes] = useState<ZoomKeyframe[]>([])
  const [selectedZoomId, setSelectedZoomId] = useState<string | null>(null)
  const [requestZoomPanelOpen, setRequestZoomPanelOpen] = useState(false) // Triggers zoom panel to open in ZoomEffects
  const [requestZoomPanelClose, setRequestZoomPanelClose] = useState(false) // Triggers zoom panel to close in ZoomEffects
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([])
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(null)

  // Effect transform for applying visual effects (shake, zoom-blur, etc.) to video content
  const effectTransform = useEffectTransform(visualEffects, currentTime)

  const [captions, setCaptions] = useState<CaptionSegment[]>([])

  // Audio
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null)
  const [trimModalTrack, setTrimModalTrack] = useState<AudioTrack | null>(null)

  // UI State - StreamLadder style
  const [activeTab, setActiveTab] = useState<SidebarTab>('layouts')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>('youtube')
  const [previewZoom, setPreviewZoom] = useState<'fit' | number>('fit') // 'fit' or percentage
  const [zoomDropdownOpen, setZoomDropdownOpen] = useState(false)

  // Editor scale for responsive sizing
  const [editorScale, setEditorScale] = useState(1)
  const [previewOnlyScale, setPreviewOnlyScale] = useState(1) // Scale when only preview is shown (non-layouts tabs)
  const [layoutsFillPercent, setLayoutsFillPercent] = useState(100) // How much of available height is filled in layouts tab
  const [previewFillPercent, setPreviewFillPercent] = useState(100) // How much of available height is filled in other tabs
  const editorContainerRef = useRef<HTMLDivElement>(null)

  // Crop regions for multi-crop layout
  const [cropRegions, setCropRegions] = useState<CropRegion[]>([
    { 
      id: 'crop-1', 
      name: 'New Crop', 
      x: 0, 
      y: 0, 
      width: 50, 
      height: 100, 
      color: '#22c55e', 
      previewX: 0, 
      previewY: 0, 
      previewWidth: 100,
      aspectRatio: 'freeform',
      cornerRounding: 0,
      zIndex: 1,
    },
  ])
  const [selectedCropId, setSelectedCropId] = useState<string | null>('crop-1')
  const [hoveredCropId, setHoveredCropId] = useState<string | null>(null)
  const [snappingEnabled, setSnappingEnabled] = useState(true)
  // Center line indicators for snapping visualization - main video only (preview handled by hook)
  const [showMainCenterXLine, setShowMainCenterXLine] = useState(false)
  const [showMainCenterYLine, setShowMainCenterYLine] = useState(false)
  // Main video crop drag state (preview handled by hook)
  const [dragCropId, setDragCropId] = useState<string | null>(null)
  const [cropDragType, setCropDragType] = useState<'move' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl' | null>(null)
  const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 })
  const [cropDragStartRegion, setCropDragStartRegion] = useState<CropRegion | null>(null)
  const mainVideoContainerRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const previewBgVideoRef = useRef<HTMLVideoElement>(null)

  // Preview crop drag hook - handles all preview panel drag operations
  const {
    snapping: previewSnapping,
    handleMouseDown: handlePreviewCropMouseDown,
    isDragging: isPreviewDragging,
  } = usePreviewCropDrag({
    containerRef: previewContainerRef,
    cropRegions,
    setCropRegions,
    snappingEnabled,
    onSelect: setSelectedCropId,
  })

  // Undo/Redo history - stores complete editor state snapshots
  type EditorSnapshot = {
    cropRegions: CropRegion[]
    overlays: OverlayElement[]
    selectedLayoutId: string | undefined
  }
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([])
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([])
  
  // Save current state to undo stack
  const pushToUndoStack = useCallback(() => {
    const snapshot: EditorSnapshot = {
      cropRegions: JSON.parse(JSON.stringify(cropRegions)),
      overlays: JSON.parse(JSON.stringify(overlays)),
      selectedLayoutId: selectedLayout?.id,
    }
    setUndoStack(prev => [...prev.slice(-50), snapshot]) // Keep last 50 states
    setRedoStack([]) // Clear redo stack on new action
  }, [cropRegions, overlays, selectedLayout])
  
  // Undo action
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    
    // Save current state to redo stack
    const currentSnapshot: EditorSnapshot = {
      cropRegions: JSON.parse(JSON.stringify(cropRegions)),
      overlays: JSON.parse(JSON.stringify(overlays)),
      selectedLayoutId: selectedLayout?.id,
    }
    setRedoStack(prev => [...prev, currentSnapshot])
    
    // Restore previous state
    const prevState = undoStack[undoStack.length - 1]
    setCropRegions(prevState.cropRegions)
    setOverlays(prevState.overlays)
    if (prevState.selectedLayoutId) {
      setSelectedLayout({ id: prevState.selectedLayoutId, name: prevState.selectedLayoutId } as LayoutTemplate)
    }
    
    setUndoStack(prev => prev.slice(0, -1))
  }, [undoStack, cropRegions, overlays, selectedLayout])
  
  // Redo action
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    
    // Save current state to undo stack
    const currentSnapshot: EditorSnapshot = {
      cropRegions: JSON.parse(JSON.stringify(cropRegions)),
      overlays: JSON.parse(JSON.stringify(overlays)),
      selectedLayoutId: selectedLayout?.id,
    }
    setUndoStack(prev => [...prev, currentSnapshot])
    
    // Restore next state
    const nextState = redoStack[redoStack.length - 1]
    setCropRegions(nextState.cropRegions)
    setOverlays(nextState.overlays)
    if (nextState.selectedLayoutId) {
      setSelectedLayout({ id: nextState.selectedLayoutId, name: nextState.selectedLayoutId } as LayoutTemplate)
    }
    
    setRedoStack(prev => prev.slice(0, -1))
  }, [redoStack, cropRegions, overlays, selectedLayout])
  
  // Check if undo/redo is available
  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  // Compute effective scale based on active tab
  // For layouts tab: use editorScale (fits source + preview)
  // For other tabs: use previewOnlyScale (fits just preview, so it's larger)
  const currentScale = activeTab === 'layouts' ? editorScale : previewOnlyScale

  // Fit percentage shows how much of available screen height is being filled
  const fitPercentage = activeTab === 'layouts' ? layoutsFillPercent : previewFillPercent

  // Compute actual zoom scale to apply as a multiplier on top of the base scale
  // When fit: use 1 (base scale is already applied via currentScale in the container sizes)
  // When percentage: scale relative to fit (e.g., 50% means half of fit size)
  const zoomMultiplier = previewZoom === 'fit' ? 1 : previewZoom / 100

  // Load saved edit state when clip is available
  useEffect(() => {
    if (!clip || editDataLoaded) return
    
    setNewTitle(clip.title || '')
    
    // Load saved edit state if exists
    const editState = parseEditData(clip.edit_data)
    if (editState) {
      if (editState.aspectRatio) setAspectRatio(editState.aspectRatio as AspectRatio)
      if (editState.cropPosition) setCropPosition(editState.cropPosition)
      if (editState.overlays) setOverlays(editState.overlays as OverlayElement[])
      if (editState.zoomKeyframes) setZoomKeyframes(editState.zoomKeyframes as ZoomKeyframe[])
      if (editState.thumbs) setThumbs(editState.thumbs)
    }
    
    setEditDataLoaded(true)
  }, [clip, editDataLoaded])

  // Sync video volume
  useEffect(() => {
    if (!videoRef) return
    videoRef.muted = muted
    videoRef.volume = volume
  }, [videoRef, muted, volume])

  // Video metadata loaded
  useEffect(() => {
    if (!videoRef) return
    const onLoaded = () => {
      setDuration(videoRef.duration)
      setEndTime(videoRef.duration)
      setThumbs([0, videoRef.duration])
    }
    videoRef.addEventListener('loadedmetadata', onLoaded)
    return () => videoRef.removeEventListener('loadedmetadata', onLoaded)
  }, [videoRef])

  // Time update
  useEffect(() => {
    if (!videoRef) return
    const update = () => setCurrentTime(videoRef.currentTime)
    videoRef.addEventListener('timeupdate', update)
    return () => videoRef.removeEventListener('timeupdate', update)
  }, [videoRef])

  // Sync playing state
  useEffect(() => {
    if (!videoRef) return
    const sync = () => setPlaying(!videoRef.paused)
    videoRef.addEventListener('play', sync)
    videoRef.addEventListener('pause', sync)
    return () => {
      videoRef.removeEventListener('play', sync)
      videoRef.removeEventListener('pause', sync)
    }
  }, [videoRef])
  
  // Sync preview background video with main video
  useEffect(() => {
    if (!videoRef) return
    
    const syncPlayState = () => {
      const bgVideo = previewBgVideoRef.current
      if (!bgVideo) return
      
      if (!videoRef.paused && bgVideo.paused) {
        bgVideo.play().catch(() => {})
      } else if (videoRef.paused && !bgVideo.paused) {
        bgVideo.pause()
      }
    }
    
    const syncTime = () => {
      const bgVideo = previewBgVideoRef.current
      if (!bgVideo) return
      
      // Sync time if significantly different
      if (Math.abs(bgVideo.currentTime - videoRef.currentTime) > 0.5) {
        bgVideo.currentTime = videoRef.currentTime
      }
    }
    
    const syncSeek = () => {
      const bgVideo = previewBgVideoRef.current
      if (bgVideo) {
        bgVideo.currentTime = videoRef.currentTime
      }
    }
    
    videoRef.addEventListener('play', syncPlayState)
    videoRef.addEventListener('pause', syncPlayState)
    videoRef.addEventListener('seeked', syncSeek)
    videoRef.addEventListener('timeupdate', syncTime)
    
    return () => {
      videoRef.removeEventListener('play', syncPlayState)
      videoRef.removeEventListener('pause', syncPlayState)
      videoRef.removeEventListener('seeked', syncSeek)
      videoRef.removeEventListener('timeupdate', syncTime)
    }
  }, [videoRef])
  
  // Sync preview video when playing state changes
  useEffect(() => {
    const bgVideo = previewBgVideoRef.current
    if (!bgVideo || !videoRef) return
    
    // Sync time first
    bgVideo.currentTime = videoRef.currentTime
    
    // Then sync play state
    if (playing) {
      bgVideo.play().catch(() => {})
    } else {
      bgVideo.pause()
    }
  }, [playing, videoRef])

  // Calculate editor scale based on viewport size
  // editorScale determines the height of the video panels (height = scale * 360px)
  // Uses ResizeObserver to detect container size changes (e.g., when timeline expands with overlays)
  useEffect(() => {
    const calculateScale = () => {
      if (!editorContainerRef.current) return

      const container = editorContainerRef.current
      const availableWidth = container.clientWidth - 64 // padding
      const availableHeight = container.clientHeight - 92 // header + padding

      // Prevent calculation with invalid dimensions
      if (availableWidth <= 0 || availableHeight <= 0) return

      // At scale 1.0:
      // - Source video: 640x360 (16:9)
      // - Preview: 202.5x360 (9:16)
      // - Gap: 32px
      const baseSourceWidth = 640
      const basePreviewWidth = 202.5
      const baseGap = 32
      const baseHeight = 360

      // For layouts tab: fit source + preview + gap
      const layoutsTotalWidth = baseSourceWidth + basePreviewWidth + baseGap
      const layoutsScaleForWidth = availableWidth / layoutsTotalWidth
      const layoutsScaleForHeight = availableHeight / baseHeight
      // Use whichever constraint is tighter (min) to prevent overflow
      const layoutsFitScale = Math.min(layoutsScaleForWidth, layoutsScaleForHeight)
      setEditorScale(Math.max(0.3, layoutsFitScale))

      // Calculate what percentage of available height is being filled
      // If width-constrained: height used = layoutsFitScale * baseHeight
      // Fill percent = (height used / availableHeight) * 100
      const layoutsActualHeight = layoutsFitScale * baseHeight
      setLayoutsFillPercent(Math.round((layoutsActualHeight / availableHeight) * 100))

      // For other tabs: fit just preview
      const previewScaleForWidth = availableWidth / basePreviewWidth
      const previewScaleForHeight = availableHeight / baseHeight
      // Use whichever constraint is tighter (min) to prevent overflow
      const previewFitScale = Math.min(previewScaleForWidth, previewScaleForHeight)
      setPreviewOnlyScale(Math.max(0.3, previewFitScale))

      // Calculate fill percent for preview-only mode
      const previewActualHeight = previewFitScale * baseHeight
      setPreviewFillPercent(Math.round((previewActualHeight / availableHeight) * 100))
    }

    // Initial calculation with delay to ensure container is rendered
    const timer = setTimeout(calculateScale, 100)
    calculateScale()

    // Use ResizeObserver to detect container size changes
    // This handles: window resize, timeline height changes, sidebar changes, etc.
    const resizeObserver = new ResizeObserver(() => {
      // Debounce the calculation to avoid excessive updates
      requestAnimationFrame(calculateScale)
    })

    if (editorContainerRef.current) {
      resizeObserver.observe(editorContainerRef.current)
    }

    // Also listen for window resize as fallback
    window.addEventListener('resize', calculateScale)

    return () => {
      clearTimeout(timer)
      resizeObserver.disconnect()
      window.removeEventListener('resize', calculateScale)
    }
  }, [clip, loading])

  // Recalculate scale when overlays change (timeline might expand/contract)
  // This is a fallback in case ResizeObserver doesn't catch the change immediately
  useEffect(() => {
    if (!editorContainerRef.current) return

    // Small delay to let the timeline re-render first
    const timer = setTimeout(() => {
      if (!editorContainerRef.current) return

      const container = editorContainerRef.current
      const availableWidth = container.clientWidth - 64
      const availableHeight = container.clientHeight - 92

      if (availableWidth <= 0 || availableHeight <= 0) return

      const baseSourceWidth = 640
      const basePreviewWidth = 202.5
      const baseGap = 32
      const baseHeight = 360

      const layoutsTotalWidth = baseSourceWidth + basePreviewWidth + baseGap
      const layoutsScaleForWidth = availableWidth / layoutsTotalWidth
      const layoutsScaleForHeight = availableHeight / baseHeight
      const layoutsFitScale = Math.min(layoutsScaleForWidth, layoutsScaleForHeight)
      setEditorScale(Math.max(0.3, layoutsFitScale))

      const layoutsActualHeight = layoutsFitScale * baseHeight
      setLayoutsFillPercent(Math.round((layoutsActualHeight / availableHeight) * 100))

      const previewScaleForWidth = availableWidth / basePreviewWidth
      const previewScaleForHeight = availableHeight / baseHeight
      const previewFitScale = Math.min(previewScaleForWidth, previewScaleForHeight)
      setPreviewOnlyScale(Math.max(0.3, previewFitScale))

      const previewActualHeight = previewFitScale * baseHeight
      setPreviewFillPercent(Math.round((previewActualHeight / availableHeight) * 100))
    }, 50)

    return () => clearTimeout(timer)
  }, [overlays.length])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        handleRedo()
        return
      }

      if (e.key === ' ') {
        e.preventDefault()
        handlePlayPause()
      }
      if (e.key === 'Delete' && selectedOverlayId) {
        pushToUndoStack()
        setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId))
        setSelectedOverlayId(null)
      }
      if (e.key === 'Escape') {
        setSelectedOverlayId(null)
        setSelectedCropId(null)
      }
      // Arrow keys for frame stepping
      if (e.key === 'ArrowLeft' && videoRef) {
        videoRef.currentTime = Math.max(0, videoRef.currentTime - (e.shiftKey ? 1 : 0.1))
      }
      if (e.key === 'ArrowRight' && videoRef) {
        videoRef.currentTime = Math.min(duration, videoRef.currentTime + (e.shiftKey ? 1 : 0.1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedOverlayId, videoRef, duration, handleUndo, handleRedo, pushToUndoStack])

  // Overlay drag handlers
  const handleOverlayMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    overlayId: string,
    type: 'move' | 'resize' | 'resize-tr' | 'resize-bl' | 'resize-tl'
  ) => {
    setDragOverlayId(overlayId)
    setDragType(type)
    setDragStart({ x: e.clientX, y: e.clientY })
    const overlay = overlays.find(el => el.id === overlayId)
    setDragStartOverlay(overlay || null)
    setSelectedOverlayId(overlayId)
    e.stopPropagation()
  }

  // Global mouse event handling for overlay dragging
  useEffect(() => {
    const handleGlobalOverlayMouseMove = (e: MouseEvent) => {
      if (!dragOverlayId || !dragType || !dragStartOverlay) return

      // Use preview container when source video is hidden, otherwise use source video container
      const containerRef = activeTab === 'layouts' ? videoContainerRef : previewContainerRef
      if (!containerRef.current) return

      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      const videoRect = containerRef.current.getBoundingClientRect()
      let updated: OverlayElement | null = null

      // Convert pixel delta to percentage
      const dxPercent = (dx / videoRect.width) * 100
      const dyPercent = (dy / videoRect.height) * 100

      if (dragType === 'move') {
        // Allow elements to clip off screen (no constraints)
        const newLeft = dragStartOverlay.videoLeft + dxPercent
        const newTop = dragStartOverlay.videoTop + dyPercent
        updated = { ...dragStartOverlay, videoLeft: newLeft, videoTop: newTop }
      } else if (dragType === 'resize' || dragType === 'resize-tr' || dragType === 'resize-bl' || dragType === 'resize-tl') {
        // Fixed aspect ratio resize
        const aspectRatio = dragStartOverlay.aspectRatio || (dragStartOverlay.videoWidth / dragStartOverlay.videoHeight)

        let newWidth: number
        let newHeight: number
        let newLeft = dragStartOverlay.videoLeft
        let newTop = dragStartOverlay.videoTop

        if (dragType === 'resize') {
          // Bottom-right: width and height grow
          newWidth = Math.max(5, dragStartOverlay.videoWidth + dxPercent)
          newHeight = newWidth / aspectRatio
        } else if (dragType === 'resize-tr') {
          // Top-right: width grows right, top moves up as height increases
          newWidth = Math.max(5, dragStartOverlay.videoWidth + dxPercent)
          newHeight = newWidth / aspectRatio
          newTop = dragStartOverlay.videoTop + dragStartOverlay.videoHeight - newHeight
        } else if (dragType === 'resize-bl') {
          // Bottom-left: width grows left
          newWidth = Math.max(5, dragStartOverlay.videoWidth - dxPercent)
          newHeight = newWidth / aspectRatio
          newLeft = dragStartOverlay.videoLeft + dragStartOverlay.videoWidth - newWidth
        } else {
          // Top-left: both shrink toward bottom-right
          newWidth = Math.max(5, dragStartOverlay.videoWidth - dxPercent)
          newHeight = newWidth / aspectRatio
          newLeft = dragStartOverlay.videoLeft + dragStartOverlay.videoWidth - newWidth
          newTop = dragStartOverlay.videoTop + dragStartOverlay.videoHeight - newHeight
        }

        // Allow elements to clip off screen (no constraints on position/size)
        updated = { ...dragStartOverlay, videoLeft: newLeft, videoTop: newTop, videoWidth: newWidth, videoHeight: newHeight }
      }

      if (updated) {
        setOverlays(prev => prev.map(el => el.id === dragOverlayId ? updated! : el))
      }
    }

    const handleGlobalOverlayMouseUp = () => {
      if (dragOverlayId) {
        setDragOverlayId(null)
        setDragType(null)
        setDragStartOverlay(null)
      }
    }

    if (dragOverlayId) {
      document.addEventListener('mousemove', handleGlobalOverlayMouseMove)
      document.addEventListener('mouseup', handleGlobalOverlayMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalOverlayMouseMove)
      document.removeEventListener('mouseup', handleGlobalOverlayMouseUp)
    }
  }, [dragOverlayId, dragType, dragStart, dragStartOverlay, activeTab])

  // Crop region handlers (main video only - preview handled by usePreviewCropDrag hook)
  const handleCropMouseDown = (
    e: React.MouseEvent,
    cropId: string,
    type: 'move' | 'resize-br' | 'resize-bl' | 'resize-tr' | 'resize-tl'
  ) => {
    e.stopPropagation()
    setDragCropId(cropId)
    setCropDragType(type)
    setCropDragStart({ x: e.clientX, y: e.clientY })
    const crop = cropRegions.find(c => c.id === cropId)
    setCropDragStartRegion(crop || null)
    setSelectedCropId(cropId)
    // Deselect any selected overlay for single selection
    setSelectedOverlayId(null)
  }

  const handleCropMouseUp = () => {
    setDragCropId(null)
    setCropDragType(null)
    setCropDragStartRegion(null)
  }

  // Global mouse event handling for MAIN VIDEO crop dragging only
  // Preview crop dragging is now handled by usePreviewCropDrag hook
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!dragCropId || !cropDragType || !cropDragStartRegion) return
      
      // Handle main video crop dragging
      if (!mainVideoContainerRef.current) return
      const rect = mainVideoContainerRef.current.getBoundingClientRect()
      const dx = ((e.clientX - cropDragStart.x) / rect.width) * 100
      const dy = ((e.clientY - cropDragStart.y) / rect.height) * 100

      const updated = { ...cropDragStartRegion }
      
      // Get aspect ratio constraint relative to 16:9 container
      // Final aspect = (width% / height%) * (16/9)
      const getRelativeAspect = (aspectRatio?: string) => {
        if (!aspectRatio || aspectRatio === 'freeform') return null
        if (aspectRatio === 'fullscreen') return (9/16) / (16/9)  // 0.316 - tall
        if (aspectRatio === '16:9') return 1.0  // same as container
        if (aspectRatio === '4:3') return (4/3) / (16/9)  // 0.75
        if (aspectRatio === 'square' || aspectRatio === 'circle') return 9/16  // 0.5625
        return null
      }
      
      const relativeAspect = getRelativeAspect(cropDragStartRegion.aspectRatio)

      if (cropDragType === 'move') {
        updated.x = Math.max(0, Math.min(100 - updated.width, cropDragStartRegion.x + dx))
        updated.y = Math.max(0, Math.min(100 - updated.height, cropDragStartRegion.y + dy))
      } else if (cropDragType === 'resize-br') {
        if (relativeAspect) {
          // Maintain aspect ratio: height = width / relativeAspect
          const newWidth = Math.max(3, Math.min(100 - updated.x, cropDragStartRegion.width + dx))
          updated.width = newWidth
          updated.height = Math.max(3, Math.min(100 - updated.y, newWidth / relativeAspect))
        } else {
          updated.width = Math.max(3, Math.min(100 - updated.x, cropDragStartRegion.width + dx))
          updated.height = Math.max(3, Math.min(100 - updated.y, cropDragStartRegion.height + dy))
        }
      } else if (cropDragType === 'resize-bl') {
        const newX = cropDragStartRegion.x + dx
        const newWidth = cropDragStartRegion.width - dx
        if (newX >= 0 && newWidth >= 3) {
          updated.x = newX
          updated.width = newWidth
        }
        if (relativeAspect) {
          // Maintain aspect ratio: height = width / relativeAspect
          updated.height = Math.max(3, Math.min(100 - updated.y, updated.width / relativeAspect))
        } else {
          updated.height = Math.max(3, Math.min(100 - updated.y, cropDragStartRegion.height + dy))
        }
      } else if (cropDragType === 'resize-tr') {
        if (relativeAspect) {
          // Maintain aspect ratio: height = width / relativeAspect
          const newWidth = Math.max(3, Math.min(100 - updated.x, cropDragStartRegion.width + dx))
          updated.width = newWidth
          const newHeight = newWidth / relativeAspect
          const newY = cropDragStartRegion.y + cropDragStartRegion.height - newHeight
          if (newY >= 0 && newHeight >= 3) {
            updated.y = newY
            updated.height = newHeight
          }
        } else {
          updated.width = Math.max(3, Math.min(100 - updated.x, cropDragStartRegion.width + dx))
          const newY = cropDragStartRegion.y + dy
          const newHeight = cropDragStartRegion.height - dy
          if (newY >= 0 && newHeight >= 3) {
            updated.y = newY
            updated.height = newHeight
          }
        }
      } else if (cropDragType === 'resize-tl') {
        if (relativeAspect) {
          // Maintain aspect ratio: height = width / relativeAspect
          const newWidth = cropDragStartRegion.width - dx
          const newHeight = newWidth / relativeAspect
          const newX = cropDragStartRegion.x + cropDragStartRegion.width - newWidth
          const newY = cropDragStartRegion.y + cropDragStartRegion.height - newHeight
          if (newX >= 0 && newWidth >= 3 && newY >= 0 && newHeight >= 3) {
            updated.x = newX
            updated.width = newWidth
            updated.y = newY
            updated.height = newHeight
          }
        } else {
          const newX = cropDragStartRegion.x + dx
          const newWidth = cropDragStartRegion.width - dx
          const newY = cropDragStartRegion.y + dy
          const newHeight = cropDragStartRegion.height - dy
          if (newX >= 0 && newWidth >= 3) {
            updated.x = newX
            updated.width = newWidth
          }
          if (newY >= 0 && newHeight >= 3) {
            updated.y = newY
            updated.height = newHeight
          }
        }
      }

      // Apply snapping if enabled - ONLY during move operations (not resize)
      if (snappingEnabled && cropDragType === 'move') {
        const snapThreshold = 3 // pixels equivalent in percentage
        const otherCrops = cropRegions.filter(c => c.id !== dragCropId)
        
        // Snap edges to container edges (0 and 100)
        if (updated.x < snapThreshold) updated.x = 0
        if (updated.y < snapThreshold) updated.y = 0
        if (100 - (updated.x + updated.width) < snapThreshold) {
          updated.x = 100 - updated.width
        }
        if (100 - (updated.y + updated.height) < snapThreshold) {
          updated.y = 100 - updated.height
        }
        
        // Snap to center lines and show visual indicators
        const centerX = updated.x + updated.width / 2
        const centerY = updated.y + updated.height / 2
        let snappedToXCenter = false
        let snappedToYCenter = false
        
        if (Math.abs(centerX - 50) < snapThreshold) {
          updated.x = 50 - updated.width / 2
          snappedToXCenter = true
        }
        if (Math.abs(centerY - 50) < snapThreshold) {
          updated.y = 50 - updated.height / 2
          snappedToYCenter = true
        }
        
        setShowMainCenterXLine(snappedToXCenter)
        setShowMainCenterYLine(snappedToYCenter)
        
        // Snap to other crops
        for (const other of otherCrops) {
          const otherRight = other.x + other.width
          const otherBottom = other.y + other.height
          const updatedRight = updated.x + updated.width
          const updatedBottom = updated.y + updated.height
          
          // Snap left edge to other's left or right edge
          if (Math.abs(updated.x - other.x) < snapThreshold) updated.x = other.x
          if (Math.abs(updated.x - otherRight) < snapThreshold) updated.x = otherRight
          
          // Snap right edge to other's left or right edge
          if (Math.abs(updatedRight - other.x) < snapThreshold) {
            updated.x = other.x - updated.width
          }
          if (Math.abs(updatedRight - otherRight) < snapThreshold) {
            updated.x = otherRight - updated.width
          }
          
          // Snap top edge to other's top or bottom edge
          if (Math.abs(updated.y - other.y) < snapThreshold) updated.y = other.y
          if (Math.abs(updated.y - otherBottom) < snapThreshold) updated.y = otherBottom
          
          // Snap bottom edge to other's top or bottom edge
          if (Math.abs(updatedBottom - other.y) < snapThreshold) {
            updated.y = other.y - updated.height
          }
          if (Math.abs(updatedBottom - otherBottom) < snapThreshold) {
            updated.y = otherBottom - updated.height
          }
          
          // Snap centers to align
          const otherCenterX = other.x + other.width / 2
          const otherCenterY = other.y + other.height / 2
          if (Math.abs(centerX - otherCenterX) < snapThreshold) {
            updated.x = otherCenterX - updated.width / 2
          }
          if (Math.abs(centerY - otherCenterY) < snapThreshold) {
            updated.y = otherCenterY - updated.height / 2
          }
        }
        
        // Ensure we stay in bounds after snapping
        updated.x = Math.max(0, Math.min(100 - updated.width, updated.x))
        updated.y = Math.max(0, Math.min(100 - updated.height, updated.y))
      } else {
        // Reset center line indicators when not moving in main video
        setShowMainCenterXLine(false)
        setShowMainCenterYLine(false)
      }

      // After source crop resize, constrain preview to fit within container
      // When source aspect ratio changes, preview height (derived from width/aspectRatio) may exceed bounds
      if (cropDragType && cropDragType.startsWith('resize-')) {
        const refVideoW = 160
        const refVideoH = 90
        const cropW = (updated.width / 100) * refVideoW
        const cropH = (updated.height / 100) * refVideoH
        const newAspectRatio = cropW / cropH
        
        // Preview container uses 9:16 aspect ratio
        // Use a reference container of 202.5x360 for percentage calculations
        const containerWidth = 202.5
        const containerHeight = 360
        
        // First, ensure previewX + previewWidth doesn't exceed 100%
        if (updated.previewX + updated.previewWidth > 100) {
          updated.previewWidth = Math.max(15, 100 - updated.previewX)
        }
        
        // Calculate current preview height with new aspect ratio
        const previewWidthPx = (updated.previewWidth / 100) * containerWidth
        const previewHeightPx = previewWidthPx / newAspectRatio
        const previewHeightPercent = (previewHeightPx / containerHeight) * 100
        
        // If preview would exceed container bottom, reduce previewWidth to fit
        if (updated.previewY + previewHeightPercent > 100) {
          const maxHeightPercent = Math.max(15, 100 - updated.previewY)
          const maxHeightPx = (maxHeightPercent / 100) * containerHeight
          const maxWidthPx = maxHeightPx * newAspectRatio
          updated.previewWidth = Math.max(15, (maxWidthPx / containerWidth) * 100)
        }
        
        // Also ensure previewWidth doesn't exceed 100%
        if (updated.previewWidth > 100) {
          updated.previewWidth = 100
        }
        
        // Ensure previewX doesn't go negative
        if (updated.previewX < 0) {
          updated.previewX = 0
        }
        
        // Ensure previewY doesn't go negative
        if (updated.previewY < 0) {
          updated.previewY = 0
        }
      }

      setCropRegions(prev => prev.map(c => c.id === dragCropId ? updated : c))
    }

    const handleGlobalMouseUp = () => {
      if (dragCropId) {
        setDragCropId(null)
        setCropDragType(null)
        setCropDragStartRegion(null)
        // Clear main video center line indicators when drag ends
        setShowMainCenterXLine(false)
        setShowMainCenterYLine(false)
      }
    }

    if (dragCropId) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [dragCropId, cropDragType, cropDragStart, cropDragStartRegion, snappingEnabled])

  const handleAddCrop = () => {
    pushToUndoStack()
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    
    // Calculate next available preview position using actual aspect ratios
    // Source video is 16:9, use reference dimensions
    const refVideoW = 160
    const refVideoH = 90
    
    const existingHeightTotal = cropRegions.reduce((sum, c) => {
      // Calculate actual aspect ratio from source crop in video space
      const cropW = (c.width / 100) * refVideoW
      const cropH = (c.height / 100) * refVideoH
      const aspectRatio = cropW / cropH
      
      // Height in percentage = width / aspect ratio (in pixel space), then convert
      // For simplicity in percentages: previewHeight% = previewWidth% / aspectRatio
      const previewHeightPercent = c.previewWidth / aspectRatio
      return sum + previewHeightPercent
    }, 0)
    
    // If no space left, overlap at the bottom or reduce size
    const newPreviewY = Math.min(existingHeightTotal, 80) // Cap at 80% to ensure visibility
    
    // Z-index is based on current count of crops
    const newZIndex = cropRegions.length + 1
    
    // New crop will be 50% wide on source (right half), full height
    // Aspect ratio: (50% * 160) / (100% * 90) = 80/90 = 0.889
    const newCrop: CropRegion = {
      id: `crop-${Date.now()}`,
      name: 'New Crop',
      x: 50,
      y: 0,
      width: 50,
      height: 100,
      color: colors[cropRegions.length % colors.length],
      previewX: 0,
      previewY: newPreviewY,
      previewWidth: 100, // Take full width in preview
      aspectRatio: 'freeform',
      cornerRounding: 0,
      zIndex: newZIndex,
    }
    
    setCropRegions(prev => [...prev, newCrop])
    setSelectedCropId(newCrop.id)
  }

  const handleDeleteCrop = (cropId: string) => {
    if (cropRegions.length <= 1) return // Keep at least one crop
    
    pushToUndoStack()
    const deletedCrop = cropRegions.find(c => c.id === cropId)
    if (!deletedCrop) return
    
    const deletedZ = deletedCrop.zIndex || 1
    
    // Remove crop and adjust z-indexes
    setCropRegions(prev => 
      prev
        .filter(c => c.id !== cropId)
        .map(c => {
          // Decrease z-index for crops that were above the deleted one
          if ((c.zIndex || 1) > deletedZ) {
            return { ...c, zIndex: (c.zIndex || 1) - 1 }
          }
          return c
        })
    )
    
    if (selectedCropId === cropId) {
      setSelectedCropId(cropRegions[0]?.id || null)
    }
  }

  const handleCropAspectRatioChange = (cropId: string, ratio: 'freeform' | 'fullscreen' | '16:9' | '4:3' | 'square' | 'circle') => {
    setCropRegions(prev => prev.map(c => {
      if (c.id !== cropId) return c
      
      const updated = { ...c, aspectRatio: ratio }
      
      // Source video is 16:9, so percentages are relative to that
      // To get final aspect ratio: (width% / height%) * (16/9)
      // Solving for height%: height% = (width% * 16/9) / targetAspect
      
      if (ratio === 'fullscreen') {
        // Target 9:16 aspect ratio
        // (width% / height%) * (16/9) = 9/16
        // width% / height% = (9/16) / (16/9) = 81/256
        const relativeAspect = (9/16) / (16/9)  // 0.316
        const currentRelative = c.width / c.height
        if (currentRelative > relativeAspect) {
          updated.width = c.height * relativeAspect
        } else {
          updated.height = c.width / relativeAspect
        }
      } else if (ratio === '16:9') {
        // Target 16:9 aspect ratio (same as container)
        // (width% / height%) * (16/9) = 16/9
        // width% / height% = 1
        const relativeAspect = 1.0
        const currentRelative = c.width / c.height
        if (currentRelative > relativeAspect) {
          updated.width = c.height * relativeAspect
        } else {
          updated.height = c.width / relativeAspect
        }
      } else if (ratio === '4:3') {
        // Target 4:3 aspect ratio
        // (width% / height%) * (16/9) = 4/3
        // width% / height% = (4/3) / (16/9) = 0.75
        const relativeAspect = (4/3) / (16/9)  // 0.75
        const currentRelative = c.width / c.height
        if (currentRelative > relativeAspect) {
          updated.width = c.height * relativeAspect
        } else {
          updated.height = c.width / relativeAspect
        }
      } else if (ratio === 'square' || ratio === 'circle') {
        // Target 1:1 aspect ratio
        // (width% / height%) * (16/9) = 1
        // width% / height% = 9/16
        const relativeAspect = 9/16  // 0.5625
        const currentRelative = c.width / c.height
        if (currentRelative > relativeAspect) {
          updated.width = c.height * relativeAspect
        } else {
          updated.height = c.width / relativeAspect
        }
        
        // Circle sets rounding to 50 (100% on slider, which maps to 50% actual)
        if (ratio === 'circle') {
          updated.cornerRounding = 50
        }
      }
      
      // Ensure crop stays within source video bounds after resizing
      if (updated.x + updated.width > 100) {
        updated.x = 100 - updated.width
      }
      if (updated.y + updated.height > 100) {
        updated.y = 100 - updated.height
      }
      
      // Constrain preview slot to fit within preview container after aspect ratio change
      const refVideoW = 160
      const refVideoH = 90
      const cropW = (updated.width / 100) * refVideoW
      const cropH = (updated.height / 100) * refVideoH
      const newAspectRatio = cropW / cropH
      
      // Reference preview container dimensions (9:16 aspect)
      const containerWidth = 202.5
      const containerHeight = 360
      
      // Calculate preview height with new aspect ratio
      let previewWidthPx = (updated.previewWidth / 100) * containerWidth
      let previewHeightPx = previewWidthPx / newAspectRatio
      let previewHeightPercent = (previewHeightPx / containerHeight) * 100
      
      // If preview exceeds width bounds, constrain
      if (updated.previewX + updated.previewWidth > 100) {
        updated.previewWidth = Math.max(15, 100 - updated.previewX)
      }
      
      // Recalculate height after width adjustment
      previewWidthPx = (updated.previewWidth / 100) * containerWidth
      previewHeightPx = previewWidthPx / newAspectRatio
      previewHeightPercent = (previewHeightPx / containerHeight) * 100
      
      // If preview exceeds height bounds, reduce width to fit
      if (updated.previewY + previewHeightPercent > 100) {
        const maxHeightPercent = Math.max(15, 100 - updated.previewY)
        const maxHeightPx = (maxHeightPercent / 100) * containerHeight
        const maxWidthPx = maxHeightPx * newAspectRatio
        updated.previewWidth = Math.max(15, (maxWidthPx / containerWidth) * 100)
      }
      
      return updated
    }))
  }

  const handleCropCornerRoundingChange = (cropId: string, value: number) => {
    // Map slider value (0-100) to actual border-radius (0-50)
    const actualRounding = value * 0.5
    setCropRegions(prev => prev.map(c => 
      c.id === cropId ? { ...c, cornerRounding: actualRounding } : c
    ))
  }

  const handleBringCropToFront = (cropId: string) => {
    setCropRegions(prev => {
      const crop = prev.find(c => c.id === cropId)
      if (!crop) return prev
      
      const currentZ = crop.zIndex || 1
      const maxZ = prev.length
      
      // Already at the front, do nothing
      if (currentZ === maxZ) return prev
      
      // Move crops between currentZ and maxZ down by 1, set selected to maxZ
      return prev.map(c => {
        if (c.id === cropId) {
          return { ...c, zIndex: maxZ }
        } else if ((c.zIndex || 1) > currentZ) {
          return { ...c, zIndex: (c.zIndex || 1) - 1 }
        }
        return c
      })
    })
  }

  const handleDuplicateCrop = (cropId: string) => {
    const crop = cropRegions.find(c => c.id === cropId)
    if (!crop) return
    
    pushToUndoStack()
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    
    // Z-index is based on current count of crops
    const newZIndex = cropRegions.length + 1
    
    const newCrop: CropRegion = {
      ...crop,
      id: `crop-${Date.now()}`,
      name: `${crop.name} Copy`,
      color: colors[cropRegions.length % colors.length], // Cycle through colors
      zIndex: newZIndex,
      // Offset slightly for visibility in source video
      x: Math.min(crop.x + 5, 95),
      y: Math.min(crop.y + 5, 95),
      // Offset in preview as well
      previewX: Math.min(crop.previewX + 5, 95),
      previewY: Math.min(crop.previewY + 5, 95),
    }
    setCropRegions(prev => [...prev, newCrop])
    setSelectedCropId(newCrop.id)
  }

  // Video controls
  const handlePlayPause = () => {
    if (!videoRef) return
    if (videoRef.paused) {
      videoRef.play()
    } else {
      videoRef.pause()
    }
  }

  const handleSeek = (time: number) => {
    if (videoRef) {
      videoRef.currentTime = time
    }
  }

  const handleToggleMute = () => {
    setMuted(m => !m)
  }

  const handleChangeVolume = (newVolume: number) => {
    setVolume(newVolume)
    setMuted(newVolume === 0)
  }

  // Overlay management
  const handleAddOverlay = (overlay: Partial<OverlayElement>) => {
    const barWidth = 600 // Default timeline width
    const st = overlay.startTime ?? currentTime
    const et = overlay.endTime ?? Math.min(duration, st + 3)

    // Calculate default sizes based on element type
    // Preview is 9:16 aspect ratio (202.5 x 360 at scale 1)
    // Values are in percentages
    let defaultWidth = 50  // 50% of container width
    let defaultHeight = 15 // 15% of container height
    let defaultLeft = 25   // Center horizontally: (100 - 50) / 2
    let defaultTop = 40    // Near center vertically

    // Adjust defaults based on element type
    if (overlay.type === 'image' || overlay.type === 'social-sticker') {
      // Images/stickers: square-ish, smaller
      defaultWidth = 40
      defaultHeight = 20
      defaultLeft = 30
      defaultTop = 40
    } else if (overlay.type === 'text' || overlay.type === 'caption') {
      // Text: wider, shorter
      defaultWidth = 80
      defaultHeight = 12
      defaultLeft = 10
      defaultTop = 75 // Near bottom for captions
    }

    const newOverlay: OverlayElement = {
      id: `overlay-${Date.now()}`,
      type: 'text',
      videoLeft: defaultLeft,
      videoTop: defaultTop,
      videoWidth: defaultWidth,
      videoHeight: defaultHeight,
      timelineLeft: timeToPosition(st, duration, barWidth),
      timelineTop: 0,
      timelineWidth: durationToWidth(et - st, duration, barWidth),
      timelineHeight: 36,
      startTime: st,
      endTime: et,
      row: 0,
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'transparent',
      ...overlay,
    } as OverlayElement

    // Ensure the overlay fits within the container
    if (newOverlay.videoLeft + newOverlay.videoWidth > 100) {
      newOverlay.videoWidth = 100 - newOverlay.videoLeft
    }
    if (newOverlay.videoTop + newOverlay.videoHeight > 100) {
      newOverlay.videoHeight = 100 - newOverlay.videoTop
    }

    newOverlay.row = findAvailableRow(overlays, { startTime: st, endTime: et, id: newOverlay.id })
    setOverlays(prev => [...prev, newOverlay])
    setSelectedOverlayId(newOverlay.id)
  }

  const handleUpdateOverlay = (id: string, updates: Partial<OverlayElement>) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
  }

  const handleDeleteOverlay = (id: string) => {
    setOverlays(prev => prev.filter(o => o.id !== id))
    if (selectedOverlayId === id) setSelectedOverlayId(null)
  }

  const handleDuplicateOverlay = (overlay: OverlayElement) => {
    const newOverlay = {
      ...overlay,
      id: `overlay-${Date.now()}`,
      startTime: overlay.startTime + 0.5,
      endTime: overlay.endTime + 0.5,
      videoLeft: overlay.videoLeft + 20,
      videoTop: overlay.videoTop + 20,
    }
    newOverlay.row = findAvailableRow(overlays, { startTime: newOverlay.startTime, endTime: newOverlay.endTime, id: newOverlay.id })
    setOverlays(prev => [...prev, newOverlay])
    setSelectedOverlayId(newOverlay.id)
  }

  const handleAddCaptionOverlay = (caption: CaptionSegment, style: CaptionStyle) => {
    handleAddOverlay({
      type: 'caption',
      content: caption.text,
      startTime: caption.startTime,
      endTime: caption.endTime,
      videoLeft: 20,
      videoTop: 280,
      videoWidth: 320,
      videoHeight: 50,
      fontSize: style.fontSize,
      fontFamily: style.fontFamily,
      fontWeight: style.fontWeight,
      color: style.color,
      backgroundColor: style.backgroundColor,
      textShadow: style.textShadow,
      borderRadius: style.borderRadius,
      textAlign: 'center',
    })
  }

  // Save handler (silent auto-save)
  const handleSave = useCallback(async () => {
    if (!clip || saving) return
    setSaving(true)

    const editData = JSON.stringify({
      aspectRatio,
      cropPosition,
      cropRegions,
      overlays,
      startTime,
      endTime,
      thumbs,
      zoomKeyframes,
    })

    await supabase
      .from('clips')
      .update({ title: newTitle, edited: true, edit_data: editData })
      .eq('id', clip.id)

    setSaving(false)
  }, [clip, saving, aspectRatio, cropPosition, cropRegions, overlays, startTime, endTime, thumbs, zoomKeyframes, newTitle])
  
  // Auto-save when relevant state changes (debounced)
  useEffect(() => {
    if (!clip || !editDataLoaded) return
    
    const timeoutId = setTimeout(() => {
      handleSave()
    }, 2000) // Save 2 seconds after last change
    
    return () => clearTimeout(timeoutId)
  }, [aspectRatio, cropPosition, cropRegions, overlays, startTime, endTime, thumbs, zoomKeyframes, newTitle, clip, editDataLoaded])

  // Export handler
  const handleExport = async () => {
    // TODO: Implement actual export with FFmpeg backend
    alert('Export functionality coming soon! This will be processed on the server using FFmpeg.')
  }

  // Calculate current zoom based on keyframes
  const getCurrentZoom = useCallback(() => {
    if (zoomKeyframes.length === 0) return { scale: 1, x: 50, y: 50 }

    // Group keyframes by segmentId
    const segmentGroups = new Map<string, typeof zoomKeyframes>()
    for (const kf of zoomKeyframes) {
      const segId = kf.segmentId || kf.id
      if (!segmentGroups.has(segId)) {
        segmentGroups.set(segId, [])
      }
      segmentGroups.get(segId)!.push(kf)
    }

    // Find the segment that contains the current time
    for (const [, segmentKeyframes] of segmentGroups) {
      if (segmentKeyframes.length < 2) continue

      const sorted = [...segmentKeyframes].sort((a, b) => a.time - b.time)
      const startKf = sorted[0]
      const endKf = sorted[sorted.length - 1]

      // Check if current time is within this segment's time range
      if (currentTime >= startKf.time && currentTime <= endKf.time) {
        // Use constant zoom values from the start keyframe throughout the segment
        // (no interpolation - zoom stays the same for the entire duration)
        return {
          scale: startKf.scale,
          x: startKf.x,
          y: startKf.y,
        }
      }
    }

    // No active zoom at current time
    return { scale: 1, x: 50, y: 50 }
  }, [zoomKeyframes, currentTime])

  const currentZoom = getCurrentZoom()

  // Handle zoom segment timing updates from timeline dragging
  const handleUpdateZoomTiming = useCallback((segmentId: string, newStartTime: number, newEndTime: number) => {
    // Find all keyframes belonging to this segment
    const segmentKeyframes = zoomKeyframes.filter(kf =>
      kf.segmentId === segmentId || kf.id === segmentId
    )

    if (segmentKeyframes.length < 2) return

    const sorted = [...segmentKeyframes].sort((a, b) => a.time - b.time)
    const startKeyframe = sorted[0]
    const endKeyframe = sorted[sorted.length - 1]

    // Update the keyframes with new times
    setZoomKeyframes(prev => prev.map(kf => {
      if (kf.id === startKeyframe.id) {
        return { ...kf, time: newStartTime }
      }
      if (kf.id === endKeyframe.id) {
        return { ...kf, time: newEndTime }
      }
      return kf
    }))
  }, [zoomKeyframes])

  // Handle zoom segment deletion
  const handleDeleteZoom = useCallback((segmentId: string) => {
    // Remove all keyframes belonging to this segment
    setZoomKeyframes(prev => prev.filter(kf =>
      kf.segmentId !== segmentId && kf.id !== segmentId
    ))
    setSelectedZoomId(null)
    // Return to effects menu by closing the zoom panel
    setRequestZoomPanelClose(true)
  }, [])

  // Visual effect handlers
  const handleAddVisualEffect = useCallback((effectType: VisualEffectType) => {
    const newEffect: VisualEffect = {
      id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: effectType,
      startTime: currentTime,
      endTime: Math.min(currentTime + 1, duration), // 1 second default duration
    }
    setVisualEffects(prev => [...prev, newEffect])
    setSelectedEffectId(newEffect.id)
  }, [currentTime, duration])

  const handleUpdateVisualEffectTiming = useCallback((effectId: string, newStartTime: number, newEndTime: number) => {
    setVisualEffects(prev => prev.map(effect =>
      effect.id === effectId
        ? { ...effect, startTime: newStartTime, endTime: newEndTime }
        : effect
    ))
  }, [])

  const handleDeleteVisualEffect = useCallback((effectId: string) => {
    setVisualEffects(prev => prev.filter(effect => effect.id !== effectId))
    setSelectedEffectId(null)
  }, [])

  // Audio track handlers
  const handleAddAudioTrack = useCallback((track: AudioTrack) => {
    setAudioTracks(prev => [...prev, track])
    setSelectedAudioId(track.id)
    // Switch to audio tab to show the properties
    setActiveTab('audio')
  }, [])

  const handleUpdateAudioTrack = useCallback((updatedTrack: AudioTrack) => {
    setAudioTracks(prev => prev.map(t =>
      t.id === updatedTrack.id ? updatedTrack : t
    ))
  }, [])

  const handleUpdateAudioTiming = useCallback((audioId: string, newStartTime: number, newEndTime: number) => {
    setAudioTracks(prev => prev.map(track => {
      if (track.id === audioId) {
        // Calculate new duration based on timing change
        const newDuration = newEndTime - newStartTime
        return {
          ...track,
          startTime: newStartTime,
          // Adjust trimEnd if duration changed
          trimEnd: Math.max(0, track.duration - track.trimStart - newDuration),
        }
      }
      return track
    }))
  }, [])

  const handleDeleteAudio = useCallback((audioId: string) => {
    setAudioTracks(prev => prev.filter(t => t.id !== audioId))
    setSelectedAudioId(null)
  }, [])

  const handleTrimAudio = useCallback((trimStart: number, trimEnd: number) => {
    if (!trimModalTrack) return
    setAudioTracks(prev => prev.map(t =>
      t.id === trimModalTrack.id
        ? { ...t, trimStart, trimEnd }
        : t
    ))
    setTrimModalTrack(null)
  }, [trimModalTrack])

  // Get selected audio track
  const selectedAudioTrack = audioTracks.find(t => t.id === selectedAudioId) || null

  // Get selected overlay
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId) || null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading editor...</p>
        </div>
      </div>
    )
  }

  if (!clip) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Clip not found</p>
          <Button onClick={() => router.push('/dashboard/clips')}>Back to Clips</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0a0a14] text-white overflow-hidden">
      {/* Left Sidebar - Icon Navigation (StreamLadder style) */}
      <div className="w-16 bg-[#12121f] border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <button
          onClick={() => router.push('/')}
          className="h-14 flex items-center justify-center border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
        >
          <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            CF
          </span>
        </button>
        
        {/* Navigation Items */}
        <div className="flex-1 py-2">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                // If clicking on Elements tab while already on it, deselect current element to go back to main view
                if (item.id === 'elements' && activeTab === 'elements' && selectedOverlayId) {
                  setSelectedOverlayId(null)
                } else {
                  setActiveTab(item.id)
                  setIsSidebarCollapsed(false)
                }
              }}
              className={`w-full py-3 px-2 flex flex-col items-center gap-1 transition-all ${
                activeTab === item.id
                  ? 'text-purple-400 bg-purple-500/10 border-l-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border-l-2 border-transparent'
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Left Panel - Tool Content */}
      {!isSidebarCollapsed && (
        <div className="w-[320px] bg-[#12121f] border-r border-gray-800 flex flex-col">
          {/* Panel Header */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-gray-800">
          <div>
            <h2 className="text-sm font-semibold capitalize">{activeTab}</h2>
            <p className="text-xs text-gray-500">
              {activeTab === 'layouts' && 'Choose your layout'}
              {activeTab === 'elements' && 'Add elements to increase engagement'}
              {activeTab === 'effects' && 'Add effects to enhance your clip'}
              {activeTab === 'audio' && 'Add cool sound effects'}
              {activeTab === 'captions' && 'Edit your captions'}
              {activeTab === 'export' && 'Select your quality'}
            </p>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            title="Collapse sidebar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto">
          {activeTab === 'layouts' && (
            <LayoutTemplates
              selectedLayoutId={selectedLayout?.id}
              selectedTemplateId={selectedTemplateId || undefined}
              onSelectLayout={(layout, templateId) => {
                pushToUndoStack()
                setSelectedLayout(layout)
                setSelectedTemplateId(templateId || null)
              }}
              aspectRatio={aspectRatio}
              onChangeAspectRatio={setAspectRatio}
              cropRegions={cropRegions}
              onApplyTemplate={(template) => {
                pushToUndoStack()
                if (template.cropRegions && template.cropRegions.length > 0) {
                  setCropRegions(template.cropRegions)
                }
              }}
            />
          )}
          {activeTab === 'elements' && (
            <ElementsPanel
              onAddElement={handleAddOverlay}
              onUpdateElement={handleUpdateOverlay}
              selectedElement={selectedOverlay}
              currentTime={currentTime}
              duration={duration}
              userId={clip?.user_id}
              requestEditView={requestElementEditView}
              onEditViewOpened={() => setRequestElementEditView(false)}
            />
          )}
          {activeTab === 'effects' && (
            <ZoomEffects
              keyframes={zoomKeyframes}
              onKeyframesChange={setZoomKeyframes}
              duration={duration}
              currentTime={currentTime}
              onSeek={handleSeek}
              videoSrc={clip?.signedUrl || ''}
              openZoomPanel={requestZoomPanelOpen}
              onZoomPanelOpened={() => setRequestZoomPanelOpen(false)}
              closeZoomPanel={requestZoomPanelClose}
              onZoomPanelClosed={() => setRequestZoomPanelClose(false)}
              onDeselectZoom={() => setSelectedZoomId(null)}
              onAddVisualEffect={handleAddVisualEffect}
            />
          )}
          {activeTab === 'audio' && (
            <AudioPanel
              onAddAudioTrack={handleAddAudioTrack}
              currentTime={currentTime}
              duration={duration}
              selectedAudioTrack={selectedAudioTrack}
              onUpdateAudioTrack={handleUpdateAudioTrack}
              onOpenTrimModal={(track) => setTrimModalTrack(track)}
            />
          )}
          {activeTab === 'captions' && (
            <CaptionEditor
              captions={captions}
              onCaptionsChange={setCaptions}
              onAddCaptionOverlay={handleAddCaptionOverlay}
              duration={duration}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          )}
          {activeTab === 'export' && (
            <ExportPanel
              clipTitle={newTitle}
              aspectRatio={aspectRatio}
              startTime={startTime}
              endTime={endTime}
              overlays={overlays}
              zoomKeyframes={zoomKeyframes}
              thumbs={thumbs}
              onExport={handleExport}
            />
          )}
          </div>

          {/* Properties Panel (when overlay selected but NOT on elements tab - elements tab has its own edit UI) */}
          {/* Also exclude social-sticker, text, caption, and image types as they are edited in ElementsPanel */}
          {selectedOverlay && activeTab !== 'elements' && !['social-sticker', 'text', 'caption', 'image'].includes(selectedOverlay.type) && (
          <div className="border-t border-gray-800 max-h-48 overflow-y-auto">
            <OverlayProperties
              overlay={selectedOverlay}
              onUpdate={handleUpdateOverlay}
              onDelete={handleDeleteOverlay}
              onDuplicate={handleDuplicateOverlay}
              duration={duration}
            />
          </div>
          )}

          {/* Crop Region Properties */}
          {selectedCropId && activeTab === 'layouts' && (
          <div className="border-t border-gray-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Crop Region</span>
              {cropRegions.length > 1 && (
                <button
                  onClick={() => handleDeleteCrop(selectedCropId)}
                  className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input
              type="text"
              value={cropRegions.find(c => c.id === selectedCropId)?.name || ''}
              onChange={(e) => {
                setCropRegions(prev => prev.map(c => 
                  c.id === selectedCropId ? { ...c, name: e.target.value } : c
                ))
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              placeholder="Crop name"
            />
          </div>
          )}

        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-800 bg-[#12121f]">
          <div className="flex items-center gap-3">
            {/* Undo/Redo - Connected buttons with separator */}
            <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors ${
                  canUndo
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
                <span className="text-sm">Undo</span>
              </button>
              <div className="w-px h-5 bg-gray-600" />
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`p-2 transition-colors ${
                  canRedo
                    ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                    : 'text-gray-600 cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right side - Auto-save indicator and Zoom */}
          <div className="flex items-center gap-4">
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              {saving && <span className="animate-pulse">Saving...</span>}
            </div>

            {/* Zoom Dropdown */}
            <div className="relative">
              <button
                onClick={() => setZoomDropdownOpen(!zoomDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-600 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <span>{previewZoom === 'fit' ? `Fit (${fitPercentage}%)` : `${previewZoom}%`}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>

              {zoomDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 bg-[#1a1a2e] border border-gray-700 rounded-lg shadow-lg z-50 min-w-[140px] py-1">
                  {[
                    { label: 'Fit to window', value: 'fit' as const },
                    { label: '75%', value: 75 },
                    { label: '50%', value: 50 },
                    { label: '33%', value: 33 },
                    { label: '25%', value: 25 },
                  ].map((option) => (
                    <button
                      key={String(option.value)}
                      onClick={() => {
                        setPreviewZoom(option.value)
                        setZoomDropdownOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-800 transition-colors ${
                        previewZoom === option.value ? 'text-purple-400' : 'text-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Preview Area - StreamLadder style with crop regions */}
        <div
          ref={editorContainerRef}
          className="flex-1 flex items-center justify-center p-4 md:p-6 overflow-auto bg-[#0a0a14]"
          onClick={() => zoomDropdownOpen && setZoomDropdownOpen(false)}
        >
          <div
            className="flex items-start gap-8 transition-transform"
            style={{
              transform: `scale(${zoomMultiplier})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Main Video with Crop Regions - Only visible when Layouts tab is active */}
            {activeTab === 'layouts' && (
            <div className="flex flex-col gap-2">
              {/* Title header */}
              <div 
                className="flex items-center select-none shrink-0"
                style={{ width: `${editorScale * 640}px` }}
              >
                <span className="text-sm font-medium text-gray-400 select-none">
                  {selectedLayout ? selectedLayout.name : 'Source'}
                </span>
              </div>
              
              {/* Main Video Container - 16:9 aspect ratio, height = editorScale * 360px */}
              <div
                ref={mainVideoContainerRef}
                className="relative bg-black shadow-2xl z-[100]"
                style={{ 
                  width: `${editorScale * 640}px`,
                  height: `${editorScale * 360}px`,
                }}
                onClick={() => { setSelectedOverlayId(null); setSelectedCropId(null) }}
              >
                {/* Edge indicators for selected crop touching edges - only visible while moving */}
                {selectedCropId && activeTab === 'layouts' && cropDragType === 'move' && (() => {
                  const crop = cropRegions.find(c => c.id === selectedCropId)
                  if (!crop) return null
                  const threshold = 0.5 // How close to edge to show indicator
                  return (
                    <>
                      {crop.x <= threshold && (
                        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-purple-400 z-[20] pointer-events-none" />
                      )}
                      {crop.x + crop.width >= 100 - threshold && (
                        <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-purple-400 z-[20] pointer-events-none" />
                      )}
                      {crop.y <= threshold && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-400 z-[20] pointer-events-none" />
                      )}
                      {crop.y + crop.height >= 100 - threshold && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-400 z-[20] pointer-events-none" />
                      )}
                    </>
                  )
                })()}

                {/* Center line indicators when snapping to center in main video */}
                {showMainCenterXLine && cropDragType === 'move' && (
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-purple-500 z-[20] pointer-events-none" style={{ transform: 'translateX(-0.5px)' }} />
                )}
                {showMainCenterYLine && cropDragType === 'move' && (
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-purple-500 z-[20] pointer-events-none" style={{ transform: 'translateY(-0.5px)' }} />
                )}
                
                {/* This container defines the coordinate space for overlays */}
                <div ref={videoContainerRef} className="absolute inset-0">
                  <video
                    src={clip.signedUrl || ''}
                    ref={(el) => { if (el) setVideoRef(el) }}
                    className="w-full h-full object-contain rounded-lg"
                  />
                  
                  {/* Dark overlay showing areas outside crop regions */}
                  {activeTab === 'layouts' && cropRegions.length > 0 && (
                    <svg 
                      className="absolute inset-0 w-full h-full pointer-events-none z-[24]"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <mask id="cropMask">
                          {/* White = visible (dark overlay), Black = hidden (clear/crop area) */}
                          <rect x="0" y="0" width="100" height="100" fill="white" />
                          {cropRegions.map((crop) => {
                            // Calculate rx as percentage of crop width, ry as percentage of crop height
                            const cornerRounding = crop.cornerRounding || 0
                            const rx = (cornerRounding / 100) * crop.width
                            const ry = (cornerRounding / 100) * crop.height
                            return (
                              <rect
                                key={crop.id}
                                x={crop.x}
                                y={crop.y}
                                width={crop.width}
                                height={crop.height}
                                fill="black"
                                rx={rx}
                                ry={ry}
                              />
                            )
                          })}
                        </mask>
                      </defs>
                      <rect 
                        x="0" 
                        y="0" 
                        width="100" 
                        height="100" 
                        fill="rgba(0, 0, 0, 0.5)" 
                        mask="url(#cropMask)"
                      />
                    </svg>
                  )}

                {/* Crop Regions Overlay - sorted by zIndex */}
                {activeTab === 'layouts' && [...cropRegions]
                  .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
                  .map((crop) => {
                  const isSelected = selectedCropId === crop.id
                  const isHovered = hoveredCropId === crop.id
                  const cornerRounding = crop.cornerRounding || 0
                  const borderRadius = cornerRounding > 0 ? `${cornerRounding}%` : '0'
                  
                  return (
                    <React.Fragment key={crop.id}>
                      <div
                        className="absolute cursor-move"
                        style={{
                          left: `${crop.x}%`,
                          top: `${crop.y}%`,
                          width: `${crop.width}%`,
                          height: `${crop.height}%`,
                          border: `2px solid ${crop.color}`,
                          backgroundColor: 'transparent',
                          zIndex: 10 + (crop.zIndex || 1), // BASE LAYERS: 10-49 for crops
                          borderRadius: borderRadius,
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedCropId(crop.id); setSelectedOverlayId(null) }}
                        onMouseDown={(e) => handleCropMouseDown(e, crop.id, 'move')}
                        onMouseEnter={() => setHoveredCropId(crop.id)}
                        onMouseLeave={() => setHoveredCropId(null)}
                      >
                        {/* Crop Label - On top border like StreamLadder (non-selectable to avoid drag jitter) */}
                        <div 
                          className="absolute left-1/2 -translate-x-1/2 -top-0.5 -translate-y-full px-2 py-0.5 text-xs font-medium whitespace-nowrap select-none"
                          style={{ backgroundColor: crop.color, color: '#fff', borderRadius: '4px 4px 0 0' }}
                        >
                          {crop.name}
                        </div>

                        {/* Resize Handles - Only show when selected, square style */}
                        {isSelected && (
                          <>
                            <div
                              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white cursor-nw-resize"
                              style={{ border: `2px solid ${crop.color}` }}
                              onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, crop.id, 'resize-tl') }}
                            />
                            <div
                              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white cursor-ne-resize"
                              style={{ border: `2px solid ${crop.color}` }}
                              onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, crop.id, 'resize-tr') }}
                            />
                            <div
                              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white cursor-sw-resize"
                              style={{ border: `2px solid ${crop.color}` }}
                              onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, crop.id, 'resize-bl') }}
                            />
                            <div
                              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white cursor-se-resize"
                              style={{ border: `2px solid ${crop.color}` }}
                              onMouseDown={(e) => { e.stopPropagation(); handleCropMouseDown(e, crop.id, 'resize-br') }}
                            />
                          </>
                        )}
                      </div>
                      
                      {/* Toolbar below selected crop */}
                      {isSelected && (
                        <div
                          className="absolute"
                          style={{
                            left: `${crop.x + crop.width / 2}%`,
                            top: `${crop.y + crop.height}%`,
                            transform: 'translate(-50%, 8px)',
                            transformOrigin: 'top center',
                            zIndex: 200,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CropToolbar
                            cropId={crop.id}
                            aspectRatio={crop.aspectRatio || 'freeform'}
                            cornerRounding={crop.cornerRounding || 0}
                            onAspectRatioChange={(ratio) => handleCropAspectRatioChange(crop.id, ratio)}
                            onCornerRoundingChange={(value) => handleCropCornerRoundingChange(crop.id, value)}
                            onBringToFront={() => handleBringCropToFront(crop.id)}
                            onDuplicate={() => handleDuplicateCrop(crop.id)}
                            onRemove={() => handleDeleteCrop(crop.id)}
                          />
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
                </div>
              </div>

              {/* Crop Controls - Below Video */}
              {activeTab === 'layouts' && (
                <div 
                  className="flex items-center gap-4 shrink-0 relative z-0"
                  style={{ width: `${editorScale * 640}px` }}
                >
                  <button
                    onClick={handleAddCrop}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <span className="text-lg leading-none">+</span>
                    Add crop
                  </button>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div 
                      className={`w-10 h-5 rounded-full relative transition-colors ${snappingEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                      onClick={() => setSnappingEnabled(!snappingEnabled)}
                    >
                      <div 
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${snappingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </div>
                    <span className="text-sm text-gray-300">Enable snapping</span>
                  </label>
                </div>
              )}
            </div>
            )}

            {/* Preview Panel - Right side of video */}
            <div className="flex flex-col gap-2">
              {/* Preview header */}
              <div
                className="flex items-center select-none shrink-0"
                style={{ width: `${currentScale * 202.5}px` }}
              >
                <span className="text-sm font-medium text-gray-400 select-none">Preview</span>
              </div>

              {/* Platform Preview - 9:16 aspect ratio, same height as source video */}
              <div
                ref={previewContainerRef}
                className="relative bg-black border border-gray-700 overflow-hidden"
                style={{
                  width: `${currentScale * 202.5}px`,
                  height: `${currentScale * 360}px`,
                }}
              >
                {/* Blurred video background */}
                {clip?.signedUrl && (
                  <div className="absolute inset-0 overflow-hidden">
                    <video
                      ref={previewBgVideoRef}
                      src={clip.signedUrl}
                      className="absolute inset-0 w-full h-full object-cover blur-md scale-105 opacity-60"
                      muted
                      playsInline
                    />
                  </div>
                )}
                
                {/* Edge indicators for preview slot touching edges - only when dragging in preview */}
                {selectedCropId && isPreviewDragging && (() => {
                  const crop = cropRegions.find(c => c.id === selectedCropId)
                  if (!crop) return null
                  
                  // Calculate crop height using the same logic as collision detection
                  const refVideoW = 160
                  const refVideoH = 90
                  const cropW = (crop.width / 100) * refVideoW
                  const cropH = (crop.height / 100) * refVideoH
                  const aspectRatio = cropW / cropH
                  
                  // Height in percentage: previewWidth% / aspectRatio
                  const cropHeight = crop.previewWidth / aspectRatio
                  
                  const threshold = 0.5
                  
                  // Determine boundaries using same logic as collision detection
                  // These are the clamping boundaries for previewY
                  let minY: number
                  let maxY: number
                  
                  if (cropHeight <= 100) {
                    // Crop fits in container
                    minY = 0  // Top edge at container top
                    maxY = 100 - cropHeight  // Bottom edge at container bottom
                  } else {
                    // Crop taller than container
                    minY = 100 - cropHeight  // Bottom edge at container bottom (negative value)
                    maxY = 0  // Top edge at container top
                  }
                  
                  return (
                    <>
                      {/* Top edge indicator - when previewY reaches maxY for tall crops, minY for normal crops */}
                      {Math.abs(crop.previewY - (cropHeight <= 100 ? minY : maxY)) <= threshold && (
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-purple-400 z-[30]" />
                      )}
                      
                      {/* Bottom edge indicator - disabled for now */}
                      {/* {Math.abs(crop.previewY - (cropHeight <= 100 ? maxY : minY)) <= threshold && (
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-purple-400 z-[30]" />
                      )} */}
                      
                      {/* Left edge indicator */}
                      {Math.abs(crop.previewX) <= threshold && (
                        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-purple-400 z-[30]" />
                      )}
                      {/* Right edge indicator */}
                      {Math.abs(crop.previewX + crop.previewWidth - 100) <= threshold && (
                        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-purple-400 z-[30]" />
                      )}
                    </>
                  )
                })()}

                {/* Center line indicators for preview when snapping */}
                {previewSnapping.showCenterX && (
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-purple-500 z-[60] pointer-events-none" style={{ transform: 'translateX(-0.5px)' }} />
                )}
                {previewSnapping.showCenterY && (
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-purple-500 z-[60] pointer-events-none" style={{ transform: 'translateY(-0.5px)' }} />
                )}
                
                {/* Preview showing cropped content - sorted by zIndex */}
                {/* Effect transform wrapper - applies shake/zoom effects to all content */}
                <div
                  className="w-full h-full relative"
                  style={{
                    transform: effectTransform.transform || undefined,
                    filter: effectTransform.filter || undefined,
                    transformOrigin: 'center center',
                  }}
                >
                  {[...cropRegions]
                    .sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
                    .map((crop) => {
                    // Container dimensions are based on currentScale
                    // Preview is 9:16 aspect, so width = 202.5 * scale, height = 360 * scale
                    const containerWidth = currentScale * 202.5
                    const containerHeight = currentScale * 360
                    
                    return (
                      <PreviewCropRegion
                        key={crop.id}
                        crop={crop}
                        videoSrc={clip.signedUrl || ''}
                        isSelected={selectedCropId === crop.id}
                        isHovered={hoveredCropId === crop.id}
                        onMouseEnter={() => setHoveredCropId(crop.id)}
                        onMouseLeave={() => setHoveredCropId(null)}
                        onMouseDown={handlePreviewCropMouseDown}
                        containerWidth={containerWidth}
                        containerHeight={containerHeight}
                        mainVideoRef={videoRef}
                        playing={playing}
                      />
                    )
                  })}

                  {/* Zoom Overlay - covers entire preview when zoom is active (scale > 1) */}
                  {currentZoom.scale > 1 && (
                    <ZoomOverlay
                      videoSrc={clip.signedUrl || ''}
                      zoom={currentZoom}
                      containerWidth={currentScale * 202.5}
                      containerHeight={currentScale * 360}
                      mainVideoRef={videoRef}
                      playing={playing}
                    />
                  )}

                  {/* Visual Effects Overlay */}
                  <EffectOverlay
                    effects={visualEffects}
                    currentTime={currentTime}
                    containerWidth={currentScale * 202.5}
                    containerHeight={currentScale * 360}
                  />

                  {/* Preview overlays - CONTENT LAYERS: 100-119 based on timeline row */}
                  {overlays
                    .filter(o => currentTime >= o.startTime && currentTime <= o.endTime)
                    .map(overlay => {
                      const isSelected = selectedOverlayId === overlay.id
                      return (
                        <React.Fragment key={overlay.id}>
                          <div
                            className="absolute"
                            style={{
                              left: `${overlay.videoLeft}%`,
                              top: `${overlay.videoTop}%`,
                              width: (overlay.type === 'text' || overlay.type === 'caption') ? 'auto' : `${overlay.videoWidth}%`,
                              minWidth: (overlay.type === 'text' || overlay.type === 'caption') ? `${overlay.videoWidth}%` : undefined,
                              minHeight: `${overlay.videoHeight}%`,
                              backgroundColor: overlay.type === 'text' || overlay.type === 'caption' ? (overlay.backgroundColor || 'transparent') : 'transparent',
                              border: isSelected && activeTab !== 'layouts' ? '2px solid #8b5cf6' : '1px solid transparent',
                              borderRadius: overlay.borderRadius || 0,
                              opacity: (overlay.opacity ?? 100) / 100,
                              transform: overlay.rotation ? `rotate(${overlay.rotation}deg)` : undefined,
                              cursor: activeTab === 'layouts' ? 'default' : (dragOverlayId === overlay.id ? 'grabbing' : 'grab'),
                              pointerEvents: activeTab === 'layouts' ? 'none' : 'auto',
                              zIndex: 100 + (overlay.zIndex || overlay.row || 0),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: overlay.textAlign || 'center',
                              overflow: 'visible',
                              userSelect: 'none',
                              padding: overlay.type === 'text' || overlay.type === 'caption' ? '4px' : undefined,
                            }}
                            onMouseDown={(e) => {
                              // Don't allow element interaction on Layouts tab
                              if (activeTab === 'layouts') return
                              e.stopPropagation()
                              // Select and start moving immediately on any click
                              // Also deselect any selected crop for single selection
                              setSelectedOverlayId(overlay.id)
                              setSelectedCropId(null)
                              handleOverlayMouseDown(e, overlay.id, 'move')
                            }}
                          >
                            {overlay.type === 'image' && (
                              <img
                                src={overlay.src}
                                alt=""
                                className="w-full h-full object-contain pointer-events-none select-none"
                                draggable={false}
                              />
                            )}
                            {overlay.type === 'social-sticker' && (
                              <div className="w-full h-full flex items-center justify-center pointer-events-none select-none">
                                <StickerRenderer
                                  config={{
                                    id: overlay.id,
                                    template: (overlay.stickerTemplate || 'basic') as StickerTemplate,
                                    platform: (overlay.socialPlatforms?.[0] || 'twitch') as SocialPlatform,
                                    platforms: overlay.socialPlatforms,
                                    username: overlay.content || 'Username',
                                    style: (overlay.stickerStyle || 'default') as StickerStyle,
                                    animated: overlay.stickerAnimated,
                                    animation: overlay.stickerAnimation,
                                    showFollowLabel: overlay.stickerTemplate === 'follow',
                                  }}
                                  isPreview={false}
                                />
                              </div>
                            )}
                            {(overlay.type === 'text' || overlay.type === 'caption') && (
                              <span
                                className="select-none"
                                style={{
                                  // Scale font size with element size (base 16px at 15% height, scale proportionally)
                                  fontSize: `${(overlay.videoHeight / 15) * (overlay.fontSize || 16)}px`,
                                  fontFamily: overlay.textStyle?.fontFamily || overlay.fontFamily || 'Inter',
                                  fontWeight: overlay.fontWeight as React.CSSProperties['fontWeight'] || 'bold',
                                  fontStyle: overlay.fontStyle,
                                  lineHeight: 1.3,
                                  // Use background for gradient text only (not backgroundColor to avoid conflicts)
                                  background: overlay.textStyle?.fill?.type === 'gradient' && overlay.textStyle.fill.gradient
                                    ? overlay.textStyle.fill.gradient.type === 'radial'
                                      ? `radial-gradient(circle, ${overlay.textStyle.fill.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
                                      : `linear-gradient(${overlay.textStyle.fill.gradient.angle || 0}deg, ${overlay.textStyle.fill.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
                                    : undefined,
                                  backgroundClip: overlay.textStyle?.fill?.type === 'gradient' ? 'text' : undefined,
                                  WebkitBackgroundClip: overlay.textStyle?.fill?.type === 'gradient' ? 'text' : undefined,
                                  WebkitTextFillColor: overlay.textStyle?.fill?.type === 'gradient' ? 'transparent' : undefined,
                                  color: overlay.textStyle?.fill?.type === 'gradient'
                                    ? 'transparent'
                                    : (overlay.textStyle?.fill?.type === 'solid' ? overlay.textStyle.fill.color : (overlay.color || '#fff')),
                                  textAlign: overlay.textAlign || 'center',
                                  // Use paint-order to make stroke expand outwards instead of inwards
                                  paintOrder: overlay.textStyle?.outline ? 'stroke fill' : undefined,
                                  WebkitTextStroke: overlay.textStyle?.outline
                                    ? `${overlay.textStyle.outline.width * 2}px ${overlay.textStyle.outline.color}`
                                    : overlay.textStroke,
                                  textShadow: overlay.textStyle?.glow
                                    ? `0 0 ${overlay.textStyle.glow.strength}px ${overlay.textStyle.glow.color}`
                                    : overlay.textStyle?.shadow
                                      ? `${overlay.textStyle.shadow.x}px ${overlay.textStyle.shadow.y}px ${overlay.textStyle.shadow.blur}px ${overlay.textStyle.shadow.color}`
                                      : overlay.textShadow,
                                  borderRadius: overlay.textStyle?.background?.radius || 0,
                                  display: 'inline-block',
                                  padding: '8px 16px',
                                  pointerEvents: 'none',
                                  whiteSpace: 'pre',
                                }}
                              >
                                {/* Inner span for text background (separate from gradient text) */}
                                {overlay.textStyle?.background && overlay.textStyle.fill?.type !== 'gradient' ? (
                                  <span
                                    style={{
                                      backgroundColor: `rgba(${parseInt(overlay.textStyle.background.color.slice(1,3), 16)}, ${parseInt(overlay.textStyle.background.color.slice(3,5), 16)}, ${parseInt(overlay.textStyle.background.color.slice(5,7), 16)}, ${(overlay.textStyle.background.opacity || 100) / 100})`,
                                      borderRadius: overlay.textStyle.background.radius || 0,
                                      padding: '4px 8px',
                                    }}
                                  >
                                    {overlay.content}
                                  </span>
                                ) : overlay.content}
                              </span>
                            )}
                            {overlay.type === 'reaction' && (
                              <div className="w-full h-full flex items-center justify-center pointer-events-none select-none">
                                {/* Twitch Reaction */}
                                {overlay.reactionPlatform === 'twitch' && (
                                  <div
                                    className="flex items-start gap-2 p-2 rounded-md w-full"
                                    style={{
                                      backgroundColor: overlay.reactionDarkMode ? '#18181b' : '#ffffff',
                                      color: overlay.reactionDarkMode ? '#efeff1' : '#0e0e10',
                                    }}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                      style={{ backgroundColor: '#9146ff' }}
                                    >
                                      {(overlay.reactionUsername || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="font-semibold text-sm" style={{ color: '#9146ff' }}>
                                        {overlay.reactionUsername || 'Username'}
                                      </span>
                                      <span className="text-sm ml-1" style={{ color: overlay.reactionDarkMode ? '#efeff1' : '#0e0e10' }}>
                                        {overlay.reactionMessage || 'Message'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {/* TikTok Reaction */}
                                {overlay.reactionPlatform === 'tiktok' && (
                                  <div
                                    className="flex items-start gap-2 p-2 rounded-md w-full"
                                    style={{
                                      backgroundColor: overlay.reactionDarkMode ? '#121212' : '#ffffff',
                                      color: overlay.reactionDarkMode ? '#ffffff' : '#161823',
                                    }}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                      style={{ background: 'linear-gradient(135deg, #25f4ee, #fe2c55)' }}
                                    >
                                      {(overlay.reactionUsername || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm" style={{ color: overlay.reactionDarkMode ? '#ffffff' : '#161823' }}>
                                        {overlay.reactionUsername || 'Username'}
                                      </div>
                                      <div className="text-sm" style={{ color: overlay.reactionDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(22,24,35,0.75)' }}>
                                        {overlay.reactionMessage || 'Message'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {/* Instagram Reaction */}
                                {overlay.reactionPlatform === 'instagram' && (
                                  <div
                                    className="flex items-start gap-2 p-2 rounded-md w-full"
                                    style={{
                                      backgroundColor: overlay.reactionDarkMode ? '#000000' : '#ffffff',
                                      color: overlay.reactionDarkMode ? '#ffffff' : '#262626',
                                    }}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                      style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}
                                    >
                                      {(overlay.reactionUsername || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="font-semibold text-sm" style={{ color: overlay.reactionDarkMode ? '#ffffff' : '#262626' }}>
                                        {overlay.reactionUsername || 'Username'}
                                      </span>
                                      <span className="text-sm ml-1" style={{ color: overlay.reactionDarkMode ? '#ffffff' : '#262626' }}>
                                        {overlay.reactionMessage || 'Message'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                {/* Twitter/X Reaction */}
                                {overlay.reactionPlatform === 'twitter' && (
                                  <div
                                    className="flex items-start gap-2 p-2 rounded-md w-full"
                                    style={{
                                      backgroundColor: overlay.reactionDarkMode ? '#000000' : '#ffffff',
                                      color: overlay.reactionDarkMode ? '#e7e9ea' : '#0f1419',
                                    }}
                                  >
                                    <div
                                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                                      style={{ backgroundColor: '#1d9bf0' }}
                                    >
                                      {(overlay.reactionUsername || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1">
                                        <span className="font-bold text-sm" style={{ color: overlay.reactionDarkMode ? '#e7e9ea' : '#0f1419' }}>
                                          {overlay.reactionUsername || 'Username'}
                                        </span>
                                        <span className="text-sm" style={{ color: overlay.reactionDarkMode ? '#71767b' : '#536471' }}>
                                          @{(overlay.reactionUsername || 'username').toLowerCase().replace(/\s/g, '')}
                                        </span>
                                      </div>
                                      <div className="text-sm" style={{ color: overlay.reactionDarkMode ? '#e7e9ea' : '#0f1419' }}>
                                        {overlay.reactionMessage || 'Message'}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Corner Resize Handles - hidden on Layouts tab */}
                            {isSelected && activeTab !== 'layouts' && (
                              <>
                                <div
                                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-se-resize"
                                  onMouseDown={(e) => { e.stopPropagation(); handleOverlayMouseDown(e, overlay.id, 'resize') }}
                                />
                                <div
                                  className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-ne-resize"
                                  onMouseDown={(e) => { e.stopPropagation(); handleOverlayMouseDown(e, overlay.id, 'resize-tr') }}
                                />
                                <div
                                  className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-sw-resize"
                                  onMouseDown={(e) => { e.stopPropagation(); handleOverlayMouseDown(e, overlay.id, 'resize-bl') }}
                                />
                                <div
                                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-purple-500 rounded-full cursor-nw-resize"
                                  onMouseDown={(e) => { e.stopPropagation(); handleOverlayMouseDown(e, overlay.id, 'resize-tl') }}
                                />
                              </>
                            )}
                          </div>

                          {/* Element Menu - appears below selected element, centered */}
                          {isSelected && activeTab !== 'layouts' && (
                            <div
                              className="absolute"
                              style={{
                                left: `${overlay.videoLeft + overlay.videoWidth / 2}%`,
                                top: `${overlay.videoTop + overlay.videoHeight}%`,
                                transform: 'translate(-50%, 8px)',
                                transformOrigin: 'top center',
                                zIndex: 300,
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1 p-1 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-700 shadow-lg">
                                {/* Opacity */}
                                <div className="relative group">
                                  <button
                                    className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                    title="Opacity"
                                  >
                                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <circle cx="12" cy="12" r="10" opacity="0.3" />
                                      <circle cx="12" cy="12" r="6" />
                                    </svg>
                                  </button>
                                  {/* Opacity slider dropdown */}
                                  <div className="absolute bottom-full left-0 mb-1 p-2 bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={overlay.opacity ?? 100}
                                        onChange={(e) => handleUpdateOverlay(overlay.id, { opacity: parseInt(e.target.value) })}
                                        className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                      />
                                      <span className="text-xs text-gray-400 w-8">{overlay.opacity ?? 100}%</span>
                                    </div>
                                  </div>
                                </div>
                                {/* Edit - switch to Elements tab to edit this element */}
                                <button
                                  onClick={() => {
                                    setRequestElementEditView(true)
                                    setActiveTab('elements')
                                  }}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                  title="Edit element"
                                >
                                  <Pencil className="w-4 h-4 text-gray-300" />
                                </button>
                                {/* Bring to front */}
                                <button
                                  onClick={() => {
                                    const maxZ = Math.max(...overlays.map(o => o.zIndex || 0))
                                    handleUpdateOverlay(overlay.id, { zIndex: maxZ + 1 })
                                  }}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                  title="Bring to front"
                                >
                                  <Layers className="w-4 h-4 text-gray-300" />
                                </button>
                                {/* Duplicate */}
                                <button
                                  onClick={() => handleDuplicateOverlay(overlay)}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                  title="Duplicate"
                                >
                                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <rect x="9" y="9" width="13" height="13" rx="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                </button>
                                {/* Delete */}
                                <button
                                  onClick={() => handleDeleteOverlay(overlay.id)}
                                  className="p-1.5 hover:bg-red-600/30 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}
                </div>

                {/* Platform UI overlay elements - z-index 200-249, scaled to fit small preview */}
                {previewPlatform !== 'none' && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 200 }}>
                    {/* YouTube Shorts UI */}
                    {previewPlatform === 'youtube' && (
                      <>
                        {/* Top left - back arrow */}
                        <div className="absolute top-2 left-1.5">
                          <svg className="w-4 h-4 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M15 19l-7-7 7-7"/>
                          </svg>
                        </div>
                        {/* Top right - search, camera, more */}
                        <div className="absolute top-2 right-1.5 flex items-center gap-2">
                          <svg className="w-4 h-4 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                          </svg>
                          <svg className="w-4 h-4 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><circle cx="17" cy="7" r="1"/>
                          </svg>
                          <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
                          </svg>
                        </div>
                        {/* Right side action buttons */}
                        <div className="absolute right-1.5 bottom-12 flex flex-col items-center gap-3">
                          {/* Like */}
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
                              </svg>
                            </div>
                            <span className="text-white text-[8px] font-medium drop-shadow-lg mt-0.5">1.1 min</span>
                          </div>
                          {/* Dislike */}
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
                              </svg>
                            </div>
                            <span className="text-white text-[8px] font-medium drop-shadow-lg mt-0.5">Dislike</span>
                          </div>
                          {/* Comments */}
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
                              </svg>
                            </div>
                            <span className="text-white text-[8px] font-medium drop-shadow-lg mt-0.5">6969</span>
                          </div>
                          {/* Share */}
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7z"/>
                              </svg>
                            </div>
                            <span className="text-white text-[8px] font-medium drop-shadow-lg mt-0.5">Share</span>
                          </div>
                          {/* Remix */}
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
                              </svg>
                            </div>
                            <span className="text-white text-[8px] font-medium drop-shadow-lg mt-0.5">Remix</span>
                          </div>
                        </div>
                        {/* Bottom info */}
                        <div className="absolute bottom-2 left-1.5 right-10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">U</span>
                            </div>
                            <span className="text-white text-[9px] font-medium drop-shadow-lg">@StreamLadder</span>
                            <span className="px-1.5 py-0.5 bg-white rounded text-[7px] font-semibold text-black">Subscribe</span>
                          </div>
                          <p className="text-white text-[8px] leading-tight drop-shadow-lg mb-1">You should subscribe to us #now #ok</p>
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                            </svg>
                            <span className="text-white text-[7px] drop-shadow-lg">Darude - @SandStorm</span>
                          </div>
                        </div>
                        {/* Bottom progress */}
                        <div className="absolute bottom-1 left-1.5 flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center">
                            <span className="text-white text-[6px] font-bold">100</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* TikTok UI */}
                    {previewPlatform === 'tiktok' && (
                      <>
                        {/* Top bar */}
                        <div className="absolute top-2 left-0 right-0 flex items-center justify-between px-2">
                          {/* Live indicator */}
                          <div className="flex items-center gap-1">
                            <div className="px-1 py-0.5 bg-pink-500 rounded text-[6px] text-white font-bold">LIVE</div>
                          </div>
                          {/* Center tabs */}
                          <div className="flex items-center gap-2">
                            <span className="text-white/60 text-[8px] font-medium">Following</span>
                            <span className="text-white text-[8px] font-bold border-b border-white pb-0.5">For you</span>
                          </div>
                          {/* Right icons */}
                          <div className="flex items-center gap-1.5">
                            <div className="px-1 py-0.5 bg-pink-500 rounded text-[6px] text-white font-bold">LIVE</div>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                            </svg>
                          </div>
                        </div>
                        {/* Right side action buttons */}
                        <div className="absolute right-1.5 bottom-10 flex flex-col items-center gap-2.5">
                          {/* Profile */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600">
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-white text-[9px] font-bold">U</span>
                              </div>
                            </div>
                            <div className="w-4 h-4 -mt-2 rounded-full bg-[#fe2c55] flex items-center justify-center border border-white">
                              <span className="text-white text-[10px] font-bold">+</span>
                            </div>
                          </div>
                          {/* Like */}
                          <div className="flex flex-col items-center">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                            <span className="text-white text-[8px] font-semibold drop-shadow-lg">250.5K</span>
                          </div>
                          {/* Comment */}
                          <div className="flex flex-col items-center">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/>
                            </svg>
                            <span className="text-white text-[8px] font-semibold drop-shadow-lg">100K</span>
                          </div>
                          {/* Bookmark */}
                          <div className="flex flex-col items-center">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                            </svg>
                          </div>
                          {/* Share */}
                          <div className="flex flex-col items-center">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 12l-7-7v4C7 10 4 15 3 20c2.5-3.5 6-5.1 11-5.1V19l7-7z"/>
                            </svg>
                            <span className="text-white text-[8px] font-semibold drop-shadow-lg">89K</span>
                          </div>
                          {/* Music disc */}
                          <div className="w-7 h-7 rounded-lg bg-gray-800 border border-gray-600 overflow-hidden animate-pulse">
                            <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-500" />
                          </div>
                        </div>
                        {/* Bottom info */}
                        <div className="absolute bottom-2 left-1.5 right-10">
                          <span className="text-white text-[10px] font-bold drop-shadow-lg">StreamLadder</span>
                          <p className="text-white text-[8px] leading-tight drop-shadow-lg mt-0.5">Use me every day 📱</p>
                          <p className="text-cyan-300 text-[8px] leading-tight drop-shadow-lg">#fyp #streamladder #loveyou</p>
                          <p className="text-white/70 text-[7px] mt-0.5">▶ Show translation</p>
                          <div className="flex items-center gap-1 mt-1">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                            </svg>
                            <span className="text-white text-[7px] drop-shadow-lg">Darude - @SandStorm</span>
                            <span className="text-white/70 text-[7px] ml-auto">132.5K</span>
                          </div>
                        </div>
                        {/* Bottom progress */}
                        <div className="absolute bottom-1 left-1.5 flex items-center gap-1">
                          <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center">
                            <span className="text-white text-[6px] font-bold">100</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Instagram Reels UI */}
                    {previewPlatform === 'instagram' && (
                      <>
                        {/* Top bar */}
                        <div className="absolute top-2 left-0 right-0 flex items-center justify-between px-2">
                          {/* Back arrow */}
                          <svg className="w-5 h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M15 19l-7-7 7-7"/>
                          </svg>
                          {/* Reels text */}
                          <span className="text-white text-[10px] font-semibold drop-shadow-lg">Reels</span>
                          {/* Camera */}
                          <svg className="w-5 h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="3"/><circle cx="17" cy="7" r="1"/>
                          </svg>
                        </div>
                        {/* Right side action buttons */}
                        <div className="absolute right-1.5 bottom-10 flex flex-col items-center gap-3">
                          {/* Like */}
                          <div className="flex flex-col items-center">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            <span className="text-white text-[8px] font-semibold drop-shadow-lg">420</span>
                          </div>
                          {/* Comment */}
                          <div className="flex flex-col items-center">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                            </svg>
                            <span className="text-white text-[8px] font-semibold drop-shadow-lg">4000</span>
                          </div>
                          {/* Share */}
                          <div className="flex flex-col items-center">
                            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                            </svg>
                            <span className="text-white text-[8px] font-semibold drop-shadow-lg">69 d...</span>
                          </div>
                          {/* More */}
                          <svg className="w-5 h-5 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                          </svg>
                          {/* Audio */}
                          <div className="w-6 h-6 rounded border-2 border-white overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500" />
                          </div>
                        </div>
                        {/* Bottom info */}
                        <div className="absolute bottom-2 left-1.5 right-10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-0.5">
                              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                                <span className="text-white text-[7px] font-bold">U</span>
                              </div>
                            </div>
                            <span className="text-white text-[9px] font-bold drop-shadow-lg">StreamLadder</span>
                            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            <span className="px-1.5 py-0.5 border border-white rounded text-[7px] font-semibold text-white">Follow</span>
                          </div>
                          <p className="text-white text-[8px] leading-tight drop-shadow-lg">You are such a beautiful person</p>
                          <div className="flex items-center gap-1 mt-1">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                            </svg>
                            <span className="text-white text-[7px] drop-shadow-lg">Darude sandstorm</span>
                            <span className="text-white/70 text-[7px] ml-1">👤 55 users</span>
                          </div>
                        </div>
                        {/* Bottom progress and comment */}
                        <div className="absolute bottom-1 left-1.5 right-1.5 flex items-center justify-between">
                          <div className="w-4 h-4 rounded bg-white/20 flex items-center justify-center">
                            <span className="text-white text-[6px] font-bold">100</span>
                          </div>
                          <div className="flex-1 mx-2 h-5 rounded-full bg-white/20 flex items-center px-2">
                            <span className="text-white/50 text-[7px]">Add a comment...</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Preview Controls: Platform Selector */}
              <div
                className="flex items-center justify-between gap-2 shrink-0"
                style={{ width: `${currentScale * 202.5}px` }}
              >
                {/* Platform Selector */}
                <div className="flex items-center gap-1">
                  {/* No overlay */}
                  <button
                    onClick={() => setPreviewPlatform('none')}
                    className={`p-1.5 rounded transition-colors ${previewPlatform === 'none' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                    title="No overlay"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <line x1="3" y1="3" x2="21" y2="21"/>
                    </svg>
                  </button>
                {/* YouTube */}
                <button
                  onClick={() => setPreviewPlatform('youtube')}
                  className={`p-1.5 rounded transition-colors ${previewPlatform === 'youtube' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                  title="YouTube Shorts"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#FF0000">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </button>
                {/* TikTok */}
                <button
                  onClick={() => setPreviewPlatform('tiktok')}
                  className={`p-1.5 rounded transition-colors ${previewPlatform === 'tiktok' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                  title="TikTok"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" fill="#fff"/>
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" fill="#25F4EE" style={{ transform: 'translate(-2px, -2px)' }}/>
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" fill="#FE2C55" style={{ transform: 'translate(2px, 2px)' }}/>
                  </svg>
                </button>
                {/* Instagram */}
                <button
                  onClick={() => setPreviewPlatform('instagram')}
                  className={`p-1.5 rounded transition-colors ${previewPlatform === 'instagram' ? 'bg-gray-700' : 'hover:bg-gray-800'}`}
                  title="Instagram Reels"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="igGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FFDC80"/>
                        <stop offset="25%" stopColor="#F77737"/>
                        <stop offset="50%" stopColor="#F56040"/>
                        <stop offset="75%" stopColor="#C13584"/>
                        <stop offset="100%" stopColor="#833AB4"/>
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igGradient)"/>
                    <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="2"/>
                    <circle cx="17.5" cy="6.5" r="1.5" fill="#fff"/>
                  </svg>
                </button>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        {duration > 0 && (
          <Timeline
            duration={duration}
            currentTime={currentTime}
            playing={playing}
            muted={muted}
            volume={volume}
            videoRef={videoRef}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onToggleMute={handleToggleMute}
            onVolumeChange={handleChangeVolume}
            onDelete={() => {
              if (selectedOverlayId) {
                pushToUndoStack()
                setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId))
                setSelectedOverlayId(null)
              }
            }}
            clipName={newTitle || clip?.title || 'Video Clip'}
            thumbnailUrl={clip?.signedUrl || undefined}
            onNextStep={() => {
              const currentIndex = SIDEBAR_ITEMS.findIndex(item => item.id === activeTab)
              const nextIndex = (currentIndex + 1) % SIDEBAR_ITEMS.length
              setActiveTab(SIDEBAR_ITEMS[nextIndex].id)
            }}
            nextStepLabel={SIDEBAR_ITEMS[(SIDEBAR_ITEMS.findIndex(item => item.id === activeTab) + 1) % SIDEBAR_ITEMS.length]?.label || 'Elements'}
            onPrevStep={() => {
              const currentIndex = SIDEBAR_ITEMS.findIndex(item => item.id === activeTab)
              const prevIndex = currentIndex > 0 ? currentIndex - 1 : SIDEBAR_ITEMS.length - 1
              setActiveTab(SIDEBAR_ITEMS[prevIndex].id)
            }}
            prevStepLabel={SIDEBAR_ITEMS[Math.max(0, SIDEBAR_ITEMS.findIndex(item => item.id === activeTab) - 1)]?.label || ''}
            isFirstStep={SIDEBAR_ITEMS.findIndex(item => item.id === activeTab) === 0}
            onOpenCaptions={() => setActiveTab('captions')}
            hasCaptions={captions.length > 0}
            overlays={overlays}
            selectedOverlayId={selectedOverlayId}
            onSelectOverlay={setSelectedOverlayId}
            onOverlayDragStart={pushToUndoStack}
            onUpdateOverlayTiming={(id, startTime, endTime) => {
              setOverlays(prev => prev.map(o =>
                o.id === id
                  ? { ...o, startTime, endTime }
                  : o
              ))
            }}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            zoomKeyframes={zoomKeyframes}
            selectedZoomId={selectedZoomId}
            onSelectZoom={(id) => {
              setSelectedZoomId(id)
              if (id) {
                setSelectedOverlayId(null)
                setSelectedCropId(null)
                // Switch to effects tab and open zoom panel when selecting a zoom in timeline
                setActiveTab('effects')
                setRequestZoomPanelOpen(true)
              }
            }}
            onUpdateZoomTiming={handleUpdateZoomTiming}
            onDeleteZoom={handleDeleteZoom}
            audioTracks={audioTracks}
            selectedAudioId={selectedAudioId}
            onSelectAudio={(id) => {
              setSelectedAudioId(id)
              if (id) {
                setSelectedOverlayId(null)
                setSelectedZoomId(null)
                setSelectedCropId(null)
                // Switch to audio tab when selecting an audio track in timeline
                setActiveTab('audio')
              }
            }}
            onUpdateAudioTiming={handleUpdateAudioTiming}
            onDeleteAudio={handleDeleteAudio}
            visualEffects={visualEffects}
            selectedEffectId={selectedEffectId}
            onSelectEffect={(id) => {
              setSelectedEffectId(id)
              if (id) {
                setSelectedOverlayId(null)
                setSelectedZoomId(null)
                setSelectedAudioId(null)
                setSelectedCropId(null)
                setActiveTab('effects')
              }
            }}
            onUpdateEffectTiming={handleUpdateVisualEffectTiming}
            onDeleteEffect={handleDeleteVisualEffect}
          />
        )}
      </div>

      {/* Trim Audio Modal */}
      {trimModalTrack && (
        <TrimAudioModal
          track={trimModalTrack}
          onClose={() => setTrimModalTrack(null)}
          onConfirm={handleTrimAudio}
        />
      )}
    </div>
  )
}
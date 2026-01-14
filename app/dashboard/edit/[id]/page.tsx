'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import TrimSlider from '@/components/TrimSlider'
import LayoutTemplates from '@/components/editor/LayoutTemplates'
import OverlayProperties from '@/components/editor/OverlayProperties'
import AspectRatioPreview from '@/components/editor/AspectRatioPreview'
import ElementsPanel from '@/components/editor/ElementsPanel'
import ZoomEffects from '@/components/editor/ZoomEffects'
import CaptionEditor from '@/components/editor/CaptionEditor'
import ExportPanel from '@/components/editor/ExportPanel'
import { usePreviewCropDrag, CropRegion } from '@/lib/hooks/usePreviewCropDrag'
import { PreviewCropRegion } from '@/components/editor/PreviewCropRegion'
import { CropToolbar } from '@/components/editor/CropToolbar'
import {
  OverlayElement,
  AspectRatio,
  ASPECT_RATIOS,
  LayoutTemplate,
  ZoomKeyframe,
  CaptionStyle,
  findAvailableRow,
  timeToPosition,
  durationToWidth,
  formatTime
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
  ZoomIn,
  Camera,
  MoreVertical,
  ChevronLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Scissors,
  Maximize2,
  Youtube,
  Save,
  Plus,
  Trash2,
  Upload
} from 'lucide-react'

type Clip = {
  id: string
  title: string | null
  video_path: string
  signedUrl: string | null
}

type SidebarTab = 'layouts' | 'elements' | 'effects' | 'audio' | 'captions' | 'export'
type PreviewPlatform = 'youtube' | 'tiktok'

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
  const { id } = useParams()
  const router = useRouter()

  // Clip data
  const [clip, setClip] = useState<Clip | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  // Overlays
  const [overlays, setOverlays] = useState<OverlayElement[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const overlayBarRef = useRef<HTMLDivElement>(null)

  // Overlay dragging
  const [dragOverlayId, setDragOverlayId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'move' | 'resize' | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [dragStartOverlay, setDragStartOverlay] = useState<OverlayElement | null>(null)

  // Effects
  const [zoomKeyframes, setZoomKeyframes] = useState<ZoomKeyframe[]>([])
  const [captions, setCaptions] = useState<CaptionSegment[]>([])

  // UI State - StreamLadder style
  const [activeTab, setActiveTab] = useState<SidebarTab>('layouts')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [previewPlatform, setPreviewPlatform] = useState<PreviewPlatform>('youtube')
  const [previewFit, setPreviewFit] = useState(100)
  const [showVolume, setShowVolume] = useState(false)
  const volumeButtonTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Editor scale for responsive sizing
  const [editorScale, setEditorScale] = useState(1)
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

  // Undo/Redo history
  const [history, setHistory] = useState<OverlayElement[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Fetch clip data
  useEffect(() => {
    const fetchClip = async () => {
      const { data, error } = await supabase
        .from('clips')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error('Clip not found:', error)
        setLoading(false)
        return
      }

      const { data: signed } = await supabase.storage
        .from('clips')
        .createSignedUrl(data.video_path, 3600)

      setClip({
        ...data,
        signedUrl: signed?.signedUrl || null
      })
      setNewTitle(data.title || '')

      // Load saved edit state if exists
      if (data.edit_data) {
        try {
          const editState = JSON.parse(data.edit_data)
          if (editState.aspectRatio) setAspectRatio(editState.aspectRatio)
          if (editState.cropPosition) setCropPosition(editState.cropPosition)
          if (editState.overlays) setOverlays(editState.overlays)
          if (editState.zoomKeyframes) setZoomKeyframes(editState.zoomKeyframes)
          if (editState.thumbs) setThumbs(editState.thumbs)
        } catch (e) {
          console.error('Failed to parse edit data:', e)
        }
      }

      setLoading(false)
    }

    fetchClip()
  }, [id])

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

  // Calculate editor scale based on viewport size
  useEffect(() => {
    const calculateScale = () => {
      if (!editorContainerRef.current) return
      
      // Fixed dimensions: 640px (main video) + 225px (preview) + 32px (gap) = 897px width
      // Height: 360px + headers/controls ~80px = 440px
      const baseWidth = 900
      const baseHeight = 440
      
      const container = editorContainerRef.current
      const availableWidth = container.clientWidth
      const availableHeight = container.clientHeight
      
      // Calculate scale to fit both width and height, with some padding
      const scaleX = (availableWidth - 80) / baseWidth
      const scaleY = (availableHeight - 80) / baseHeight
      const scale = Math.min(1.5, scaleX, scaleY) // Max scale 1.5x
      
      setEditorScale(Math.max(0.3, scale)) // Min scale 0.3
    }
    
    // Initial calculation with delay to ensure container is rendered
    const timer = setTimeout(calculateScale, 100)
    calculateScale()
    
    window.addEventListener('resize', calculateScale)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', calculateScale)
    }
  }, [clip, loading])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.key === ' ') {
        e.preventDefault()
        handlePlayPause()
      }
      if (e.key === 'Delete' && selectedOverlayId) {
        setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId))
        setSelectedOverlayId(null)
      }
      if (e.key === 'Escape') {
        setSelectedOverlayId(null)
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
  }, [selectedOverlayId, videoRef, duration])

  // Overlay drag handlers
  const handleOverlayMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    overlayId: string,
    type: 'move' | 'resize'
  ) => {
    setDragOverlayId(overlayId)
    setDragType(type)
    setDragStart({ x: e.clientX, y: e.clientY })
    const overlay = overlays.find(el => el.id === overlayId)
    setDragStartOverlay(overlay || null)
    setSelectedOverlayId(overlayId)
    e.stopPropagation()
  }

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragOverlayId || !dragType || !dragStartOverlay || !videoContainerRef.current) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    const videoRect = videoContainerRef.current.getBoundingClientRect()
    let updated: OverlayElement | null = null

    if (dragType === 'move') {
      let newLeft = dragStartOverlay.videoLeft + dx
      let newTop = dragStartOverlay.videoTop + dy
      newLeft = Math.max(0, Math.min(videoRect.width - dragStartOverlay.videoWidth, newLeft))
      newTop = Math.max(0, Math.min(videoRect.height - dragStartOverlay.videoHeight, newTop))
      updated = { ...dragStartOverlay, videoLeft: newLeft, videoTop: newTop }
    } else if (dragType === 'resize') {
      let newWidth = dragStartOverlay.videoWidth + dx
      let newHeight = dragStartOverlay.videoHeight + dy
      newWidth = Math.max(30, Math.min(videoRect.width - dragStartOverlay.videoLeft, newWidth))
      newHeight = Math.max(20, Math.min(videoRect.height - dragStartOverlay.videoTop, newHeight))
      updated = { ...dragStartOverlay, videoWidth: newWidth, videoHeight: newHeight }
    }

    if (updated) {
      setOverlays(prev => prev.map(el => el.id === dragOverlayId ? updated! : el))
    }
  }

  const handleOverlayMouseUp = () => {
    setDragOverlayId(null)
    setDragType(null)
    setDragStartOverlay(null)
  }

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

      let updated = { ...cropDragStartRegion }
      
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
          const newWidth = Math.max(10, Math.min(100 - updated.x, cropDragStartRegion.width + dx))
          updated.width = newWidth
          updated.height = Math.max(10, Math.min(100 - updated.y, newWidth / relativeAspect))
        } else {
          updated.width = Math.max(10, Math.min(100 - updated.x, cropDragStartRegion.width + dx))
          updated.height = Math.max(10, Math.min(100 - updated.y, cropDragStartRegion.height + dy))
        }
      } else if (cropDragType === 'resize-bl') {
        const newX = cropDragStartRegion.x + dx
        const newWidth = cropDragStartRegion.width - dx
        if (newX >= 0 && newWidth >= 10) {
          updated.x = newX
          updated.width = newWidth
        }
        if (relativeAspect) {
          // Maintain aspect ratio: height = width / relativeAspect
          updated.height = Math.max(10, Math.min(100 - updated.y, updated.width / relativeAspect))
        } else {
          updated.height = Math.max(10, Math.min(100 - updated.y, cropDragStartRegion.height + dy))
        }
      } else if (cropDragType === 'resize-tr') {
        if (relativeAspect) {
          // Maintain aspect ratio: height = width / relativeAspect
          const newWidth = Math.max(10, Math.min(100 - updated.x, cropDragStartRegion.width + dx))
          updated.width = newWidth
          const newHeight = newWidth / relativeAspect
          const newY = cropDragStartRegion.y + cropDragStartRegion.height - newHeight
          if (newY >= 0 && newHeight >= 10) {
            updated.y = newY
            updated.height = newHeight
          }
        } else {
          updated.width = Math.max(10, Math.min(100 - updated.x, cropDragStartRegion.width + dx))
          const newY = cropDragStartRegion.y + dy
          const newHeight = cropDragStartRegion.height - dy
          if (newY >= 0 && newHeight >= 10) {
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
          if (newX >= 0 && newWidth >= 10 && newY >= 0 && newHeight >= 10) {
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
          if (newX >= 0 && newWidth >= 10) {
            updated.x = newX
            updated.width = newWidth
          }
          if (newY >= 0 && newHeight >= 10) {
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
      
      let updated = { ...c, aspectRatio: ratio }
      
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
      
      // Ensure crop stays within bounds after resizing
      if (updated.x + updated.width > 100) {
        updated.x = 100 - updated.width
      }
      if (updated.y + updated.height > 100) {
        updated.y = 100 - updated.height
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
    const barWidth = overlayBarRef.current?.getBoundingClientRect().width || 600
    const st = overlay.startTime ?? currentTime
    const et = overlay.endTime ?? Math.min(duration, st + 3)

    const newOverlay: OverlayElement = {
      id: `overlay-${Date.now()}`,
      type: 'text',
      videoLeft: 40,
      videoTop: 40,
      videoWidth: 150,
      videoHeight: 40,
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
      backgroundColor: 'rgba(0,0,0,0.7)',
      ...overlay,
    } as OverlayElement

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

  // Save handler
  const handleSave = async () => {
    if (!clip) return
    setSaving(true)

    const editData = JSON.stringify({
      aspectRatio,
      cropPosition,
      overlays,
      startTime,
      endTime,
      thumbs,
      zoomKeyframes,
    })

    const { error } = await supabase
      .from('clips')
      .update({ title: newTitle, edited: true, edit_data: editData })
      .eq('id', clip.id)

    if (error) {
      alert('Failed to save changes.')
    } else {
      alert('Changes saved!')
    }

    setSaving(false)
  }

  // Export handler
  const handleExport = async () => {
    // TODO: Implement actual export with FFmpeg backend
    alert('Export functionality coming soon! This will be processed on the server using FFmpeg.')
  }

  // Calculate current zoom based on keyframes
  const getCurrentZoom = useCallback(() => {
    if (zoomKeyframes.length === 0) return { scale: 1, x: 50, y: 50 }

    const sorted = [...zoomKeyframes].sort((a, b) => a.time - b.time)
    if (currentTime <= sorted[0].time) return { scale: sorted[0].scale, x: sorted[0].x, y: sorted[0].y }
    if (currentTime >= sorted[sorted.length - 1].time) {
      const last = sorted[sorted.length - 1]
      return { scale: last.scale, x: last.x, y: last.y }
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      if (currentTime >= sorted[i].time && currentTime <= sorted[i + 1].time) {
        const from = sorted[i]
        const to = sorted[i + 1]
        const progress = (currentTime - from.time) / (to.time - from.time)
        return {
          scale: from.scale + (to.scale - from.scale) * progress,
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
        }
      }
    }
    return { scale: 1, x: 50, y: 50 }
  }, [zoomKeyframes, currentTime])

  const currentZoom = getCurrentZoom()

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
                setActiveTab(item.id)
                setIsSidebarCollapsed(false)
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
              onSelectLayout={setSelectedLayout}
              aspectRatio={aspectRatio}
              onChangeAspectRatio={setAspectRatio}
            />
          )}
          {activeTab === 'elements' && (
            <ElementsPanel
              onAddSticker={handleAddOverlay}
              onAddText={handleAddOverlay}
              currentTime={currentTime}
              duration={duration}
            />
          )}
          {activeTab === 'effects' && (
            <ZoomEffects
              keyframes={zoomKeyframes}
              onKeyframesChange={setZoomKeyframes}
              duration={duration}
              currentTime={currentTime}
              onSeek={handleSeek}
            />
          )}
          {activeTab === 'audio' && (
            <div className="p-4 text-gray-400 text-sm">
              <p>Audio effects coming soon...</p>
            </div>
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

          {/* Properties Panel (when overlay or crop selected) */}
          {selectedOverlay && (
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

          {/* Panel Footer - Next Tab Navigation */}
          <div className="p-3 border-t border-gray-800">
          <button
            onClick={() => {
              const currentIndex = SIDEBAR_ITEMS.findIndex(item => item.id === activeTab)
              const nextIndex = (currentIndex + 1) % SIDEBAR_ITEMS.length
              setActiveTab(SIDEBAR_ITEMS[nextIndex].id)
            }}
            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {SIDEBAR_ITEMS.find(item => item.id === activeTab)?.label}
            <span className="text-xs">→</span>
          </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-800 bg-[#12121f]">
          <div className="flex items-center gap-3">
            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {/* TODO: Implement undo */}}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {/* TODO: Implement redo */}}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Video Preview Area - StreamLadder style with crop regions */}
        <div 
          ref={editorContainerRef}
          className="flex-1 flex items-center justify-center p-4 md:p-6 overflow-hidden bg-[#0a0a14]"
        >
          <div 
            className="flex gap-8 items-start justify-center"
            style={{
              transform: `scale(${editorScale})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Main Video with Crop Regions */}
            <div className="flex flex-col gap-2">
              {/* Title header - counter-scaled to stay normal size */}
              <div 
                className="flex items-center justify-between select-none"
                style={{
                  transform: `scale(${1 / editorScale})`,
                  transformOrigin: 'left top',
                  marginBottom: `${8 * (1 / editorScale - 1)}px`,
                  width: `${640 * editorScale}px`,
                }}
              >
                <span className="text-sm font-medium text-gray-400 select-none">
                  {selectedLayout ? selectedLayout.name : 'Source Video'}
                </span>
                <div className="flex items-center gap-1">
                  <button className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Main Video Container - Fixed size, scaled by parent */}
              <div
                ref={mainVideoContainerRef}
                className="relative bg-black rounded-lg overflow-visible shadow-2xl"
                style={{ 
                  width: '640px',
                  height: '360px',
                }}
                onClick={() => { setSelectedOverlayId(null); setSelectedCropId(null) }}
              >
                {/* Edge indicators for selected crop touching edges - only in main video */}
                {selectedCropId && activeTab === 'layouts' && !cropDragType?.startsWith('preview-') && (() => {
                  const crop = cropRegions.find(c => c.id === selectedCropId)
                  if (!crop) return null
                  const threshold = 0.5 // How close to edge to show indicator
                  return (
                    <>
                      {crop.x <= threshold && (
                        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-purple-400 z-[20]" />
                      )}
                      {crop.x + crop.width >= 100 - threshold && (
                        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-purple-400 z-[20]" />
                      )}
                      {crop.y <= threshold && (
                        <div className="absolute top-0 left-0 right-0 h-[1px] bg-purple-400 z-[20]" />
                      )}
                      {crop.y + crop.height >= 100 - threshold && (
                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-purple-400 z-[20]" />
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
                    style={{
                      transform: `scale(${currentZoom.scale})`,
                      transformOrigin: `${currentZoom.x}% ${currentZoom.y}%`
                    }}
                  />

                {/* Crop Regions Overlay */}
                {activeTab === 'layouts' && cropRegions.map((crop) => {
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
                          zIndex: 30 + (crop.zIndex || 1),
                          borderRadius: borderRadius,
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedCropId(crop.id) }}
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
                            zIndex: 150,
                            maxHeight: '42px',
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

                {/* Overlays on video (for non-layouts tabs) */}
                {activeTab !== 'layouts' && overlays
                  .filter(o => currentTime >= o.startTime && currentTime <= o.endTime)
                  .map(overlay => {
                    const isSelected = selectedOverlayId === overlay.id
                    return (
                      <div
                        key={overlay.id}
                        style={{
                          position: 'absolute',
                          left: `${(overlay.videoLeft / 640) * 100}%`,
                          top: `${(overlay.videoTop / 360) * 100}%`,
                          width: `${(overlay.videoWidth / 640) * 100}%`,
                          height: `${(overlay.videoHeight / 360) * 100}%`,
                          backgroundColor: overlay.backgroundColor || 'transparent',
                          border: isSelected ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.2)',
                          borderRadius: overlay.borderRadius || 4,
                          opacity: overlay.opacity ?? 1,
                          transform: overlay.rotation ? `rotate(${overlay.rotation}deg)` : undefined,
                          cursor: dragOverlayId === overlay.id ? 'grabbing' : 'grab',
                          zIndex: isSelected ? 20 : 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: overlay.textAlign || 'center',
                          overflow: 'hidden',
                          userSelect: 'none',
                        }}
                        onMouseDown={(e) => { e.stopPropagation(); handleOverlayMouseDown(e, overlay.id, 'move') }}
                        onMouseMove={handleOverlayMouseMove}
                        onMouseUp={handleOverlayMouseUp}
                      >
                        {(overlay.type === 'text' || overlay.type === 'caption' || overlay.type === 'sticker') ? (
                          <span
                            style={{
                              fontSize: overlay.fontSize || 16,
                              fontFamily: overlay.fontFamily,
                              fontWeight: overlay.fontWeight as React.CSSProperties['fontWeight'],
                              fontStyle: overlay.fontStyle,
                              color: overlay.color || '#fff',
                              textAlign: overlay.textAlign || 'center',
                              WebkitTextStroke: overlay.textStroke,
                              textShadow: overlay.textShadow,
                              width: '100%',
                              padding: '4px 8px',
                              pointerEvents: 'none',
                            }}
                          >
                            {overlay.content}
                          </span>
                        ) : (
                          <img
                            src={overlay.src}
                            alt=""
                            className="w-full h-full object-contain"
                            draggable={false}
                          />
                        )}

                        {/* Resize Handle */}
                        {isSelected && (
                          <div
                            className="absolute bottom-0 right-0 w-4 h-4 bg-purple-500 cursor-se-resize rounded-tl"
                            onMouseDown={(e) => { e.stopPropagation(); handleOverlayMouseDown(e, overlay.id, 'resize') }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Crop Controls - Below Video - counter-scaled to stay normal size */}
              {activeTab === 'layouts' && (
                <div 
                  className="flex items-center gap-4"
                  style={{
                    transform: `scale(${1 / editorScale})`,
                    transformOrigin: 'left top',
                    marginTop: `${8 * (1 / editorScale - 1)}px`,
                    width: `${640 * editorScale}px`,
                  }}
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

            {/* Preview Panel - Right side of video */}
            <div className="flex flex-col gap-2">
              {/* Preview header - counter-scaled to stay normal size */}
              <div 
                className="flex items-center justify-between select-none"
                style={{
                  transform: `scale(${1 / editorScale})`,
                  transformOrigin: 'left top',
                  marginBottom: `${8 * (1 / editorScale - 1)}px`,
                  width: `${202.5 * editorScale}px`,
                }}
              >
                <span className="text-sm font-medium text-gray-400 select-none">Preview</span>
                <div className="flex items-center gap-1">
                  <button className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                    <Camera className="w-4 h-4" />
                  </button>
                  <button className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Platform Preview - 9:16 aspect ratio - Fixed size, scaled by parent */}
              <div 
                ref={previewContainerRef}
                className="relative bg-black border border-gray-700"
                style={{ 
                  width: '202.5px',
                  height: '360px',
                }}
              >
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
                
                {/* Preview showing cropped content */}
                <div className="w-full h-full relative">
                  {cropRegions.map((crop) => {
                    // Use fixed container dimensions (not scaled) for calculations
                    // The scale transform is applied to the parent, but crop percentages
                    // should be calculated based on the original 202.5x360 container
                    const containerWidth = 202.5
                    const containerHeight = 360
                    
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
                      />
                    )
                  })}

                  {/* Preview overlays */}
                  {overlays
                    .filter(o => currentTime >= o.startTime && currentTime <= o.endTime)
                    .map(overlay => (
                      <div
                        key={overlay.id}
                        className="absolute"
                        style={{
                          left: `${(overlay.videoLeft / 640) * 100}%`,
                          bottom: '10%',
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <span
                          style={{
                            fontSize: (overlay.fontSize || 16) * 0.5,
                            fontFamily: overlay.fontFamily,
                            fontWeight: overlay.fontWeight as React.CSSProperties['fontWeight'],
                            color: overlay.color || '#fff',
                            textShadow: overlay.textShadow,
                          }}
                        >
                          {overlay.content}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Platform UI overlay elements */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-3 pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-gray-800/80 flex items-center justify-center">
                    <span className="text-white text-xs">👍</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-800/80 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-800/80 flex items-center justify-center">
                    <span className="text-white text-xs">↗</span>
                  </div>
                </div>
              </div>

              {/* Platform Selector - counter-scaled to stay normal size */}
              <div 
                className="flex items-center gap-2"
                style={{
                  transform: `scale(${1 / editorScale})`,
                  transformOrigin: 'left top',
                  marginTop: `${8 * (1 / editorScale - 1)}px`,
                  width: `${202.5 * editorScale}px`,
                }}
              >
                <button
                  onClick={() => setPreviewPlatform('youtube')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    previewPlatform === 'youtube'
                      ? 'bg-red-600/20 text-red-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Youtube className="w-3 h-3" />
                  YouTube
                </button>
                <button
                  onClick={() => setPreviewPlatform('tiktok')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    previewPlatform === 'tiktok'
                      ? 'bg-pink-600/20 text-pink-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                  TikTok
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        <div className="border-t border-gray-800 bg-[#12121f]">
          {/* Video Controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-4">
              {/* Time Display */}
              <span className="text-sm font-mono text-gray-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Playback Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => videoRef && (videoRef.currentTime = Math.max(0, currentTime - 5))}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="p-2 hover:bg-gray-800 rounded-lg bg-gray-700"
                >
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => videoRef && (videoRef.currentTime = Math.min(duration, currentTime + 5))}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Edit tools */}
              <div className="flex items-center gap-1 ml-2">
                <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white" title="Split">
                  <Scissors className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white" title="Skip Forward">
                  <SkipForward className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white" title="Skip Back">
                  <SkipBack className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Volume Control */}
              <div className="relative">
                <button
                  onClick={handleToggleMute}
                  onMouseEnter={() => setShowVolume(true)}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
                >
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                {showVolume && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-800 rounded-lg"
                    onMouseEnter={() => volumeButtonTimeout.current && clearTimeout(volumeButtonTimeout.current)}
                    onMouseLeave={() => { volumeButtonTimeout.current = setTimeout(() => setShowVolume(false), 200) }}
                  >
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={muted ? 0 : volume}
                      onChange={(e) => handleChangeVolume(parseFloat(e.target.value))}
                      className="w-20"
                    />
                  </div>
                )}
              </div>

              {/* Zoom/Fit toggle */}
              <button
                onClick={() => setPreviewFit(previewFit === 100 ? 75 : 100)}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white text-xs font-medium"
              >
                {previewFit}%
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="p-4">
            {duration > 0 && (
              <TrimSlider
                videoRef={videoRef}
                duration={duration}
                startTime={startTime}
                endTime={endTime}
                setStartTime={setStartTime}
                setEndTime={setEndTime}
                overlays={overlays}
                setOverlays={setOverlays}
                currentTime={currentTime}
                selectedOverlayId={selectedOverlayId}
                setSelectedOverlayId={setSelectedOverlayId}
                ref={overlayBarRef}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
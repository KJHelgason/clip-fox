'use client'

import { useState, useCallback, useEffect, RefObject } from 'react'

export type CropRegion = {
  id: string
  name: string
  x: number // percentage 0-100 (position in source video)
  y: number // percentage 0-100 (position in source video)
  width: number // percentage 0-100 (size in source video)
  height: number // percentage 0-100 (size in source video)
  color: string
  // Preview position (where this crop appears in 9:16 output)
  previewX: number // percentage 0-100 (horizontal position in preview)
  previewY: number // percentage 0-100 (vertical position in preview)
  previewWidth: number // percentage 0-100 (width in preview - height is derived from aspect ratio)
  // Aspect ratio constraint
  aspectRatio?: 'freeform' | 'fullscreen' | '16:9' | '4:3' | 'square' | 'circle'
  cornerRounding?: number // 0-100 percentage
  zIndex?: number // for bring to front functionality
}

export type PreviewDragType = 
  | 'preview-move' 
  | 'preview-resize-tl' 
  | 'preview-resize-tr' 
  | 'preview-resize-bl' 
  | 'preview-resize-br'

type DragState = {
  cropId: string | null
  type: PreviewDragType | null
  startX: number
  startY: number
  startRegion: CropRegion | null
}

type SnappingState = {
  showCenterX: boolean
  showCenterY: boolean
}

type UsePreviewCropDragOptions = {
  containerRef: RefObject<HTMLDivElement | null>
  cropRegions: CropRegion[]
  setCropRegions: React.Dispatch<React.SetStateAction<CropRegion[]>>
  snappingEnabled: boolean
  onSelect?: (cropId: string) => void
}

type UsePreviewCropDragReturn = {
  dragState: DragState
  snapping: SnappingState
  handleMouseDown: (e: React.MouseEvent, cropId: string, type: PreviewDragType) => void
  isDragging: boolean
}

const SNAP_THRESHOLD = 3 // percentage
const MIN_SIZE = 15 // percentage - minimum width

/**
 * Custom hook for handling preview crop drag operations.
 * Manages move, resize (all 4 corners), snapping, and edge clamping.
 */
export function usePreviewCropDrag({
  containerRef,
  cropRegions,
  setCropRegions,
  snappingEnabled,
  onSelect,
}: UsePreviewCropDragOptions): UsePreviewCropDragReturn {
  
  const [dragState, setDragState] = useState<DragState>({
    cropId: null,
    type: null,
    startX: 0,
    startY: 0,
    startRegion: null,
  })
  
  const [snapping, setSnapping] = useState<SnappingState>({
    showCenterX: false,
    showCenterY: false,
  })

  const handleMouseDown = useCallback((
    e: React.MouseEvent,
    cropId: string,
    type: PreviewDragType
  ) => {
    e.stopPropagation()
    e.preventDefault()
    
    const crop = cropRegions.find(c => c.id === cropId)
    if (!crop) return
    
    setDragState({
      cropId,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startRegion: { ...crop },
    })
    
    onSelect?.(cropId)
  }, [cropRegions, onSelect])

  // Handle mouse move - global listener to track even outside container
  useEffect(() => {
    const { cropId, type, startX, startY, startRegion } = dragState
    if (!cropId || !type || !startRegion) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      // Use inner container if available for accurate dimensions
      const innerContainer = (container as any).innerContainer
      const rect = innerContainer ? innerContainer.getBoundingClientRect() : container.getBoundingClientRect()

      // Calculate delta in percentage terms
      const dxPercent = ((e.clientX - startX) / rect.width) * 100
      const dyPercent = ((e.clientY - startY) / rect.height) * 100

      // Calculate aspect ratio from source crop dimensions in reference video space
      // Source video is 16:9, use reference dimensions
      const refVideoW = 160
      const refVideoH = 90
      const cropW = (startRegion.width / 100) * refVideoW
      const cropH = (startRegion.height / 100) * refVideoH
      const aspectRatio = cropW / cropH

      const updated: CropRegion = { ...startRegion }

      if (type === 'preview-move') {
        // Calculate crop height in pixels, then convert to percentage
        const cropWidthPx = (startRegion.previewWidth / 100) * rect.width
        const cropHeightPx = cropWidthPx / aspectRatio
        const cropHeight = (cropHeightPx / rect.height) * 100
        
        // Calculate new position
        let newX = startRegion.previewX + dxPercent
        let newY = startRegion.previewY + dyPercent
        
        // Clamp X: crop must stay fully within container horizontally
        const maxX = Math.max(0, 100 - startRegion.previewWidth)
        newX = Math.max(0, Math.min(maxX, newX))
        
        // Clamp Y: crop must stay within container vertically
        // For crops SHORTER than container (height <= 100%):
        //   - minY = 0 (top edge at container top)
        //   - maxY = 100 - height (bottom edge at container bottom)
        // For crops TALLER than container (height > 100%):
        //   - minY = 100 - height (bottom edge at container bottom, top extends above)
        //   - maxY = 0 (top edge at container top, bottom extends below)
        let minY: number
        let maxY: number
        
        if (cropHeight <= 100) {
          // Crop fits in container - can move from top to bottom
          minY = 0
          maxY = 100 - cropHeight
        } else {
          // Crop taller than container - can move from bottom-aligned to top-aligned
          minY = 100 - cropHeight  // Negative value
          maxY = 0
        }
        
        newY = Math.max(minY, Math.min(maxY, newY))
        
        // Apply snapping if enabled
        let snapX = false
        let snapY = false
        
        if (snappingEnabled) {
          // Edge snapping for X
          if (newX < SNAP_THRESHOLD) newX = 0
          if (100 - (newX + startRegion.previewWidth) < SNAP_THRESHOLD) {
            newX = Math.max(0, 100 - startRegion.previewWidth)
          }
          
          // Edge snapping for Y (only if crop fits in container)
          if (cropHeight <= 100) {
            // Snap to top edge
            if (newY < SNAP_THRESHOLD) newY = 0
            
            // Snap to bottom edge
            const bottomAlignY = 100 - cropHeight
            if (bottomAlignY > 0 && Math.abs(newY - bottomAlignY) < SNAP_THRESHOLD) {
              newY = bottomAlignY
            }
            
            // Center Y snapping
            const centerY = newY + cropHeight / 2
            if (Math.abs(centerY - 50) < SNAP_THRESHOLD) {
              newY = 50 - cropHeight / 2
              snapY = true
            }
          }
          
          // Center snapping for X
          const centerX = newX + startRegion.previewWidth / 2
          if (Math.abs(centerX - 50) < SNAP_THRESHOLD) {
            newX = Math.max(0, 50 - startRegion.previewWidth / 2)
            snapX = true
          }
        }
        
        setSnapping({ showCenterX: snapX, showCenterY: snapY })
        
        updated.previewX = newX
        updated.previewY = newY
        
      } else {
        // Handle resize operations
        // Clear snapping indicators during resize
        setSnapping({ showCenterX: false, showCenterY: false })
        
        const result = calculateResize(
          type,
          startRegion,
          dxPercent,
          dyPercent,
          aspectRatio,
          rect.width,
          rect.height
        )
        
        updated.previewX = result.x
        updated.previewY = result.y
        updated.previewWidth = result.width
      }

      setCropRegions(prev => 
        prev.map(c => c.id === cropId ? updated : c)
      )
    }

    const handleMouseUp = () => {
      setDragState({
        cropId: null,
        type: null,
        startX: 0,
        startY: 0,
        startRegion: null,
      })
      setSnapping({ showCenterX: false, showCenterY: false })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, containerRef, snappingEnabled, setCropRegions])

  return {
    dragState,
    snapping,
    handleMouseDown,
    isDragging: dragState.cropId !== null,
  }
}

/**
 * Calculate new position and size for resize operations.
 * Each corner anchors the opposite corner and resizes toward/away from the cursor.
 * The anchor corner NEVER moves - only the dragged corner moves.
 * 
 * IMPORTANT: Height is derived from width via aspect ratio in PIXELS, not percentages.
 * The aspect ratio must account for the actual video dimensions (16:9 reference).
 */
function calculateResize(
  type: PreviewDragType,
  start: CropRegion,
  dxPercent: number,
  dyPercent: number,
  aspectRatio: number,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number; width: number } {
  
  // Calculate current height in pixels, then convert to percentage
  const startWidthPx = (start.previewWidth / 100) * containerWidth
  const startHeightPx = startWidthPx / aspectRatio
  const startHeightPercent = (startHeightPx / containerHeight) * 100
  
  // For bottom corners: The user is dragging a bottom corner, so we anchor the TOP.
  // Top edge (previewY) stays fixed, width changes, bottom edge moves with height.
  
  // For top corners: The user is dragging a top corner, so we anchor the BOTTOM.
  // Bottom edge stays fixed, width and Y both change.
  
  switch (type) {
    case 'preview-resize-br': {
      // Bottom-right corner dragged: anchor TOP-LEFT
      // Top (Y) and Left (X) stay fixed, width changes, bottom/right move
      let newWidth = start.previewWidth + dxPercent
      
      newWidth = Math.max(MIN_SIZE, newWidth)
      // Clamp to right edge
      newWidth = Math.min(100 - start.previewX, newWidth)
      
      // Calculate height and check bottom edge
      const newWidthPx = (newWidth / 100) * containerWidth
      const newHeightPx = newWidthPx / aspectRatio
      const newHeightPercent = (newHeightPx / containerHeight) * 100
      
      // If bottom would extend beyond container, shrink width to fit
      if (start.previewY + newHeightPercent > 100) {
        const maxHeightPercent = 100 - start.previewY
        const maxHeightPx = (maxHeightPercent / 100) * containerHeight
        const maxWidthPx = maxHeightPx * aspectRatio
        newWidth = (maxWidthPx / containerWidth) * 100
      }
      
      return { x: start.previewX, y: start.previewY, width: newWidth }
    }
    
    case 'preview-resize-bl': {
      // Bottom-left corner dragged: anchor TOP-RIGHT
      // Top (Y) and Right edge stay fixed, X and width change, bottom moves
      const anchorRight = start.previewX + start.previewWidth
      
      let newWidth = start.previewWidth - dxPercent
      newWidth = Math.max(MIN_SIZE, newWidth)
      
      let newX = anchorRight - newWidth
      
      // Clamp to left edge
      if (newX < 0) {
        newX = 0
        newWidth = anchorRight
      }
      
      // Calculate height and check bottom edge
      const newWidthPx = (newWidth / 100) * containerWidth
      const newHeightPx = newWidthPx / aspectRatio
      const newHeightPercent = (newHeightPx / containerHeight) * 100
      
      // If bottom would extend beyond container, shrink width to fit
      if (start.previewY + newHeightPercent > 100) {
        const maxHeightPercent = 100 - start.previewY
        const maxHeightPx = (maxHeightPercent / 100) * containerHeight
        const maxWidthPx = maxHeightPx * aspectRatio
        newWidth = (maxWidthPx / containerWidth) * 100
        newX = anchorRight - newWidth
      }
      
      // Y stays fixed (top edge anchored)
      return { x: newX, y: start.previewY, width: Math.max(MIN_SIZE, newWidth) }
    }
    
    case 'preview-resize-tr': {
      // Top-right corner dragged: anchor BOTTOM-LEFT
      // The BOTTOM edge and LEFT edge stay fixed. Top and right move.
      // We use vertical movement to drive the resize since the top edge is moving
      
      // Calculate anchor point (bottom edge position in percentage - this must NOT move)
      const anchorBottomPercent = start.previewY + startHeightPercent
      
      // Use vertical movement to drive the resize for top corners
      // Moving mouse UP (negative dy) = make bigger, moving DOWN = make smaller
      let newHeightPx = startHeightPx - (dyPercent / 100) * containerHeight
      newHeightPx = Math.max((MIN_SIZE / 100) * containerWidth / aspectRatio, newHeightPx)
      
      // Calculate new width from height (maintain aspect ratio)
      let newWidthPx = newHeightPx * aspectRatio
      let newWidth = (newWidthPx / containerWidth) * 100
      
      // Clamp width to right edge of container
      if (start.previewX + newWidth > 100) {
        newWidth = 100 - start.previewX
        newWidthPx = (newWidth / 100) * containerWidth
        newHeightPx = newWidthPx / aspectRatio
      }
      
      // Calculate new Y from anchored bottom
      const newHeightPercent = (newHeightPx / containerHeight) * 100
      let newY = anchorBottomPercent - newHeightPercent
      
      // Clamp to top edge
      if (newY < 0) {
        newY = 0
        const maxHeightPercent = anchorBottomPercent
        const maxHeightPx = (maxHeightPercent / 100) * containerHeight
        newWidthPx = maxHeightPx * aspectRatio
        newWidth = (newWidthPx / containerWidth) * 100
      }
      
      return { x: start.previewX, y: newY, width: Math.max(MIN_SIZE, newWidth) }
    }
    
    case 'preview-resize-tl': {
      // Top-left corner dragged: anchor BOTTOM-RIGHT
      // The BOTTOM edge and RIGHT edge stay fixed. Top and left move.
      
      // Calculate anchor points (these must NOT move)
      const anchorRight = start.previewX + start.previewWidth
      const anchorBottomPercent = start.previewY + startHeightPercent
      
      // Use vertical movement to drive the resize for top corners
      let newHeightPx = startHeightPx - (dyPercent / 100) * containerHeight
      newHeightPx = Math.max((MIN_SIZE / 100) * containerWidth / aspectRatio, newHeightPx)
      
      // Calculate new width from height (maintain aspect ratio)
      let newWidthPx = newHeightPx * aspectRatio
      let newWidth = (newWidthPx / containerWidth) * 100
      
      // Calculate new positions from anchors
      let newX = anchorRight - newWidth
      const newHeightPercent = (newHeightPx / containerHeight) * 100
      let newY = anchorBottomPercent - newHeightPercent
      
      // Clamp to left edge
      if (newX < 0) {
        newX = 0
        newWidth = anchorRight
        newWidthPx = (newWidth / 100) * containerWidth
        newHeightPx = newWidthPx / aspectRatio
        const constrainedHeightPercent = (newHeightPx / containerHeight) * 100
        newY = anchorBottomPercent - constrainedHeightPercent
      }
      
      // Clamp to top edge
      if (newY < 0) {
        newY = 0
        const maxHeightPercent = anchorBottomPercent
        const maxHeightPx = (maxHeightPercent / 100) * containerHeight
        newWidthPx = maxHeightPx * aspectRatio
        newWidth = (newWidthPx / containerWidth) * 100
        newX = anchorRight - newWidth
      }
      
      return { x: Math.max(0, newX), y: Math.max(0, newY), width: Math.max(MIN_SIZE, newWidth) }
    }
    
    default:
      return { x: start.previewX, y: start.previewY, width: start.previewWidth }
  }
}

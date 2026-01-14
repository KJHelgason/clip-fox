'use client'

import React from 'react'
import { CropRegion, PreviewDragType } from '@/lib/hooks/usePreviewCropDrag'

type PreviewCropRegionProps = {
  crop: CropRegion
  videoSrc: string
  isSelected: boolean
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onMouseDown: (e: React.MouseEvent, cropId: string, type: PreviewDragType) => void
  // Preview container dimensions (fixed pixels)
  containerWidth: number
  containerHeight: number
}

/**
 * A single crop region rendered in the preview panel.
 * Shows the cropped portion of the video at the specified position and size.
 * Includes resize handles when selected.
 */
export function PreviewCropRegion({
  crop,
  videoSrc,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  containerWidth,
  containerHeight,
}: PreviewCropRegionProps) {
  
  // Source video is 16:9. Use reference dimensions for calculations.
  const refVideoW = 160
  const refVideoH = 90
  
  // The crop region at reference scale
  const cropW = (crop.width / 100) * refVideoW
  const cropH = (crop.height / 100) * refVideoH
  const cropX = (crop.x / 100) * refVideoW
  const cropY = (crop.y / 100) * refVideoH
  
  // The crop's aspect ratio (from source video crop)
  const cropAspect = cropW / cropH
  
  // Calculate box dimensions based on preview percentages
  const boxW = (crop.previewWidth / 100) * containerWidth
  const boxH = boxW / cropAspect // Height derived from aspect ratio
  
  // Position from percentages
  const boxLeft = (crop.previewX / 100) * containerWidth
  const boxTop = (crop.previewY / 100) * containerHeight
  
  // Scale the video so the crop region fills the box
  const scale = boxW / cropW
  const scaledVideoW = refVideoW * scale
  const scaledVideoH = refVideoH * scale
  
  // Position video so crop region is at origin of box
  const videoLeft = -cropX * scale
  const videoTop = -cropY * scale
  
  // Apply corner rounding
  const cornerRounding = crop.cornerRounding || 0
  const borderRadius = cornerRounding > 0 ? `${cornerRounding}%` : '0'

  return (
    <div
      className="absolute"
      style={{
        left: boxLeft,
        top: boxTop,
        width: boxW,
        height: boxH,
        zIndex: crop.zIndex || (isSelected ? 50 : 40),
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* The visible box showing the cropped content */}
      <div
        className="absolute cursor-move overflow-hidden"
        style={{
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          border: (isHovered || isSelected) 
            ? `2px solid ${crop.color}` 
            : '1px solid rgba(255,255,255,0.2)',
          boxSizing: 'border-box',
          borderRadius: borderRadius,
        }}
        onMouseDown={(e) => onMouseDown(e, crop.id, 'preview-move')}
      >
        {/* Video positioned and scaled so crop region fills this box */}
        <video
          src={videoSrc}
          className="absolute pointer-events-none"
          style={{
            width: scaledVideoW,
            height: scaledVideoH,
            minWidth: scaledVideoW,
            minHeight: scaledVideoH,
            maxWidth: 'none',
            maxHeight: 'none',
            left: videoLeft,
            top: videoTop,
            objectFit: 'fill',
          }}
          muted
          playsInline
        />
        
        {/* 4 Corner resize handles */}
        {isSelected && (
          <>
            {/* Top-left */}
            <div
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white cursor-nw-resize"
              style={{ border: `2px solid ${crop.color}`, zIndex: 60 }}
              onMouseDown={(e) => {
                e.stopPropagation()
                onMouseDown(e, crop.id, 'preview-resize-tl')
              }}
            />
            {/* Top-right */}
            <div
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white cursor-ne-resize"
              style={{ border: `2px solid ${crop.color}`, zIndex: 60 }}
              onMouseDown={(e) => {
                e.stopPropagation()
                onMouseDown(e, crop.id, 'preview-resize-tr')
              }}
            />
            {/* Bottom-left */}
            <div
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white cursor-sw-resize"
              style={{ border: `2px solid ${crop.color}`, zIndex: 60 }}
              onMouseDown={(e) => {
                e.stopPropagation()
                onMouseDown(e, crop.id, 'preview-resize-bl')
              }}
            />
            {/* Bottom-right */}
            <div
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white cursor-se-resize"
              style={{ border: `2px solid ${crop.color}`, zIndex: 60 }}
              onMouseDown={(e) => {
                e.stopPropagation()
                onMouseDown(e, crop.id, 'preview-resize-br')
              }}
            />
          </>
        )}
        
        {/* Crop name label (non-selectable to prevent drag issues) */}
        <div 
          className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap select-none pointer-events-none"
          style={{ backgroundColor: crop.color, color: '#fff' }}
        >
          {crop.name}
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useRef, useEffect, useMemo, useState } from 'react'

type ZoomOverlayProps = {
  videoSrc: string
  zoom: { scale: number; x: number; y: number }
  containerWidth: number
  containerHeight: number
  mainVideoRef: HTMLVideoElement | null
  playing: boolean
}

// Source video reference dimensions (16:9 aspect ratio)
const SRC_VIDEO_WIDTH = 1600
const SRC_VIDEO_HEIGHT = 900

/**
 * ZoomOverlay - displays a zoomed 9:16 crop of the video covering the entire preview.
 * Uses a canvas to capture frames from the main video and display them zoomed.
 */
export function ZoomOverlay({
  videoSrc,
  zoom,
  containerWidth,
  containerHeight,
  mainVideoRef,
  playing,
}: ZoomOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

  // Calculate the crop region from the source video
  const cropRegion = useMemo(() => {
    // The crop box dimensions as percentages of the 16:9 source video
    // This matches ZoomEffects panel calculation
    const heightPercent = 100 / zoom.scale
    const widthPercent = heightPercent * (9 / 16) / (16 / 9)

    // Convert to pixel dimensions in source video coordinates
    const cropWidth = (widthPercent / 100) * SRC_VIDEO_WIDTH
    const cropHeight = (heightPercent / 100) * SRC_VIDEO_HEIGHT

    // Calculate the crop region position (top-left corner)
    // zoom.x and zoom.y are center points as percentages
    const centerX = (zoom.x / 100) * SRC_VIDEO_WIDTH
    const centerY = (zoom.y / 100) * SRC_VIDEO_HEIGHT

    // Clamp the region to stay within video bounds
    const cropX = Math.max(0, Math.min(SRC_VIDEO_WIDTH - cropWidth, centerX - cropWidth / 2))
    const cropY = Math.max(0, Math.min(SRC_VIDEO_HEIGHT - cropHeight, centerY - cropHeight / 2))

    return { cropX, cropY, cropWidth, cropHeight }
  }, [zoom.scale, zoom.x, zoom.y])

  // Draw the zoomed video frame to canvas
  useEffect(() => {
    if (!mainVideoRef || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match container
    canvas.width = containerWidth
    canvas.height = containerHeight

    const drawFrame = () => {
      if (!mainVideoRef || mainVideoRef.readyState < 2) {
        // Video not ready yet, try again next frame
        animationRef.current = requestAnimationFrame(drawFrame)
        return
      }

      // Get actual video dimensions
      const videoWidth = mainVideoRef.videoWidth || SRC_VIDEO_WIDTH
      const videoHeight = mainVideoRef.videoHeight || SRC_VIDEO_HEIGHT

      // Scale crop region to actual video dimensions
      const scaleX = videoWidth / SRC_VIDEO_WIDTH
      const scaleY = videoHeight / SRC_VIDEO_HEIGHT

      const srcX = cropRegion.cropX * scaleX
      const srcY = cropRegion.cropY * scaleY
      const srcW = cropRegion.cropWidth * scaleX
      const srcH = cropRegion.cropHeight * scaleY

      // Clear and draw
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(
        mainVideoRef,
        srcX, srcY, srcW, srcH,  // Source rectangle
        0, 0, canvas.width, canvas.height  // Destination rectangle (fill canvas)
      )

      // Continue animation loop
      animationRef.current = requestAnimationFrame(drawFrame)
    }

    // Start drawing
    drawFrame()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [mainVideoRef, containerWidth, containerHeight, cropRegion])

  return (
    <div
      className="absolute overflow-hidden pointer-events-none"
      style={{
        zIndex: 80, // Above crops (10-49) and resize handles (60), but below overlays (100+)
        width: containerWidth,
        height: containerHeight,
        left: 0,
        top: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          width: containerWidth,
          height: containerHeight,
        }}
      />
    </div>
  )
}

import React, { useRef, useState, useEffect, useCallback, forwardRef } from 'react'
import { Slider } from '@/components/ui/slider'
import { OverlayElement, findAvailableRow } from '@/lib/types'
import { Scissors, Undo2, Trash2, Zap } from 'lucide-react'

type Props = {
  videoRef: HTMLVideoElement | null
  duration: number
  startTime: number
  endTime: number
  setStartTime: (t: number) => void
  setEndTime: (t: number) => void
  overlays: OverlayElement[]
  setOverlays: React.Dispatch<React.SetStateAction<OverlayElement[]>>
  currentTime: number
  selectedOverlayId?: string | null
  setSelectedOverlayId?: (id: string | null) => void
  silenceRegions?: { start: number; end: number }[] // SmartCuts detected silence
}

const TrimSlider = forwardRef<HTMLDivElement, Props>(function TrimSlider(
  {
    videoRef,
    duration,
    startTime,
    endTime,
    setStartTime,
    setEndTime,
    overlays,
    setOverlays,
    currentTime,
    selectedOverlayId,
    setSelectedOverlayId,
    silenceRegions = [],
  },
  forwardedRef
) {
  const [sliderKey, setSliderKey] = useState(0)
  const [thumbs, setThumbs] = useState<number[]>([0, duration])
  const overlayBarRef = useRef<HTMLDivElement>(null)
  // Use the forwarded ref for timeline bar
  const barRef = (forwardedRef as React.RefObject<HTMLDivElement>) || overlayBarRef

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'move' | 'resize-left' | 'resize-right' | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [dragStartY, setDragStartY] = useState<number>(0)
  const [dragStartOverlay, setDragStartOverlay] = useState<OverlayElement | null>(null)
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const [originalRow, setOriginalRow] = useState<number | null>(null)

  // --- Undo ---
  const [history, setHistory] = useState<{ overlays: OverlayElement[]; thumbs: number[] }[]>([])

  const recordHistory = useCallback(() => {
    setHistory(h => [...h, { overlays: overlays.map(o => ({ ...o })), thumbs: [...thumbs] }])
  }, [overlays, thumbs])

  const handleUndo = useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1]
      setOverlays(prev.overlays)
      setThumbs(prev.thumbs)
      setHistory(history.slice(0, -1))
      setSelectedOverlayId?.(null)
    }
  }, [history, setOverlays, setThumbs, setSelectedOverlayId])

  useEffect(() => {
    setStartTime(thumbs[0])
    setEndTime(thumbs[thumbs.length - 1])
  }, [thumbs, setStartTime, setEndTime])

  // --- Timeline click to seek ---
  const handleSliderBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || !videoRef) return
    if (e.button !== 0) return
    const barRect = barRef.current.getBoundingClientRect()
    const x = e.clientX - barRect.left
    const pct = x / barRect.width
    const newTime = Math.max(0, Math.min(duration, pct * duration))
    videoRef.currentTime = newTime
  }

  // --- Row logic ---
  const overlayRowHeight = 38
  const maxRow = overlays.length === 0 ? 0 : Math.max(...overlays.map(o => o.row))
  const totalOverlayBarHeight = (maxRow + 1) * overlayRowHeight

  // --- Split, thumbs, and slider logic ---
  const segments = thumbs
    .slice(0, -1)
    .map((start, i) => ({
      start,
      end: thumbs[i + 1],
    }))
    .filter(seg => seg.end > seg.start)

  const handleSplit = () => {
    if (!videoRef || thumbs.length > 20) return
    const splitPoint = parseFloat(videoRef.currentTime.toFixed(2))
    const offset = 0.10
    const rightThumb = Math.min(duration, parseFloat((splitPoint + offset).toFixed(2)))
    if (!thumbs.includes(splitPoint) && !thumbs.includes(rightThumb)) {
      recordHistory()
      const newThumbs = [...thumbs, splitPoint, rightThumb].sort((a, b) => a - b)
      setThumbs(newThumbs)
      setSliderKey(prev => prev + 1)
    }
  }

  const handleThumbChange = (newThumbs: number[]) => {
    recordHistory()
    let sortedThumbs = newThumbs
      .map(t => Math.max(0, Math.min(duration, parseFloat(t.toFixed(2)))))
      .sort((a, b) => a - b)
    sortedThumbs = Array.from(new Set(sortedThumbs))
    setThumbs(sortedThumbs)
  }

  useEffect(() => {
    if (!videoRef) return
    const inKeep = segments.some(
      (seg, idx) => idx % 2 === 0 && currentTime >= seg.start && currentTime < seg.end
    )
    if (!inKeep) {
      const next = segments.find((seg, idx) => idx % 2 === 0 && seg.start > currentTime)
      if (next) {
        videoRef.currentTime = next.start
      } else {
        videoRef.pause()
      }
    }
  }, [currentTime, segments, videoRef])

  const renderThumbConnectors = () =>
    segments.map((seg, idx) => {
      if (idx % 2 !== 0) return null
      const leftPct = (seg.start / duration) * 100
      const widthPct = ((seg.end - seg.start) / duration) * 100
      return (
        <React.Fragment key={idx}>
          <div
            className="absolute bg-emerald-500"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: '3px',
              top: 0,
              zIndex: 1,
              borderRadius: '2px 2px 0 0',
            }}
          />
          <div
            className="absolute bg-emerald-500"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: '3px',
              bottom: 0,
              zIndex: 1,
              borderRadius: '0 0 2px 2px',
            }}
          />
        </React.Fragment>
      )
    })

  const renderCutSegmentOverlays = () =>
    segments.map((seg, idx) => {
      if (idx % 2 !== 1) return null
      const leftPct = (seg.start / duration) * 100
      const widthPct = ((seg.end - seg.start) / duration) * 100
      return (
        <div
          key={idx}
          className="absolute h-full bg-red-500/20 border-x border-red-500/40"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            top: 0,
            zIndex: 1,
          }}
        >
          {/* Diagonal stripes pattern for cut sections */}
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239, 68, 68, 0.3) 4px, rgba(239, 68, 68, 0.3) 8px)',
            }}
          />
        </div>
      )
    })

  // --- Drag/Swap logic ---
  const handleTimelineMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    id: string,
    type: 'move' | 'resize-left' | 'resize-right'
  ) => {
    if (selectedOverlayId !== id) setSelectedOverlayId?.(id)
    if (draggingId !== id || !dragType) recordHistory()
    setDraggingId(id)
    setDragType(type)
    setDragStartX(e.clientX)
    setDragStartY(e.clientY)
    const overlay = overlays.find(el => el.id === id)
    setDragStartOverlay(overlay || null)
    setOriginalRow(overlay?.row ?? null)
    setHoverRow(overlay?.row ?? null)
    e.stopPropagation()
  }

  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggingId || !dragType || !dragStartOverlay || !barRef.current) return
    const barRect = barRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStartX
    if (dragType === 'move') {
      let newLeft = dragStartOverlay.timelineLeft + dx
      newLeft = Math.max(0, Math.min(barRect.width - dragStartOverlay.timelineWidth, newLeft))
      const newStartTime = (newLeft / barRect.width) * duration
      const newEndTime = Math.min(duration, newStartTime + (dragStartOverlay.endTime - dragStartOverlay.startTime))
      const newRow = findAvailableRow(overlays.filter(o => o.id !== draggingId), {
        startTime: newStartTime,
        endTime: newEndTime,
        id: draggingId
      })
      setOverlays(olds => olds.map(el =>
        el.id === draggingId
          ? {
              ...el,
              timelineLeft: newLeft,
              startTime: newStartTime,
              endTime: newEndTime,
              row: newRow,
            }
          : el
      ))
      const y = e.clientY - barRect.top
      const overRow = Math.max(0, Math.floor(y / overlayRowHeight))
      setHoverRow(overRow)
    }
    if (dragType === 'resize-left') {
      let newLeft = dragStartOverlay.timelineLeft + dx
      newLeft = Math.max(0, Math.min(dragStartOverlay.timelineLeft + dragStartOverlay.timelineWidth - 30, newLeft))
      const newWidth = dragStartOverlay.timelineWidth - dx
      const width = Math.max(30, newWidth)
      const newStartTime = (newLeft / barRect.width) * duration
      setOverlays(olds => olds.map(el =>
        el.id === draggingId
          ? {
              ...el,
              timelineLeft: newLeft,
              timelineWidth: width,
              startTime: newStartTime,
              row: findAvailableRow(
                olds.filter(o => o.id !== draggingId),
                {
                  startTime: newStartTime,
                  endTime: el.endTime,
                  id: draggingId,
                }
              ),
            }
          : el
      ))
    }
    if (dragType === 'resize-right') {
      let newWidth = dragStartOverlay.timelineWidth + dx
      newWidth = Math.max(30, Math.min(barRect.width - dragStartOverlay.timelineLeft, newWidth))
      const newEndTime = Math.min(duration, dragStartOverlay.startTime + (newWidth / barRect.width) * duration)
      setOverlays(olds => olds.map(el =>
        el.id === draggingId
          ? {
              ...el,
              timelineWidth: newWidth,
              endTime: newEndTime,
              row: findAvailableRow(
                olds.filter(o => o.id !== draggingId),
                {
                  startTime: el.startTime,
                  endTime: newEndTime,
                  id: draggingId,
                }
              ),
            }
          : el
      ))
    }
  }

  // PATCH: Swap overlays if possible when dragging vertically
  const handleTimelineMouseUp = () => {
    if (
      draggingId &&
      dragType === 'move' &&
      hoverRow !== null &&
      originalRow !== null &&
      hoverRow !== originalRow
    ) {
      const draggingOverlay = overlays.find(o => o.id === draggingId)!
      // Find overlays on the target row that overlap
      const overlaysInTargetRow = overlays.filter(
        o => o.row === hoverRow && o.id !== draggingId
      )
      // Find overlays in original row that overlap with draggingOverlay's time
      const overlaysInOriginalRow = overlays.filter(
        o => o.row === originalRow && o.id !== draggingId &&
        Math.max(o.startTime, draggingOverlay.startTime) < Math.min(o.endTime, draggingOverlay.endTime)
      )
      const canMove = !overlaysInTargetRow.some(
        o =>
          Math.max(o.startTime, draggingOverlay.startTime) < Math.min(o.endTime, draggingOverlay.endTime)
      )
      if (canMove) {
        // Move to empty space on target row
        setOverlays(overlays.map(o =>
          o.id === draggingId ? { ...o, row: hoverRow } : o
        ))
      } else {
        // Try to swap if exactly one conflicting overlay and swap is safe
        const conflicting = overlaysInTargetRow.find(
          o =>
            Math.max(o.startTime, draggingOverlay.startTime) < Math.min(o.endTime, draggingOverlay.endTime)
        )
        if (
          conflicting &&
          // Check if the original row has space for the conflicting overlay's time
          !overlaysInOriginalRow.some(
            o =>
              Math.max(o.startTime, conflicting.startTime) < Math.min(o.endTime, conflicting.endTime)
          )
        ) {
          setOverlays(overlays.map(o => {
            if (o.id === draggingId) return { ...o, row: hoverRow }
            if (o.id === conflicting.id) return { ...o, row: originalRow }
            return o
          }))
        }
        // else: can't move or swap
      }
    }
    setDraggingId(null)
    setDragType(null)
    setDragStartOverlay(null)
    setOriginalRow(null)
    setHoverRow(null)
  }

  const playheadX =
    barRef.current && duration > 0
      ? (currentTime / duration) * barRef.current.getBoundingClientRect().width
      : 0

  function handleDeleteSelected() {
    if (!selectedOverlayId) return
    recordHistory()
    setOverlays(olds => olds.filter(el => el.id !== selectedOverlayId))
    setSelectedOverlayId?.(null)
  }

  // SmartCuts - auto-mark silence regions for cutting
  const handleSmartCuts = () => {
    if (silenceRegions.length === 0) return
    recordHistory()
    // Add split points at silence boundaries
    const newThumbs = [...thumbs]
    silenceRegions.forEach(region => {
      if (!newThumbs.includes(region.start)) newThumbs.push(region.start)
      if (!newThumbs.includes(region.end)) newThumbs.push(region.end)
    })
    setThumbs(newThumbs.sort((a, b) => a - b))
    setSliderKey(prev => prev + 1)
  }

  // Get overlay color based on type
  const getOverlayColor = (type: string) => {
    switch (type) {
      case 'text': return 'bg-amber-500/70 border-amber-400'
      case 'image': return 'bg-purple-500/70 border-purple-400'
      case 'sticker': return 'bg-pink-500/70 border-pink-400'
      case 'shape': return 'bg-cyan-500/70 border-cyan-400'
      default: return 'bg-blue-500/70 border-blue-400'
    }
  }

  return (
    <div className="pt-4 space-y-3">
      {/* Segment indicators */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          {segments.map((segment, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 text-xs rounded font-medium ${
                idx % 2 === 0 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {idx % 2 === 0 ? '✓ Keep' : '✕ Cut'} {segment.start.toFixed(1)}s → {segment.end.toFixed(1)}s
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          {silenceRegions.length > 0 && (
            <button
              onClick={handleSmartCuts}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 transition"
              title="Auto-detect and mark silent sections"
            >
              <Zap className="w-3.5 h-3.5" />
              SmartCuts
            </button>
          )}
          <button
            onClick={handleSplit}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition"
          >
            <Scissors className="w-3.5 h-3.5" />
            Split
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
          {selectedOverlayId && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition"
              title="Delete selected element"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Overlay Timeline */}
      <div
        ref={barRef}
        className="relative w-full mt-2 border border-zinc-700 rounded-lg bg-zinc-800/50"
        style={{ height: Math.max(totalOverlayBarHeight, overlayRowHeight), overflow: "hidden" }}
        onMouseUp={handleTimelineMouseUp}
        onMouseMove={handleTimelineMouseMove}
        onClick={handleSliderBarClick}
      >
        {/* Grid lines for visual guidance */}
        {Array.from({ length: Math.floor(duration / 5) + 1 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-zinc-700/50"
            style={{ left: `${(i * 5 / duration) * 100}%` }}
          />
        ))}

        {/* Hover row indicator */}
        {hoverRow !== null &&
          <div
            className="absolute left-0 w-full pointer-events-none"
            style={{
              top: hoverRow * overlayRowHeight,
              height: overlayRowHeight,
              background: "rgba(59, 130, 246, 0.1)",
              zIndex: 0,
              transition: "top 0.1s"
            }}
          />
        }

        {/* Silence regions indicator (SmartCuts preview) */}
        {silenceRegions.map((region, idx) => {
          const leftPct = (region.start / duration) * 100
          const widthPct = ((region.end - region.start) / duration) * 100
          return (
            <div
              key={`silence-${idx}`}
              className="absolute top-0 bottom-0 bg-red-500/10 border-l border-r border-red-500/30"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              title={`Silence: ${region.start.toFixed(1)}s - ${region.end.toFixed(1)}s`}
            />
          )
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg shadow-red-500/50"
          style={{
            left: playheadX,
            height: Math.max(totalOverlayBarHeight, overlayRowHeight),
            zIndex: 20,
            pointerEvents: 'none',
            transition: 'left 0.06s linear'
          }}
        >
          {/* Playhead handle */}
          <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-lg" />
        </div>

        {/* Overlay elements */}
        {overlays
          .slice()
          .sort((a, b) => a.row - b.row || a.startTime - b.startTime)
          .map(el => (
          <div
            key={el.id}
            className={`absolute rounded-md transition-all ${getOverlayColor(el.type)} ${
              selectedOverlayId === el.id ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900' : ''
            }`}
            style={{
              left: el.timelineLeft,
              top: el.row * overlayRowHeight + 4,
              width: el.timelineWidth,
              height: el.timelineHeight - 8,
              cursor: draggingId === el.id && dragType === 'move' ? 'grabbing' : 'grab',
              userSelect: 'none',
              zIndex: selectedOverlayId === el.id ? 10 : 2,
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75em',
              fontWeight: 500,
              opacity: draggingId === el.id && hoverRow !== null && hoverRow !== el.row ? 0.5 : 1,
            }}
            onMouseDown={e => handleTimelineMouseDown(e, el.id, 'move')}
            onContextMenu={e => {
              e.preventDefault()
              recordHistory()
              setOverlays(olds => olds.filter(o => o.id !== el.id))
              if (selectedOverlayId === el.id) setSelectedOverlayId?.(null)
            }}
            tabIndex={0}
            title={`${el.type} (${el.startTime.toFixed(2)}s–${el.endTime.toFixed(2)}s)`}
          >
            <span className="truncate px-2 text-white drop-shadow-sm">
              {el.type === 'text' ? el.content : el.type}
            </span>
            
            {/* Resize handles */}
            <div
              className="absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-l transition"
              onMouseDown={e => handleTimelineMouseDown(e, el.id, 'resize-left')}
            />
            <div
              className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-r transition"
              onMouseDown={e => handleTimelineMouseDown(e, el.id, 'resize-right')}
            />
          </div>
        ))}

        {/* Empty state */}
        {overlays.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
            Drag elements here to add them to the timeline
          </div>
        )}
      </div>

      {/* Video trim timeline */}
      <div className="relative w-full h-14 mt-2 bg-zinc-800/50 rounded-lg border border-zinc-700 overflow-hidden">
        {/* Keep/Cut visualization */}
        {renderCutSegmentOverlays()}
        {renderThumbConnectors()}
        
        <Slider
          key={sliderKey}
          min={0}
          max={duration}
          step={0.01}
          value={thumbs}
          onValueChange={handleThumbChange}
          minStepsBetweenThumbs={1}
          duration={duration}
          playheadTime={currentTime}
          overlays={renderCutSegmentOverlays()}
          connectors={renderThumbConnectors()}
          className="w-full absolute top-0 left-0 h-full"
        />
      </div>

      {/* Timeline info */}
      <div className="flex justify-between text-xs text-zinc-500">
        <span>
          Keep: {segments.filter((_, idx) => idx % 2 === 0).map(seg => `${seg.start.toFixed(1)}-${seg.end.toFixed(1)}s`).join(', ') || 'Full clip'}
        </span>
        <span>
          {thumbs.length - 2} splits • {duration.toFixed(1)}s total
        </span>
      </div>
    </div>
  )
})

export default TrimSlider
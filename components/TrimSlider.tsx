import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Slider } from '@/components/ui/slider'

type OverlayElement = {
  id: string
  type: 'text' | 'image'
  videoLeft: number
  videoTop: number
  videoWidth: number
  videoHeight: number
  timelineLeft: number
  timelineTop: number
  timelineWidth: number
  timelineHeight: number
  content?: string
  src?: string
  startTime: number
  endTime: number
  row: number // explicit row property
}

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
}

// Utility: find the lowest available row where the overlay does not overlap others
function findAvailableRow(
  overlays: OverlayElement[],
  candidate: { startTime: number; endTime: number; id?: string }
): number {
  let row = 0
  while (true) {
    const overlaps = overlays.some(
      o =>
        o.row === row &&
        o.id !== candidate.id &&
        Math.max(o.startTime, candidate.startTime) < Math.min(o.endTime, candidate.endTime)
    )
    if (!overlaps) return row
    row++
  }
}

export default function TrimSlider({
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
}: Props) {
  const [sliderKey, setSliderKey] = useState(0)
  const [thumbs, setThumbs] = useState<number[]>([0, duration])
  const overlayBarRef = useRef<HTMLDivElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'move' | 'resize-left' | 'resize-right' | null>(null)
  const [dragStartX, setDragStartX] = useState<number>(0)
  const [dragStartY, setDragStartY] = useState<number>(0)
  const [dragStartOverlay, setDragStartOverlay] = useState<OverlayElement | null>(null)
  const [hoverRow, setHoverRow] = useState<number | null>(null)
  const [originalRow, setOriginalRow] = useState<number | null>(null)

  // --- UNDO HISTORY ---
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

  React.useEffect(() => {
    setStartTime(thumbs[0])
    setEndTime(thumbs[thumbs.length - 1])
  }, [thumbs, setStartTime, setEndTime])

  // --- PLAYHEAD JUMP ---
  const handleSliderBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayBarRef.current || !videoRef) return;
    if (e.button !== 0) return;
    const barRect = overlayBarRef.current.getBoundingClientRect();
    const x = e.clientX - barRect.left;
    const pct = x / barRect.width;
    const newTime = Math.max(0, Math.min(duration, pct * duration));
    videoRef.currentTime = newTime;
  };

  // --- ROW LOGIC ---
  const overlayRowHeight = 38
  const maxRow = overlays.length === 0 ? 0 : Math.max(...overlays.map(o => o.row))
  const totalOverlayBarHeight = (maxRow + 1) * overlayRowHeight

  // --- Split, thumbs, and slider logic (unchanged) ---
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

  React.useEffect(() => {
    if (!videoRef) return
    const inKeep = segments.some((seg, idx) => idx % 2 === 0 && currentTime >= seg.start && currentTime < seg.end)
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
            className="absolute bg-blue-500"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: '2px',
              top: 0,
              zIndex: 1,
            }}
          />
          <div
            className="absolute bg-blue-500"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              height: '2px',
              bottom: 0,
              zIndex: 1,
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
          className="absolute h-8 bg-gray-400 opacity-40"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            top: 0,
            zIndex: 1,
          }}
        />
      )
    })

  // --- Drag/Swap logic, including row packing ---
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
    if (!draggingId || !dragType || !dragStartOverlay || !overlayBarRef.current) return
    const barRect = overlayBarRef.current.getBoundingClientRect()
    const dx = e.clientX - dragStartX
    if (dragType === 'move') {
      let newLeft = dragStartOverlay.timelineLeft + dx
      newLeft = Math.max(0, Math.min(barRect.width - dragStartOverlay.timelineWidth, newLeft))
      const newStartTime = (newLeft / barRect.width) * duration
      const newEndTime = Math.min(duration, newStartTime + (dragStartOverlay.endTime - dragStartOverlay.startTime))
      // PATCH: recalculate row to allow for packing as you move in time
      const newRow = findAvailableRow(overlays.filter(o => o.id !== draggingId), {
        startTime: newStartTime,
        endTime: newEndTime,
        id: draggingId
      })
      setOverlays(olds => olds.map(el =>
        el.id === draggingId
          ? { ...el, timelineLeft: newLeft, startTime: newStartTime, endTime: newEndTime, row: newRow }
          : el
      ))
      // For vertical drag highlight
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
      // PATCH: recalculate row to allow for packing
      const newRow = findAvailableRow(overlays.filter(o => o.id !== draggingId), {
        startTime: newStartTime,
        endTime: dragStartOverlay.endTime,
        id: draggingId
      })
      setOverlays(olds => olds.map(el =>
        el.id === draggingId
          ? { ...el, timelineLeft: newLeft, timelineWidth: width, startTime: newStartTime, row: newRow }
          : el
      ))
    }
    if (dragType === 'resize-right') {
      let newWidth = dragStartOverlay.timelineWidth + dx
      newWidth = Math.max(30, Math.min(barRect.width - dragStartOverlay.timelineLeft, newWidth))
      const newEndTime = Math.min(duration, dragStartOverlay.startTime + (newWidth / barRect.width) * duration)
      // PATCH: recalculate row to allow for packing
      const newRow = findAvailableRow(overlays.filter(o => o.id !== draggingId), {
        startTime: dragStartOverlay.startTime,
        endTime: newEndTime,
        id: draggingId
      })
      setOverlays(olds => olds.map(el =>
        el.id === draggingId
          ? { ...el, timelineWidth: newWidth, endTime: newEndTime, row: newRow }
          : el
      ))
    }
  }

  // PATCH: On vertical drag, moving to a row is only allowed if there is no overlap on that row
  const handleTimelineMouseUp = () => {
    if (
      draggingId &&
      dragType === 'move' &&
      hoverRow !== null &&
      originalRow !== null &&
      hoverRow !== originalRow
    ) {
      const draggingOverlay = overlays.find(o => o.id === draggingId)!
      const canMove = !overlays.some(
        o =>
          o.row === hoverRow &&
          o.id !== draggingId &&
          Math.max(o.startTime, draggingOverlay.startTime) < Math.min(o.endTime, draggingOverlay.endTime)
      )
      if (canMove) {
        setOverlays(overlays.map(o =>
          o.id === draggingId ? { ...o, row: hoverRow } : o
        ))
      }
    }
    setDraggingId(null)
    setDragType(null)
    setDragStartOverlay(null)
    setOriginalRow(null)
    setHoverRow(null)
  }

  // PATCH: When adding overlays, use findAvailableRow to allow packing
  // The parent page should use this pattern when adding overlays:
  // const row = findAvailableRow(overlays, { startTime, endTime })
  // setOverlays(prev => [...prev, { ...overlay, row }])

  // Playhead X Position
  const playheadX =
    overlayBarRef.current && duration > 0
      ? (currentTime / duration) * overlayBarRef.current.getBoundingClientRect().width
      : 0;

  // ---- DELETE LOGIC ----
  function handleDeleteSelected() {
    if (!selectedOverlayId) return
    recordHistory()
    setOverlays(olds => olds.filter(el => el.id !== selectedOverlayId))
    setSelectedOverlayId?.(null)
  }

  return (
    <div className="pt-4 space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 flex-wrap">
          {segments.map((segment, idx) => (
            <span
              key={idx}
              className={`px-2 py-1 text-xs rounded border ${idx % 2 === 0 ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-700'}`}
            >
              {idx % 2 === 0 ? 'Keep' : 'Cut'} {segment.start.toFixed(2)}s → {segment.end.toFixed(2)}s
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSplit}
            className="text-sm px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition"
          >
             Split
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 border"
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          {selectedOverlayId && (
            <button
              onClick={handleDeleteSelected}
              className="text-sm px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition"
              title="Delete selected element"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div
        ref={overlayBarRef}
        className="relative w-full mt-2 border rounded bg-gray-300"
        style={{ height: totalOverlayBarHeight, overflow: "hidden" }}
        onMouseUp={handleTimelineMouseUp}
        onMouseMove={handleTimelineMouseMove}
        onClick={handleSliderBarClick}
      >
        {/* Row hover highlight */}
        {hoverRow !== null &&
          <div
            className="absolute left-0 w-full pointer-events-none"
            style={{
              top: hoverRow * overlayRowHeight,
              height: overlayRowHeight,
              background: "rgba(37, 99, 235, 0.09)",
              zIndex: 0,
              transition: "top 0.1s"
            }}
          />
        }
        {/* Playhead vertical line */}
        <div
          className="absolute top-0 bottom-0 bg-red-500"
          style={{
            left: playheadX,
            width: 2,
            height: totalOverlayBarHeight,
            zIndex: 20,
            pointerEvents: 'none',
            transition: 'left 0.06s linear'
          }}
        />
        {overlays
          .slice()
          .sort((a, b) => a.row - b.row || a.startTime - b.startTime)
          .map(el => (
          <div
            key={el.id}
            style={{
              position: 'absolute',
              left: el.timelineLeft,
              top: el.row * overlayRowHeight,
              width: el.timelineWidth,
              height: el.timelineHeight,
              background: el.type === 'text' ? 'rgba(255,255,0,0.5)' : undefined,
              border: selectedOverlayId === el.id ? '2px solid #0070f3' : '1px solid #888',
              borderRadius: 4,
              textAlign: 'center',
              cursor: draggingId === el.id && dragType === 'move' ? 'move' : 'pointer',
              userSelect: 'none',
              zIndex: 2,
              overflow: 'hidden',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 600,
              fontSize: '0.8em',
              opacity:
                draggingId === el.id && hoverRow !== null && hoverRow !== el.row
                  ? 0.5
                  : 1,
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
            {el.type === 'text' ? el.content : (
              <img
                src={el.src}
                alt="Overlay"
                style={{ height: '80%', borderRadius: 3, pointerEvents: 'none' }}
                draggable={false}
                onDragStart={e => e.preventDefault()}
              />
            )}
            {/* Left resize handle */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 12,
                height: '100%',
                cursor: 'ew-resize',
                background: selectedOverlayId === el.id ? '#0070f3' : '#bbb',
                borderRadius: '4px 0 0 4px',
                zIndex: 3,
              }}
              onMouseDown={e => handleTimelineMouseDown(e, el.id, 'resize-left')}
            />
            {/* Right resize handle */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: 12,
                height: '100%',
                cursor: 'ew-resize',
                background: selectedOverlayId === el.id ? '#0070f3' : '#bbb',
                borderRadius: '0 4px 4px 0',
                zIndex: 3,
              }}
              onMouseDown={e => handleTimelineMouseDown(e, el.id, 'resize-right')}
            />
          </div>
        ))}
      </div>
      <div className="relative w-full h-12 mt-2">
        {renderCutSegmentOverlays()}
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
          className="w-full absolute top-0 left-0"
        />
      </div>
      <div className="flex justify-between text-sm text-muted-foreground mt-2">
        <span>
          Keep regions: {
            segments.filter((_, idx) => idx % 2 === 0)
              .map(seg => `${seg.start.toFixed(2)}-${seg.end.toFixed(2)}s`)
              .join(', ')
          }
        </span>
        <span>
          Total splits: {thumbs.length - 2}
        </span>
      </div>
    </div>
  )
}
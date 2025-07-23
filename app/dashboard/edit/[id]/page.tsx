'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import TrimSlider from '@/components/TrimSlider'

const MENU_ITEMS = [
    { type: 'text', label: 'Text' },
    { type: 'image', label: 'Image' },
]

type Clip = {
    id: string
    title: string | null
    video_path: string
    signedUrl: string | null
}

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
    row: number // PATCH: Add explicit row property
}

export default function EditClipPage() {
    const { id } = useParams()
    const router = useRouter()
    const [clip, setClip] = useState<Clip | null>(null)
    const [newTitle, setNewTitle] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [startTime, setStartTime] = useState(0)
    const [endTime, setEndTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)

    // Overlay and timeline state
    const [overlays, setOverlays] = useState<OverlayElement[]>([])
    const [currentTime, setCurrentTime] = useState(0)
    const videoContainerRef = useRef<HTMLDivElement>(null)
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)

    // For dragging/resizing overlays on video
    const [dragOverlayId, setDragOverlayId] = useState<string | null>(null)
    const [dragType, setDragType] = useState<'move' | 'resize' | null>(null)
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
    const [dragStartOverlay, setDragStartOverlay] = useState<OverlayElement | null>(null)

    // Play/pause UI
    const [playing, setPlaying] = useState(false)

    // Volume control UI
    const [muted, setMuted] = useState(false)
    const [volume, setVolume] = useState(1) // 0-1
    const [showVolume, setShowVolume] = useState(false)
    const volumeSliderRef = useRef<HTMLDivElement>(null)
    const volumeButtonTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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
            setLoading(false)
        }

        fetchClip()
    }, [id])

    // Volume sync with video element
    useEffect(() => {
        if (!videoRef) return
        videoRef.muted = muted
        videoRef.volume = volume
    }, [videoRef, muted, volume])

    useEffect(() => {
        if (!videoRef) return
        const onLoaded = () => {
            setDuration(videoRef.duration)
            setEndTime(videoRef.duration)
        }
        videoRef.addEventListener('loadedmetadata', onLoaded)
        return () => videoRef.removeEventListener('loadedmetadata', onLoaded)
    }, [videoRef])

    useEffect(() => {
        if (!videoRef) return
        const update = () => setCurrentTime(videoRef.currentTime)
        videoRef.addEventListener('timeupdate', update)
        return () => videoRef.removeEventListener('timeupdate', update)
    }, [videoRef])

    // Sync playing state if user interacts with video directly
    useEffect(() => {
        if (!videoRef) return
        const sync = () => setPlaying(!videoRef.paused)
        videoRef.addEventListener("play", sync)
        videoRef.addEventListener("pause", sync)
        return () => {
            videoRef.removeEventListener("play", sync)
            videoRef.removeEventListener("pause", sync)
        }
    }, [videoRef])

    // Dragging/moving overlays on video
    const handleOverlayMouseDown = (
        e: React.MouseEvent<HTMLDivElement>,
        id: string,
        type: 'move' | 'resize'
    ) => {
        setDragOverlayId(id)
        setDragType(type)
        setDragStart({ x: e.clientX, y: e.clientY })
        const overlay = overlays.find(el => el.id === id)
        setDragStartOverlay(overlay || null)
        setSelectedOverlayId(id)
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
            // Clamp to video bounds
            newLeft = Math.max(0, Math.min(videoRect.width - dragStartOverlay.videoWidth, newLeft))
            newTop = Math.max(0, Math.min(videoRect.height - dragStartOverlay.videoHeight, newTop))
            updated = { ...dragStartOverlay, videoLeft: newLeft, videoTop: newTop }
        } else if (dragType === 'resize') {
            // Only resize bottom right for now
            let newWidth = dragStartOverlay.videoWidth + dx
            let newHeight = dragStartOverlay.videoHeight + dy
            // Clamp
            newWidth = Math.max(30, Math.min(videoRect.width - dragStartOverlay.videoLeft, newWidth))
            newHeight = Math.max(20, Math.min(videoRect.height - dragStartOverlay.videoTop, newHeight))
            updated = { ...dragStartOverlay, videoWidth: newWidth, videoHeight: newHeight }
        }
        if (updated) {
            setOverlays((olds: OverlayElement[]) =>
                olds.map(el => el.id === dragOverlayId ? updated! : el)
            )
        }
    }

    const handleOverlayMouseUp = () => {
        setDragOverlayId(null)
        setDragType(null)
        setDragStartOverlay(null)
    }

    const handlePlayPause = () => {
        if (!videoRef) return
        if (videoRef.paused) {
            videoRef.play()
            setPlaying(true)
        } else {
            videoRef.pause()
            setPlaying(false)
        }
    }

    const handleToggleMute = () => {
        setMuted(m => !m)
        if (videoRef) videoRef.muted = !muted
    }

    const handleChangeVolume = (newVolume: number) => {
        setVolume(newVolume)
        setMuted(newVolume === 0)
        if (videoRef) {
            videoRef.volume = newVolume
            videoRef.muted = newVolume === 0
        }
    }

    // Volume slider interaction: show on hover, hide on mouse leave (with short delay)
    const handleVolumeButtonMouseEnter = () => {
        if (volumeButtonTimeout.current) {
            clearTimeout(volumeButtonTimeout.current)
            volumeButtonTimeout.current = null
        }
        setShowVolume(true)
    }
    const handleVolumeButtonMouseLeave = () => {
        volumeButtonTimeout.current = setTimeout(() => setShowVolume(false), 200)
    }
    const handleVolumeSliderMouseEnter = () => {
        if (volumeButtonTimeout.current) {
            clearTimeout(volumeButtonTimeout.current)
            volumeButtonTimeout.current = null
        }
        setShowVolume(true)
    }
    const handleVolumeSliderMouseLeave = () => {
        volumeButtonTimeout.current = setTimeout(() => setShowVolume(false), 200)
    }

    const handleSave = async () => {
        if (!clip) return
        setSaving(true)

        const { error } = await supabase
            .from('clips')
            .update({ title: newTitle, edited: true })
            .eq('id', clip.id)

        if (error) {
            alert('Failed to save changes.')
        } else {
            alert('Clip updated!')
            router.push('/dashboard/clips')
        }

        setSaving(false)
    }

    // PATCH: Import findAvailableRow from TrimSlider.tsx or reimplement it here:
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


    // PATCH: Utility to get the lowest available row for overlays
    const getLowestAvailableRow = (overs: OverlayElement[]) => {
        const occupied = new Set(overs.map(o => o.row));
        let row = 0;
        while (occupied.has(row)) row++;
        return row;
    };

    if (loading) return <div className="p-4">Loading clip...</div>
    if (!clip) return <div className="p-4 text-red-500">Clip not found.</div>

    return (
        <div className="flex flex-row w-full min-h-screen">
            {/* Left menu */}
            <div className="flex flex-col gap-4 items-center pt-4 min-w-[120px] bg-gray-50 border-r">
                <span className="font-bold text-sm mb-2">Add to Overlay</span>
                {
                    MENU_ITEMS.map(item => (
                        <div
                            key={item.type}
                            className="cursor-pointer px-4 py-2 bg-gray-200 rounded border hover:bg-gray-300"
                            onClick={() => {
                                const durationSec = 2;
                                const st = startTime;
                                const et = Math.min(duration, st + durationSec);
                                // Use actual timeline bar width if possible; fallback to 600px
                                const barWidth = overlayBarRef.current?.getBoundingClientRect().width || 600;
                                const timelineLeft = (st / duration) * barWidth;
                                const timelineWidth = ((et - st) / duration) * barWidth;

                                const id = `${item.type}-${Date.now()}`;
                                const row = findAvailableRow(overlays, { startTime: st, endTime: et, id });

                                setOverlays(prev => [
                                    ...prev,
                                    {
                                        id,
                                        type: item.type as 'text' | 'image',
                                        videoLeft: 40,
                                        videoTop: 40,
                                        videoWidth: 120,
                                        videoHeight: 36,
                                        timelineLeft,
                                        timelineTop: 0,
                                        timelineWidth,
                                        timelineHeight: 36,
                                        content: item.type === 'text' ? 'Your text' : undefined,
                                        src: item.type === 'image' ? 'https://placehold.co/80x30' : undefined,
                                        startTime: st,
                                        endTime: et,
                                        row
                                    },
                                ]);
                            }}
                        >
                            {item.label}
                        </div>
                    ))
                }
            </div>
            {/* Main content */}
            <div className="flex-1 px-8 pt-8 max-w-2xl mx-auto space-y-4">
                <h1 className="text-2xl font-bold">Edit Clip</h1>

                <div
                    ref={videoContainerRef}
                    className="relative w-full my-2"
                    style={{ minHeight: 300, height: 360 }}
                    onMouseUp={handleOverlayMouseUp}
                    onMouseMove={handleOverlayMouseMove}
                >
                    <video
                        src={clip.signedUrl || ''}
                        controls={false}
                        className="w-full rounded"
                        ref={(el) => {
                            if (el) {
                                setVideoRef(el)
                            }
                        }}
                        style={{ height: 360 }}
                    />
                    {/* Overlays rendered above the video */}
                    {videoRef && videoContainerRef.current &&
                        overlays
                            .filter(el => currentTime >= el.startTime && currentTime <= el.endTime)
                            .map(el => {
                                const isSelected = selectedOverlayId === el.id
                                return (
                                    <div
                                        key={el.id}
                                        style={{
                                            position: 'absolute',
                                            left: el.videoLeft,
                                            top: el.videoTop,
                                            width: el.videoWidth,
                                            height: el.videoHeight,
                                            background: el.type === 'text' ? 'rgba(255,255,0,0.5)' : 'rgba(0,200,255,0.3)',
                                            border: isSelected ? '2px solid #0070f3' : '1px solid #888',
                                            borderRadius: 4,
                                            textAlign: 'center',
                                            userSelect: 'none',
                                            zIndex: 10,
                                            overflow: 'hidden',
                                            boxSizing: 'border-box',
                                            cursor: dragOverlayId === el.id ? (dragType === 'move' ? 'move' : 'nwse-resize') : 'pointer',
                                        }}
                                        onMouseDown={e => handleOverlayMouseDown(e, el.id, 'move')}
                                        tabIndex={0}
                                    >
                                        {el.type === 'text' ? (
                                            <span style={{ fontWeight: 'bold', fontSize: '1em', pointerEvents: 'none' }}>{el.content}</span>
                                        ) : (
                                            <img src={el.src} alt="Overlay" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} draggable={false} onDragStart={e => e.preventDefault()} />
                                        )}
                                        {/* Resize handle: bottom right corner */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                right: 0,
                                                bottom: 0,
                                                width: 8,
                                                height: 8,
                                                cursor: 'nwse-resize',
                                                zIndex: 11,
                                                background: 'transparent',
                                                pointerEvents: 'auto',
                                            }}
                                            onMouseDown={e => handleOverlayMouseDown(e, el.id, 'resize')}
                                        >
                                            <svg width="8" height="8" style={{ display: 'block' }}>
                                                <polygon points="0,8 8,8 8,0" fill={isSelected ? '#0070f3' : '#bbb'} />
                                            </svg>
                                        </div>
                                    </div>
                                )
                            })
                    }
                    {/* Custom play and volume controls below video */}
                    <div className="absolute left-0 right-0 flex justify-center items-center" style={{ top: '100%', marginTop: 0, height: '2.5rem', pointerEvents: 'none' }}>
                        <div className="flex w-full justify-between items-center" style={{ maxWidth: 420, margin: '0 auto', pointerEvents: 'auto' }}>
                            {/* Empty left side for spacing */}
                            <div style={{ width: 44 }} />
                            {/* Play button */}
                            <Button
                                onClick={handlePlayPause}
                                className="rounded px-2 py-2 text-lg font-bold shadow"
                                style={{ background: '#2563eb', color: '#fff', height: '2rem' }}
                            >
                                {playing ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 inline">
                                        <rect x="5" y="5" width="5" height="14" rx="1.5" fill="currentColor" />
                                        <rect x="14" y="5" width="5" height="14" rx="1.5" fill="currentColor" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7 inline">
                                        <polygon points="5,3 19,12 5,21" fill="currentColor" />
                                    </svg>
                                )}
                            </Button>
                            {/* Volume button and slider */}
                            <div
                                className="relative flex items-center"
                                style={{ width: 44, justifyContent: 'flex-end' }}
                                onMouseEnter={handleVolumeButtonMouseEnter}
                                onMouseLeave={handleVolumeButtonMouseLeave}
                            >
                                <Button
                                    type="button"
                                    className="rounded-full px-2 py-2 shadow"
                                    style={{ background: '#f1f5f9', color: '#333', height: '2rem', width: '2rem', minWidth: 0, minHeight: 0 }}
                                    onClick={e => {
                                        e.stopPropagation()
                                        handleToggleMute()
                                    }}
                                >
                                    {muted || volume === 0 ? (
                                        // Muted icon
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                                            <path stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 9L5 12H2v0h3l4 3V9m10 5l-4-4m0 0l-4 4m4-4v9m0-9L5 12" />
                                        </svg>
                                    ) : volume > 0.7 ? (
                                        // High volume icon
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                                            <path stroke="currentColor" strokeWidth={2} d="M9 9l-4 3H2v0h3l4 3V9zm7 2a5 5 0 010 2m3-2a8 8 0 01-8 8m8-8a8 8 0 010-8" />
                                        </svg>
                                    ) : volume > 0.3 ? (
                                        // Medium
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                                            <path stroke="currentColor" strokeWidth={2} d="M9 9l-4 3H2v0h3l4 3V9zm5 2a3 3 0 010 2" />
                                        </svg>
                                    ) : (
                                        // Low
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
                                            <path stroke="currentColor" strokeWidth={2} d="M9 9l-4 3H2v0h3l4 3V9zm2 3a1 1 0 010 2" />
                                        </svg>
                                    )}
                                </Button>
                                {/* Volume slider, vertical, shown on hover */}
                                <div
                                    ref={volumeSliderRef}
                                    className="absolute bottom-[120%] right-0 flex items-center"
                                    style={{ display: showVolume ? 'flex' : 'none', zIndex: 30, height: 100, pointerEvents: 'auto' }}
                                    onMouseEnter={handleVolumeSliderMouseEnter}
                                    onMouseLeave={handleVolumeSliderMouseLeave}
                                >
                                    <div className="flex flex-col items-center bg-white border rounded shadow p-2">
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={muted ? 0 : volume}
                                            onChange={e => handleChangeVolume(Number(e.target.value))}
                                            className="slider-vertical"
                                            style={{
                                                writingMode: 'vertical-lr',
                                                WebkitAppearance: 'slider-vertical',
                                                width: 28,
                                                height: 90,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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
                    />
                )}

                <div className="space-y-2 pt-4">
                    <label className="block text-sm font-medium">Trim Start & End (seconds)</label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            min={0}
                            value={startTime}
                            onChange={(e) => setStartTime(Number(e.target.value))}
                            placeholder="Start"
                        />
                        <Input
                            type="number"
                            min={0}
                            value={endTime}
                            onChange={(e) => setEndTime(Number(e.target.value))}
                            placeholder="End"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={() => {
                                if (videoRef) videoRef.currentTime = startTime
                            }}
                            variant="secondary"
                        >
                            Preview Start
                        </Button>
                        <Button
                            onClick={() => {
                                if (videoRef) videoRef.currentTime = endTime
                            }}
                            variant="secondary"
                        >
                            Preview End
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium">Title</label>
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                </div>

                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    )
}
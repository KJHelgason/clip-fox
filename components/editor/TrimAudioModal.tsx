'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Play, Pause, Scissors } from 'lucide-react'
import { AudioTrack } from '@/lib/types'

type Props = {
  track: AudioTrack
  onClose: () => void
  onConfirm: (trimStart: number, trimEnd: number) => void
  onReplaceOriginal?: () => void // Only for user-uploaded sounds
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export default function TrimAudioModal({
  track,
  onClose,
  onConfirm,
  onReplaceOriginal,
}: Props) {
  const [trimStart, setTrimStart] = useState(track.trimStart)
  const [trimEnd, setTrimEnd] = useState(track.trimEnd)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [waveformData, setWaveformData] = useState<number[]>([])
  const [showReplacePopup, setShowReplacePopup] = useState(false)
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)

  const effectiveDuration = track.duration - trimStart - trimEnd
  const trimmedEndPosition = track.duration - trimEnd

  // Load audio and generate waveform
  useEffect(() => {
    const audio = new Audio(track.url)
    audioRef.current = audio

    // Generate simplified waveform data
    const generateWaveform = async () => {
      try {
        const response = await fetch(track.url)
        const arrayBuffer = await response.arrayBuffer()
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        const channelData = audioBuffer.getChannelData(0)
        const samples = 100 // Number of bars in waveform
        const blockSize = Math.floor(channelData.length / samples)
        const waveform: number[] = []

        for (let i = 0; i < samples; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j])
          }
          waveform.push(sum / blockSize)
        }

        // Normalize
        const max = Math.max(...waveform)
        setWaveformData(waveform.map(v => v / max))
        audioContext.close()
      } catch {
        // Fallback: generate random waveform for demo
        const fakeWaveform = Array.from({ length: 100 }, () => 0.3 + Math.random() * 0.7)
        setWaveformData(fakeWaveform)
      }
    }

    generateWaveform()

    return () => {
      audio.pause()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [track.url])

  // Handle playback
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else {
      audioRef.current.currentTime = trimStart
      audioRef.current.play()
      setIsPlaying(true)

      const updateTime = () => {
        if (audioRef.current) {
          const time = audioRef.current.currentTime
          setCurrentTime(time)

          // Stop at trim end
          if (time >= trimmedEndPosition) {
            audioRef.current.pause()
            audioRef.current.currentTime = trimStart
            setIsPlaying(false)
            setCurrentTime(trimStart)
            return
          }

          animationRef.current = requestAnimationFrame(updateTime)
        }
      }
      animationRef.current = requestAnimationFrame(updateTime)
    }
  }, [isPlaying, trimStart, trimmedEndPosition])

  // Keyboard handler for spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay])

  // Handle slider drag
  const handleMouseDown = useCallback((type: 'start' | 'end') => {
    setIsDragging(type)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !waveformRef.current) return

    const rect = waveformRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const percent = x / rect.width
    const time = percent * track.duration

    if (isDragging === 'start') {
      // Ensure at least 0.1 second of audio remains
      const maxStart = trimmedEndPosition - 0.1
      setTrimStart(Math.max(0, Math.min(time, maxStart)))
    } else {
      // trimEnd is from the end of the track
      const newTrimEnd = track.duration - time
      const maxTrimEnd = track.duration - trimStart - 0.1
      setTrimEnd(Math.max(0, Math.min(newTrimEnd, maxTrimEnd)))
    }
  }, [isDragging, track.duration, trimStart, trimmedEndPosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const handleConfirm = () => {
    if (track.isUserUploaded && (trimStart > 0 || trimEnd > 0)) {
      setShowReplacePopup(true)
    } else {
      onConfirm(trimStart, trimEnd)
    }
  }

  const handleReplaceConfirm = (replaceOriginal: boolean) => {
    if (replaceOriginal && onReplaceOriginal) {
      onReplaceOriginal()
    }
    onConfirm(trimStart, trimEnd)
    setShowReplacePopup(false)
  }

  return (
    <>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="bg-[#1a1a2e] rounded-2xl w-full max-w-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Trim Audio</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-gray-400 mb-4">
              Cut the beginning of your audio clip by setting a start offset.
            </p>

            {/* Trim indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <div className="w-3 h-3 bg-red-500/30 rounded" />
              <span>Red area shows trimmed portion (will be cut off)</span>
            </div>

            {/* Waveform Container */}
            <div
              ref={waveformRef}
              className="relative h-20 bg-[#12121f] rounded-lg overflow-hidden mb-4"
            >
              {/* Trim overlay - start (red/trimmed area) */}
              <div
                className="absolute top-0 bottom-0 left-0 bg-red-500/20 z-10"
                style={{ width: `${(trimStart / track.duration) * 100}%` }}
              />

              {/* Trim overlay - end (red/trimmed area) */}
              <div
                className="absolute top-0 bottom-0 right-0 bg-red-500/20 z-10"
                style={{ width: `${(trimEnd / track.duration) * 100}%` }}
              />

              {/* Waveform bars */}
              <div className="absolute inset-0 flex items-center px-2 gap-[2px]">
                {waveformData.map((amplitude, i) => {
                  const position = (i / waveformData.length) * track.duration
                  const isTrimmed = position < trimStart || position > trimmedEndPosition
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-colors ${
                        isTrimmed ? 'bg-gray-700' : 'bg-purple-500'
                      }`}
                      style={{ height: `${amplitude * 80}%` }}
                    />
                  )
                })}
              </div>

              {/* Playhead */}
              {isPlaying && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-20"
                  style={{ left: `${(currentTime / track.duration) * 100}%` }}
                />
              )}

              {/* Trim handles */}
              {/* Start handle */}
              <div
                className="absolute top-0 bottom-0 w-4 bg-purple-600 cursor-ew-resize z-30 flex items-center justify-center hover:bg-purple-500 transition-colors"
                style={{ left: `calc(${(trimStart / track.duration) * 100}% - 8px)` }}
                onMouseDown={() => handleMouseDown('start')}
              >
                <div className="w-0.5 h-8 bg-white/60 rounded" />
              </div>

              {/* End handle */}
              <div
                className="absolute top-0 bottom-0 w-4 bg-purple-600 cursor-ew-resize z-30 flex items-center justify-center hover:bg-purple-500 transition-colors"
                style={{ left: `calc(${(trimmedEndPosition / track.duration) * 100}% - 8px)` }}
                onMouseDown={() => handleMouseDown('end')}
              >
                <div className="w-0.5 h-8 bg-white/60 rounded" />
              </div>
            </div>

            {/* Time display */}
            <div className="flex justify-between text-xs text-gray-400 mb-4">
              <span>Start: {formatTime(trimStart)}</span>
              <span>Duration: {formatTime(effectiveDuration)}</span>
              <span>End: {formatTime(trimmedEndPosition)}</span>
            </div>

            {/* Play Controls */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={togglePlay}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white" />
                ) : (
                  <Play className="w-4 h-4 text-white ml-0.5" />
                )}
                <span className="text-sm text-white">Play</span>
              </button>
              <span className="text-xs text-gray-500">
                Press spacebar to play/pause
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Trim Audio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Replace Original Popup (for user-uploaded sounds) */}
      {showReplacePopup && (
        <div
          className="fixed inset-0 bg-black/60 z-[1001] flex items-center justify-center p-4"
          onClick={() => setShowReplacePopup(false)}
        >
          <div
            className="bg-[#1a1a2e] rounded-xl w-full max-w-sm shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-white mb-2">
              Replace saved sound?
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Do you also want to replace the saved sound with the new trimmed version?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleReplaceConfirm(false)}
                className="flex-1 py-2 px-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                No, keep original
              </button>
              <button
                onClick={() => handleReplaceConfirm(true)}
                className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Yes, replace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

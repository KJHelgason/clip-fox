'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { VisualEffect, VisualEffectType } from '@/lib/types'

type EffectOverlayProps = {
  effects: VisualEffect[]
  currentTime: number
  containerWidth: number
  containerHeight: number
}

/**
 * Effect Definitions:
 *
 * 1. ZOOM BLUR - Rapid zoom with motion blur. Starts zoomed in and blurred,
 *    quickly settles to clear. Creates a "punch in" feeling for impact moments.
 *    Duration: ~0.5-1s recommended
 *
 * 2. SHAKE - Camera shake effect. Subtle random movements simulating handheld
 *    camera or impact. Used for explosions, hits, bass drops.
 *    Duration: ~0.3-1s recommended
 *
 * 3. SLIDE SHAKE - Vertical slide with shake. Content moves up/down with
 *    subtle horizontal shake. More dramatic than regular shake.
 *    Duration: ~0.5-1s recommended
 *
 * 4. MORPH - Warp/wave distortion. Image warps and ripples like liquid.
 *    Creates a dreamy or surreal look.
 *    Duration: ~1-2s recommended
 *
 * 5. SLIDE - Push/slide transition. Content slides in a direction.
 *    Used for scene changes or emphasis.
 *    Duration: ~0.3-0.5s recommended
 *
 * 6. GLITCH - Digital distortion. RGB color split, scanlines, jitter.
 *    Mimics corrupted video or CRT artifacts.
 *    Duration: ~0.2-0.5s recommended
 *
 * 7. PIXELATE - Mosaic effect. Image breaks into large pixels/blocks.
 *    Used for censoring or retro game style.
 *    Duration: ~0.3-1s recommended
 */

// Hook to get effect transform values - used by parent to transform the video container
export function useEffectTransform(
  effects: VisualEffect[],
  currentTime: number
): {
  transform: string
  filter: string
  scale: number
  clipPath: string
  opacity: number
  // For glitch effect overlays
  glitchActive: boolean
  glitchProgress: number
  // For pixelate effect
  pixelateActive: boolean
  pixelateSize: number
} {
  const [frame, setFrame] = useState(0)
  const rafRef = useRef<number | null>(null)

  // Find active effects at current time
  const activeEffects = useMemo(() =>
    effects.filter(
      effect => currentTime >= effect.startTime && currentTime < effect.endTime
    ),
    [effects, currentTime]
  )

  // Determine if we need animation frames
  const needsAnimation = activeEffects.some(
    e => e.type === 'shake' || e.type === 'slide-shake' || e.type === 'glitch' || e.type === 'morph'
  )

  // Animate at ~30fps for smoother, less chaotic effects
  useEffect(() => {
    if (needsAnimation) {
      let lastTime = 0
      const targetInterval = 1000 / 30 // 30fps

      const animate = (timestamp: number) => {
        if (timestamp - lastTime >= targetInterval) {
          setFrame(f => f + 1)
          lastTime = timestamp
        }
        rafRef.current = requestAnimationFrame(animate)
      }
      rafRef.current = requestAnimationFrame(animate)
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }
  }, [needsAnimation])

  // Calculate combined transform from all active effects
  return useMemo(() => {
    const defaultResult = {
      transform: '',
      filter: '',
      scale: 1,
      clipPath: '',
      opacity: 1,
      glitchActive: false,
      glitchProgress: 0,
      pixelateActive: false,
      pixelateSize: 1,
    }

    if (activeEffects.length === 0) {
      return defaultResult
    }

    let totalX = 0
    let totalY = 0
    let totalRotation = 0
    let totalScale = 1
    let totalBlur = 0
    let glitchActive = false
    let glitchProgress = 0
    let pixelateActive = false
    let pixelateSize = 1

    // Punchy random values - harsh at start, settling over time
    // Uses frame for variation but intensity controlled by progress
    const getPunchyOffset = (seed: number, maxIntensity: number, settleProgress: number) => {
      const t = (frame + seed) * 0.2
      // Intensity is high at start (settleProgress=0), low at end (settleProgress=1)
      const intensity = maxIntensity * (1 - settleProgress)
      return (Math.sin(t * 2.7) + Math.sin(t * 4.1) * 0.5) * intensity
    }

    // Easing functions
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4)
    const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    // Decay function for settling effects (harsh start, gentle settle)
    const getDecay = (progress: number, harshPhase: number = 0.3) => {
      if (progress < harshPhase) {
        // During harsh phase, intensity is at maximum
        return 1
      }
      // After harsh phase, decay exponentially
      const settleProgress = (progress - harshPhase) / (1 - harshPhase)
      return Math.pow(1 - settleProgress, 2)
    }

    for (const effect of activeEffects) {
      const duration = effect.endTime - effect.startTime
      const progress = Math.min(1, Math.max(0, (currentTime - effect.startTime) / duration))

      if (effect.type === 'zoom-blur') {
        // ZOOM BLUR: Punchy zoom in with blur, quickly settles to clear
        // Starts at 1.4x scale and 12px blur, settles by 25%
        const settlePoint = 0.25
        const settleProgress = Math.min(1, progress / settlePoint)
        const eased = easeOutQuart(settleProgress)

        // Start at 1.4x scale, settle to 1x
        totalScale *= 1 + (1 - eased) * 0.4
        // Start at 12px blur, settle to 0
        totalBlur += (1 - eased) * 12
      }

      if (effect.type === 'shake') {
        // SHAKE: Harsh initial shake (0-30%), then settling (30-100%)
        // Matches CSS: Initial 8px movements with rotation, settling to sub-pixel
        const harshPhase = 0.3
        const decay = getDecay(progress, harshPhase)

        // During harsh phase: 8px movements, 2.5deg rotation
        // During settle: decays to near zero
        const baseX = 8 * decay
        const baseY = 6 * decay
        const baseRotation = 2.5 * decay

        totalX += getPunchyOffset(0, baseX, 1 - decay)
        totalY += getPunchyOffset(50, baseY, 1 - decay)
        totalRotation += getPunchyOffset(100, baseRotation, 1 - decay)

        // Scale to hide edges during harsh shake
        totalScale = Math.max(totalScale, 1.05 + 0.03 * decay)
      }

      if (effect.type === 'slide-shake') {
        // SLIDE SHAKE: Hard slam down (0-15%), then bouncing back with decay
        // Matches CSS: 15px slam, then bouncing with decreasing intensity
        const slamDuration = 0.15
        const bounceStart = 0.22

        if (progress < slamDuration) {
          // Initial slam down - quick movement to 15px
          const slamProgress = progress / slamDuration
          totalY += easeOutCubic(slamProgress) * 15
          totalX += (Math.random() - 0.5) * 2 // Slight horizontal shake
        } else if (progress < bounceStart) {
          // Hold at slam position briefly, then start bouncing back
          const holdProgress = (progress - slamDuration) / (bounceStart - slamDuration)
          totalY += 15 - holdProgress * 25 // Bounce back past center
        } else {
          // Bouncing phase with exponential decay
          const bounceProgress = (progress - bounceStart) / (1 - bounceStart)
          const decay = Math.pow(1 - bounceProgress, 1.5)

          // Damped oscillation
          const oscillation = Math.sin(bounceProgress * Math.PI * 4) * decay
          totalY += oscillation * 8
          totalX += getPunchyOffset(80, 3 * decay, bounceProgress)
        }

        totalScale = Math.max(totalScale, 1.08)
      }

      if (effect.type === 'morph') {
        // MORPH: Strong initial warp, settles to subtle
        // Starts with scale 1.05 and 3deg skew, decays over time
        const harshPhase = 0.4
        const decay = getDecay(progress, harshPhase)

        const wavePhase = frame * 0.15

        // Strong initial warp
        const scaleWave = Math.sin(wavePhase) * 0.05 * decay
        const skewAmount = Math.sin(wavePhase * 1.3) * 3 * decay

        totalScale *= 1 + scaleWave
        // Simulate skew with X/Y offset
        totalX += Math.sin(wavePhase * 1.5) * 5 * decay
        totalY += Math.cos(wavePhase * 1.2) * 3 * decay
        totalRotation += skewAmount * 0.3
      }

      if (effect.type === 'slide') {
        // SLIDE: Quick push out and back
        // Push to -25px, hold briefly, then return
        const slideDistance = 25 // pixels
        const pushEnd = 0.3
        const holdEnd = 0.5
        const returnEnd = 0.85

        if (progress < pushEnd) {
          // Quick push out
          const pushProgress = easeOutCubic(progress / pushEnd)
          totalX -= pushProgress * slideDistance
        } else if (progress < holdEnd) {
          // Hold at pushed position
          totalX -= slideDistance
        } else if (progress < returnEnd) {
          // Return back
          const returnProgress = easeInOutQuad((progress - holdEnd) / (returnEnd - holdEnd))
          totalX -= (1 - returnProgress) * slideDistance
        }
        // After returnEnd, stays at 0

        totalScale = Math.max(totalScale, 1.02)
      }

      if (effect.type === 'glitch') {
        // GLITCH: Aggressive initial glitch (0-25%), then sporadic
        // Matches CSS: 6px jitter at start, then occasional smaller glitches
        glitchActive = true
        glitchProgress = progress

        const harshPhase = 0.25
        const isHarsh = progress < harshPhase

        if (isHarsh) {
          // Aggressive initial jitter - every frame
          const jitterIntensity = 6
          totalX += (Math.random() - 0.5) * jitterIntensity * 2
          totalY += (Math.random() - 0.5) * jitterIntensity
        } else {
          // Sporadic smaller glitches
          const sporadicChance = 0.3 - progress * 0.2 // Less frequent over time
          if (Math.random() < sporadicChance) {
            const jitterIntensity = 3 * (1 - progress)
            totalX += (Math.random() - 0.5) * jitterIntensity * 2
            totalY += (Math.random() - 0.5) * jitterIntensity
          }
        }
      }

      if (effect.type === 'pixelate') {
        // PIXELATE: Quick pixelate then settle back
        // Peaks early (around 20-30%), then returns to normal
        pixelateActive = true

        const peakPoint = 0.2
        const settleStart = 0.3

        let pixelIntensity: number
        if (progress < peakPoint) {
          // Quick ramp up to max pixelation
          pixelIntensity = easeOutCubic(progress / peakPoint)
        } else if (progress < settleStart) {
          // Hold at peak
          pixelIntensity = 1
        } else {
          // Settle back to normal
          const settleProgress = (progress - settleStart) / (1 - settleStart)
          pixelIntensity = 1 - easeOutCubic(settleProgress)
        }

        // Pixel size: 1 (normal) to 20 (very pixelated)
        pixelateSize = 1 + pixelIntensity * 19
      }
    }

    const transforms: string[] = []

    // Apply scale first (for edge hiding)
    if (totalScale !== 1) {
      transforms.push(`scale(${totalScale})`)
    }

    // Then translation
    if (totalX !== 0 || totalY !== 0) {
      transforms.push(`translate(${totalX}px, ${totalY}px)`)
    }

    // Then rotation
    if (totalRotation !== 0) {
      transforms.push(`rotate(${totalRotation}deg)`)
    }

    return {
      transform: transforms.join(' '),
      filter: totalBlur > 0 ? `blur(${totalBlur}px)` : '',
      scale: totalScale,
      clipPath: '',
      opacity: 1,
      glitchActive,
      glitchProgress,
      pixelateActive,
      pixelateSize,
    }
  }, [activeEffects, frame, currentTime])
}

/**
 * EffectOverlay - renders visual effect overlays on top of video content.
 *
 * This handles effects that need additional overlay elements:
 * - Glitch: RGB split layers, scanlines
 * - Pixelate: CSS pixelation filter applied to content
 *
 * Movement effects (shake, zoom, slide) are handled by useEffectTransform
 * which applies transforms to the video container directly.
 */
export function EffectOverlay({
  effects,
  currentTime,
  containerWidth,
  containerHeight,
}: EffectOverlayProps) {
  const [frame, setFrame] = useState(0)

  // Find active effects at current time
  const activeEffects = effects.filter(
    effect => currentTime >= effect.startTime && currentTime < effect.endTime
  )

  // Check for glitch effect
  const glitchEffect = activeEffects.find(e => e.type === 'glitch')
  const hasGlitch = !!glitchEffect

  // Animate for glitch effect
  useEffect(() => {
    if (hasGlitch) {
      const interval = setInterval(() => {
        setFrame(f => f + 1)
      }, 50) // Update every 50ms for glitch randomness
      return () => clearInterval(interval)
    }
  }, [hasGlitch])

  if (!hasGlitch) return null

  // Calculate glitch progress
  const duration = glitchEffect.endTime - glitchEffect.startTime
  const progress = (currentTime - glitchEffect.startTime) / duration

  // Punchy glitch: aggressive at start (0-25%), then sporadic
  const harshPhase = 0.25
  const isHarsh = progress < harshPhase

  // Intensity is maximum during harsh phase, then decays
  const intensity = isHarsh ? 1 : Math.pow(1 - (progress - harshPhase) / (1 - harshPhase), 2)

  // Random values for glitch effects - more aggressive during harsh phase
  const rgbOffset = isHarsh
    ? (Math.random() > 0.5 ? 1 : -1) * (4 + Math.random() * 8) // 4-12px during harsh
    : (Math.random() > 0.5 ? 1 : -1) * Math.random() * 4 * intensity // 0-4px settling

  // More frequent scanlines during harsh phase
  const showScanline = isHarsh ? Math.random() > 0.3 : Math.random() > 0.7
  const scanlineY = Math.random() * 100

  // More frequent glitch blocks during harsh phase
  const showBlock = isHarsh ? Math.random() > 0.5 : Math.random() > 0.85
  const blockY = Math.random() * 80
  const blockH = isHarsh ? (8 + Math.random() * 20) : (5 + Math.random() * 10)

  return (
    <>
      {/* RGB Split - Red channel offset */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen"
        style={{
          zIndex: 91,
          transform: `translateX(${rgbOffset}px)`,
          opacity: 0.5 * intensity,
          background: `linear-gradient(90deg, rgba(255,0,0,0.3) 0%, transparent 50%, rgba(255,0,0,0.3) 100%)`,
        }}
      />

      {/* RGB Split - Blue channel offset */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-screen"
        style={{
          zIndex: 91,
          transform: `translateX(${-rgbOffset}px)`,
          opacity: 0.5 * intensity,
          background: `linear-gradient(90deg, rgba(0,0,255,0.3) 0%, transparent 50%, rgba(0,0,255,0.3) 100%)`,
        }}
      />

      {/* Scanline */}
      {showScanline && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            zIndex: 92,
            top: `${scanlineY}%`,
            height: '2px',
            background: 'rgba(255,255,255,0.8)',
            boxShadow: '0 0 4px rgba(255,255,255,0.5)',
          }}
        />
      )}

      {/* Glitch block */}
      {showBlock && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            zIndex: 93,
            top: `${blockY}%`,
            height: `${blockH}%`,
            background: `linear-gradient(90deg,
              transparent ${Math.random() * 20}%,
              rgba(0,255,255,0.3) ${20 + Math.random() * 30}%,
              transparent ${50 + Math.random() * 30}%,
              rgba(255,0,255,0.3) ${80 + Math.random() * 10}%,
              transparent 100%
            )`,
            transform: `translateX(${(Math.random() - 0.5) * 20}px)`,
          }}
        />
      )}

      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 90,
          opacity: 0.1 * intensity,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  )
}

export default EffectOverlay

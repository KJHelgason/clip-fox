'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  OverlayElement, AnimationType, TextStyle, FillType,
  SocialPlatform, SocialSticker, CustomElement, SocialUsernames,
  StickerTemplate
} from '@/lib/types'
import StickerRenderer, { StickerConfig, StickerStyle } from './stickers/StickerRenderer'
import { supabase } from '@/lib/supabase'
import {
  Upload, ArrowLeft, X, Trash2, Eye, Layers, Copy,
  Type, ChevronDown, Check, Loader2, Plus, Pipette
} from 'lucide-react'

// Recommended color palettes
const RECOMMENDED_COLORS = [
  '#ffffff', '#000000', '#f43f5e', '#ec4899', '#d946ef', '#a855f7',
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6',
  '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316',
  '#ef4444', '#78716c', '#64748b', '#6b7280'
]

// Full Color Picker Component with visual saturation/brightness picker
const ColorPicker = ({
  value,
  onChange,
  recentColors = [],
  onAddRecent
}: {
  value: string;
  onChange: (color: string) => void;
  recentColors?: string[];
  onAddRecent?: (color: string) => void;
}) => {
  const [hexInput, setHexInput] = useState(value?.toUpperCase() || '#FFFFFF')
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [brightness, setBrightness] = useState(100)
  const pickerRef = useRef<HTMLDivElement>(null)
  const isDraggingPicker = useRef(false)

  // Convert hex to HSB
  const hexToHsb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const d = max - min
    let h = 0
    const s = max === 0 ? 0 : (d / max) * 100
    const v = max * 100
    if (d !== 0) {
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6 * 360; break
        case g: h = ((b - r) / d + 2) / 6 * 360; break
        case b: h = ((r - g) / d + 4) / 6 * 360; break
      }
    }
    return { h, s, v }
  }

  // Convert HSB to hex
  const hsbToHex = (h: number, s: number, v: number) => {
    const sNorm = s / 100
    const vNorm = v / 100
    const c = vNorm * sNorm
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
    const m = vNorm - c
    let r = 0, g = 0, b = 0
    if (h < 60) { r = c; g = x; b = 0 }
    else if (h < 120) { r = x; g = c; b = 0 }
    else if (h < 180) { r = 0; g = c; b = x }
    else if (h < 240) { r = 0; g = x; b = c }
    else if (h < 300) { r = x; g = 0; b = c }
    else { r = c; g = 0; b = x }
    const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  useEffect(() => {
    if (value && /^#[0-9A-Fa-f]{6}$/.test(value)) {
      setHexInput(value.toUpperCase())
      const hsb = hexToHsb(value)
      setHue(hsb.h)
      setSaturation(hsb.s)
      setBrightness(hsb.v)
    }
  }, [value])

  const handleColorChange = (color: string) => {
    onChange(color)
    if (onAddRecent && !recentColors.includes(color)) {
      onAddRecent(color)
    }
  }

  const handleHexSubmit = () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      handleColorChange(hexInput.toLowerCase())
    }
  }

  const handlePickerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerRef.current) return
    const rect = pickerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    const newSat = x * 100
    const newBri = (1 - y) * 100
    setSaturation(newSat)
    setBrightness(newBri)
    const newColor = hsbToHex(hue, newSat, newBri)
    setHexInput(newColor.toUpperCase())
    handleColorChange(newColor)
  }

  const handlePickerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingPicker.current = true
    handlePickerClick(e)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPicker.current || !pickerRef.current) return
      const rect = pickerRef.current.getBoundingClientRect()
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      const newSat = x * 100
      const newBri = (1 - y) * 100
      setSaturation(newSat)
      setBrightness(newBri)
      const newColor = hsbToHex(hue, newSat, newBri)
      setHexInput(newColor.toUpperCase())
      handleColorChange(newColor)
    }
    const handleMouseUp = () => {
      isDraggingPicker.current = false
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [hue])

  const handleHueChange = (newHue: number) => {
    setHue(newHue)
    const newColor = hsbToHex(newHue, saturation, brightness)
    setHexInput(newColor.toUpperCase())
    handleColorChange(newColor)
  }

  return (
    <div className="space-y-3">
      {/* Color picker area */}
      <div
        ref={pickerRef}
        className="relative w-full h-32 rounded-lg cursor-crosshair"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hue}, 100%, 50%))`,
        }}
        onMouseDown={handlePickerMouseDown}
      >
        {/* Picker indicator */}
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full shadow-md pointer-events-none"
          style={{
            left: `calc(${saturation}% - 8px)`,
            top: `calc(${100 - brightness}% - 8px)`,
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.3)'
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="relative h-3 rounded-full cursor-pointer"
        style={{
          background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - rect.left) / rect.width
          handleHueChange(x * 360)
        }}
      >
        <div
          className="absolute w-3 h-3 bg-white rounded-full border border-gray-300 shadow-sm pointer-events-none"
          style={{ left: `calc(${(hue / 360) * 100}% - 6px)` }}
        />
      </div>

      {/* HEX input row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-600">
          HEX
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        </div>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value.toUpperCase())}
          onBlur={handleHexSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleHexSubmit()}
          className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 font-mono"
          placeholder="#FFFFFF"
        />
        <button
          onClick={() => navigator.clipboard.writeText(hexInput)}
          className="p-1.5 text-gray-400 hover:text-gray-600"
          title="Copy"
        >
          <Copy className="w-4 h-4" />
        </button>
      </div>

      {/* Recently used */}
      {recentColors.length > 0 && (
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">Recently used</label>
          <div className="flex flex-wrap gap-1.5">
            {recentColors.slice(0, 10).map((color, i) => (
              <button
                key={i}
                onClick={() => handleColorChange(color)}
                className={`w-6 h-6 rounded border transition-all ${value === color ? 'ring-2 ring-purple-500 ring-offset-1' : 'border-gray-300 hover:border-gray-400'}`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recommended Colors */}
      <div>
        <label className="block text-xs text-gray-500 mb-1.5">Recommended</label>
        <div className="grid grid-cols-8 gap-1">
          {RECOMMENDED_COLORS.slice(0, 16).map((color, i) => (
            <button
              key={i}
              onClick={() => handleColorChange(color)}
              className={`w-6 h-6 rounded border transition-all ${value === color ? 'ring-2 ring-purple-500 ring-offset-1' : 'border-gray-300 hover:border-gray-400'}`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Animation options
const ELEMENT_ANIMATIONS: { id: AnimationType; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'reveal', name: 'Reveal' },
  { id: 'fade-in', name: 'Fade in' },
  { id: 'slide-right', name: 'Slide right' },
  { id: 'slide-left', name: 'Slide left' },
  { id: 'slide-top', name: 'Slide top' },
  { id: 'slide-bottom', name: 'Slide bottom' },
  { id: 'shrink', name: 'Shrink' },
  { id: 'bounce-in', name: 'Bounce in' },
  { id: 'slide', name: 'Slide' },
  { id: 'rotate', name: 'Rotate' },
  { id: 'sway', name: 'Sway' },
]

const TEXT_ANIMATIONS: { id: AnimationType; name: string }[] = [
  ...ELEMENT_ANIMATIONS,
  { id: 'stick', name: 'Stick' },
  { id: 'appear', name: 'Appear' },
  { id: 'land', name: 'Land' },
  { id: 'pop', name: 'Pop' },
  { id: 'unfold', name: 'Unfold' },
  { id: 'emerge', name: 'Emerge' },
  { id: 'burst', name: 'Burst' },
  { id: 'jump', name: 'Jump' },
  { id: 'glide', name: 'Glide' },
  { id: 'flip', name: 'Flip' },
  { id: 'float', name: 'Float' },
  { id: 'impact', name: 'Impact' },
  { id: 'hop', name: 'Hop' },
  { id: 'drift', name: 'Drift' },
  { id: 'groove', name: 'Groove' },
  { id: 'bounce', name: 'Bounce' },
  { id: 'shake', name: 'Shake' },
  { id: 'whirl', name: 'Whirl' },
]

// Social sticker definitions with templates for dynamic rendering
const SOCIAL_STICKERS: SocialSticker[] = [
  // Animated stickers - various platforms with animations
  { id: 'twitch-animated-1', name: 'Follow', platform: 'twitch', type: 'animated', category: 'animated', styles: ['purple'], defaultStyle: 'purple', thumbnailSrc: '', template: 'follow', animation: 'slideRight' },
  { id: 'youtube-animated-1', name: 'Subscribe', platform: 'youtube', type: 'animated', category: 'animated', styles: ['red'], defaultStyle: 'red', thumbnailSrc: '', template: 'subscribe', animation: 'bounceIn' },
  { id: 'kick-animated-1', name: 'Follow', platform: 'kick', type: 'animated', category: 'animated', styles: ['green'], defaultStyle: 'green', thumbnailSrc: '', template: 'basic', animation: 'fadeIn' },
  { id: 'youtube-animated-2', name: 'Subscribe', platform: 'youtube', type: 'animated', category: 'animated', styles: ['red', 'dark'], defaultStyle: 'red', thumbnailSrc: '', template: 'banner', animation: 'slideUp' },
  { id: 'tiktok-animated-1', name: 'Follow', platform: 'tiktok', type: 'animated', category: 'animated', styles: ['dark'], defaultStyle: 'dark', thumbnailSrc: '', template: 'follow', animation: 'pop' },
  { id: 'twitch-animated-2', name: 'Follow', platform: 'twitch', type: 'animated', category: 'animated', styles: ['purple', 'dark'], defaultStyle: 'purple', thumbnailSrc: '', template: 'banner', animation: 'slideRight' },
  { id: 'instagram-animated-1', name: 'Follow', platform: 'instagram', type: 'animated', category: 'animated', styles: ['gradient'], defaultStyle: 'gradient', thumbnailSrc: '', template: 'basic', animation: 'fadeIn' },
  { id: 'twitter-animated-1', name: 'Follow', platform: 'twitter', type: 'animated', category: 'animated', styles: ['dark', 'light'], defaultStyle: 'dark', thumbnailSrc: '', template: 'badge', animation: 'bounceIn' },
  { id: 'subscribe-animated-1', name: 'Subscribe', platform: 'youtube', type: 'animated', category: 'animated', styles: ['red'], defaultStyle: 'red', thumbnailSrc: '', template: 'subscribe', animation: 'pop' },
  { id: 'tiktok-animated-2', name: 'Follow', platform: 'tiktok', type: 'animated', category: 'animated', styles: ['dark'], defaultStyle: 'dark', thumbnailSrc: '', template: 'card', animation: 'slideUp' },
  { id: 'kick-animated-2', name: 'Follow', platform: 'kick', type: 'animated', category: 'animated', styles: ['green', 'dark'], defaultStyle: 'green', thumbnailSrc: '', template: 'follow', animation: 'bounceIn' },
  { id: 'facebook-animated-1', name: 'Follow', platform: 'facebook', type: 'animated', category: 'animated', styles: ['blue'], defaultStyle: 'blue', thumbnailSrc: '', template: 'basic', animation: 'slideLeft' },

  // Multiple platform stickers
  { id: 'multi-1', name: 'Follow', platform: 'multiple', platforms: ['youtube', 'tiktok', 'instagram'], type: 'image', category: 'multiple', styles: ['dark', 'light', 'gradient'], defaultStyle: 'dark', thumbnailSrc: '', template: 'basic' },
  { id: 'multi-2', name: 'Follow', platform: 'multiple', platforms: ['youtube', 'tiktok', 'instagram'], type: 'image', category: 'multiple', styles: ['light', 'dark'], defaultStyle: 'light', thumbnailSrc: '', template: 'basic' },
  { id: 'multi-3', name: 'Follow', platform: 'multiple', platforms: ['tiktok', 'instagram', 'youtube'], type: 'image', category: 'multiple', styles: ['gradient', 'dark'], defaultStyle: 'gradient', thumbnailSrc: '', template: 'card' },

  // Twitch stickers - various templates and styles
  { id: 'twitch-1', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['purple', 'dark', 'light'], defaultStyle: 'purple', thumbnailSrc: '', template: 'follow' },
  { id: 'twitch-2', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['dark', 'purple', 'light'], defaultStyle: 'dark', thumbnailSrc: '', template: 'basic' },
  { id: 'twitch-3', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['purple', 'dark'], defaultStyle: 'purple', thumbnailSrc: '', template: 'badge' },
  { id: 'twitch-4', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['light', 'dark'], defaultStyle: 'light', thumbnailSrc: '', template: 'basic' },
  { id: 'twitch-5', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['purple', 'gradient'], defaultStyle: 'purple', thumbnailSrc: '', template: 'banner' },
  { id: 'twitch-6', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['purple', 'dark', 'light'], defaultStyle: 'purple', thumbnailSrc: '', template: 'follow' },
  { id: 'twitch-7', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['dark', 'light'], defaultStyle: 'dark', thumbnailSrc: '', template: 'minimal' },
  { id: 'twitch-8', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['purple'], defaultStyle: 'purple', thumbnailSrc: '', template: 'card' },
  { id: 'twitch-9', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['light', 'purple'], defaultStyle: 'light', thumbnailSrc: '', template: 'basic' },
  { id: 'twitch-10', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['purple', 'dark'], defaultStyle: 'purple', thumbnailSrc: '', template: 'follow' },
  { id: 'twitch-11', name: 'FOLLOW', platform: 'twitch', type: 'image', category: 'twitch', styles: ['gradient', 'purple'], defaultStyle: 'gradient', thumbnailSrc: '', template: 'banner' },
  { id: 'twitch-12', name: 'Follow', platform: 'twitch', type: 'image', category: 'twitch', styles: ['purple', 'light'], defaultStyle: 'purple', thumbnailSrc: '', template: 'badge' },

  // YouTube stickers
  { id: 'youtube-1', name: 'Subscribe', platform: 'youtube', type: 'image', category: 'youtube', styles: ['red', 'dark', 'light'], defaultStyle: 'red', thumbnailSrc: '', template: 'subscribe' },
  { id: 'youtube-2', name: 'Subscribe', platform: 'youtube', type: 'image', category: 'youtube', styles: ['red', 'dark'], defaultStyle: 'red', thumbnailSrc: '', template: 'banner' },
  { id: 'youtube-3', name: 'Subscribe', platform: 'youtube', type: 'image', category: 'youtube', styles: ['dark', 'red'], defaultStyle: 'dark', thumbnailSrc: '', template: 'basic' },
  { id: 'youtube-4', name: 'Subscribe', platform: 'youtube', type: 'image', category: 'youtube', styles: ['light', 'dark'], defaultStyle: 'light', thumbnailSrc: '', template: 'subscribe' },

  // Instagram stickers
  { id: 'instagram-1', name: 'Follow', platform: 'instagram', type: 'image', category: 'instagram', styles: ['gradient', 'dark', 'light'], defaultStyle: 'gradient', thumbnailSrc: '', template: 'basic' },
  { id: 'instagram-2', name: 'Follow', platform: 'instagram', type: 'image', category: 'instagram', styles: ['dark', 'gradient'], defaultStyle: 'dark', thumbnailSrc: '', template: 'follow' },
  { id: 'instagram-3', name: 'Follow', platform: 'instagram', type: 'image', category: 'instagram', styles: ['gradient'], defaultStyle: 'gradient', thumbnailSrc: '', template: 'badge' },

  // Kick stickers
  { id: 'kick-1', name: 'Follow', platform: 'kick', type: 'image', category: 'kick', styles: ['green', 'dark', 'light'], defaultStyle: 'green', thumbnailSrc: '', template: 'basic' },
  { id: 'kick-2', name: 'Follow', platform: 'kick', type: 'image', category: 'kick', styles: ['dark', 'green'], defaultStyle: 'dark', thumbnailSrc: '', template: 'follow' },
  { id: 'kick-3', name: 'Follow', platform: 'kick', type: 'image', category: 'kick', styles: ['green'], defaultStyle: 'green', thumbnailSrc: '', template: 'banner' },

  // Twitter/X stickers
  { id: 'twitter-1', name: 'Follow', platform: 'twitter', type: 'image', category: 'twitter', styles: ['dark', 'light'], defaultStyle: 'dark', thumbnailSrc: '', template: 'basic' },
  { id: 'twitter-2', name: 'Follow', platform: 'twitter', type: 'image', category: 'twitter', styles: ['light', 'dark'], defaultStyle: 'light', thumbnailSrc: '', template: 'badge' },

  // Facebook stickers
  { id: 'facebook-1', name: 'Follow', platform: 'facebook', type: 'image', category: 'facebook', styles: ['blue', 'dark', 'light'], defaultStyle: 'blue', thumbnailSrc: '', template: 'basic' },
  { id: 'facebook-2', name: 'Follow', platform: 'facebook', type: 'image', category: 'facebook', styles: ['dark', 'blue'], defaultStyle: 'dark', thumbnailSrc: '', template: 'follow' },

  // TikTok stickers
  { id: 'tiktok-1', name: 'Follow', platform: 'tiktok', type: 'image', category: 'tiktok', styles: ['dark', 'light'], defaultStyle: 'dark', thumbnailSrc: '', template: 'basic' },
  { id: 'tiktok-2', name: 'Follow', platform: 'tiktok', type: 'image', category: 'tiktok', styles: ['dark'], defaultStyle: 'dark', thumbnailSrc: '', template: 'follow' },
  { id: 'tiktok-3', name: 'Follow', platform: 'tiktok', type: 'image', category: 'tiktok', styles: ['gradient', 'dark'], defaultStyle: 'gradient', thumbnailSrc: '', template: 'badge' },
]

// Text style presets
const TEXT_PRESETS: { id: string; name: string; style: Partial<TextStyle> }[] = [
  // 1. Gaming Bold - Popular for gaming content with thick outline
  {
    id: 'gaming-bold',
    name: 'Gaming Bold',
    style: {
      fontFamily: 'Bebas Neue',
      fill: { type: 'solid', color: '#ffffff' },
      outline: { color: '#000000', width: 4 },
      shadow: { color: '#000000', blur: 8, x: 4, y: 4 }
    }
  },
  // 2. Neon Glow - Cyberpunk style with bright glow
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    style: {
      fontFamily: 'Orbitron',
      fill: { type: 'solid', color: '#00ffff' },
      glow: { color: '#00ffff', strength: 25 },
      outline: { color: '#001122', width: 2 }
    }
  },
  // 3. Fire Gradient - Hot gradient for hype moments
  {
    id: 'fire-gradient',
    name: 'Fire',
    style: {
      fontFamily: 'Anton',
      fill: { type: 'gradient', gradient: { type: 'linear', angle: 180, stops: [{ position: 0, color: '#ff6b00' }, { position: 50, color: '#ff0000' }, { position: 100, color: '#ffcc00' }] } },
      outline: { color: '#000000', width: 3 }
    }
  },
  // 4. Comic Pop - Bold comic book style
  {
    id: 'comic-pop',
    name: 'Comic Pop',
    style: {
      fontFamily: 'Bangers',
      fill: { type: 'solid', color: '#ffee00' },
      outline: { color: '#000000', width: 4 },
      shadow: { color: '#ff3300', blur: 0, x: 4, y: 4 }
    }
  },
  // 5. Glitch Purple - Modern streamer style
  {
    id: 'glitch-purple',
    name: 'Glitch',
    style: {
      fontFamily: 'Teko',
      fill: { type: 'gradient', gradient: { type: 'linear', angle: 90, stops: [{ position: 0, color: '#9d00ff' }, { position: 100, color: '#00d9ff' }] } },
      outline: { color: '#000000', width: 3 },
      glow: { color: '#9d00ff', strength: 12 }
    }
  },
  // 6. Clean Subtitle - Professional caption style
  {
    id: 'clean-subtitle',
    name: 'Subtitle',
    style: {
      fontFamily: 'Montserrat',
      fill: { type: 'solid', color: '#ffffff' },
      background: { color: '#000000', opacity: 75, radius: 4 }
    }
  },
  // 7. Retro Wave - 80s synthwave aesthetic
  {
    id: 'retro-wave',
    name: 'Retro Wave',
    style: {
      fontFamily: 'Permanent Marker',
      fill: { type: 'gradient', gradient: { type: 'linear', angle: 180, stops: [{ position: 0, color: '#ff00ff' }, { position: 100, color: '#00ffff' }] } },
      glow: { color: '#ff00ff', strength: 18 }
    }
  },
  // 8. Bold Impact - Classic YouTube thumbnail style
  {
    id: 'bold-impact',
    name: 'Impact',
    style: {
      fontFamily: 'Oswald',
      fill: { type: 'solid', color: '#ff0000' },
      outline: { color: '#ffffff', width: 4 },
      shadow: { color: '#000000', blur: 6, x: 3, y: 3 }
    }
  },
  // 9. Streamer Tag - Highlighted tag style
  {
    id: 'streamer-tag',
    name: 'Tag',
    style: {
      fontFamily: 'Russo One',
      fill: { type: 'solid', color: '#ffffff' },
      background: { color: '#9d00ff', opacity: 100, radius: 8 }
    }
  },
  // 10. Electric Blue - Esports style
  {
    id: 'electric-blue',
    name: 'Electric',
    style: {
      fontFamily: 'Rajdhani',
      fill: { type: 'solid', color: '#00d4ff' },
      outline: { color: '#000033', width: 3 },
      glow: { color: '#00d4ff', strength: 20 }
    }
  },
  // 11. Gold Premium - Luxury style
  {
    id: 'gold-premium',
    name: 'Gold',
    style: {
      fontFamily: 'Cinzel',
      fill: { type: 'gradient', gradient: { type: 'linear', angle: 135, stops: [{ position: 0, color: '#ffd700' }, { position: 50, color: '#fff4b8' }, { position: 100, color: '#d4a200' }] } },
      shadow: { color: '#000000', blur: 4, x: 2, y: 2 }
    }
  },
  // 12. Graffiti Style - Urban street art
  {
    id: 'graffiti',
    name: 'Graffiti',
    style: {
      fontFamily: 'Bungee',
      fill: { type: 'gradient', gradient: { type: 'linear', angle: 45, stops: [{ position: 0, color: '#ff006e' }, { position: 50, color: '#8338ec' }, { position: 100, color: '#3a86ff' }] } },
      outline: { color: '#000000', width: 3 },
      shadow: { color: '#000000', blur: 0, x: 5, y: 5 }
    }
  },
]

// Helper function to generate CSS styles for text preview thumbnails
const getTextPreviewStyles = (style: Partial<TextStyle>): React.CSSProperties => {
  const styles: React.CSSProperties = {
    fontFamily: style.fontFamily || 'Inter',
    fontWeight: 'bold',
    display: 'inline-block',
  }

  // Handle fill (solid or gradient)
  if (style.fill?.type === 'gradient' && style.fill.gradient) {
    const gradient = style.fill.gradient
    if (gradient.type === 'radial') {
      styles.background = `radial-gradient(circle, ${gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
    } else {
      styles.background = `linear-gradient(${gradient.angle || 0}deg, ${gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
    }
    styles.backgroundClip = 'text'
    styles.WebkitBackgroundClip = 'text'
    styles.WebkitTextFillColor = 'transparent'
    styles.color = 'transparent'
  } else if (style.fill?.type === 'solid') {
    styles.color = style.fill.color
  } else {
    styles.color = '#ffffff'
  }

  // Handle outline (WebkitTextStroke) - use paint-order to expand outwards
  if (style.outline) {
    styles.paintOrder = 'stroke fill'
    styles.WebkitTextStroke = `${style.outline.width * 2}px ${style.outline.color}`
  }

  // Handle shadow or glow (prefer glow if both exist)
  if (style.glow) {
    styles.textShadow = `0 0 ${style.glow.strength}px ${style.glow.color}`
  } else if (style.shadow) {
    styles.textShadow = `${style.shadow.x}px ${style.shadow.y}px ${style.shadow.blur}px ${style.shadow.color}`
  }

  // Handle background (for subtitle-style text)
  if (style.background) {
    const r = parseInt(style.background.color.slice(1, 3), 16)
    const g = parseInt(style.background.color.slice(3, 5), 16)
    const b = parseInt(style.background.color.slice(5, 7), 16)
    styles.backgroundColor = `rgba(${r}, ${g}, ${b}, ${(style.background.opacity || 100) / 100})`
    styles.borderRadius = style.background.radius || 0
    styles.padding = '2px 6px'
  }

  return styles
}

// Font options - Popular Google Fonts (alphabetically sorted)
// These fonts are loaded via Google Fonts in layout.tsx
const FONT_OPTIONS = [
  'Abril Fatface',
  'Alegreya',
  'Alfa Slab One',
  'Anton',
  'Archivo Black',
  'Arimo',
  'Arvo',
  'Asap',
  'Assistant',
  'Bangers',
  'Barlow',
  'Barlow Condensed',
  'Be Vietnam Pro',
  'Bebas Neue',
  'Bitter',
  'Black Ops One',
  'Bodoni Moda',
  'Boogaloo',
  'Bungee',
  'Cabin',
  'Cairo',
  'Caveat',
  'Chakra Petch',
  'Chewy',
  'Cinzel',
  'Comfortaa',
  'Concert One',
  'Cormorant Garamond',
  'Creepster',
  'Crimson Text',
  'Dancing Script',
  'DM Sans',
  'DM Serif Display',
  'Dosis',
  'EB Garamond',
  'Exo 2',
  'Fira Sans',
  'Fjalla One',
  'Fredoka One',
  'Fugaz One',
  'Gloria Hallelujah',
  'Great Vibes',
  'Heebo',
  'Inconsolata',
  'Inter',
  'JetBrains Mono',
  'Josefin Sans',
  'Kanit',
  'Karla',
  'Kaushan Script',
  'Lato',
  'Lexend',
  'Libre Baskerville',
  'Libre Franklin',
  'Lilita One',
  'Lobster',
  'Lobster Two',
  'Lora',
  'Luckiest Guy',
  'Manrope',
  'Marcellus',
  'Merriweather',
  'Montserrat',
  'Mukta',
  'Mulish',
  'Noto Sans',
  'Noto Serif',
  'Nunito',
  'Nunito Sans',
  'Old Standard TT',
  'Open Sans',
  'Orbitron',
  'Oswald',
  'Outfit',
  'Overpass',
  'Pacifico',
  'Patrick Hand',
  'Permanent Marker',
  'Philosopher',
  'Play',
  'Playfair Display',
  'Plus Jakarta Sans',
  'Poppins',
  'Press Start 2P',
  'Prompt',
  'PT Sans',
  'PT Serif',
  'Quicksand',
  'Rajdhani',
  'Raleway',
  'Red Hat Display',
  'Righteous',
  'Roboto',
  'Roboto Condensed',
  'Roboto Mono',
  'Roboto Slab',
  'Rock Salt',
  'Rubik',
  'Russo One',
  'Sacramento',
  'Satisfy',
  'Secular One',
  'Shadows Into Light',
  'Signika',
  'Slabo 27px',
  'Source Code Pro',
  'Source Sans Pro',
  'Source Serif Pro',
  'Space Grotesk',
  'Space Mono',
  'Spectral',
  'Staatliches',
  'Teko',
  'Titillium Web',
  'Ubuntu',
  'Ubuntu Mono',
  'Urbanist',
  'Varela Round',
  'VT323',
  'Work Sans',
  'Yanone Kaffeesatz',
  'Zilla Slab',
]

type ViewType =
  | 'main'
  | 'custom-elements'
  | 'social-stickers'
  | 'text-elements'
  | 'animated-stickers'
  | 'gifs'
  | 'twitch-emotes'
  | 'edit-image'
  | 'edit-social-sticker'
  | 'edit-text'

// Giphy types
interface GiphyGif {
  id: string
  title: string
  images: {
    fixed_height: { url: string; width: string; height: string }
    fixed_width: { url: string; width: string; height: string }
    original: { url: string; width: string; height: string }
    preview_gif: { url: string }
  }
}

// Twitch emote types
interface TwitchEmote {
  id: string
  name: string
  images: {
    url_1x: string
    url_2x: string
    url_4x: string
  }
  format: string[]
  scale: string[]
  theme_mode: string[]
  isAnimated?: boolean
  emote_type?: string // 'bitstier' | 'follower' | 'subscriptions'
  tier?: string
}

// Reaction platform types
type ReactionPlatform = 'twitch' | 'tiktok' | 'instagram' | 'twitter'

// Reaction configuration for each platform
const REACTION_PLATFORMS: { id: ReactionPlatform; name: string; label: string }[] = [
  { id: 'twitch', name: 'Twitch', label: 'Twitch reaction' },
  { id: 'tiktok', name: 'TikTok', label: 'TikTok reaction' },
  { id: 'instagram', name: 'Instagram', label: 'Instagram reaction' },
  { id: 'twitter', name: 'Twitter', label: 'Twitter reaction' },
]

type Props = {
  onAddElement: (element: Partial<OverlayElement>) => void
  onUpdateElement?: (id: string, updates: Partial<OverlayElement>) => void
  selectedElement?: OverlayElement | null
  currentTime: number
  duration: number
  userId?: string
  // When true, opens the edit view for the selected element (triggered by Edit button in preview)
  requestEditView?: boolean
  onEditViewOpened?: () => void // Callback to reset requestEditView after opening
}

// Platform colors and icons
const PLATFORM_CONFIG: Record<SocialPlatform, { color: string; bgColor: string; icon: React.ReactNode }> = {
  twitch: { 
    color: '#9146FF', 
    bgColor: 'bg-purple-600',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>
  },
  youtube: { 
    color: '#FF0000', 
    bgColor: 'bg-red-600',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
  },
  tiktok: { 
    color: '#000000', 
    bgColor: 'bg-black',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
  },
  instagram: { 
    color: '#E4405F', 
    bgColor: 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
  },
  kick: { 
    color: '#53FC18', 
    bgColor: 'bg-green-500',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M1.333 0v24h10.666V12.533L17.779 24h4.888l-7.334-12.8L22.667 0h-4.89l-5.778 10.133V0z"/></svg>
  },
  twitter: { 
    color: '#000000', 
    bgColor: 'bg-black',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
  },
  facebook: { 
    color: '#1877F2', 
    bgColor: 'bg-blue-600',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
  },
  discord: { 
    color: '#5865F2', 
    bgColor: 'bg-indigo-500',
    icon: <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>
  },
}

export default function ElementsPanel({
  onAddElement,
  onUpdateElement,
  selectedElement,
  currentTime,
  duration,
  userId,
  requestEditView,
  onEditViewOpened
}: Props) {
  const [view, setView] = useState<ViewType>('main')
  const [customElements, setCustomElements] = useState<CustomElement[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [socialUsernames, setSocialUsernames] = useState<SocialUsernames>({})
  const [localUsername, setLocalUsername] = useState('') // Local state for immediate input response
  const [socialFilter, setSocialFilter] = useState<'all' | 'animated' | 'multiple' | SocialPlatform>('all')
  const [previewText, setPreviewText] = useState('Enter text\nhere')
  const [editAnimationTab, setEditAnimationTab] = useState<'in' | 'out'>('in')
  const [editTextTab, setEditTextTab] = useState<'edit' | 'style' | 'animations' | 'presets'>('edit')
  const [editSocialTab, setEditSocialTab] = useState<'style' | 'animations'>('style')
  const [expandedStyleSection, setExpandedStyleSection] = useState<string | null>(null)
  const [recentColors, setRecentColors] = useState<string[]>([])

  // Reaction modal state
  const [reactionModalOpen, setReactionModalOpen] = useState(false)
  const [reactionPlatform, setReactionPlatform] = useState<ReactionPlatform | null>(null)
  const [reactionUsername, setReactionUsername] = useState('Username')
  const [reactionMessage, setReactionMessage] = useState('')
  const [reactionDarkMode, setReactionDarkMode] = useState(true)
  const [reactionTab, setReactionTab] = useState<'from-platform' | 'create'>('create')

  // Giphy state (Animated Stickers & Gifs)
  const [animatedStickers, setAnimatedStickers] = useState<GiphyGif[]>([])
  const [gifs, setGifs] = useState<GiphyGif[]>([])
  const [animatedStickersSearch, setAnimatedStickersSearch] = useState('')
  const [gifsSearch, setGifsSearch] = useState('')
  const [isLoadingAnimatedStickers, setIsLoadingAnimatedStickers] = useState(false)
  const [isLoadingGifs, setIsLoadingGifs] = useState(false)

  // Twitch Emotes state
  const [twitchEmotes, setTwitchEmotes] = useState<TwitchEmote[]>([])
  const [twitchEmoteSearch, setTwitchEmoteSearch] = useState('')
  const [isLoadingTwitchEmotes, setIsLoadingTwitchEmotes] = useState(false)
  const [twitchEmoteError, setTwitchEmoteError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load custom elements from Supabase
  useEffect(() => {
    if (userId) {
      loadCustomElements()
      loadSocialUsernames()
    }
  }, [userId])

  // Only switch to edit view when explicitly requested via Edit button
  // Reset to main view when element is deselected (deleted)
  useEffect(() => {
    if (!selectedElement) {
      // Reset to main view when element is deselected (deleted)
      setView('main')
    }
  }, [selectedElement?.id])

  // Handle explicit request to open edit view (from Edit button in preview)
  useEffect(() => {
    if (requestEditView && selectedElement) {
      if (selectedElement.type === 'image') {
        setView('edit-image')
      } else if (selectedElement.type === 'social-sticker') {
        setView('edit-social-sticker')
      } else if (selectedElement.type === 'text' || selectedElement.type === 'caption') {
        setView('edit-text')
      }
      // Notify parent that we've opened the edit view
      onEditViewOpened?.()
    }
  }, [requestEditView, selectedElement, onEditViewOpened])

  const loadCustomElements = async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('custom_elements')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error loading custom elements:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        setCustomElements([])
        return
      }
      setCustomElements(data || [])
    } catch (err) {
      // Handle unexpected errors
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorDetails = err instanceof Error ? { name: err.name, stack: err.stack } : {}
      console.error('Error loading custom elements:', {
        message: errorMessage,
        ...errorDetails
      })
      setCustomElements([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadSocialUsernames = async () => {
    if (!userId) return
    try {
      const { data, error } = await supabase
        .from('social_usernames')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        // PGRST116 means no rows returned, which is fine
        if (error.code !== 'PGRST116') {
          console.error('Error loading social usernames:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
        }
        return
      }
      
      if (data) {
        setSocialUsernames(data)
        // Initialize local username from loaded data
        setLocalUsername(data.twitch || data.youtube || '')
      }
    } catch (err) {
      // No existing record is fine, but log unexpected errors
      if (err instanceof Error && err.message !== 'No rows returned') {
        console.error('Unexpected error loading social usernames:', {
          message: err.message,
          name: err.name
        })
      }
    }
  }

  const saveSocialUsernamesToDb = async (usernames: SocialUsernames) => {
    if (!userId) return
    try {
      const { error } = await supabase
        .from('social_usernames')
        .upsert({ user_id: userId, ...usernames }, { onConflict: 'user_id' })

      if (error) {
        console.error('Error saving social usernames:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorDetails = err instanceof Error ? { name: err.name, stack: err.stack } : {}
      console.error('Error saving social usernames:', {
        message: errorMessage,
        ...errorDetails
      })
    }
  }

  // Handle username input with immediate local update and debounced save
  const handleUsernameChange = (name: string) => {
    // Update local state immediately for responsive UI
    setLocalUsername(name)

    // Update socialUsernames state immediately (for sticker previews)
    const newUsernames = {
      ...socialUsernames,
      twitch: name,
      youtube: name,
      tiktok: name,
      instagram: name,
      kick: name,
      twitter: name,
      facebook: name,
    }
    setSocialUsernames(newUsernames)

    // Debounce the database save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveSocialUsernamesToDb(newUsernames)
    }, 500) // Save 500ms after user stops typing
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Fetch trending animated stickers from Giphy via our API route
  const fetchAnimatedStickers = async (searchQuery?: string) => {
    setIsLoadingAnimatedStickers(true)
    try {
      const params = new URLSearchParams({
        type: 'stickers',
        limit: '50',
        rating: 'pg-13',
      })
      if (searchQuery) {
        params.set('q', searchQuery)
      }

      const response = await fetch(`/api/giphy?${params.toString()}`)
      const data = await response.json()

      if (data.error) {
        console.error('Giphy API error:', data.error)
        setAnimatedStickers([])
      } else {
        setAnimatedStickers(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching animated stickers:', error)
      setAnimatedStickers([])
    } finally {
      setIsLoadingAnimatedStickers(false)
    }
  }

  // Fetch trending GIFs from Giphy via our API route
  const fetchGifs = async (searchQuery?: string) => {
    setIsLoadingGifs(true)
    try {
      const params = new URLSearchParams({
        type: 'gifs',
        limit: '50',
        rating: 'pg-13',
      })
      if (searchQuery) {
        params.set('q', searchQuery)
      }

      const response = await fetch(`/api/giphy?${params.toString()}`)
      const data = await response.json()

      if (data.error) {
        console.error('Giphy API error:', data.error)
        setGifs([])
      } else {
        setGifs(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching GIFs:', error)
      setGifs([])
    } finally {
      setIsLoadingGifs(false)
    }
  }

  // Fetch Twitch emotes for a channel via our API route
  const fetchTwitchEmotes = async (channelName: string) => {
    if (!channelName.trim()) return
    setIsLoadingTwitchEmotes(true)
    setTwitchEmoteError(null)
    try {
      const response = await fetch(`/api/twitch/emotes?channel=${encodeURIComponent(channelName.toLowerCase())}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setTwitchEmoteError('Channel not found on Twitch')
          setTwitchEmotes([])
          return
        }
        throw new Error(data.error || 'Failed to fetch emotes')
      }

      // Transform Twitch emotes to our format
      const transformedEmotes: TwitchEmote[] = (data.data || []).map((emote: { id: string; name: string; url_1x: string; url_2x: string; url_4x: string; format?: string[]; isAnimated?: boolean; emote_type?: string; tier?: string }) => ({
        id: emote.id,
        name: emote.name,
        images: {
          url_1x: emote.url_1x,
          url_2x: emote.url_2x,
          url_4x: emote.url_4x,
        },
        format: emote.format || ['static'],
        scale: ['1.0', '2.0', '3.0'],
        theme_mode: ['dark', 'light'],
        isAnimated: emote.isAnimated,
        emote_type: emote.emote_type,
        tier: emote.tier,
      }))

      setTwitchEmotes(transformedEmotes)

      if (transformedEmotes.length === 0) {
        setTwitchEmoteError('No custom emotes found for this channel')
      }
    } catch (error) {
      console.error('Error fetching Twitch emotes:', error)
      setTwitchEmoteError('Failed to load emotes')
      setTwitchEmotes([])
    } finally {
      setIsLoadingTwitchEmotes(false)
    }
  }

  // Load initial data for Giphy sections
  useEffect(() => {
    fetchAnimatedStickers()
    fetchGifs()
  }, [])

  // Load emotes when twitch username is set
  useEffect(() => {
    if (socialUsernames.twitch) {
      setTwitchEmoteSearch(socialUsernames.twitch)
      fetchTwitchEmotes(socialUsernames.twitch)
    }
  }, [socialUsernames.twitch])

  // Add Giphy sticker/gif as image element
  const addGiphyElement = (gif: GiphyGif, type: 'sticker' | 'gif') => {
    const width = parseInt(gif.images.fixed_height.width)
    const height = parseInt(gif.images.fixed_height.height)
    const aspectRatio = width / height

    // Size based on type
    const elementWidth = type === 'sticker' ? 15 : 25
    const elementHeight = elementWidth / aspectRatio

    const newElement: Partial<OverlayElement> = {
      type: 'image',
      src: gif.images.fixed_height.url,
      content: gif.title || (type === 'sticker' ? 'Animated Sticker' : 'GIF'),
      videoLeft: 50 - elementWidth / 2,
      videoTop: 50 - elementHeight / 2,
      videoWidth: elementWidth,
      videoHeight: elementHeight,
      aspectRatio,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration),
      opacity: 100,
    }
    onAddElement(newElement)
  }

  // Add Twitch emote as image element
  const addTwitchEmote = (emote: TwitchEmote) => {
    const newElement: Partial<OverlayElement> = {
      type: 'image',
      src: emote.images.url_4x,
      content: emote.name,
      videoLeft: 45,
      videoTop: 45,
      videoWidth: 10,
      videoHeight: 10,
      aspectRatio: 1,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration),
      opacity: 100,
    }
    onAddElement(newElement)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    // Validate file
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload PNG, JPEG, GIF, or WebP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.')
      return
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      
      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('custom-elements')
        .upload(fileName, file)
      
      if (uploadError) {
        console.error('Error uploading file to storage:', {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: (uploadError as Error & { statusCode?: number }).statusCode
        })
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('custom-elements')
        .getPublicUrl(fileName)

      // Get image dimensions
      const img = new Image()
      img.src = URL.createObjectURL(file)
      await new Promise(resolve => { img.onload = resolve })

      // Save to database
      const { data, error } = await supabase
        .from('custom_elements')
        .insert({
          user_id: userId,
          name: file.name.replace(/\.[^/.]+$/, ''),
          file_path: fileName,
          file_url: publicUrl,
          file_type: file.type === 'image/gif' ? 'gif' : 'image',
          width: img.width,
          height: img.height,
          file_size: file.size
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving custom element to database:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      setCustomElements(prev => [data, ...prev])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorDetails = err instanceof Error 
        ? { name: err.name, stack: err.stack } 
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? { message: (err as { message?: string }).message, details: (err as { details?: string }).details }
          : {}
      console.error('Error uploading file:', {
        message: errorMessage,
        ...errorDetails
      })
      alert('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteCustomElement = async (element: CustomElement) => {
    if (!confirm('Delete this element?')) return
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('custom-elements')
        .remove([element.file_path])
      
      if (storageError) {
        console.error('Error deleting element from storage:', {
          message: storageError.message,
          details: storageError
        })
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('custom_elements')
        .delete()
        .eq('id', element.id)
      
      if (dbError) {
        console.error('Error deleting element from database:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        })
        return
      }
      
      setCustomElements(prev => prev.filter(e => e.id !== element.id))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorDetails = err instanceof Error ? { name: err.name, stack: err.stack } : {}
      console.error('Error deleting element:', {
        message: errorMessage,
        ...errorDetails
      })
    }
  }

  const addCustomElement = (element: CustomElement) => {
    onAddElement({
      type: 'image',
      src: element.file_url,
      content: element.name,
      videoLeft: 10,
      videoTop: 10,
      videoWidth: 20,
      videoHeight: element.height && element.width ? (20 * element.height / element.width) : 20,
      aspectRatio: element.width && element.height ? element.width / element.height : 1,
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + 3),
      opacity: 100,
      animation: { in: 'none', out: 'none' }
    })
  }

  const addSocialSticker = (sticker: SocialSticker) => {
    const username = sticker.platform === 'multiple'
      ? 'Username'
      : socialUsernames[sticker.platform as SocialPlatform] || 'Username'

    // Determine platform for single-platform stickers
    const platforms = sticker.platform === 'multiple'
      ? sticker.platforms
      : [sticker.platform as SocialPlatform]

    onAddElement({
      type: 'social-sticker',
      socialStickerId: sticker.id,
      content: username,
      stickerStyle: sticker.defaultStyle,
      stickerTemplate: sticker.template,
      stickerAnimated: sticker.type === 'animated',
      stickerAnimation: sticker.animation,
      socialPlatforms: platforms,
      videoLeft: 10,
      videoTop: 10,
      videoWidth: 30,
      videoHeight: 12,
      aspectRatio: 30 / 12,
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + 3),
      opacity: 100,
      animation: { in: 'none', out: 'none' }
    })
  }

  const addTextElement = (presetId?: string) => {
    const preset = presetId ? TEXT_PRESETS.find(p => p.id === presetId) : null

    onAddElement({
      type: 'text',
      content: previewText,
      textStyle: preset?.style as TextStyle || {
        fontFamily: 'Inter',
        fill: { type: 'solid', color: '#ffffff' }
      },
      videoLeft: 20,
      videoTop: 40,
      videoWidth: 60,
      videoHeight: 15,
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + 3),
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
      opacity: 100,
      animation: { in: 'none', out: 'none' }
    })
  }

  // Open reaction modal for a specific platform
  const openReactionModal = (platform: ReactionPlatform) => {
    setReactionPlatform(platform)
    setReactionUsername('Username')
    setReactionMessage('')
    setReactionDarkMode(true)
    setReactionTab('create')
    setReactionModalOpen(true)
  }

  // Add reaction element to the video
  const addReaction = () => {
    if (!reactionPlatform) return

    onAddElement({
      type: 'reaction',
      reactionPlatform: reactionPlatform,
      reactionUsername: reactionUsername,
      reactionMessage: reactionMessage,
      reactionDarkMode: reactionDarkMode,
      videoLeft: 10,
      videoTop: 70,
      videoWidth: 40,
      videoHeight: 10,
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + 3),
      opacity: 100,
      animation: { in: 'fade-in', out: 'none' }
    })

    setReactionModalOpen(false)
  }

  const getFilteredStickers = useCallback(() => {
    if (socialFilter === 'all') return SOCIAL_STICKERS
    return SOCIAL_STICKERS.filter(s => s.category === socialFilter)
  }, [socialFilter])

  const getStickersByCategory = useCallback((category: string) => {
    return SOCIAL_STICKERS.filter(s => s.category === category)
  }, [])

  // Render social sticker thumbnail using StickerRenderer
  const renderStickerThumbnail = (sticker: SocialSticker, username: string) => {
    const platform = sticker.platform === 'multiple' ? (sticker.platforms?.[0] || 'twitch') : sticker.platform

    const stickerConfig: StickerConfig = {
      id: sticker.id,
      template: sticker.template || 'basic',
      platform: platform as SocialPlatform,
      platforms: sticker.platform === 'multiple' ? sticker.platforms : undefined,
      username: username,
      style: sticker.defaultStyle as StickerStyle,
      animated: sticker.type === 'animated',
      animation: sticker.animation,
      showFollowLabel: sticker.template === 'follow',
    }

    return (
      <div className="w-full h-full flex items-center justify-center px-3 py-2">
        <StickerRenderer config={stickerConfig} isPreview={true} />
      </div>
    )
  }

  // Get CSS animation style for a given animation type
  const getAnimationStyle = (animId: AnimationType): React.CSSProperties => {
    const animationMap: Record<string, string> = {
      'fadeIn': 'fadeIn 1s ease-out infinite',
      'fadeOut': 'fadeOut 1s ease-out infinite',
      'slideRight': 'slideRight 1s ease-out infinite',
      'slideLeft': 'slideLeft 1s ease-out infinite',
      'slideUp': 'slideUp 1s ease-out infinite',
      'slideDown': 'slideDown 1s ease-out infinite',
      'bounceIn': 'bounceIn 1s ease-out infinite',
      'pop': 'pop 1s ease-out infinite',
      'rollIn': 'rollIn 1s ease-out infinite',
      'zoomIn': 'zoomIn 1s ease-out infinite',
      'flip': 'flip 1s ease-out infinite',
      'shake': 'shake 0.5s ease-in-out infinite',
      'pulse': 'pulse 1s ease-in-out infinite',
      'stick': 'slideDown 0.5s ease-out infinite',
      'appear': 'fadeIn 0.5s ease-out infinite',
      'land': 'slideDown 0.6s ease-out infinite',
      'unfold': 'zoomIn 0.8s ease-out infinite',
      'emerge': 'slideUp 0.6s ease-out infinite',
      'burst': 'pop 0.5s ease-out infinite',
      'jump': 'bounceIn 0.6s ease-out infinite',
      'glide': 'slideRight 0.8s ease-out infinite',
      'float': 'slideUp 1s ease-out infinite',
      'impact': 'pop 0.4s ease-out infinite',
      'hop': 'bounceIn 0.5s ease-out infinite',
      'drift': 'slideLeft 1s ease-out infinite',
      'groove': 'shake 0.6s ease-in-out infinite',
      'bounce': 'bounceIn 0.8s ease-out infinite',
      'whirl': 'flip 1s ease-out infinite',
    }
    return animId !== 'none' && animationMap[animId]
      ? { animation: animationMap[animId] }
      : {}
  }

  // Animation grid component
  const AnimationGrid = ({
    animations,
    selected,
    onSelect
  }: {
    animations: { id: AnimationType; name: string }[]
    selected: AnimationType
    onSelect: (anim: AnimationType) => void
  }) => (
    <div className="grid grid-cols-2 gap-2 p-3">
      {animations.map(anim => (
        <button
          key={anim.id}
          onClick={() => onSelect(anim.id)}
          className={`flex flex-col items-center p-2 rounded-lg border transition-colors ${
            selected === anim.id
              ? 'border-purple-500 bg-purple-500/20'
              : 'border-gray-700 bg-[#1a1a2e] hover:bg-[#252538]'
          }`}
        >
          {/* Animation preview rectangle */}
          <div className="w-full h-12 bg-gray-800 rounded flex items-center justify-center overflow-hidden mb-2">
            <span
              className="text-sm font-medium text-white"
              style={getAnimationStyle(anim.id)}
            >
              abc123
            </span>
          </div>
          {/* Animation name below */}
          <span className={`text-xs ${selected === anim.id ? 'text-white' : 'text-gray-400'}`}>
            {anim.name}
          </span>
        </button>
      ))}
    </div>
  )

  // Submenu header with back button - replaces the "Elements" title in edit views
  const SubmenuHeader = ({
    title,
    subtitle,
    onBack
  }: {
    title: string
    subtitle: string
    onBack: () => void
  }) => (
    <div className="mb-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-1 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-lg font-semibold text-white">{title}</span>
      </button>
      <p className="text-xs text-gray-400 ml-6">{subtitle}</p>
    </div>
  )

  // Main elements view
  const renderMainView = () => (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Custom Elements Section */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Custom Elements</h3>
          {customElements.length > 0 && (
            <button 
              onClick={() => setView('custom-elements')}
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              View all
            </button>
          )}
        </div>
        
        {/* Upload Area */}
        <label className="block border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-gray-500 transition-colors cursor-pointer mb-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          {isUploading ? (
            <Loader2 className="w-5 h-5 mx-auto mb-2 text-gray-400 animate-spin" />
          ) : (
            <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
          )}
          <p className="text-sm text-gray-400">Upload a file</p>
          <p className="text-xs text-gray-600">Max 10 MB • PNG, JPEG, GIF</p>
        </label>

        {/* Element Grid - 4 columns, max 12 */}
        {customElements.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {customElements.slice(0, 12).map((element) => (
              <button
                key={element.id}
                onClick={() => addCustomElement(element)}
                className="aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors group relative"
                title={element.name}
              >
                <img
                  src={element.file_url}
                  alt={element.name}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 text-center py-4">No custom elements yet</p>
        )}
      </div>

      {/* Social Stickers Section */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Social Stickers</h3>
          <button 
            onClick={() => setView('social-stickers')}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            View all
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_STICKERS.slice(0, 6).map((sticker) => {
            const username = sticker.platform === 'multiple' 
              ? 'Username' 
              : socialUsernames[sticker.platform as SocialPlatform] || 'Username'
            return (
              <button
                key={sticker.id}
                onClick={() => addSocialSticker(sticker)}
                className="h-16 bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors"
              >
                {renderStickerThumbnail(sticker, username)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Text Elements Section */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Text Elements</h3>
          <button
            onClick={() => setView('text-elements')}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {TEXT_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              onClick={() => addTextElement(preset.id)}
              className="p-3 bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg transition-colors overflow-hidden"
            >
              <div
                className="text-sm font-medium text-center truncate"
                style={getTextPreviewStyles(preset.style)}
              >
                {preset.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Reactions Section */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Reactions</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Twitch Reaction */}
          <button
            onClick={() => openReactionModal('twitch')}
            className="relative p-3 bg-gradient-to-br from-purple-100/80 to-blue-50/80 hover:from-purple-200/80 hover:to-blue-100/80 border border-gray-200 rounded-lg transition-colors overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-[#18181b] text-white rounded-md px-2 py-1.5 text-xs shadow-md">
              <div className="w-4 h-4 text-purple-500">
                {PLATFORM_CONFIG.twitch.icon}
              </div>
              <span><span className="text-purple-400 font-semibold">Username</span>: Twitch reaction</span>
            </div>
          </button>

          {/* Instagram Reaction */}
          <button
            onClick={() => openReactionModal('instagram')}
            className="relative p-3 bg-gradient-to-br from-pink-100/80 to-purple-50/80 hover:from-pink-200/80 hover:to-purple-100/80 border border-gray-200 rounded-lg transition-colors overflow-hidden"
          >
            <div className="flex flex-col items-end gap-0.5 bg-white rounded-xl px-3 py-2 text-xs shadow-md border border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 text-pink-500">
                  {PLATFORM_CONFIG.instagram.icon}
                </div>
                <span className="text-gray-900 font-medium">Instagram reaction</span>
              </div>
              <span className="text-gray-400 text-[10px]">Replying to Username</span>
            </div>
          </button>

          {/* TikTok Reaction */}
          <button
            onClick={() => openReactionModal('tiktok')}
            className="relative p-3 bg-gradient-to-br from-cyan-100/80 to-pink-50/80 hover:from-cyan-200/80 hover:to-pink-100/80 border border-gray-200 rounded-lg transition-colors overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 bg-white rounded-lg px-3 py-2 text-xs shadow-md border border-gray-100">
              <span className="text-gray-400 text-[10px]">Reply to Username&apos;s comment</span>
              <span className="text-gray-900 font-medium">TikTok reaction</span>
            </div>
          </button>

          {/* Twitter Reaction */}
          <button
            onClick={() => openReactionModal('twitter')}
            className="relative p-3 bg-gradient-to-br from-blue-50/80 to-gray-50/80 hover:from-blue-100/80 hover:to-gray-100/80 border border-gray-200 rounded-lg transition-colors overflow-hidden"
          >
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-xs shadow-md border border-gray-100">
              <div className="flex flex-col">
                <span className="text-gray-900 font-medium">Username</span>
                <span className="text-gray-500 text-[10px]">Twitter reaction</span>
              </div>
              <div className="w-4 h-4 text-black ml-auto">
                {PLATFORM_CONFIG.twitter.icon}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Animated Stickers Section (Giphy) */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Animated Stickers</h3>
          <button
            onClick={() => setView('animated-stickers')}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {isLoadingAnimatedStickers ? (
            <div className="col-span-3 flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : animatedStickers.length > 0 ? (
            animatedStickers.slice(0, 9).map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => addGiphyElement(sticker, 'sticker')}
                className="aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors"
              >
                <img
                  src={sticker.images.fixed_height.url}
                  alt={sticker.title}
                  width={100}
                  height={100}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </button>
            ))
          ) : (
            <p className="col-span-3 text-sm text-gray-500 text-center py-4">No stickers found</p>
          )}
        </div>
      </div>

      {/* GIFs Section (Giphy) */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">GIFs</h3>
          <button
            onClick={() => setView('gifs')}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            View all
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {isLoadingGifs ? (
            <div className="col-span-3 flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : gifs.length > 0 ? (
            gifs.slice(0, 9).map((gif) => (
              <button
                key={gif.id}
                onClick={() => addGiphyElement(gif, 'gif')}
                className="aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors"
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt={gif.title}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))
          ) : (
            <p className="col-span-3 text-sm text-gray-500 text-center py-4">No GIFs found</p>
          )}
        </div>
      </div>

      {/* Twitch Emotes Section */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Twitch Emotes</h3>
          <button
            onClick={() => setView('twitch-emotes')}
            className="text-xs text-purple-400 hover:text-purple-300"
          >
            View all
          </button>
        </div>

        {/* Search input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            name="twitch-username"
            autoComplete="off"
            placeholder={socialUsernames.twitch || 'Enter Twitch username'}
            value={twitchEmoteSearch}
            onChange={(e) => setTwitchEmoteSearch(e.target.value)}
            className="flex-1 px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => fetchTwitchEmotes(twitchEmoteSearch)}
            disabled={isLoadingTwitchEmotes || !twitchEmoteSearch.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoadingTwitchEmotes ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Search emotes'
            )}
          </button>
        </div>

        {twitchEmoteError && (
          <p className="text-sm text-red-400 mb-3">{twitchEmoteError}</p>
        )}

        <div className="grid grid-cols-4 gap-2">
          {isLoadingTwitchEmotes ? (
            <div className="col-span-4 flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : twitchEmotes.length > 0 ? (
            twitchEmotes.slice(0, 12).map((emote) => (
              <button
                key={emote.id}
                onClick={() => addTwitchEmote(emote)}
                className="aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors p-2 flex items-center justify-center"
                title={emote.name}
              >
                <img
                  src={emote.images.url_2x}
                  alt={emote.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </button>
            ))
          ) : (
            <p className="col-span-4 text-sm text-gray-500 text-center py-4">
              {twitchEmoteSearch ? 'No emotes found' : 'Enter a username to search emotes'}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  // Custom Elements View All
  const renderCustomElementsView = () => (
    <div className="flex flex-col h-full p-3">
      <SubmenuHeader
        title="Custom Elements"
        subtitle="Upload and manage your custom images and graphics."
        onBack={() => setView('main')}
      />
      
      {/* Upload Area */}
      <label className="block border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-gray-500 transition-colors cursor-pointer mb-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />
        {isUploading ? (
          <Loader2 className="w-5 h-5 mx-auto mb-2 text-gray-400 animate-spin" />
        ) : (
          <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
        )}
        <p className="text-sm text-gray-400">Upload a file</p>
        <p className="text-xs text-gray-600">Max 10 MB • PNG, JPEG, GIF</p>
      </label>

      {/* 2-column grid of all elements */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {customElements.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {customElements.map((element) => (
              <div
                key={element.id}
                className="relative group aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors"
              >
                <button
                  onClick={() => addCustomElement(element)}
                  className="w-full h-full"
                >
                  <img
                    src={element.file_url}
                    alt={element.name}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
                <button
                  onClick={() => handleDeleteCustomElement(element)}
                  className="absolute top-1 right-1 p-1 bg-red-500/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            No custom elements uploaded yet
          </p>
        )}
      </div>
    </div>
  )

  // Social Stickers View All
  const renderSocialStickersView = () => {
    const filters: Array<'all' | 'animated' | 'multiple' | SocialPlatform> = [
      'all', 'animated', 'multiple', 'twitch', 'youtube', 'tiktok', 'instagram', 'kick', 'twitter', 'facebook'
    ]

    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-gray-800">
          <SubmenuHeader
            title="Social Stickers"
            subtitle="Add social media follow buttons to your video."
            onBack={() => setView('main')}
          />
          <p className="text-xs text-gray-400 mb-4 -mt-2">
            Let your viewers know where to find you on social media with these stickers.
          </p>
          
          {/* Filter tabs - Horizontal scroll, single line */}
          <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-2 mb-3">
            {filters.map(filter => (
              <button
                key={filter}
                onClick={() => setSocialFilter(filter)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  socialFilter === filter
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
          
          {/* Username input */}
          <div className="mb-2">
            <input
              type="text"
              name="social-username"
              autoComplete="off"
              placeholder="Your username"
              value={localUsername}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Stickers by category */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
          {socialFilter === 'all' ? (
            <>
              {['animated', 'multiple', 'twitch', 'youtube', 'tiktok', 'instagram', 'kick', 'twitter', 'facebook'].map(category => {
                const stickers = getStickersByCategory(category)
                if (stickers.length === 0) return null
                
                return (
                  <div key={category} className="mb-6">
                    <h3 className="text-sm font-medium text-white mb-3 capitalize">{category}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {stickers.map(sticker => {
                        const username = sticker.platform === 'multiple' 
                          ? 'Username' 
                          : socialUsernames[sticker.platform as SocialPlatform] || 'Username'
                        return (
                          <button
                            key={sticker.id}
                            onClick={() => addSocialSticker(sticker)}
                            className="h-[72px] bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors"
                          >
                            {renderStickerThumbnail(sticker, username)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {getFilteredStickers().map(sticker => {
                const username = sticker.platform === 'multiple' 
                  ? 'Username' 
                  : socialUsernames[sticker.platform as SocialPlatform] || 'Username'
                return (
                  <button
                    key={sticker.id}
                    onClick={() => addSocialSticker(sticker)}
                    className="h-14 bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors"
                  >
                    {renderStickerThumbnail(sticker, username)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Text Elements View All
  const renderTextElementsView = () => (
    <div className="flex flex-col h-full p-3">
      <SubmenuHeader
        title="Text Elements"
        subtitle="Add styled text to your video."
        onBack={() => setView('main')}
      />
      
      {/* Text preview input */}
      <div className="mb-4">
        <textarea
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Enter text here"
          rows={2}
          className="w-full px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      {/* Text presets - 2 column grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          {TEXT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => addTextElement(preset.id)}
              className="p-4 bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg transition-colors overflow-hidden"
            >
              <div
                className="text-sm font-medium text-center whitespace-pre-line"
                style={getTextPreviewStyles(preset.style)}
              >
                {previewText}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // Edit Image View (for custom elements)
  const renderEditImageView = () => {
    if (!selectedElement) return null

    return (
      <div className="flex flex-col h-full p-3">
        <SubmenuHeader
          title="Edit image"
          subtitle="Change the animations of your image element."
          onBack={() => setView('main')}
        />
        
        {/* Animation tabs */}
        <div className="flex border-b border-gray-700 mb-2">
          <button
            onClick={() => setEditAnimationTab('in')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              editAnimationTab === 'in' 
                ? 'text-white border-b-2 border-purple-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            In Animation
          </button>
          <button
            onClick={() => setEditAnimationTab('out')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              editAnimationTab === 'out' 
                ? 'text-white border-b-2 border-purple-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Out Animation
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimationGrid
            animations={ELEMENT_ANIMATIONS}
            selected={editAnimationTab === 'in' 
              ? selectedElement.animation?.in || 'none' 
              : selectedElement.animation?.out || 'none'
            }
            onSelect={(anim) => {
              if (onUpdateElement) {
                onUpdateElement(selectedElement.id, {
                  animation: {
                    in: selectedElement.animation?.in || 'none',
                    out: selectedElement.animation?.out || 'none',
                    ...selectedElement.animation,
                    [editAnimationTab]: anim
                  }
                })
              }
            }}
          />
        </div>
      </div>
    )
  }

  // Edit Social Sticker View
  const renderEditSocialStickerView = () => {
    if (!selectedElement) return null

    const sticker = SOCIAL_STICKERS.find(s => s.id === selectedElement.socialStickerId)

    return (
      <div className="flex flex-col h-full p-3">
        <SubmenuHeader
          title="Edit social sticker"
          subtitle="Customize the style and animation of your sticker."
          onBack={() => setView('main')}
        />
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-4">
          <button
            onClick={() => setEditSocialTab('style')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              editSocialTab === 'style' 
                ? 'text-white border-b-2 border-purple-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Style
          </button>
          <button
            onClick={() => setEditSocialTab('animations')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              editSocialTab === 'animations' 
                ? 'text-white border-b-2 border-purple-500' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Animations
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {editSocialTab === 'style' ? (
            <div className="space-y-4">
              {/* Sticker text */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Sticker text</label>
                <input
                  type="text"
                  value={selectedElement.content || ''}
                  onChange={(e) => {
                    if (onUpdateElement) {
                      onUpdateElement(selectedElement.id, { content: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              
              {/* Style options */}
              {sticker && sticker.styles.length > 1 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sticker.styles.map(style => (
                      <button
                        key={style}
                        onClick={() => {
                          if (onUpdateElement) {
                            onUpdateElement(selectedElement.id, { stickerStyle: style })
                          }
                        }}
                        className={`p-2 rounded-lg border text-sm capitalize transition-colors ${
                          selectedElement.stickerStyle === style
                            ? 'border-purple-500 bg-purple-500/20 text-white'
                            : 'border-gray-700 bg-[#1a1a2e] text-gray-300 hover:bg-[#252538]'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Edit socials for multiple platform stickers */}
              {sticker?.platform === 'multiple' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {(['twitch', 'youtube', 'tiktok', 'instagram', 'kick', 'twitter'] as SocialPlatform[]).map(platform => {
                      const isActive = selectedElement.socialPlatforms?.includes(platform)
                      const config = PLATFORM_CONFIG[platform]
                      return (
                        <button
                          key={platform}
                          onClick={() => {
                            if (onUpdateElement) {
                              const platforms = selectedElement.socialPlatforms || []
                              const newPlatforms = isActive
                                ? platforms.filter(p => p !== platform)
                                : [...platforms, platform]
                              onUpdateElement(selectedElement.id, { socialPlatforms: newPlatforms })
                            }
                          }}
                          className={`p-2 rounded-lg border transition-colors ${
                            isActive
                              ? 'border-purple-500 bg-purple-500/20'
                              : 'border-gray-700 bg-[#1a1a2e] hover:bg-[#252538]'
                          }`}
                        >
                          <span className="text-white">{config.icon}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Animation sub-tabs */}
              <div className="flex border-b border-gray-700 mb-2">
                <button
                  onClick={() => setEditAnimationTab('in')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    editAnimationTab === 'in' 
                      ? 'text-white border-b-2 border-purple-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  In Animation
                </button>
                <button
                  onClick={() => setEditAnimationTab('out')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    editAnimationTab === 'out' 
                      ? 'text-white border-b-2 border-purple-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Out Animation
                </button>
              </div>
              
              <AnimationGrid
                animations={ELEMENT_ANIMATIONS}
                selected={editAnimationTab === 'in'
                  ? selectedElement.animation?.in || 'none'
                  : selectedElement.animation?.out || 'none'
                }
                onSelect={(anim) => {
                  if (onUpdateElement) {
                    onUpdateElement(selectedElement.id, {
                      animation: {
                        in: selectedElement.animation?.in || 'none',
                        out: selectedElement.animation?.out || 'none',
                        ...selectedElement.animation,
                        [editAnimationTab]: anim
                      }
                    })
                  }
                }}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  // Edit Custom Element View

  // Edit Text View
  const renderEditTextView = () => {
    if (!selectedElement) return null

    const textStyle = selectedElement.textStyle || {
      fontFamily: 'Inter',
      fill: { type: 'solid' as const, color: '#ffffff' }
    }

    return (
      <div className="flex flex-col h-full p-3">
        <SubmenuHeader
          title="Edit text element"
          subtitle="Change the text and style of your text element."
          onBack={() => setView('main')}
        />
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-4">
          {(['edit', 'style', 'animations', 'presets'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setEditTextTab(tab)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                editTextTab === tab 
                  ? 'text-white border-b-2 border-purple-500' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Edit Tab */}
          {editTextTab === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Text content</label>
                <textarea
                  value={selectedElement.content || ''}
                  onChange={(e) => {
                    if (onUpdateElement) {
                      onUpdateElement(selectedElement.id, { content: e.target.value })
                    }
                  }}
                  rows={4}
                  className="w-full px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
              
              {/* TTS Placeholder */}
              <div className="p-4 bg-[#1a1a2e] border border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 text-gray-400">
                  <Type className="w-4 h-4" />
                  <span className="text-sm">Text to Speech</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Coming soon...</p>
              </div>
            </div>
          )}
          
          {/* Style Tab */}
          {editTextTab === 'style' && (
            <div className="space-y-3">
              {/* Font family */}
              <button
                onClick={() => setExpandedStyleSection(expandedStyleSection === 'font' ? null : 'font')}
                className="w-full p-3 bg-[#1a1a2e] border border-gray-700 rounded-lg text-left hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base text-white" style={{ fontFamily: textStyle.fontFamily }}>
                    {textStyle.fontFamily || 'Inter'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedStyleSection === 'font' ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {expandedStyleSection === 'font' && (
                <div className="mt-1 bg-[#1a1a2e] border border-gray-700 rounded-lg max-h-80 overflow-y-auto custom-scrollbar">
                  {FONT_OPTIONS.map(font => (
                    <button
                      key={font}
                      onClick={() => {
                        if (onUpdateElement) {
                          onUpdateElement(selectedElement.id, {
                            textStyle: { ...textStyle, fontFamily: font }
                          })
                        }
                        setExpandedStyleSection(null)
                      }}
                      className={`w-full px-4 py-3 text-left text-lg border-b border-gray-800 last:border-b-0 transition-colors ${
                        textStyle.fontFamily === font
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'text-gray-200 hover:bg-[#252538]'
                      }`}
                      style={{ fontFamily: `"${font}", sans-serif` }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              )}

              {/* Fill - Always active */}
              <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedStyleSection(expandedStyleSection === 'fill' ? null : 'fill')}
                  className="w-full p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Fill color square - shows solid color or gradient */}
                    {textStyle.fill?.type === 'gradient' && textStyle.fill.gradient ? (
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{
                          background: textStyle.fill.gradient.type === 'radial'
                            ? `radial-gradient(circle, ${textStyle.fill.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
                            : `linear-gradient(${textStyle.fill.gradient.angle || 0}deg, ${textStyle.fill.gradient.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
                        }}
                      />
                    ) : (
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: textStyle.fill?.color || '#ffffff' }}
                      />
                    )}
                    <span className="text-sm text-white">Fill</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedStyleSection === 'fill' ? 'rotate-180' : ''}`} />
                </button>
                {expandedStyleSection === 'fill' && (
                  <div className="p-4 border-t border-gray-700 bg-white rounded-b-lg">
                    {/* Solid/Gradient tabs - matching screenshot design */}
                    <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => {
                          if (onUpdateElement) {
                            onUpdateElement(selectedElement.id, {
                              textStyle: { ...textStyle, fill: { type: 'solid', color: textStyle.fill?.color || '#cfcfcf' } }
                            })
                          }
                        }}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${textStyle.fill?.type !== 'gradient' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      >
                        Solid
                      </button>
                      <button
                        onClick={() => {
                          if (onUpdateElement) {
                            onUpdateElement(selectedElement.id, {
                              textStyle: {
                                ...textStyle,
                                fill: {
                                  type: 'gradient',
                                  gradient: textStyle.fill?.gradient || { type: 'linear', angle: 90, stops: [{ position: 0, color: '#cfcfcf' }, { position: 63, color: '#ffffff' }, { position: 100, color: '#cfcfcf' }] }
                                }
                              }
                            })
                          }
                        }}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${textStyle.fill?.type === 'gradient' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                      >
                        Gradient
                      </button>
                    </div>

                    {textStyle.fill?.type !== 'gradient' ? (
                      <ColorPicker
                        value={textStyle.fill?.color || '#ffffff'}
                        onChange={(color) => {
                          if (onUpdateElement) {
                            onUpdateElement(selectedElement.id, {
                              textStyle: { ...textStyle, fill: { type: 'solid', color } }
                            })
                          }
                        }}
                        recentColors={recentColors}
                        onAddRecent={(color) => {
                          setRecentColors(prev => [color, ...prev.filter(c => c !== color)].slice(0, 12))
                        }}
                      />
                    ) : (
                      <div className="space-y-4">
                        {/* Linear/Radial dropdown + Angle */}
                        <div className="flex items-center gap-3">
                          <select
                            value={textStyle.fill.gradient?.type || 'linear'}
                            onChange={(e) => {
                              if (onUpdateElement) {
                                onUpdateElement(selectedElement.id, {
                                  textStyle: {
                                    ...textStyle,
                                    fill: {
                                      type: 'gradient',
                                      gradient: { ...textStyle.fill!.gradient!, type: e.target.value as 'linear' | 'radial' }
                                    }
                                  }
                                })
                              }
                            }}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="linear">linear</option>
                            <option value="radial">radial</option>
                          </select>

                          {textStyle.fill.gradient?.type !== 'radial' && (
                            <div className="flex items-center gap-1 border border-gray-300 rounded-md">
                              <button
                                onClick={() => {
                                  if (onUpdateElement) {
                                    const currentAngle = textStyle.fill?.gradient?.angle || 0
                                    onUpdateElement(selectedElement.id, {
                                      textStyle: {
                                        ...textStyle,
                                        fill: {
                                          type: 'gradient',
                                          gradient: { ...textStyle.fill!.gradient!, angle: Math.max(0, currentAngle - 15) }
                                        }
                                      }
                                    })
                                  }
                                }}
                                className="px-2 py-1.5 text-gray-500 hover:text-gray-700"
                              >
                                −
                              </button>
                              <input
                                type="text"
                                value={`${textStyle.fill.gradient?.angle || 0}°`}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value.replace('°', ''))
                                  if (!isNaN(val) && onUpdateElement) {
                                    onUpdateElement(selectedElement.id, {
                                      textStyle: {
                                        ...textStyle,
                                        fill: {
                                          type: 'gradient',
                                          gradient: { ...textStyle.fill!.gradient!, angle: Math.min(360, Math.max(0, val)) }
                                        }
                                      }
                                    })
                                  }
                                }}
                                className="w-12 py-1.5 text-center text-sm text-gray-900 border-0 focus:outline-none"
                              />
                              <button
                                onClick={() => {
                                  if (onUpdateElement) {
                                    const currentAngle = textStyle.fill?.gradient?.angle || 0
                                    onUpdateElement(selectedElement.id, {
                                      textStyle: {
                                        ...textStyle,
                                        fill: {
                                          type: 'gradient',
                                          gradient: { ...textStyle.fill!.gradient!, angle: Math.min(360, currentAngle + 15) }
                                        }
                                      }
                                    })
                                  }
                                }}
                                className="px-2 py-1.5 text-gray-500 hover:text-gray-700"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Gradient preview bar */}
                        <div
                          className="h-3 rounded-full relative"
                          style={{
                            background: `linear-gradient(to right, ${textStyle.fill.gradient?.stops.map(s => `${s.color} ${s.position}%`).join(', ')})`
                          }}
                        >
                          {textStyle.fill.gradient?.stops.map((stop, i) => (
                            <div
                              key={i}
                              className="absolute w-3 h-3 bg-white border border-gray-400 rounded-sm -translate-x-1/2 top-0 cursor-pointer"
                              style={{ left: `${stop.position}%` }}
                            />
                          ))}
                        </div>

                        {/* Gradient Stops List */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-sm text-gray-700 font-medium">Stops</label>
                            {(textStyle.fill.gradient?.stops.length || 0) < 9 && (
                              <button
                                onClick={() => {
                                  if (onUpdateElement) {
                                    const stops = textStyle.fill?.gradient?.stops || []
                                    const lastPosition = stops.length > 0 ? stops[stops.length - 1].position : 0
                                    const newPosition = Math.min(100, lastPosition + Math.floor((100 - lastPosition) / 2))
                                    const newStops = [...stops, { position: newPosition, color: '#ffffff' }]
                                    onUpdateElement(selectedElement.id, {
                                      textStyle: {
                                        ...textStyle,
                                        fill: {
                                          type: 'gradient',
                                          gradient: { ...textStyle.fill!.gradient!, stops: newStops }
                                        }
                                      }
                                    })
                                  }
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {textStyle.fill.gradient?.stops.map((stop, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-sm text-gray-600 w-10">{stop.position}%</span>
                              <div
                                className="w-6 h-6 rounded border border-gray-300 cursor-pointer relative"
                                style={{ backgroundColor: stop.color }}
                              >
                                <input
                                  type="color"
                                  value={stop.color}
                                  onChange={(e) => {
                                    if (onUpdateElement) {
                                      const newStops = [...(textStyle.fill?.gradient?.stops || [])]
                                      newStops[i] = { ...newStops[i], color: e.target.value }
                                      onUpdateElement(selectedElement.id, {
                                        textStyle: {
                                          ...textStyle,
                                          fill: {
                                            type: 'gradient',
                                            gradient: { ...textStyle.fill!.gradient!, stops: newStops }
                                          }
                                        }
                                      })
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                              </div>
                              <input
                                type="text"
                                value={stop.color.toUpperCase()}
                                onChange={(e) => {
                                  if (onUpdateElement && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                    const newStops = [...(textStyle.fill?.gradient?.stops || [])]
                                    newStops[i] = { ...newStops[i], color: e.target.value }
                                    onUpdateElement(selectedElement.id, {
                                      textStyle: {
                                        ...textStyle,
                                        fill: {
                                          type: 'gradient',
                                          gradient: { ...textStyle.fill!.gradient!, stops: newStops }
                                        }
                                      }
                                    })
                                  }
                                }}
                                className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 font-mono"
                              />
                              {(textStyle.fill.gradient?.stops.length || 0) > 2 && (
                                <button
                                  onClick={() => {
                                    if (onUpdateElement) {
                                      const newStops = [...(textStyle.fill?.gradient?.stops || [])].filter((_, idx) => idx !== i)
                                      onUpdateElement(selectedElement.id, {
                                        textStyle: {
                                          ...textStyle,
                                          fill: {
                                            type: 'gradient',
                                            gradient: { ...textStyle.fill!.gradient!, stops: newStops }
                                          }
                                        }
                                      })
                                    }
                                  }}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Outline - Click to open, remove button to disable */}
              <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    if (expandedStyleSection === 'outline') {
                      setExpandedStyleSection(null)
                    } else {
                      setExpandedStyleSection('outline')
                      // Enable outline if not already enabled
                      if (onUpdateElement && !textStyle.outline) {
                        onUpdateElement(selectedElement.id, {
                          textStyle: { ...textStyle, outline: { color: '#000000', width: 2 } }
                        })
                      }
                    }
                  }}
                  className="w-full p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {textStyle.outline ? (
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: textStyle.outline.color }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded border border-gray-600 bg-[#252538] flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-gray-500 rotate-45" />
                      </div>
                    )}
                    <span className="text-sm text-white">Outline</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedStyleSection === 'outline' ? 'rotate-180' : ''}`} />
                </button>
                {expandedStyleSection === 'outline' && (
                  <div className="p-3 border-t border-gray-700 space-y-3">
                    {textStyle.outline ? (
                      <>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={textStyle.outline.color}
                              onChange={(e) => {
                                if (onUpdateElement) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, outline: { ...textStyle.outline!, color: e.target.value } }
                                  })
                                }
                              }}
                              className="w-10 h-10 cursor-pointer rounded border border-gray-600 bg-transparent"
                            />
                            <input
                              type="text"
                              value={textStyle.outline.color}
                              onChange={(e) => {
                                if (onUpdateElement && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, outline: { ...textStyle.outline!, color: e.target.value } }
                                  })
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-[#252538] border border-gray-600 rounded text-sm text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Width: {textStyle.outline.width}px</label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={textStyle.outline.width}
                            onChange={(e) => {
                              if (onUpdateElement) {
                                onUpdateElement(selectedElement.id, {
                                  textStyle: { ...textStyle, outline: { ...textStyle.outline!, width: parseInt(e.target.value) } }
                                })
                              }
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (onUpdateElement) {
                              const newStyle = { ...textStyle }
                              delete newStyle.outline
                              onUpdateElement(selectedElement.id, { textStyle: newStyle })
                              setExpandedStyleSection(null)
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">Remove Outline</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (onUpdateElement) {
                            onUpdateElement(selectedElement.id, {
                              textStyle: { ...textStyle, outline: { color: '#000000', width: 2 } }
                            })
                          }
                        }}
                        className="w-full py-2 text-purple-400 hover:text-purple-300 text-sm"
                      >
                        + Add Outline
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Shadow - Click to open, remove button to disable */}
              <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    if (expandedStyleSection === 'shadow') {
                      setExpandedStyleSection(null)
                    } else {
                      setExpandedStyleSection('shadow')
                      if (onUpdateElement && !textStyle.shadow) {
                        onUpdateElement(selectedElement.id, {
                          textStyle: { ...textStyle, shadow: { color: '#000000', blur: 4, x: 2, y: 2 } }
                        })
                      }
                    }
                  }}
                  className="w-full p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {textStyle.shadow ? (
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: textStyle.shadow.color }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded border border-gray-600 bg-[#252538] flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-gray-500 rotate-45" />
                      </div>
                    )}
                    <span className="text-sm text-white">Shadow</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedStyleSection === 'shadow' ? 'rotate-180' : ''}`} />
                </button>
                {expandedStyleSection === 'shadow' && (
                  <div className="p-3 border-t border-gray-700 space-y-3">
                    {textStyle.shadow ? (
                      <>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={textStyle.shadow.color}
                              onChange={(e) => {
                                if (onUpdateElement) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, shadow: { ...textStyle.shadow!, color: e.target.value } }
                                  })
                                }
                              }}
                              className="w-10 h-10 cursor-pointer rounded border border-gray-600 bg-transparent"
                            />
                            <input
                              type="text"
                              value={textStyle.shadow.color}
                              onChange={(e) => {
                                if (onUpdateElement && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, shadow: { ...textStyle.shadow!, color: e.target.value } }
                                  })
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-[#252538] border border-gray-600 rounded text-sm text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Blur: {textStyle.shadow.blur}px</label>
                          <input
                            type="range"
                            min="0"
                            max="20"
                            value={textStyle.shadow.blur}
                            onChange={(e) => {
                              if (onUpdateElement) {
                                onUpdateElement(selectedElement.id, {
                                  textStyle: { ...textStyle, shadow: { ...textStyle.shadow!, blur: parseInt(e.target.value) } }
                                })
                              }
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">X: {textStyle.shadow.x}px</label>
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              value={textStyle.shadow.x}
                              onChange={(e) => {
                                if (onUpdateElement) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, shadow: { ...textStyle.shadow!, x: parseInt(e.target.value) } }
                                  })
                                }
                              }}
                              className="w-full accent-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Y: {textStyle.shadow.y}px</label>
                            <input
                              type="range"
                              min="-20"
                              max="20"
                              value={textStyle.shadow.y}
                              onChange={(e) => {
                                if (onUpdateElement) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, shadow: { ...textStyle.shadow!, y: parseInt(e.target.value) } }
                                  })
                                }
                              }}
                              className="w-full accent-purple-500"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (onUpdateElement) {
                              const newStyle = { ...textStyle }
                              delete newStyle.shadow
                              onUpdateElement(selectedElement.id, { textStyle: newStyle })
                              setExpandedStyleSection(null)
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">Remove Shadow</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (onUpdateElement) {
                            onUpdateElement(selectedElement.id, {
                              textStyle: { ...textStyle, shadow: { color: '#000000', blur: 4, x: 2, y: 2 } }
                            })
                          }
                        }}
                        className="w-full py-2 text-purple-400 hover:text-purple-300 text-sm"
                      >
                        + Add Shadow
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Glow - Click to toggle open/close, enable on open if not enabled */}
              <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    if (expandedStyleSection === 'glow') {
                      // Just close the section (don't disable)
                      setExpandedStyleSection(null)
                    } else {
                      // Open the section - enable the effect if not already enabled
                      setExpandedStyleSection('glow')
                      if (onUpdateElement && !textStyle.glow) {
                        onUpdateElement(selectedElement.id, {
                          textStyle: { ...textStyle, glow: { color: '#ffffff', strength: 10 } }
                        })
                      }
                    }
                  }}
                  className="w-full p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Glow color square - filled with solid color */}
                    {textStyle.glow ? (
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: textStyle.glow.color }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded border border-gray-600 bg-[#252538] flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-gray-500 rotate-45" />
                      </div>
                    )}
                    <span className="text-sm text-white">Glow</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedStyleSection === 'glow' ? 'rotate-180' : ''}`} />
                </button>
                {expandedStyleSection === 'glow' && (
                  <div className="p-3 border-t border-gray-700 space-y-3">
                    {textStyle.glow ? (
                      <>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={textStyle.glow.color}
                              onChange={(e) => {
                                if (onUpdateElement) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, glow: { ...textStyle.glow!, color: e.target.value } }
                                  })
                                }
                              }}
                              className="w-10 h-10 cursor-pointer rounded border border-gray-600 bg-transparent"
                            />
                            <input
                              type="text"
                              value={textStyle.glow.color}
                              onChange={(e) => {
                                if (onUpdateElement && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, glow: { ...textStyle.glow!, color: e.target.value } }
                                  })
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-[#252538] border border-gray-600 rounded text-sm text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Strength: {textStyle.glow.strength}px</label>
                          <input
                            type="range"
                            min="1"
                            max="40"
                            value={textStyle.glow.strength}
                            onChange={(e) => {
                              if (onUpdateElement) {
                                onUpdateElement(selectedElement.id, {
                                  textStyle: { ...textStyle, glow: { ...textStyle.glow!, strength: parseInt(e.target.value) } }
                                })
                              }
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (onUpdateElement) {
                              const newStyle = { ...textStyle }
                              delete newStyle.glow
                              onUpdateElement(selectedElement.id, { textStyle: newStyle })
                              setExpandedStyleSection(null)
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">Remove Glow</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (onUpdateElement) {
                            onUpdateElement(selectedElement.id, {
                              textStyle: { ...textStyle, glow: { color: '#ffffff', strength: 10 } }
                            })
                          }
                        }}
                        className="w-full py-2 text-purple-400 hover:text-purple-300 text-sm"
                      >
                        + Add Glow
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Background - Click to toggle open/close, enable on open if not enabled */}
              <div className="bg-[#1a1a2e] border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    if (expandedStyleSection === 'background') {
                      // Just close the section (don't disable)
                      setExpandedStyleSection(null)
                    } else {
                      // Open the section - enable the effect if not already enabled
                      setExpandedStyleSection('background')
                      if (onUpdateElement && !textStyle.background) {
                        onUpdateElement(selectedElement.id, {
                          textStyle: { ...textStyle, background: { color: '#000000', opacity: 80, radius: 8 } }
                        })
                      }
                    }
                  }}
                  className="w-full p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Background color square - filled with solid color */}
                    {textStyle.background ? (
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: textStyle.background.color }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded border border-gray-600 bg-[#252538] flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-gray-500 rotate-45" />
                      </div>
                    )}
                    <span className="text-sm text-white">Background</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedStyleSection === 'background' ? 'rotate-180' : ''}`} />
                </button>
                {expandedStyleSection === 'background' && (
                  <div className="p-3 border-t border-gray-700 space-y-3">
                    {textStyle.background ? (
                      <>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={textStyle.background.color}
                              onChange={(e) => {
                                if (onUpdateElement) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, background: { ...textStyle.background!, color: e.target.value } }
                                  })
                                }
                              }}
                              className="w-10 h-10 cursor-pointer rounded border border-gray-600 bg-transparent"
                            />
                            <input
                              type="text"
                              value={textStyle.background.color}
                              onChange={(e) => {
                                if (onUpdateElement && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                  onUpdateElement(selectedElement.id, {
                                    textStyle: { ...textStyle, background: { ...textStyle.background!, color: e.target.value } }
                                  })
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-[#252538] border border-gray-600 rounded text-sm text-white"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Opacity: {textStyle.background.opacity}%</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={textStyle.background.opacity}
                            onChange={(e) => {
                              if (onUpdateElement) {
                                onUpdateElement(selectedElement.id, {
                                  textStyle: { ...textStyle, background: { ...textStyle.background!, opacity: parseInt(e.target.value) } }
                                })
                              }
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Radius: {textStyle.background.radius}px</label>
                          <input
                            type="range"
                            min="0"
                            max="32"
                            value={textStyle.background.radius}
                            onChange={(e) => {
                              if (onUpdateElement) {
                                onUpdateElement(selectedElement.id, {
                                  textStyle: { ...textStyle, background: { ...textStyle.background!, radius: parseInt(e.target.value) } }
                                })
                              }
                            }}
                            className="w-full accent-purple-500"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (onUpdateElement) {
                              const newStyle = { ...textStyle }
                              delete newStyle.background
                              onUpdateElement(selectedElement.id, { textStyle: newStyle })
                              setExpandedStyleSection(null)
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-sm">Remove Background</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (onUpdateElement) {
                            onUpdateElement(selectedElement.id, {
                              textStyle: { ...textStyle, background: { color: '#000000', opacity: 80, radius: 8 } }
                            })
                          }
                        }}
                        className="w-full py-2 text-purple-400 hover:text-purple-300 text-sm"
                      >
                        + Add Background
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Animations Tab */}
          {editTextTab === 'animations' && (
            <>
              <div className="flex border-b border-gray-700 mb-2">
                <button
                  onClick={() => setEditAnimationTab('in')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    editAnimationTab === 'in' 
                      ? 'text-white border-b-2 border-purple-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  In Animation
                </button>
                <button
                  onClick={() => setEditAnimationTab('out')}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    editAnimationTab === 'out' 
                      ? 'text-white border-b-2 border-purple-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Out Animation
                </button>
              </div>
              
              <AnimationGrid
                animations={TEXT_ANIMATIONS}
                selected={editAnimationTab === 'in'
                  ? selectedElement.animation?.in || 'none'
                  : selectedElement.animation?.out || 'none'
                }
                onSelect={(anim) => {
                  if (onUpdateElement) {
                    onUpdateElement(selectedElement.id, {
                      animation: {
                        in: selectedElement.animation?.in || 'none',
                        out: selectedElement.animation?.out || 'none',
                        ...selectedElement.animation,
                        [editAnimationTab]: anim
                      }
                    })
                  }
                }}
              />
            </>
          )}
          
          {/* Presets Tab */}
          {editTextTab === 'presets' && (
            <div className="grid grid-cols-2 gap-3">
              {TEXT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    if (onUpdateElement) {
                      onUpdateElement(selectedElement.id, {
                        textStyle: preset.style as TextStyle
                      })
                    }
                  }}
                  className="p-4 bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg transition-colors overflow-hidden"
                >
                  <div
                    className="text-sm font-medium text-center"
                    style={getTextPreviewStyles(preset.style)}
                  >
                    Aa
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">{preset.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render reaction preview based on platform
  const renderReactionPreview = () => {
    if (!reactionPlatform) return null

    const username = reactionUsername || 'Username'
    const message = reactionMessage || `${reactionPlatform.charAt(0).toUpperCase() + reactionPlatform.slice(1)} reaction`

    if (reactionPlatform === 'twitch') {
      return (
        <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm ${reactionDarkMode ? 'bg-[#18181b] text-white' : 'bg-[#f7f7f8] text-gray-900'}`}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div className="w-5 h-5 text-purple-500">
            {PLATFORM_CONFIG.twitch.icon}
          </div>
          <span><span className="text-purple-400 font-semibold">{username}</span>: {message}</span>
        </div>
      )
    }

    if (reactionPlatform === 'instagram') {
      return (
        <div className={`flex flex-col items-start gap-1 px-4 py-3 rounded-2xl text-sm ${reactionDarkMode ? 'bg-[#262626] text-white' : 'bg-white text-gray-900 border border-gray-200'}`}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <div className="w-4 h-4 text-pink-500">
                  {PLATFORM_CONFIG.instagram.icon}
                </div>
              </div>
            </div>
            <span className="font-semibold">{username}</span>
          </div>
          <span className={reactionDarkMode ? 'text-gray-200' : 'text-gray-700'}>{message}</span>
        </div>
      )
    }

    if (reactionPlatform === 'tiktok') {
      return (
        <div className={`flex flex-col gap-1 px-4 py-3 rounded-xl text-sm ${reactionDarkMode ? 'bg-[#121212] text-white' : 'bg-white text-gray-900 border border-gray-200'}`}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <span className={`text-xs ${reactionDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reply to {username}&apos;s comment</span>
          <span className="font-medium">{message}</span>
        </div>
      )
    }

    if (reactionPlatform === 'twitter') {
      return (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl text-sm ${reactionDarkMode ? 'bg-[#16181c] text-white' : 'bg-white text-gray-900 border border-gray-200'}`}
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-bold">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold">{username}</span>
              <span className={reactionDarkMode ? 'text-gray-500' : 'text-gray-400'}>@{username.toLowerCase().replace(/\s/g, '')}</span>
            </div>
            <span className={reactionDarkMode ? 'text-gray-100' : 'text-gray-800'}>{message}</span>
          </div>
          <div className="w-5 h-5 text-current">
            {PLATFORM_CONFIG.twitter.icon}
          </div>
        </div>
      )
    }

    return null
  }

  // Render the main content
  // Animated Stickers View All
  const renderAnimatedStickersView = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800">
        <SubmenuHeader
          title="Animated Stickers"
          subtitle="Add animated stickers from Giphy to your video."
          onBack={() => setView('main')}
        />

        {/* Search input */}
        <div className="flex gap-2">
          <input
            type="text"
            name="sticker-search"
            autoComplete="off"
            placeholder="Search stickers..."
            value={animatedStickersSearch}
            onChange={(e) => setAnimatedStickersSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAnimatedStickers(animatedStickersSearch)}
            className="flex-1 px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => fetchAnimatedStickers(animatedStickersSearch)}
            disabled={isLoadingAnimatedStickers}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoadingAnimatedStickers ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isLoadingAnimatedStickers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : animatedStickers.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {animatedStickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => addGiphyElement(sticker, 'sticker')}
                className="aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors"
              >
                <img
                  src={sticker.images.fixed_height.url}
                  alt={sticker.title}
                  width={100}
                  height={100}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No stickers found. Try a different search.</p>
        )}
      </div>

      {/* Giphy attribution */}
      <div className="p-2 border-t border-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-500">Powered by GIPHY</span>
      </div>
    </div>
  )

  // GIFs View All
  const renderGifsView = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800">
        <SubmenuHeader
          title="GIFs"
          subtitle="Add GIFs from Giphy to your video."
          onBack={() => setView('main')}
        />

        {/* Search input */}
        <div className="flex gap-2">
          <input
            type="text"
            name="gif-search"
            autoComplete="off"
            placeholder="Search GIFs..."
            value={gifsSearch}
            onChange={(e) => setGifsSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGifs(gifsSearch)}
            className="flex-1 px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => fetchGifs(gifsSearch)}
            disabled={isLoadingGifs}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoadingGifs ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isLoadingGifs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => addGiphyElement(gif, 'gif')}
                className="aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors"
              >
                <img
                  src={gif.images.fixed_height.url}
                  alt={gif.title}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">No GIFs found. Try a different search.</p>
        )}
      </div>

      {/* Giphy attribution */}
      <div className="p-2 border-t border-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-500">Powered by GIPHY</span>
      </div>
    </div>
  )

  // Twitch Emotes View All
  const renderTwitchEmotesView = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800">
        <SubmenuHeader
          title="Twitch Emotes"
          subtitle="Search for custom channel emotes from Twitch."
          onBack={() => setView('main')}
        />

        {/* Search input */}
        <div className="flex gap-2">
          <input
            type="text"
            name="twitch-emote-search"
            autoComplete="off"
            placeholder="Enter Twitch username..."
            value={twitchEmoteSearch}
            onChange={(e) => setTwitchEmoteSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchTwitchEmotes(twitchEmoteSearch)}
            className="flex-1 px-3 py-2 bg-[#1a1a2e] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={() => fetchTwitchEmotes(twitchEmoteSearch)}
            disabled={isLoadingTwitchEmotes || !twitchEmoteSearch.trim()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {isLoadingTwitchEmotes ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search emotes'}
          </button>
        </div>

        {twitchEmoteError && (
          <p className="text-sm text-red-400 mt-2">{twitchEmoteError}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {isLoadingTwitchEmotes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : twitchEmotes.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {twitchEmotes.map((emote) => (
              <button
                key={emote.id}
                onClick={() => addTwitchEmote(emote)}
                className="aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg overflow-hidden transition-colors p-2 flex items-center justify-center"
                title={emote.name}
              >
                <img
                  src={emote.images.url_2x}
                  alt={emote.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">
            {twitchEmoteSearch ? 'No emotes found for this channel.' : 'Enter a Twitch username to search for their emotes.'}
          </p>
        )}
      </div>

      {/* 7TV attribution */}
      <div className="p-2 border-t border-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-500">Emotes powered by 7TV</span>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (view) {
      case 'custom-elements':
        return renderCustomElementsView()
      case 'social-stickers':
        return renderSocialStickersView()
      case 'text-elements':
        return renderTextElementsView()
      case 'animated-stickers':
        return renderAnimatedStickersView()
      case 'gifs':
        return renderGifsView()
      case 'twitch-emotes':
        return renderTwitchEmotesView()
      case 'edit-image':
        return renderEditImageView()
      case 'edit-social-sticker':
        return renderEditSocialStickerView()
      case 'edit-text':
        return renderEditTextView()
      default:
        return renderMainView()
    }
  }

  const platformName = reactionPlatform
    ? reactionPlatform.charAt(0).toUpperCase() + reactionPlatform.slice(1)
    : ''

  return (
    <>
      {renderContent()}

      {/* Reaction Modal */}
      {reactionModalOpen && reactionPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add a {platformName} reaction to your clip</h2>
                <p className="text-sm text-gray-500 mt-1">Search and select the most hype, funny, or memorable chat message to include in your video.</p>
              </div>
              <button
                onClick={() => setReactionModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex">
              {/* Left Panel - Form */}
              <div className="w-1/2 p-6 border-r border-gray-200">
                {/* Tabs */}
                <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setReactionTab('from-platform')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                      reactionTab === 'from-platform'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    From {platformName}
                  </button>
                  <button
                    onClick={() => setReactionTab('create')}
                    className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                      reactionTab === 'create'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Create your own
                  </button>
                </div>

                {/* Create Tab Content */}
                {reactionTab === 'create' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                      <input
                        type="text"
                        name="reaction-username"
                        autoComplete="off"
                        value={reactionUsername}
                        onChange={(e) => setReactionUsername(e.target.value)}
                        placeholder="Enter username"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                      <textarea
                        value={reactionMessage}
                        onChange={(e) => setReactionMessage(e.target.value)}
                        placeholder="Type or paste text to create a reaction message"
                        rows={4}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                      <p className="text-xs text-gray-400 mt-2">You can also use channel emotes from BTTV, FFZ & 7TV!</p>
                    </div>
                  </div>
                )}

                {/* From Platform Tab Content */}
                {reactionTab === 'from-platform' && (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 mb-4 text-gray-300">
                      {PLATFORM_CONFIG[reactionPlatform].icon}
                    </div>
                    <p className="text-gray-500">Search {platformName} chat coming soon...</p>
                    <p className="text-sm text-gray-400 mt-2">Use &quot;Create your own&quot; to make a custom reaction</p>
                  </div>
                )}
              </div>

              {/* Right Panel - Preview */}
              <div className="w-1/2 p-6 bg-gradient-to-br from-purple-100/50 via-blue-50/50 to-pink-50/50 flex flex-col">
                <div className="flex-1 flex items-center justify-center">
                  {renderReactionPreview()}
                </div>

                {/* Add to Clip Button */}
                <button
                  onClick={addReaction}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors mt-4"
                >
                  Add to Clip
                </button>

                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={() => setReactionDarkMode(!reactionDarkMode)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${reactionDarkMode ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${reactionDarkMode ? 'translate-x-6' : 'translate-x-0.5'}`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">Dark mode</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

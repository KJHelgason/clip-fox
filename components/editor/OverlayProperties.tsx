'use client'

import { useState } from 'react'
import { OverlayElement, AnimationType } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type Props = {
  overlay: OverlayElement | null
  onUpdate: (id: string, updates: Partial<OverlayElement>) => void
  onDelete: (id: string) => void
  onDuplicate: (overlay: OverlayElement) => void
  duration: number
}

const FONT_FAMILIES = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat' },
  { value: 'Oswald, sans-serif', label: 'Oswald' },
  { value: 'Bebas Neue, sans-serif', label: 'Bebas Neue' },
  { value: 'Impact, sans-serif', label: 'Impact' },
  { value: 'Arial Black, sans-serif', label: 'Arial Black' },
  { value: 'Comic Sans MS, cursive', label: 'Comic Sans' },
]

const ANIMATIONS: { value: AnimationType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '⊘' },
  { value: 'fade-in', label: 'Fade In', icon: '🌅' },
  { value: 'slide-top', label: 'Slide Up', icon: '⬆️' },
  { value: 'slide-bottom', label: 'Slide Down', icon: '⬇️' },
  { value: 'slide-left', label: 'Slide Left', icon: '⬅️' },
  { value: 'slide-right', label: 'Slide Right', icon: '➡️' },
  { value: 'bounce', label: 'Bounce', icon: '🏀' },
  { value: 'pop', label: 'Pop', icon: '💥' },
  { value: 'reveal', label: 'Reveal', icon: '✨' },
]

const PRESET_COLORS = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
]

export default function OverlayProperties({ overlay, onUpdate, onDelete, onDuplicate, duration }: Props) {
  const [activeTab, setActiveTab] = useState<'style' | 'timing' | 'animation'>('style')

  if (!overlay) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-gray-400 mb-1">No Element Selected</h3>
        <p className="text-xs text-gray-500">Click on an overlay in the preview or timeline to edit its properties</p>
      </div>
    )
  }

  const isText = overlay.type === 'text' || overlay.type === 'caption'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${
            overlay.type === 'text' ? 'bg-yellow-500/20 text-yellow-400' :
            overlay.type === 'image' ? 'bg-blue-500/20 text-blue-400' :
            overlay.type === 'sticker' ? 'bg-pink-500/20 text-pink-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {overlay.type === 'text' ? 'T' : overlay.type === 'image' ? '🖼' : overlay.type === 'sticker' ? '✨' : 'CC'}
          </div>
          <span className="text-sm font-medium text-white capitalize">{overlay.type}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onDuplicate(overlay)}
            className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Duplicate"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(overlay.id)}
            className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {['style', 'timing', 'animation'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-purple-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'style' && (
          <>
            {/* Text Content */}
            {isText && (
              <PropertySection title="Content">
                <textarea
                  value={overlay.content || ''}
                  onChange={(e) => onUpdate(overlay.id, { content: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                  rows={3}
                  placeholder="Enter text..."
                />
              </PropertySection>
            )}

            {/* Font Settings */}
            {isText && (
              <PropertySection title="Font">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <select
                    value={overlay.fontFamily || 'Inter, sans-serif'}
                    onChange={(e) => onUpdate(overlay.id, { fontFamily: e.target.value })}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {FONT_FAMILIES.map((font) => (
                      <option key={font.value} value={font.value}>{font.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      value={overlay.fontSize || 24}
                      onChange={(e) => onUpdate(overlay.id, { fontSize: parseInt(e.target.value) || 24 })}
                      className="flex-1 bg-gray-800 border-gray-700 text-white text-xs h-8"
                      min={8}
                      max={120}
                    />
                    <span className="flex items-center text-xs text-gray-500">px</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onUpdate(overlay.id, { fontWeight: overlay.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-colors ${
                      overlay.fontWeight === 'bold' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => onUpdate(overlay.id, { fontStyle: overlay.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`flex-1 py-1.5 rounded text-xs italic transition-colors ${
                      overlay.fontStyle === 'italic' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    I
                  </button>
                  <button
                    onClick={() => onUpdate(overlay.id, { textAlign: 'left' })}
                    className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                      overlay.textAlign === 'left' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    ⫷
                  </button>
                  <button
                    onClick={() => onUpdate(overlay.id, { textAlign: 'center' })}
                    className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                      (!overlay.textAlign || overlay.textAlign === 'center') ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    ⫶
                  </button>
                  <button
                    onClick={() => onUpdate(overlay.id, { textAlign: 'right' })}
                    className={`flex-1 py-1.5 rounded text-xs transition-colors ${
                      overlay.textAlign === 'right' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    ⫸
                  </button>
                </div>
              </PropertySection>
            )}

            {/* Colors */}
            <PropertySection title="Colors">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Text Color</label>
                  <div className="flex gap-1 flex-wrap">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => onUpdate(overlay.id, { color })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          overlay.color === color ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={overlay.color || '#ffffff'}
                      onChange={(e) => onUpdate(overlay.id, { color: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Background</label>
                  <div className="flex gap-1 flex-wrap">
                    <button
                      onClick={() => onUpdate(overlay.id, { backgroundColor: 'transparent' })}
                      className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                        overlay.backgroundColor === 'transparent' ? 'border-white' : 'border-gray-600'
                      }`}
                      style={{ background: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px' }}
                    />
                    {PRESET_COLORS.slice(0, 6).map((color) => (
                      <button
                        key={color}
                        onClick={() => onUpdate(overlay.id, { backgroundColor: color + '99' })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          overlay.backgroundColor?.startsWith(color) ? 'border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color + '99' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </PropertySection>

            {/* Effects */}
            {isText && (
              <PropertySection title="Text Effects">
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Text Stroke</label>
                    <div className="flex gap-2">
                      <select
                        value={overlay.textStroke || 'none'}
                        onChange={(e) => onUpdate(overlay.id, { textStroke: e.target.value === 'none' ? undefined : e.target.value })}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="none">None</option>
                        <option value="1px #000000">Thin Black</option>
                        <option value="2px #000000">Medium Black</option>
                        <option value="3px #000000">Thick Black</option>
                        <option value="2px #ffffff">White</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Shadow</label>
                    <select
                      value={overlay.textShadow || 'none'}
                      onChange={(e) => onUpdate(overlay.id, { textShadow: e.target.value === 'none' ? undefined : e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="none">None</option>
                      <option value="2px 2px 4px rgba(0,0,0,0.8)">Drop Shadow</option>
                      <option value="0 0 10px rgba(0,0,0,0.9)">Glow</option>
                      <option value="3px 3px 0 #000, -3px 3px 0 #000, 3px -3px 0 #000, -3px -3px 0 #000">Outline</option>
                      <option value="0 0 20px #8b5cf6, 0 0 40px #8b5cf6">Neon Purple</option>
                      <option value="0 0 20px #06b6d4, 0 0 40px #06b6d4">Neon Cyan</option>
                    </select>
                  </div>
                </div>
              </PropertySection>
            )}

            {/* Image Source */}
            {overlay.type === 'image' && (
              <PropertySection title="Image Source">
                <Input
                  value={overlay.src || ''}
                  onChange={(e) => onUpdate(overlay.id, { src: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white text-xs"
                  placeholder="Image URL..."
                />
                <button className="mt-2 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700 border-dashed">
                  📁 Upload Image
                </button>
              </PropertySection>
            )}

            {/* Opacity & Rotation */}
            <PropertySection title="Transform">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 flex justify-between">
                    <span>Opacity</span>
                    <span>{Math.round((overlay.opacity ?? 1) * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={overlay.opacity ?? 1}
                    onChange={(e) => onUpdate(overlay.id, { opacity: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 flex justify-between">
                    <span>Rotation</span>
                    <span>{overlay.rotation ?? 0}°</span>
                  </label>
                  <input
                    type="range"
                    min={-180}
                    max={180}
                    step={1}
                    value={overlay.rotation ?? 0}
                    onChange={(e) => onUpdate(overlay.id, { rotation: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Border Radius</label>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={overlay.borderRadius ?? 4}
                    onChange={(e) => onUpdate(overlay.id, { borderRadius: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              </div>
            </PropertySection>
          </>
        )}

        {activeTab === 'timing' && (
          <>
            <PropertySection title="Time Range">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">Start (sec)</label>
                  <Input
                    type="number"
                    step={0.1}
                    min={0}
                    max={overlay.endTime - 0.1}
                    value={overlay.startTime.toFixed(2)}
                    onChange={(e) => onUpdate(overlay.id, { startTime: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 mb-1 block">End (sec)</label>
                  <Input
                    type="number"
                    step={0.1}
                    min={overlay.startTime + 0.1}
                    max={duration}
                    value={overlay.endTime.toFixed(2)}
                    onChange={(e) => onUpdate(overlay.id, { endTime: Math.min(duration, parseFloat(e.target.value) || 0) })}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8"
                  />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                Duration: {(overlay.endTime - overlay.startTime).toFixed(2)}s
              </div>
            </PropertySection>

            <PropertySection title="Quick Duration">
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 5].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => onUpdate(overlay.id, { endTime: Math.min(duration, overlay.startTime + sec) })}
                    className="py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700"
                  >
                    {sec}s
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1 mt-1">
                <button
                  onClick={() => onUpdate(overlay.id, { startTime: 0, endTime: duration })}
                  className="py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700"
                >
                  Full Duration
                </button>
                <button
                  onClick={() => onUpdate(overlay.id, { endTime: duration })}
                  className="py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded border border-gray-700"
                >
                  To End
                </button>
              </div>
            </PropertySection>
          </>
        )}

        {activeTab === 'animation' && (
          <>
            <PropertySection title="Entry Animation">
              <div className="grid grid-cols-3 gap-1">
                {ANIMATIONS.map((anim) => (
                  <button
                    key={anim.value}
                    onClick={() => onUpdate(overlay.id, {
                      animation: {
                        in: anim.value,
                        out: overlay.animation?.out || 'none'
                      }
                    })}
                    className={`py-2 rounded text-xs transition-colors ${
                      overlay.animation?.in === anim.value
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <span className="block text-base mb-0.5">{anim.icon}</span>
                    <span className="text-[10px]">{anim.label}</span>
                  </button>
                ))}
              </div>
            </PropertySection>

            {overlay.animation?.in && overlay.animation.in !== 'none' && (
              <PropertySection title="Animation Settings">
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 flex justify-between">
                      <span>In Duration</span>
                      <span>{overlay.animation.inDuration ?? 0.3}s</span>
                    </label>
                    <input
                      type="range"
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={overlay.animation.inDuration ?? 0.3}
                      onChange={(e) => onUpdate(overlay.id, {
                        animation: {
                          in: overlay.animation?.in || 'none',
                          out: overlay.animation?.out || 'none',
                          ...overlay.animation,
                          inDuration: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 mb-1 block">Easing</label>
                    <select
                      value={overlay.animation.easing ?? 'ease-out'}
                      onChange={(e) => onUpdate(overlay.id, {
                        animation: {
                          in: overlay.animation?.in || 'none',
                          out: overlay.animation?.out || 'none',
                          ...overlay.animation,
                          easing: e.target.value as 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
                        }
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="linear">Linear</option>
                      <option value="ease-in">Ease In</option>
                      <option value="ease-out">Ease Out</option>
                      <option value="ease-in-out">Ease In Out</option>
                    </select>
                  </div>
                </div>
              </PropertySection>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-400 mb-2">{title}</h4>
      {children}
    </div>
  )
}

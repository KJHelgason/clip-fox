'use client'

import { useState } from 'react'
import { STICKER_CATEGORIES, StickerCategory, OverlayElement, findAvailableRow } from '@/lib/types'
import { Upload, Twitch, Youtube, Twitter } from 'lucide-react'

type Props = {
  onAddSticker: (sticker: Partial<OverlayElement>) => void
  onAddText: (text: Partial<OverlayElement>) => void
  currentTime: number
  duration: number
}

// Custom element stickers (game logos, popular images)
const CUSTOM_ELEMENTS = [
  { id: 'minecraft', name: 'Minecraft', icon: '⛏️' },
  { id: 'valorant', name: 'Valorant', icon: '🔫' },
  { id: 'league', name: 'League', icon: '⚔️' },
  { id: 'fortnite', name: 'Fortnite', icon: '🏗️' },
  { id: 'apex', name: 'Apex', icon: '🎯' },
  { id: 'zyn', name: 'ZYN', icon: '💊' },
  { id: 'pepe', name: 'Pepe', icon: '🐸' },
  { id: 'monkas', name: 'MonkaS', icon: '😰' },
]

// Social stickers with different styles
const SOCIAL_STICKERS = [
  { id: 'twitch-1', name: 'Twitch Follow', platform: 'twitch', style: 'pill' },
  { id: 'twitch-2', name: 'Twitch Follow', platform: 'twitch', style: 'banner' },
  { id: 'twitch-3', name: 'Twitch Follow', platform: 'twitch', style: 'neon' },
  { id: 'yt-sub-1', name: 'Subscribe', platform: 'youtube', style: 'classic' },
  { id: 'yt-sub-2', name: 'Subscribe', platform: 'youtube', style: 'animated' },
  { id: 'yt-sub-3', name: 'Subscribe', platform: 'youtube', style: 'minimal' },
  { id: 'discord-1', name: 'Join Discord', platform: 'discord', style: 'banner' },
  { id: 'kick-1', name: 'Follow', platform: 'kick', style: 'pill' },
  { id: 'twitter-1', name: 'Follow', platform: 'twitter', style: 'banner' },
]

// Text style presets matching StreamLadder
const TEXT_PRESETS = [
  { id: '1', content: 'Enter text here', style: 'simple', preview: 'Enter text here' },
  { id: '2', content: 'ENTER TEXT HERE', style: 'bold-caps', preview: 'ENTER TEXT HERE' },
  { id: '3', content: 'ENTER TEXT HERE', style: 'gradient', preview: 'ENTER TEXT HERE' },
  { id: '4', content: 'ENTER TEXT HERE', style: 'outline', preview: 'ENTER TEXT HERE' },
  { id: '5', content: 'ENTER TEXT HERE', style: 'shadow', preview: 'ENTER TEXT HERE' },
  { id: '6', content: 'ENTER TEXT HERE', style: 'glow', preview: 'ENTER TEXT HERE' },
  { id: '7', content: 'Enter text here', style: 'cursive', preview: 'Enter text here' },
  { id: '8', content: 'ENTER TEXT HERE', style: 'neon', preview: 'ENTER TEXT HERE' },
  { id: '9', content: 'Enter text here', style: 'retro', preview: 'Enter text here' },
]

export default function ElementsPanel({ onAddSticker, onAddText, currentTime, duration }: Props) {
  const [customText, setCustomText] = useState('')

  const handleAddText = (content: string, style: Record<string, unknown> = {}) => {
    onAddText({
      type: 'text',
      content,
      videoLeft: 40,
      videoTop: 40,
      videoWidth: 150,
      videoHeight: 40,
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + 3),
      fontSize: 24,
      fontWeight: 'bold',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      ...style,
    })
  }

  const handleAddSticker = (src: string, name: string) => {
    onAddSticker({
      type: 'image',
      src,
      content: name,
      videoLeft: 80,
      videoTop: 80,
      videoWidth: 80,
      videoHeight: 80,
      startTime: currentTime,
      endTime: Math.min(duration, currentTime + 3),
    })
  }

  const getTextStyle = (styleId: string) => {
    const styles: Record<string, Record<string, unknown>> = {
      'simple': { fontWeight: 'normal', fontSize: 20, color: '#ffffff', backgroundColor: 'transparent' },
      'bold-caps': { fontWeight: 'bold', fontSize: 24, color: '#ffffff', backgroundColor: 'transparent' },
      'gradient': { fontWeight: 'bold', fontSize: 24, color: '#ff6b6b', backgroundColor: 'transparent' },
      'outline': { fontWeight: 'bold', fontSize: 24, color: '#ffffff', textStroke: '2px #000000', backgroundColor: 'transparent' },
      'shadow': { fontWeight: 'bold', fontSize: 24, color: '#ffffff', textShadow: '3px 3px 6px rgba(0,0,0,0.8)', backgroundColor: 'transparent' },
      'glow': { fontWeight: 'bold', fontSize: 24, color: '#00ff00', textShadow: '0 0 20px #00ff00', backgroundColor: 'transparent' },
      'cursive': { fontFamily: 'cursive', fontSize: 22, color: '#ffffff', backgroundColor: 'transparent' },
      'neon': { fontWeight: 'bold', fontSize: 24, color: '#ff00ff', textShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff', backgroundColor: 'transparent' },
      'retro': { fontWeight: 'bold', fontSize: 24, color: '#ffcc00', textShadow: '2px 2px 0 #ff6600', backgroundColor: 'transparent' },
    }
    return styles[styleId] || styles['simple']
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Custom Elements Section */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Custom Elements</h3>
          <span className="text-xs text-gray-500">View all</span>
        </div>
        
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-gray-500 transition-colors cursor-pointer mb-3">
          <Upload className="w-5 h-5 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-400">Upload a file</p>
          <p className="text-xs text-gray-600">Max 10 MB files are allowed</p>
          <p className="text-xs text-gray-600">Supported formats: .png, .jpeg, .gif</p>
        </div>

        {/* Element Grid */}
        <div className="grid grid-cols-4 gap-2">
          {CUSTOM_ELEMENTS.map((el) => (
            <button
              key={el.id}
              onClick={() => handleAddSticker(`/elements/${el.id}.png`, el.name)}
              className="aspect-square bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg flex items-center justify-center text-2xl transition-colors"
              title={el.name}
            >
              {el.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Social Stickers Section */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Social Stickers</h3>
          <span className="text-xs text-gray-500">View all</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {SOCIAL_STICKERS.slice(0, 9).map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => handleAddText(sticker.name, {
                backgroundColor: sticker.platform === 'twitch' ? 'rgba(145, 70, 255, 0.9)' :
                                sticker.platform === 'youtube' ? 'rgba(255, 0, 0, 0.9)' :
                                sticker.platform === 'discord' ? 'rgba(88, 101, 242, 0.9)' :
                                sticker.platform === 'kick' ? 'rgba(83, 252, 24, 0.9)' :
                                'rgba(29, 161, 242, 0.9)',
                color: sticker.platform === 'kick' ? '#000000' : '#ffffff',
                fontSize: 14,
                borderRadius: sticker.style === 'pill' ? 20 : 4,
              })}
              className="p-2 bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg transition-colors"
            >
              <div className={`text-xs font-medium px-2 py-1 rounded ${
                sticker.platform === 'twitch' ? 'bg-purple-600 text-white' :
                sticker.platform === 'youtube' ? 'bg-red-600 text-white' :
                sticker.platform === 'discord' ? 'bg-indigo-600 text-white' :
                sticker.platform === 'kick' ? 'bg-green-500 text-black' :
                'bg-blue-500 text-white'
              }`}>
                {sticker.platform === 'twitch' && <span className="mr-1">📺</span>}
                {sticker.platform === 'youtube' && <span className="mr-1">▶️</span>}
                {sticker.name}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Text Elements Section */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">Text Elements</h3>
          <span className="text-xs text-gray-500">View all</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {TEXT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleAddText(preset.content, getTextStyle(preset.style))}
              className="p-2 bg-[#1a1a2e] hover:bg-[#252538] border border-gray-700 rounded-lg transition-colors"
            >
              <div className={`text-[10px] font-medium text-center truncate ${
                preset.style === 'gradient' ? 'text-red-400' :
                preset.style === 'glow' ? 'text-green-400' :
                preset.style === 'neon' ? 'text-pink-400' :
                preset.style === 'retro' ? 'text-yellow-400' :
                'text-white'
              }`}>
                {preset.preview}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

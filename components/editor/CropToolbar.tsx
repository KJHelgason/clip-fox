'use client'

import React, { useState } from 'react'
import { ChevronDown, Copy, Trash2, Layers } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Slider } from '@/components/ui/slider'

type AspectRatioOption = 'freeform' | 'fullscreen' | '16:9' | '4:3' | 'square' | 'circle'

type CropToolbarProps = {
  cropId: string
  aspectRatio: AspectRatioOption
  cornerRounding: number
  onAspectRatioChange: (ratio: AspectRatioOption) => void
  onCornerRoundingChange: (value: number) => void
  onBringToFront: () => void
  onDuplicate: () => void
  onRemove: () => void
}

export function CropToolbar({
  cropId,
  aspectRatio,
  cornerRounding,
  onAspectRatioChange,
  onCornerRoundingChange,
  onBringToFront,
  onDuplicate,
  onRemove,
}: CropToolbarProps) {
  const [showRoundingSlider, setShowRoundingSlider] = useState(false)

  // Convert actual rounding (0-50) to slider value (0-100)
  const sliderValue = cornerRounding * 2

  const aspectRatioLabels: Record<AspectRatioOption, string> = {
    freeform: 'Freeform',
    fullscreen: 'Fullscreen',
    '16:9': 'Wide Screen',
    '4:3': 'Rectangle 4:3',
    square: 'Square',
    circle: 'Circle',
  }

  const aspectRatioIcons: Record<AspectRatioOption, React.ReactNode> = {
    freeform: <div className="w-4 h-4 border-2 border-current" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)' }} />,
    fullscreen: <div className="w-4 h-3.5 border-2 border-current" />,
    '16:9': <div className="w-4 h-2.5 border-2 border-current" />,
    '4:3': <div className="w-4 h-3 border-2 border-current" />,
    square: <div className="w-3.5 h-3.5 border-2 border-current" />,
    circle: <div className="w-3.5 h-3.5 border-2 border-current rounded-full" />,
  }

  return (
    <div className="flex items-center gap-1 bg-[#1a1a2e] rounded-lg p-1 shadow-lg border border-gray-700" style={{ maxHeight: '42px', overflow: 'visible' }}>
      {/* Aspect Ratio Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-700 rounded text-sm text-gray-300 transition-colors">
            {aspectRatioIcons[aspectRatio]}
            <span>{aspectRatioLabels[aspectRatio]}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-[#1a1a2e] border-gray-700">
          {(Object.keys(aspectRatioLabels) as AspectRatioOption[]).map((ratio) => (
            <DropdownMenuItem
              key={ratio}
              onClick={() => onAspectRatioChange(ratio)}
              className="flex items-center gap-2 text-gray-300 hover:bg-gray-700 focus:bg-gray-700"
            >
              {aspectRatioIcons[ratio]}
              <span>{aspectRatioLabels[ratio]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-700" />

      {/* Corner Rounding */}
      <div className="relative">
        <button
          onClick={() => setShowRoundingSlider(!showRoundingSlider)}
          className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
          title="Corner rounding"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 2 L2 6 M2 2 L6 2" />
            <path d="M14 2 L14 6 M14 2 L10 2" />
            <path d="M2 14 L2 10 M2 14 L6 14" />
            <path d="M14 14 Q14 10 10 10 M14 14 L14 10" strokeLinecap="round" />
          </svg>
        </button>
        
        {showRoundingSlider && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowRoundingSlider(false)}
            />
            <div className="absolute left-0 top-full mt-2 bg-[#1a1a2e] border border-gray-700 rounded-lg p-4 shadow-xl z-50 w-56">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-300">Corner Rounding</span>
                <span className="text-sm text-purple-400 font-semibold">{Math.round(sliderValue)}%</span>
              </div>
              <Slider
                value={[sliderValue]}
                onValueChange={(values) => onCornerRoundingChange(values[0])}
                min={0}
                max={100}
                step={1}
                className="w-full [&>span:first-child]:bg-gradient-to-r [&>span:first-child]:from-purple-600 [&>span:first-child]:to-pink-600 [&>span:first-child]:hover:from-purple-500 [&>span:first-child]:hover:to-pink-500 [&>span:last-child]:bg-gradient-to-r [&>span:last-child]:from-purple-600 [&>span:last-child]:to-pink-600 [&>span:last-child]:hover:from-purple-500 [&>span:last-child]:hover:to-pink-500"
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bring to Front */}
      <button
        onClick={onBringToFront}
        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
        title="Bring to front"
      >
        <Layers className="w-4 h-4" />
      </button>

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        className="p-2 hover:bg-gray-700 rounded text-gray-300 transition-colors"
        title="Duplicate crop"
      >
        <Copy className="w-4 h-4" />
      </button>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-2 hover:bg-red-700 rounded text-gray-300 hover:text-white transition-colors"
        title="Remove crop"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

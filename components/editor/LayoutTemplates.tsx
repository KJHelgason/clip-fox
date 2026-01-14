'use client'

import { useState } from 'react'
import { LAYOUT_TEMPLATES, LayoutTemplate, AspectRatio, ASPECT_RATIOS } from '@/lib/types'
import { Settings, Plus } from 'lucide-react'

type Props = {
  selectedLayoutId?: string
  onSelectLayout: (layout: LayoutTemplate) => void
  aspectRatio: AspectRatio
  onChangeAspectRatio: (ratio: AspectRatio) => void
}

// User saved templates (would come from database)
const USER_TEMPLATES = [
  { id: 'user-1', name: 'BETA: New Template', thumbnail: '/templates/beta.png' },
  { id: 'user-2', name: 'COUNTER_STRIKE w...', thumbnail: '/templates/cs.png' },
  { id: 'user-3', name: 'BEST TEMPLATE PO...', thumbnail: '/templates/best.png' },
  { id: 'user-4', name: 'FINAL!', thumbnail: '/templates/final.png' },
  { id: 'user-5', name: 'BEST TEMPLATE', thumbnail: '/templates/best2.png' },
]

// Preset layouts matching StreamLadder
const PRESET_LAYOUTS = [
  { id: 'small-facecam', name: 'Small facecam', icon: '🎥' },
  { id: 'circle-facecam', name: 'Circle facecam', icon: '⭕' },
  { id: 'game-ui', name: 'Game UI', icon: '🎮' },
  { id: 'split', name: 'Split', icon: '⬛' },
  { id: 'blurred', name: 'Blurred', icon: '🌫️' },
  { id: 'fullscreen', name: 'Fullscreen', icon: '📺' },
]

export default function LayoutTemplates({
  selectedLayoutId,
  onSelectLayout,
  aspectRatio,
  onChangeAspectRatio
}: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'templates' | 'layouts'>('all')

  // Filter layouts by current aspect ratio
  const filteredLayouts = LAYOUT_TEMPLATES.filter(l => l.aspectRatio === aspectRatio)

  return (
    <div className="flex flex-col h-full">
      {/* Tabs: All / Your templates / Layouts */}
      <div className="px-3 pt-3">
        <div className="flex gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'templates', label: 'Your templates' },
            { id: 'layouts', label: 'Layouts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Your Templates Section */}
      {(activeTab === 'all' || activeTab === 'templates') && (
        <div className="px-3 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white">Your templates</h3>
            <button className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              <Settings className="w-3 h-3" />
              Manage
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {USER_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className="relative group rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors"
              >
                <div className="aspect-[9/16] bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                  <p className="text-[10px] text-white truncate">{template.name}</p>
                </div>
                {/* New Crop badge */}
                {template.name.includes('BETA') && (
                  <div className="absolute top-1 left-1 bg-green-500 text-[8px] text-white px-1 rounded">
                    New Crop
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Layouts Section */}
      {(activeTab === 'all' || activeTab === 'layouts') && (
        <div className="px-3 pt-4">
          <h3 className="text-sm font-medium text-white mb-3">Layouts</h3>
          <div className="grid grid-cols-3 gap-2">
            {PRESET_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => {
                  const template = filteredLayouts.find(l => l.id === layout.id)
                  if (template) onSelectLayout(template)
                }}
                className={`relative group rounded-lg overflow-hidden border transition-colors ${
                  selectedLayoutId === layout.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="aspect-[9/16] bg-[#1a1a2e] flex items-center justify-center">
                  {/* Layout preview visualization */}
                  <LayoutPreview layoutId={layout.id} />
                </div>
                <div className="p-2">
                  <p className="text-[10px] text-gray-400 text-center">{layout.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add crop button */}
      <div className="px-3 py-4 mt-auto border-t border-gray-800">
        <button className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Add crop
        </button>
        <label className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <input type="checkbox" className="rounded bg-gray-800 border-gray-600" defaultChecked />
          Enable snapping
        </label>
      </div>
    </div>
  )
}

// Layout preview component
function LayoutPreview({ layoutId }: { layoutId: string }) {
  const previewStyles: Record<string, React.ReactNode> = {
    'small-facecam': (
      <div className="w-full h-full relative">
        <div className="absolute inset-0 bg-blue-500/30" />
        <div className="absolute bottom-2 right-2 w-6 h-6 bg-purple-500/50 rounded" />
      </div>
    ),
    'circle-facecam': (
      <div className="w-full h-full relative">
        <div className="absolute inset-0 bg-blue-500/30" />
        <div className="absolute bottom-2 right-2 w-6 h-6 bg-purple-500/50 rounded-full" />
      </div>
    ),
    'game-ui': (
      <div className="w-full h-full relative">
        <div className="absolute inset-x-0 top-0 h-1/2 bg-blue-500/30" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-green-500/30" />
      </div>
    ),
    'split': (
      <div className="w-full h-full relative">
        <div className="absolute inset-x-0 top-0 h-[45%] bg-blue-500/30" />
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-purple-500/30" />
      </div>
    ),
    'blurred': (
      <div className="w-full h-full relative">
        <div className="absolute inset-0 bg-gray-600/30 blur-sm" />
        <div className="absolute inset-x-2 inset-y-4 bg-blue-500/30" />
      </div>
    ),
    'fullscreen': (
      <div className="w-full h-full bg-blue-500/30" />
    ),
  }

  return previewStyles[layoutId] || <div className="w-full h-full bg-gray-700/30" />
}

function LayoutCard({
  layout,
  isSelected,
  onClick
}: {
  layout: LayoutTemplate
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 rounded-lg border transition-all text-left
        ${isSelected 
          ? 'bg-purple-900/30 border-purple-500 ring-1 ring-purple-500/50' 
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      {/* Layout Preview */}
      <div 
        className="relative w-full bg-gray-900 rounded overflow-hidden mb-2"
        style={{ aspectRatio: '9/16', maxHeight: 100 }}
      >
        {layout.regions.map((region) => (
          <div
            key={region.id}
            className={`absolute ${
              region.type === 'video' ? 'bg-blue-500/40' :
              region.type === 'facecam' ? 'bg-purple-500/40' :
              region.type === 'overlay' ? 'bg-green-500/40' :
              'bg-gray-500/40'
            }`}
            style={{
              left: `${region.x}%`,
              top: `${region.y}%`,
              width: `${region.width}%`,
              height: `${region.height}%`,
              borderRadius: region.borderRadius || 0,
              border: region.border || 'none'
            }}
          >
            <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/70 font-medium">
              {region.type === 'video' ? '🎬' : region.type === 'facecam' ? '🎥' : ''}
            </span>
          </div>
        ))}
      </div>
      
      {/* Layout Info */}
      <div>
        <h4 className="text-xs font-medium text-white truncate">{layout.name}</h4>
        <p className="text-[10px] text-gray-400 truncate">{layout.description}</p>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-1 right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  )
}

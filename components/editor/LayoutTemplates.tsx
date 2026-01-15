'use client'

import { useState, useEffect } from 'react'
import { LayoutTemplate, AspectRatio } from '@/lib/types'
import { Settings, Plus, Trash2, X } from 'lucide-react'

type UserTemplate = {
  id: string
  name: string
  layoutId: string
  cropRegions: any[]
  createdAt: number
}

type Props = {
  selectedLayoutId?: string
  onSelectLayout: (layout: LayoutTemplate | null) => void
  aspectRatio: AspectRatio
  onChangeAspectRatio: (ratio: AspectRatio) => void
  cropRegions?: any[]
  onApplyTemplate?: (template: UserTemplate) => void
}

// All preset layouts matching StreamLadder
const PRESET_LAYOUTS = [
  { id: 'small-facecam', name: 'Small facecam' },
  { id: 'circle-facecam', name: 'Circle facecam' },
  { id: 'game-ui', name: 'Game UI' },
  { id: 'split', name: 'Split' },
  { id: 'blurred', name: 'Blurred' },
  { id: 'fullscreen', name: 'Fullscreen' },
  { id: 'basecam', name: 'Basecam' },
  { id: 'mosaic', name: 'Mosaic' },
  { id: 'dual-facecam', name: 'Dual facecam' },
  { id: 'duo-split', name: 'Duo Split' },
  { id: 'half', name: 'Half' },
]

const STORAGE_KEY = 'clipper_user_templates'
const LAST_LAYOUT_KEY = 'clipper_last_layout'
const MAX_TEMPLATES = 9

export default function LayoutTemplates({
  selectedLayoutId,
  onSelectLayout,
  aspectRatio,
  onChangeAspectRatio,
  cropRegions = [],
  onApplyTemplate,
}: Props) {
  const [activeTab, setActiveTab] = useState<'all' | 'templates' | 'layouts'>('all')
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([])
  const [isManaging, setIsManaging] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')

  // Load user templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setUserTemplates(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load user templates:', e)
      }
    }
  }, [])

  // Load last used layout on mount
  useEffect(() => {
    const lastLayout = localStorage.getItem(LAST_LAYOUT_KEY)
    if (lastLayout && !selectedLayoutId) {
      // Auto-select last used layout
      const layout = PRESET_LAYOUTS.find(l => l.id === lastLayout)
      if (layout) {
        onSelectLayout({ id: layout.id, name: layout.name } as LayoutTemplate)
      }
    }
  }, [])

  // Save user templates to localStorage
  const saveTemplates = (templates: UserTemplate[]) => {
    setUserTemplates(templates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
  }

  // Save last used layout
  const handleSelectLayout = (layoutId: string) => {
    localStorage.setItem(LAST_LAYOUT_KEY, layoutId)
    const layout = PRESET_LAYOUTS.find(l => l.id === layoutId)
    if (layout) {
      onSelectLayout({ id: layout.id, name: layout.name } as LayoutTemplate)
    }
  }

  // Add new user template
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim() || userTemplates.length >= MAX_TEMPLATES) return

    const newTemplate: UserTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplateName.trim(),
      layoutId: selectedLayoutId || 'custom',
      cropRegions: cropRegions,
      createdAt: Date.now(),
    }

    saveTemplates([...userTemplates, newTemplate])
    setNewTemplateName('')
    setShowSaveDialog(false)
  }

  // Delete user template
  const handleDeleteTemplate = (templateId: string) => {
    saveTemplates(userTemplates.filter(t => t.id !== templateId))
  }

  // Apply user template
  const handleApplyUserTemplate = (template: UserTemplate) => {
    if (onApplyTemplate) {
      onApplyTemplate(template)
    }
    if (template.layoutId) {
      handleSelectLayout(template.layoutId)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs: All / Your templates / Layouts */}
      <div className="px-3 pt-3 shrink-0">
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

      <div className="flex-1 overflow-y-auto">
        {/* Your Templates Section */}
        {(activeTab === 'all' || activeTab === 'templates') && (
          <div className="px-3 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">Your templates</h3>
              <button 
                onClick={() => setIsManaging(!isManaging)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <Settings className="w-3 h-3" />
                Manage
              </button>
            </div>
            
            {userTemplates.length === 0 ? (
              // Empty state - Add template button
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full aspect-[9/16] max-h-32 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:bg-purple-500/5 transition-colors"
              >
                <Plus className="w-6 h-6 text-gray-500" />
                <span className="text-xs text-gray-500">Save current as template</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {userTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="relative group"
                  >
                    <button
                      onClick={() => !isManaging && handleApplyUserTemplate(template)}
                      className="w-full relative rounded-lg overflow-hidden border border-gray-700 hover:border-purple-500 transition-colors"
                    >
                      <div className="aspect-[9/16] bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
                        <LayoutPreview layoutId={template.layoutId} />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                        <p className="text-[10px] text-white truncate">{template.name}</p>
                      </div>
                    </button>
                    {isManaging && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
                
                {/* Add template button (if under limit) */}
                {userTemplates.length < MAX_TEMPLATES && (
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="aspect-[9/16] border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-purple-500 hover:bg-purple-500/5 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-500" />
                    <span className="text-[9px] text-gray-500">Add</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Layouts Section */}
        {(activeTab === 'all' || activeTab === 'layouts') && (
          <div className="px-3 pt-4 pb-4">
            <h3 className="text-sm font-medium text-white mb-3">Layouts</h3>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_LAYOUTS.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => handleSelectLayout(layout.id)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    selectedLayoutId === layout.id
                      ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20'
                      : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <div className="aspect-[9/16] bg-[#1a1a2e] flex items-center justify-center overflow-hidden">
                    <LayoutPreview layoutId={layout.id} />
                  </div>
                  <div className="p-1.5 bg-[#12121f]">
                    <p className="text-[10px] text-gray-400 text-center">{layout.name}</p>
                  </div>
                  {/* Selection checkmark */}
                  {selectedLayoutId === layout.id && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Template Dialog */}
      {showSaveDialog && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-lg p-4 w-full max-w-xs border border-gray-700">
            <h3 className="text-sm font-medium text-white mb-3">Save as Template</h3>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name..."
              maxLength={30}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                disabled={!newTemplateName.trim()}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Layout preview component with actual visual representations
function LayoutPreview({ layoutId }: { layoutId: string }) {
  // Colors matching StreamLadder
  const gameColor = 'bg-gradient-to-br from-green-600 to-green-800'
  const facecamColor = 'bg-gradient-to-br from-cyan-400 to-blue-500'
  const blurColor = 'bg-cyan-500/30 backdrop-blur-sm'
  
  const previewStyles: Record<string, React.ReactNode> = {
    'small-facecam': (
      <div className="w-full h-full relative">
        <div className={`absolute inset-0 ${gameColor}`} />
        <div className={`absolute top-2 right-2 w-1/3 h-[20%] ${facecamColor} rounded border-2 border-purple-400`} />
      </div>
    ),
    'circle-facecam': (
      <div className="w-full h-full relative">
        <div className={`absolute inset-0 ${gameColor}`} />
        <div className={`absolute top-2 right-2 w-8 h-8 ${facecamColor} rounded-full border-2 border-purple-400`} />
      </div>
    ),
    'game-ui': (
      <div className="w-full h-full relative bg-cyan-500">
        <div className="absolute top-1 left-1 right-1 h-3 bg-red-500/80 rounded-sm flex items-center px-1 gap-0.5">
          <div className="w-1 h-1 rounded-full bg-white" />
          <div className="flex-1 h-0.5 bg-white/50 rounded" />
        </div>
        <div className={`absolute inset-x-1 top-5 bottom-[45%] ${gameColor} rounded-sm`} />
        <div className={`absolute inset-x-1 bottom-1 h-[40%] ${facecamColor} rounded-sm`} />
      </div>
    ),
    'split': (
      <div className="w-full h-full relative flex flex-col">
        <div className={`flex-1 ${facecamColor}`} />
        <div className={`flex-1 ${gameColor}`} />
      </div>
    ),
    'blurred': (
      <div className="w-full h-full relative bg-gray-700">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-600/50 to-gray-800/50 blur-sm" />
        <div className={`absolute inset-x-2 inset-y-4 ${gameColor} rounded`} />
      </div>
    ),
    'fullscreen': (
      <div className={`w-full h-full ${gameColor}`} />
    ),
    'basecam': (
      <div className="w-full h-full relative flex flex-col">
        <div className={`flex-[2] ${gameColor}`} />
        <div className={`flex-1 ${facecamColor}`} />
      </div>
    ),
    'mosaic': (
      <div className="w-full h-full relative">
        <div className={`absolute top-0 left-0 right-0 h-[60%] ${gameColor}`} />
        <div className={`absolute bottom-0 left-0 w-1/2 h-[40%] ${facecamColor}`} />
        <div className={`absolute bottom-0 right-0 w-1/2 h-[40%] ${gameColor} opacity-70`} />
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-1/3 h-[25%] bg-gray-800 rounded border border-gray-600" />
      </div>
    ),
    'dual-facecam': (
      <div className="w-full h-full relative flex flex-col gap-0.5">
        <div className={`h-[30%] ${facecamColor}`} />
        <div className={`flex-1 ${gameColor}`} />
        <div className={`h-[30%] ${facecamColor}`} />
      </div>
    ),
    'duo-split': (
      <div className="w-full h-full relative flex flex-col">
        <div className={`flex-1 ${gameColor}`} />
        <div className={`h-[35%] ${facecamColor}`} />
      </div>
    ),
    'half': (
      <div className="w-full h-full relative flex flex-col">
        <div className={`flex-1 ${facecamColor}`} />
        <div className={`flex-1 ${gameColor}`} />
      </div>
    ),
    'custom': (
      <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
        <span className="text-2xl">🎬</span>
      </div>
    ),
  }

  return previewStyles[layoutId] || <div className="w-full h-full bg-gray-700/30" />
}

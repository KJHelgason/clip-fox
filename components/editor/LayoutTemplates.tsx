'use client'

import { useState, useEffect } from 'react'
import { LayoutTemplate, AspectRatio } from '@/lib/types'
import { Settings, Plus, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type CropRegion = {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  color: string
  previewX: number
  previewY: number
  previewWidth: number
  cornerRounding?: number
  zIndex?: number
}

type UserTemplate = {
  id: string
  name: string
  user_id?: string
  layout_data: {
    cropRegions: CropRegion[]
  }
  created_at?: string
}

type Props = {
  selectedLayoutId?: string
  selectedTemplateId?: string
  onSelectLayout: (layout: LayoutTemplate | null, templateId?: string) => void
  aspectRatio: AspectRatio
  onChangeAspectRatio: (ratio: AspectRatio) => void
  cropRegions?: CropRegion[]
  onApplyTemplate?: (template: { cropRegions: CropRegion[] }) => void
}

// Default preset layouts - these are the 9 standard layouts available to all users
const PRESET_LAYOUTS: Array<{
  id: string
  name: string
  cropRegions: CropRegion[]
}> = [
  {
    id: 'small-facecam',
    name: 'Small facecam',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 22.265625, y: 0, width: 55.46875, height: 100, color: '#22c55e', previewX: 0, previewY: 21.478873239436624, previewWidth: 100, cornerRounding: 0, zIndex: 1 },
      { id: 'crop-2', name: 'Camera', x: 75.33482142857142, y: 69.24603174603175, width: 24.665178571428566, height: 30.75396825396826, color: '#3b82f6', previewX: 25.59429674546689, previewY: 11.969648219648231, previewWidth: 48.81140650906622, cornerRounding: 0, zIndex: 2 }
    ]
  },
  {
    id: 'circle-facecam',
    name: 'Circle facecam',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 22.265625, y: 0, width: 55.46875, height: 100, color: '#22c55e', previewX: 0, previewY: 21.478873239436624, previewWidth: 100, cornerRounding: 0, zIndex: 1 },
      { id: 'crop-2', name: 'Camera', x: 77.734375, y: 63.29365079365079, width: 20.64732142857143, height: 36.70634920634921, color: '#3b82f6', previewX: 25.59429674546689, previewY: 10.382346632346644, previewWidth: 48.81140650906622, cornerRounding: 50, zIndex: 2 }
    ]
  },
  {
    id: 'game-ui',
    name: 'Game UI',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 28.57142857142857, y: 0, width: 46.98660714285714, height: 100, color: '#22c55e', previewX: 0.2797600811610934, previewY: 33.03711155823834, previewWidth: 99.44047983767781, cornerRounding: 0, zIndex: 1 },
      { id: 'crop-2', name: 'Camera', x: 75.55803571428571, y: 74.2063492063492, width: 24.44196428571428, height: 25.793650793650798, color: '#3b82f6', previewX: 0, previewY: 0, previewWidth: 100, cornerRounding: 0, zIndex: 2 },
      { id: 'crop-3', name: 'UI', x: 78.29241071428571, y: 0, width: 21.707589285714292, height: 3.3968253968253967, color: '#f59e0b', previewX: 0, previewY: 30.579465796470874, previewWidth: 100, cornerRounding: 0, zIndex: 3 }
    ]
  },
  {
    id: 'split',
    name: 'Split',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 27.23214285714284, y: 0, width: 49.776785714285715, height: 100, color: '#22c55e', previewX: 0, previewY: 37.00536552649229, previewWidth: 99.10267010647068, cornerRounding: 0, zIndex: 1 },
      { id: 'crop-2', name: 'Camera', x: 77.00892857142856, y: 73.21428571428571, width: 22.991071428571423, height: 26.785714285714292, color: '#3b82f6', previewX: 0, previewY: 0, previewWidth: 100, cornerRounding: 0, zIndex: 2 }
    ]
  },
  {
    id: 'blurred',
    name: 'Blurred',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 25.111607142857142, y: 0, width: 49.776785714285715, height: 100, color: '#22c55e', previewX: 0.4486649467646586, previewY: 18.50268276324615, previewWidth: 99.10267010647068, cornerRounding: 0, zIndex: 1 }
    ]
  },
  {
    id: 'fullscreen',
    name: 'Fullscreen',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 34.17271205357143, y: 0, width: 31.65457589285714, height: 100, color: '#22c55e', previewX: 0.4486649467646586, previewY: 0.6239313817175685, previewWidth: 99.3760686182824, cornerRounding: 0, zIndex: 1 }
    ]
  },
  {
    id: 'split-reversed',
    name: 'Split reversed',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 27.23214285714284, y: 0, width: 49.776785714285715, height: 100, color: '#22c55e', previewX: 0.4486649467646586, previewY: 0, previewWidth: 99.10267010647068, cornerRounding: 0, zIndex: 1 },
      { id: 'crop-2', name: 'Camera', x: 77.00892857142856, y: 73.21428571428571, width: 22.991071428571423, height: 26.785714285714292, color: '#3b82f6', previewX: 0, previewY: 63.13713592233008, previewWidth: 100, cornerRounding: 0, zIndex: 2 }
    ]
  },
  {
    id: 'half',
    name: 'Half',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 14.787946428571423, y: 0, width: 61.272321428571416, height: 100, color: '#22c55e', previewX: 0.22433247338233286, previewY: 48.19857856241533, previewWidth: 99.77566752661767, cornerRounding: 0, zIndex: 1 },
      { id: 'crop-2', name: 'Camera', x: 78.34821428571426, y: 67.26190476190476, width: 21.540178571428577, height: 32.73809523809525, color: '#3b82f6', previewX: 0, previewY: 0, previewWidth: 100, cornerRounding: 0, zIndex: 2 }
    ]
  },
  {
    id: 'mosaic',
    name: 'Mosaic',
    cropRegions: [
      { id: 'crop-1', name: 'Video', x: 28.57142857142857, y: 0, width: 46.98660714285714, height: 100, color: '#22c55e', previewX: 0.2797600811610934, previewY: 33.03711155823834, previewWidth: 99.44047983767781, cornerRounding: 0, zIndex: 1 },
      { id: 'crop-2', name: 'Camera', x: 82.47767857142857, y: 63.09523809523809, width: 17.522321428571423, height: 36.90476190476191, color: '#3b82f6', previewX: 0, previewY: 0, previewWidth: 49.911816578483254, cornerRounding: 0, zIndex: 2 },
      { id: 'crop-3', name: 'Video 2', x: 0, y: 63.09523809523808, width: 17.522321428571423, height: 36.90476190476191, color: '#ef4444', previewX: 50.088183421516746, previewY: 0, previewWidth: 49.911816578483254, cornerRounding: 0, zIndex: 3 }
    ]
  },
]

const LAST_SELECTION_KEY = 'clipper_last_selection'
const MAX_TEMPLATES = 9

export default function LayoutTemplates({
  selectedLayoutId,
  selectedTemplateId,
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
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load user templates from Supabase
  useEffect(() => {
    async function loadTemplates() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Failed to load templates:', error)
        } else if (data) {
          setUserTemplates(data as UserTemplate[])
        }
      } catch (e) {
        console.error('Failed to load templates:', e)
      } finally {
        setIsLoading(false)
      }
    }

    loadTemplates()
  }, [])

  // Load last used selection on mount
  useEffect(() => {
    const lastSelection = localStorage.getItem(LAST_SELECTION_KEY)
    if (lastSelection && !selectedLayoutId && !selectedTemplateId) {
      try {
        const { type, id } = JSON.parse(lastSelection)
        if (type === 'layout') {
          const layout = PRESET_LAYOUTS.find(l => l.id === id)
          if (layout) {
            onSelectLayout({ id: layout.id, name: layout.name } as LayoutTemplate)
            if (onApplyTemplate) {
              onApplyTemplate({ cropRegions: layout.cropRegions })
            }
          }
        }
      } catch (e) {
        console.error('Failed to load last selection:', e)
      }
    }
  }, [])

  // Select a preset layout
  const handleSelectLayout = (layout: typeof PRESET_LAYOUTS[0]) => {
    localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify({ type: 'layout', id: layout.id }))
    onSelectLayout({ id: layout.id, name: layout.name } as LayoutTemplate)
    if (onApplyTemplate) {
      onApplyTemplate({ cropRegions: layout.cropRegions })
    }
  }

  // Select a user template
  const handleSelectTemplate = (template: UserTemplate) => {
    if (isManaging) return
    localStorage.setItem(LAST_SELECTION_KEY, JSON.stringify({ type: 'template', id: template.id }))
    onSelectLayout({ id: template.id, name: template.name } as LayoutTemplate, template.id)
    if (onApplyTemplate) {
      onApplyTemplate({ cropRegions: template.layout_data.cropRegions })
    }
  }

  // Add new user template to Supabase
  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || userTemplates.length >= MAX_TEMPLATES || isSaving) return

    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.error('User not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('templates')
        .insert({
          user_id: user.id,
          name: newTemplateName.trim(),
          aspect_ratio: aspectRatio,
          layout_data: { cropRegions: cropRegions as CropRegion[] },
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save template:', error)
      } else if (data) {
        setUserTemplates([data as UserTemplate, ...userTemplates])
        setNewTemplateName('')
        setShowSaveDialog(false)
      }
    } catch (e) {
      console.error('Failed to save template:', e)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete user template from Supabase
  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId)

      if (error) {
        console.error('Failed to delete template:', error)
      } else {
        setUserTemplates(userTemplates.filter(t => t.id !== templateId))
      }
    } catch (e) {
      console.error('Failed to delete template:', e)
    }
  }

  // Check if a layout or template is selected
  const isLayoutSelected = (layoutId: string) => selectedLayoutId === layoutId && !selectedTemplateId
  const isTemplateSelected = (templateId: string) => selectedTemplateId === templateId

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
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

      <div 
        className="flex-1 overflow-y-auto custom-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#4b5563 transparent',
        }}
      >
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
                {isManaging ? 'Done' : 'Manage'}
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            ) : userTemplates.length === 0 ? (
              <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="rounded-md border border-dashed border-gray-700 flex flex-col items-center justify-center gap-1.5 hover:border-purple-500 hover:bg-purple-500/5 transition-colors bg-[#0d0d15]"
                    style={{ aspectRatio: '9/16' }}
                  >
                    <Plus className="w-5 h-5 text-gray-500" />
                    <span className="text-[9px] text-gray-500 px-1 text-center">Save current</span>
                  </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {userTemplates.map((template) => (
                  <div key={template.id} className="relative group">
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className={`w-full relative rounded-md overflow-hidden transition-all ${
                        isTemplateSelected(template.id)
                          ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/30'
                          : 'ring-1 ring-gray-700 hover:ring-gray-500'
                      }`}
                    >
                      <div 
                        className="overflow-hidden"
                        style={{ aspectRatio: '9/16' }}
                      >
                        <CropPreview cropRegions={template.layout_data.cropRegions} />
                      </div>
                      <div className="py-1.5 px-1 bg-[#0d0d15] border-t border-gray-800">
                        <p className="text-[10px] text-gray-400 text-center truncate">{template.name}</p>
                      </div>
                      {isTemplateSelected(template.id) && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                    {isManaging && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                ))}
                
                {userTemplates.length < MAX_TEMPLATES && (
                  <button
                    onClick={() => setShowSaveDialog(true)}
                    className="rounded-md border border-dashed border-gray-700 flex flex-col items-center justify-center gap-1 hover:border-purple-500 hover:bg-purple-500/5 transition-colors bg-[#0d0d15]"
                    style={{ aspectRatio: '9/16' }}
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
                  onClick={() => handleSelectLayout(layout)}
                  className={`relative group rounded-md overflow-hidden transition-all ${
                    isLayoutSelected(layout.id)
                      ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/30'
                      : 'ring-1 ring-gray-700 hover:ring-gray-500'
                  }`}
                >
                  <div 
                    className="overflow-hidden"
                    style={{ aspectRatio: '9/16' }}
                  >
                    <CropPreview cropRegions={layout.cropRegions} />
                  </div>
                  <div className="py-1.5 px-1 bg-[#0d0d15] border-t border-gray-800">
                    <p className="text-[10px] text-gray-400 text-center truncate">{layout.name}</p>
                  </div>
                  {isLayoutSelected(layout.id) && (
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#1a1a2e] rounded-lg p-4 w-full max-w-xs border border-gray-700 shadow-xl">
            <h3 className="text-sm font-medium text-white mb-3">Save as Template</h3>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name..."
              maxLength={30}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 mb-3"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
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
                disabled={!newTemplateName.trim() || isSaving}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Preview component that shows actual crop regions in 9:16 aspect ratio
// The thumbnail container is 9:16 and we render the crops as they would appear on the preview
function CropPreview({ cropRegions }: { cropRegions: CropRegion[] }) {
  if (!cropRegions || cropRegions.length === 0) {
    return <div className="w-full h-full bg-gray-800/50" />
  }

  // Calculate preview height from width maintaining crop's source aspect ratio
  // Source is 16:9, so crop.width/crop.height gives us the crop's aspect ratio in source space
  // In the 9:16 preview, we need to convert that to actual preview dimensions
  const calculatePreviewHeight = (crop: CropRegion) => {
    // The crop's aspect ratio in source coordinates (16:9 source)
    // crop.width and crop.height are percentages of the source video
    // Source is 16:9, so actual pixel ratio = (crop.width / 100 * 16) / (crop.height / 100 * 9)
    const cropAspectInSource = (crop.width * 16) / (crop.height * 9)
    
    // In the 9:16 preview, the crop width is previewWidth% of container width
    // Container aspect ratio is 9:16, so width = 9 units, height = 16 units
    // Crop width in preview = previewWidth% * 9 / 100
    // Crop height in preview = cropWidth / cropAspectInSource
    // As percentage of container height (16 units):
    // height% = (cropWidth / cropAspectInSource) / 16 * 100
    
    const cropWidthUnits = (crop.previewWidth / 100) * 9
    const cropHeightUnits = cropWidthUnits / cropAspectInSource
    const heightPercent = (cropHeightUnits / 16) * 100
    
    return heightPercent
  }

  // Sort crops by zIndex so they render in correct order (lower zIndex first = behind)
  const sortedCrops = [...cropRegions].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1))
  
  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{ backgroundColor: '#2d2640' }} // Light muted purple
    >
      
      {sortedCrops.map((crop) => {
        const cornerRounding = crop.cornerRounding || 0
        // Border radius as percentage - but for small elements it looks better as a fixed amount
        const borderRadius = cornerRounding > 0 ? `${Math.min(cornerRounding * 0.5, 20)}%` : '2px'
        const previewHeight = calculatePreviewHeight(crop)
        
        return (
          <div
            key={crop.id}
            className="absolute shadow-sm"
            style={{
              left: `${crop.previewX}%`,
              top: `${crop.previewY}%`,
              width: `${crop.previewWidth}%`,
              height: `${previewHeight}%`,
              backgroundColor: crop.color,
              borderRadius: borderRadius,
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              zIndex: crop.zIndex || 1,
            }}
          />
        )
      })}
    </div>
  )
}

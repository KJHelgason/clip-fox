'use client'

import { useState } from 'react'
import { 
  ExportSettings, 
  DEFAULT_EXPORT_SETTINGS, 
  AspectRatio, 
  ASPECT_RATIOS,
  OverlayElement,
  ZoomKeyframe
} from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Upload, Check, Bookmark } from 'lucide-react'

type Props = {
  clipTitle: string
  aspectRatio: AspectRatio
  startTime: number
  endTime: number
  overlays: OverlayElement[]
  zoomKeyframes: ZoomKeyframe[]
  thumbs: number[]
  onExport: (settings: ExportSettings) => Promise<void>
}

// Quality presets matching StreamLadder
const QUALITY_PRESETS = [
  { id: '720p-30', label: '720p', sublabel: 'Standard 720p', fps: 30 as const, resolution: '720p' as const, description: 'Content creation starts here' },
  { id: '720p-60', label: '720p', sublabel: '720p High Frame Rate', fps: 60 as const, resolution: '720p' as const, description: 'Enhanced smoothness' },
  { id: '1080p-60', label: '1080p', sublabel: 'Full HD 1080p', fps: 60 as const, resolution: '1080p' as const, description: 'Best for creators', recommended: true },
]

export default function ExportPanel({
  clipTitle,
  aspectRatio,
  startTime,
  endTime,
  overlays,
  zoomKeyframes,
  thumbs,
  onExport
}: Props) {
  const [settings, setSettings] = useState<ExportSettings>({
    ...DEFAULT_EXPORT_SETTINGS,
    aspectRatio
  })
  const [selectedQuality, setSelectedQuality] = useState('1080p-60')
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStage, setExportStage] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)
    
    try {
      const stages = [
        { name: 'Preparing...', progress: 10 },
        { name: 'Processing video...', progress: 30 },
        { name: 'Applying overlays...', progress: 50 },
        { name: 'Applying effects...', progress: 70 },
        { name: 'Encoding...', progress: 90 },
        { name: 'Finalizing...', progress: 100 },
      ]

      for (const stage of stages) {
        setExportStage(stage.name)
        setExportProgress(stage.progress)
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      await onExport(settings)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
      setExportProgress(0)
      setExportStage('')
    }
  }

  return (
    <div className="flex flex-col h-full p-3 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-white">Select your quality</h3>
        <p className="text-xs text-gray-500">Choose the quality of your video from the options below, then click the button to start rendering.</p>
      </div>

      {/* Quality Options */}
      <div className="space-y-2">
        {QUALITY_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => {
              setSelectedQuality(preset.id)
              setSettings(s => ({ ...s, fps: preset.fps, resolution: preset.resolution }))
            }}
            className={`w-full p-3 rounded-lg border transition-all text-left ${
              selectedQuality === preset.id
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-[#1a1a2e]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedQuality === preset.id ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                }`}>
                  {selectedQuality === preset.id && <Check className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{preset.label}</span>
                    <span className="text-sm text-white">{preset.sublabel}</span>
                  </div>
                  <p className="text-xs text-gray-500">{preset.fps} fps</p>
                </div>
              </div>
            </div>
            {preset.description && (
              <p className="text-xs text-gray-500 mt-1 ml-8">{preset.description}</p>
            )}
          </button>
        ))}
      </div>

      {/* Recommended Banner */}
      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-lg p-3">
        <p className="text-xs text-green-400 font-medium">
          ✨ The best choice for 23% more engagement!
        </p>
      </div>

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium"
      >
        {isExporting ? (
          <span className="flex items-center gap-2">
            Exporting... {exportProgress}%
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Export clip
          </span>
        )}
      </Button>

      {/* Export Progress */}
      {isExporting && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{exportStage}</span>
            <span className="text-purple-400">{exportProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Save Template Section */}
      <div className="border-t border-gray-800 pt-4">
        <h4 className="text-sm font-semibold text-white mb-2">Save Template</h4>
        <p className="text-xs text-gray-500 mb-3">
          Save your current settings, crops and stickers as a template to save time on your next video.
        </p>
        
        <ul className="space-y-2 text-xs text-gray-400 mb-4">
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-500" />
            Save your current clip settings as a reusable template.
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-500" />
            Instantly apply the template to future clip projects with a single click.
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-3 h-3 text-green-500" />
            Preserve edits, customizations, and effects for consistent and efficient results.
          </li>
        </ul>

        <Button
          variant="outline"
          className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Save template
        </Button>
      </div>
    </div>
  )
}
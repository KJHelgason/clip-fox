'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ExportSettings,
  DEFAULT_EXPORT_SETTINGS,
  AspectRatio,
  OverlayElement,
  ZoomKeyframe
} from '@/lib/types'
import { CropRegion } from '@/lib/hooks/usePreviewCropDrag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Check, Bookmark, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type Props = {
  clipTitle: string
  aspectRatio: AspectRatio
  startTime: number
  endTime: number
  overlays: OverlayElement[]
  zoomKeyframes: ZoomKeyframe[]
  thumbs: number[]
  cropRegions?: CropRegion[]
  videoSrc?: string
  onExport: (settings: ExportSettings) => Promise<void>
}

// Quality presets matching StreamLadder
const QUALITY_PRESETS = [
  { id: '720p-30', label: '720p', sublabel: 'Standard 720p', fps: 30 as const, resolution: '720p' as const, description: 'Content creation starts here' },
  { id: '720p-60', label: '720p', sublabel: '720p High Frame Rate', fps: 60 as const, resolution: '720p' as const, description: 'Enhanced smoothness' },
  { id: '1080p-60', label: '1080p', sublabel: 'Full HD 1080p', fps: 60 as const, resolution: '1080p' as const, description: 'Best for creators', recommended: true },
]

// Template toggle item type
type TemplateToggle = {
  id: string
  label: string
  enabled: boolean
}

export default function ExportPanel({
  clipTitle,
  aspectRatio,
  startTime,
  endTime,
  overlays,
  zoomKeyframes,
  thumbs,
  cropRegions = [],
  videoSrc,
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

  // Save Template Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateToggles, setTemplateToggles] = useState<TemplateToggle[]>([
    { id: 'layout', label: 'Layout', enabled: true },
    { id: 'text', label: 'Text', enabled: false },
    { id: 'captions', label: 'Captions', enabled: true },
    { id: 'gifs', label: 'Gifs', enabled: true },
    { id: 'stickers', label: 'Stickers', enabled: true },
    { id: 'soundEffects', label: 'Sound Effects', enabled: true },
    { id: 'videoEffects', label: 'Video Effects', enabled: true },
  ])

  // Preview canvas ref for template thumbnail
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

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

  const handleToggle = (id: string) => {
    setTemplateToggles(prev =>
      prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t)
    )
  }

  const handleSaveTemplate = () => {
    // TODO: Save template to database
    console.log('Saving template:', {
      name: templateName,
      toggles: templateToggles,
      overlays,
      cropRegions,
      aspectRatio
    })
    setShowTemplateModal(false)
    setTemplateName('')
  }

  // Generate preview thumbnail when modal opens
  useEffect(() => {
    if (showTemplateModal && videoSrc && previewCanvasRef.current) {
      const canvas = previewCanvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.src = videoSrc
      video.currentTime = startTime || 0

      video.onloadeddata = () => {
        // Draw the video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      }
    }
  }, [showTemplateModal, videoSrc, startTime])

  return (
    <div className="flex flex-col h-full p-3 space-y-4">
      {/* Header with title and subtitle */}
      <div>
        <h3 className="text-sm font-semibold text-white">Export</h3>
        <p className="text-xs text-gray-500">Select your quality</p>
      </div>

      {/* Quality section header */}
      <div>
        <p className="text-xs text-gray-500">Choose the quality of your video from the options below, then click the button to start rendering.</p>
      </div>

      {/* Quality Options */}
      <div className="space-y-2">
        {QUALITY_PRESETS.map((preset) => {
          const isRecommended = preset.recommended
          const isSelected = selectedQuality === preset.id

          return (
            <div
              key={preset.id}
              className={`relative rounded-lg border transition-all overflow-hidden ${
                isSelected
                  ? 'border-purple-500'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <button
                onClick={() => {
                  setSelectedQuality(preset.id)
                  setSettings(s => ({ ...s, fps: preset.fps, resolution: preset.resolution }))
                }}
                className={`w-full p-3 transition-all text-left ${
                  isSelected
                    ? 'bg-purple-500/10'
                    : 'bg-[#1a1a2e]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Radio circle - vertically centered */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>

                  {/* Two column layout */}
                  <div className="flex-1 grid grid-cols-[auto_1fr] gap-x-4 items-center">
                    {/* Column 1: Resolution and FPS */}
                    <div className="text-left">
                      <div className="text-sm font-medium text-white">{preset.label}</div>
                      <div className="text-xs text-gray-500">{preset.fps}fps</div>
                    </div>

                    {/* Column 2: Sublabel and Description */}
                    <div className="text-left">
                      <div className="text-sm text-white">{preset.sublabel}</div>
                      <div className="text-xs text-gray-500">{preset.description}</div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Recommended Banner - attached to bottom of 1080p option */}
              {isRecommended && (
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 px-3 py-2">
                  <p className="text-xs text-green-400 font-medium">
                    ✨ The best choice for 23% more engagement!
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Export Button - icon on the right */}
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
          <span className="flex items-center justify-center gap-2 w-full">
            Export clip
            <Upload className="w-4 h-4" />
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
          onClick={() => setShowTemplateModal(true)}
          className="w-full border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          <Bookmark className="w-4 h-4 mr-2" />
          Save template
        </Button>
      </div>

      {/* Save Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="sm:max-w-[700px] bg-[#1a1a2e] border-gray-700 p-0 overflow-hidden">
          <div className="flex">
            {/* Left side - Form */}
            <div className="flex-1 p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-white text-lg">Update template</DialogTitle>
                <DialogDescription className="text-gray-400 text-sm">
                  Update this template to easily apply it to your next clip.
                </DialogDescription>
              </DialogHeader>

              {/* Template Name Input */}
              <div className="mb-6">
                <label className="text-sm font-medium text-white mb-2 block">Template name</label>
                <div className="relative">
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value.slice(0, 50))}
                    placeholder="My Template"
                    className="bg-[#0a0a12] border-gray-700 text-white pr-16"
                    name="templateName"
                    autoComplete="off"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    {templateName.length} / 50
                  </span>
                </div>
              </div>

              {/* Save template with toggles */}
              <div>
                <label className="text-sm font-medium text-white mb-3 block">Save template with</label>
                <div className="space-y-3">
                  {templateToggles.map((toggle) => (
                    <div key={toggle.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">{toggle.label}</span>
                      <button
                        onClick={() => handleToggle(toggle.id)}
                        className={`w-11 h-6 rounded-full relative transition-colors ${
                          toggle.enabled ? 'bg-teal-500' : 'bg-gray-600'
                        }`}
                        aria-label={`Toggle ${toggle.label}`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            toggle.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-700">
                <button
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                  onClick={() => setShowTemplateModal(false)}
                >
                  New
                </button>
                <Button
                  onClick={handleSaveTemplate}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                >
                  Update
                </Button>
              </div>
            </div>

            {/* Right side - Preview */}
            <div className="w-[240px] bg-[#0a0a12] p-4 flex flex-col items-center relative">
              {/* Close button */}
              <button
                onClick={() => setShowTemplateModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Preview container - 9:16 aspect ratio */}
              <div
                className="relative bg-black rounded-lg overflow-hidden border border-gray-700 mt-6"
                style={{
                  width: '160px',
                  height: '284px', // 9:16 aspect ratio
                }}
              >
                {/* Background blur */}
                {videoSrc && (
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    className="absolute inset-0 w-full h-full object-cover blur-md scale-105 opacity-60"
                    muted
                    playsInline
                  />
                )}

                {/* Main content preview */}
                <div className="absolute inset-0 flex flex-col">
                  {/* Render crop regions */}
                  {cropRegions.map((crop) => (
                    <div
                      key={crop.id}
                      className="absolute bg-gray-800"
                      style={{
                        left: `${crop.previewX}%`,
                        top: `${crop.previewY}%`,
                        width: `${crop.previewWidth}%`,
                        height: 'auto',
                        aspectRatio: `${crop.width} / ${crop.height}`,
                      }}
                    >
                      {videoSrc && (
                        <video
                          src={videoSrc}
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${crop.x}% ${crop.y}%`,
                          }}
                          muted
                          playsInline
                        />
                      )}
                    </div>
                  ))}

                  {/* Render overlays preview - simplified */}
                  {overlays.filter(o => templateToggles.find(t => {
                    if (t.id === 'text' && o.type === 'text') return t.enabled
                    if (t.id === 'captions' && o.type === 'caption') return t.enabled
                    if (t.id === 'stickers' && (o.type === 'sticker' || o.type === 'social-sticker' || o.type === 'image')) return t.enabled
                    return false
                  })).map((overlay) => (
                    <div
                      key={overlay.id}
                      className="absolute"
                      style={{
                        left: `${overlay.videoLeft}%`,
                        top: `${overlay.videoTop}%`,
                        width: `${overlay.videoWidth}%`,
                        height: `${overlay.videoHeight}%`,
                        opacity: (overlay.opacity ?? 100) / 100,
                      }}
                    >
                      {overlay.type === 'text' && (
                        <div
                          className="text-white text-center"
                          style={{
                            fontSize: '8px',
                            fontWeight: overlay.fontWeight || 'normal'
                          }}
                        >
                          {overlay.content}
                        </div>
                      )}
                      {overlay.type === 'caption' && (
                        <div className="bg-purple-600 text-white text-center px-1 py-0.5 rounded text-[6px]">
                          CAPTIONS
                        </div>
                      )}
                      {(overlay.type === 'sticker' || overlay.type === 'social-sticker' || overlay.type === 'image') && overlay.src && (
                        <img
                          src={overlay.src}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Caption indicator at bottom */}
                {templateToggles.find(t => t.id === 'captions')?.enabled && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <div className="bg-purple-600 text-white text-[8px] px-2 py-1 rounded font-medium">
                      CAPTIONS
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

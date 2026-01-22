'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/supabase/useUser'
import { v4 as uuidv4 } from 'uuid'
import { useRouter } from 'next/navigation'
import {
  Upload,
  Film,
  CloudUpload,
  Link2,
  Twitch,
  Youtube,
  X,
  CheckCircle2,
  Loader2,
  FileVideo
} from 'lucide-react'

export default function UploadClip() {
  const { user } = useUser()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('video/')) {
      setFile(droppedFile)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const clearFile = () => {
    setFile(null)
    setUploadProgress(0)
    setUploadComplete(false)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUpload = async () => {
    if (!file || !user) return

    setUploading(true)
    setUploadProgress(0)

    const clipId = uuidv4()
    const filePath = `${user.id}/${clipId}.mp4`

    // Simulate progress (since Supabase JS client doesn't support progress)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('clips')
      .upload(filePath, file)

    clearInterval(progressInterval)

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      setUploadProgress(0)
      return
    }

    setUploadProgress(95)

    // Insert metadata into DB
    const { data: clipData, error: dbError } = await supabase.from('clips').insert({
      id: clipId,
      user_id: user.id,
      title: file.name.replace(/\.[^/.]+$/, ''),
      video_path: filePath,
    }).select().single()

    if (dbError) {
      alert(`DB error: ${dbError.message}`)
      setUploading(false)
      return
    }

    setUploadProgress(100)
    setUploadComplete(true)
    setUploading(false)

    // Redirect to editor after short delay
    setTimeout(() => {
      router.push(`/edit/${clipData.id}`)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Clip</h1>
          <p className="text-gray-400">
            Upload your stream clips to start editing. Supports MP4, MOV, and WebM formats.
          </p>
        </div>

        {/* Upload Methods */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Drag & Drop Zone */}
          <div className="md:col-span-2">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
                ${isDragging
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-600 hover:border-gray-500 bg-[#1a1a2e]'
                }
                ${file ? 'border-green-500/50 bg-green-500/5' : ''}
              `}
            >
              {!file ? (
                <>
                  <div className={`
                    w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center
                    ${isDragging ? 'bg-purple-500/20' : 'bg-gray-700/50'}
                  `}>
                    <CloudUpload className={`w-10 h-10 ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {isDragging ? 'Drop your video here' : 'Drag & drop your video'}
                  </h3>
                  <p className="text-gray-400 mb-4">or click to browse</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    name="video-file"
                  />
                  <p className="text-sm text-gray-500">
                    Maximum file size: 500MB • MP4, MOV, WebM
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  {/* File Preview */}
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <FileVideo className="w-8 h-8 text-purple-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium truncate max-w-xs">{file.name}</p>
                      <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                    </div>
                    {!uploading && !uploadComplete && (
                      <button
                        onClick={clearFile}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        aria-label="Remove file"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {(uploading || uploadComplete) && (
                    <div className="max-w-md mx-auto">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          {uploadComplete ? 'Upload complete!' : 'Uploading...'}
                        </span>
                        <span className="text-sm font-medium">{uploadProgress}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            uploadComplete ? 'bg-green-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  {!uploading && !uploadComplete && (
                    <Button
                      onClick={handleUpload}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Edit
                    </Button>
                  )}

                  {uploading && (
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing your video...</span>
                    </div>
                  )}

                  {uploadComplete && (
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Redirecting to editor...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Import from URL */}
          <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Link2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Import from URL</h3>
                <p className="text-sm text-gray-400">Paste a video link</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-[#0f0f23] border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                name="video-url"
                autoComplete="url"
              />
              <Button
                variant="outline"
                className="border-gray-600 hover:bg-gray-700"
                disabled
              >
                Import
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Coming soon</p>
          </div>

          {/* Import from Platform */}
          <div className="bg-[#1a1a2e] rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold">Import from Platform</h3>
                <p className="text-sm text-gray-400">Connect your accounts</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="border-gray-600 hover:bg-gray-700 justify-start"
                disabled
              >
                <Twitch className="w-4 h-4 mr-2 text-purple-400" />
                Twitch
              </Button>
              <Button
                variant="outline"
                className="border-gray-600 hover:bg-gray-700 justify-start"
                disabled
              >
                <Youtube className="w-4 h-4 mr-2 text-red-400" />
                YouTube
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Coming soon</p>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-[#1a1a2e] rounded-xl p-6 border border-gray-700/50">
          <h3 className="font-semibold mb-4">💡 Tips for best results</h3>
          <ul className="grid gap-3 md:grid-cols-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Upload clips under 5 minutes for optimal processing</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>1080p resolution recommended for TikTok quality</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>MP4 with H.264 codec provides best compatibility</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Keep original audio for auto-caption accuracy</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

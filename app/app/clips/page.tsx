'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/supabase/useUser'
import Link from 'next/link'
import {
  Play,
  Trash2,
  Edit3,
  Download,
  MoreHorizontal,
  Clock,
  Eye,
  Upload,
  Grid,
  List,
  Search,
  Filter,
  Plus
} from 'lucide-react'

type Clip = {
  id: string
  title: string | null
  video_path: string
  thumbnail_path?: string
  duration?: number
  created_at: string
  signedUrl: string | null
}

export default function ClipListPage() {
  const { user } = useUser()
  const [clips, setClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user) return

    const fetchClips = async () => {
      const { data, error } = await supabase
        .from('clips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error || !data) {
        console.error('Error fetching clips:', error)
        setLoading(false)
        return
      }

      const clipsWithUrls = await Promise.all(
        data.map(async (clip) => {
          const { data: signed } = await supabase.storage
            .from('clips')
            .createSignedUrl(clip.video_path, 3600)

          return {
            ...clip,
            signedUrl: signed?.signedUrl || null
          }
        })
      )

      setClips(clipsWithUrls)
      setLoading(false)
    }

    fetchClips()
  }, [user])

  const handleDelete = async (clip: Clip) => {
    if (!confirm('Are you sure you want to delete this clip?')) return

    setDeletingId(clip.id)

    const { error: storageError } = await supabase.storage
      .from('clips')
      .remove([clip.video_path])

    const { error: dbError } = await supabase
      .from('clips')
      .delete()
      .eq('id', clip.id)

    if (storageError || dbError) {
      alert('Failed to delete clip.')
      console.error({ storageError, dbError })
    } else {
      setClips((prev) => prev.filter((c) => c.id !== clip.id))
    }

    setDeletingId(null)
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredClips = clips.filter(clip =>
    !searchQuery ||
    (clip.title?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Videos</h1>
          <p className="text-zinc-400 text-sm">{clips.length} clips uploaded</p>
        </div>
        <Link href="/upload">
          <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload new
          </button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search clips..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            name="search-clips"
            autoComplete="off"
          />
        </div>

        {/* Filter */}
        <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm hover:bg-zinc-800 transition">
          <Filter className="w-4 h-4" />
          Filter
        </button>

        {/* View Toggle */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            aria-label="Grid view"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            aria-label="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clips */}
      {filteredClips.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
            <Upload className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-medium mb-2">
            {searchQuery ? 'No clips found' : 'No clips yet'}
          </h3>
          <p className="text-zinc-500 mb-6 max-w-md mx-auto">
            {searchQuery
              ? `No clips match "${searchQuery}"`
              : 'Upload your first clip to start creating amazing content!'
            }
          </p>
          {!searchQuery && (
            <Link href="/upload">
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-full font-medium transition flex items-center gap-2 mx-auto">
                Upload your first clip
                <Plus className="w-4 h-4" />
              </button>
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClips.map((clip) => (
            <div
              key={clip.id}
              className="group bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition"
            >
              {/* Thumbnail */}
              <Link href={`/edit/${clip.id}`}>
                <div className="relative aspect-video bg-zinc-800">
                  {clip.signedUrl ? (
                    <video
                      src={clip.signedUrl}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-12 h-12 text-zinc-600" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium">
                    {formatDuration(clip.duration)}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
                      <Play className="w-7 h-7 text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Info */}
              <div className="p-3">
                <h3 className="font-medium truncate mb-2">
                  {clip.title || 'Untitled Clip'}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(clip.created_at)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Link href={`/edit/${clip.id}`}>
                      <button
                        className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition"
                        aria-label="Edit clip"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDelete(clip)}
                      disabled={deletingId === clip.id}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition disabled:opacity-50"
                      aria-label="Delete clip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List View
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Clip</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Duration</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Date</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClips.map((clip) => (
                <tr key={clip.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/edit/${clip.id}`} className="flex items-center gap-3">
                      <div className="w-24 h-14 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                        {clip.signedUrl && (
                          <video
                            src={clip.signedUrl}
                            className="w-full h-full object-cover"
                            muted
                          />
                        )}
                      </div>
                      <span className="font-medium hover:text-purple-400 transition">
                        {clip.title || 'Untitled Clip'}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {formatDuration(clip.duration)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {formatDate(clip.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/edit/${clip.id}`}>
                        <button
                          className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition"
                          aria-label="Edit clip"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </Link>
                      <button
                        className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded transition"
                        aria-label="Download clip"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(clip)}
                        disabled={deletingId === clip.id}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 rounded transition disabled:opacity-50"
                        aria-label="Delete clip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

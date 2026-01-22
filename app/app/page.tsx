'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  Smartphone,
  Monitor,
  Sparkles,
  Share2,
  Film,
  Smile,
  Calendar,
  Download,
  Plus,
  Clock,
  Play,
  Eye,
  ChevronDown,
  ExternalLink
} from 'lucide-react'

type Clip = {
  id: string
  title: string | null
  video_path: string
  thumbnail_path?: string
  signedUrl?: string
  duration?: number
  created_at: string
  updated_at: string
  status: string
}

type Profile = {
  username: string
  avatar_url?: string
}

type TwitchConnection = {
  id: string
  platform_username: string
  platform_display_name: string
  platform_user_id: string
}

type TwitchClip = {
  id: string
  title: string
  thumbnail_url: string
  url: string
  view_count: number
  created_at: string
  duration: number
  broadcaster_name: string
}

type TwitchPeriod = 'all' | '24h' | '7d' | '30d'

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recentClips, setRecentClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)

  // Twitch clips state
  const [twitchConnection, setTwitchConnection] = useState<TwitchConnection | null>(null)
  const [twitchClips, setTwitchClips] = useState<TwitchClip[]>([])
  const [twitchClipsLoading, setTwitchClipsLoading] = useState(false)
  const [twitchPeriod, setTwitchPeriod] = useState<TwitchPeriod>('all')
  const [twitchShowAll, setTwitchShowAll] = useState(false)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      } else {
        setProfile({
          username: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url
        })
      }

      // Load recent clips (ordered by last edited)
      const { data: clipsData } = await supabase
        .from('clips')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(6)

      if (clipsData) {
        // Generate signed URLs for video thumbnails
        const clipsWithUrls = await Promise.all(
          clipsData.map(async (clip) => {
            if (clip.video_path) {
              const { data: signed } = await supabase.storage
                .from('clips')
                .createSignedUrl(clip.video_path, 3600)
              return { ...clip, signedUrl: signed?.signedUrl }
            }
            return clip
          })
        )
        setRecentClips(clipsWithUrls)
      }

      // Load Twitch connection
      const { data: connectionData } = await supabase
        .from('social_connections')
        .select('id, platform_username, platform_display_name, platform_user_id')
        .eq('user_id', user.id)
        .eq('platform', 'twitch')
        .eq('is_active', true)
        .single()

      if (connectionData) {
        setTwitchConnection(connectionData)
      }

      setLoading(false)
    }

    loadData()
  }, [])

  // Fetch Twitch clips when connection or period changes
  useEffect(() => {
    async function fetchTwitchClips() {
      if (!twitchConnection) return

      setTwitchClipsLoading(true)
      try {
        const limit = twitchShowAll ? 60 : 4
        const response = await fetch(
          `/api/twitch/clips?username=${twitchConnection.platform_username}&limit=${limit}&period=${twitchPeriod}`
        )
        if (response.ok) {
          const data = await response.json()
          setTwitchClips(data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch Twitch clips:', error)
      }
      setTwitchClipsLoading(false)
    }

    fetchTwitchClips()
  }, [twitchConnection, twitchPeriod, twitchShowAll])

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const mainActions = [
    {
      title: 'Create vertical clip',
      description: 'Convert any clip to TikTok, Instagram or YouTube',
      href: '/upload?format=vertical',
      gradient: 'from-purple-500 to-pink-500',
      icon: Smartphone,
    },
    {
      title: 'Create horizontal video',
      description: 'Create a horizontal video for YouTube',
      href: '/upload?format=horizontal',
      gradient: 'from-pink-400 to-orange-400',
      icon: Monitor,
    },
    {
      title: 'ClipGPT: AI Clipping',
      description: 'Let our AI find the best clips from your stream',
      href: '/ai-clipping',
      gradient: 'from-violet-500 to-purple-600',
      icon: Sparkles,
    },
    {
      title: 'Create post',
      description: 'Post or plan directly to TikTok or YouTube',
      href: '/schedule',
      gradient: 'from-emerald-400 to-cyan-400',
      icon: Share2,
    },
  ]

  const quickActions = [
    { label: 'Create a Montage', icon: Film, href: '/montage' },
    { label: 'Create emote', icon: Smile, href: '/emote' },
    { label: 'Create Stream Schedule', icon: Calendar, href: '/stream-schedule' },
    { label: 'Download clips', icon: Download, href: '/clips' },
  ]

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatLastEdited = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Last edited today'
    if (diffDays === 1) return 'Last edited 1 day ago'
    return `Last edited ${diffDays} days ago`
  }

  const formatDaysAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">{profile?.username}</span>! 👋
        </h1>
        <p className="text-zinc-400">How will you climb the ClipFox ladder today? 🚀</p>
      </div>

      {/* Main Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {mainActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${action.gradient} hover:scale-[1.02] transition-transform group`}
          >
            <div className="relative z-10">
              <h3 className="text-xl font-bold text-white mb-1">{action.title}</h3>
              <p className="text-white/80 text-sm">{action.description}</p>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-30 transition">
              <action.icon className="w-24 h-24" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-zinc-800 transition group"
          >
            <action.icon className="w-5 h-5 text-zinc-400 group-hover:text-purple-400 transition" />
            <span className="text-sm font-medium">{action.label}</span>
            <Plus className="w-4 h-4 text-zinc-600 ml-auto" />
          </Link>
        ))}
      </div>

      {/* ClipGPT Projects Section */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Your latest ClipGPT projects
        </h2>
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">No recent ClipGPT projects</h3>
            <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
              Ready to go viral? Drop a Twitch stream link and let AI find the best moments from your broadcast automatically.
            </p>
            <Link href="/ai-clipping">
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-full font-medium transition flex items-center gap-2 mx-auto">
                Create project
                <Plus className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Twitch Clips Section - Only show if connected */}
      {twitchConnection && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
              </svg>
              {twitchConnection.platform_display_name || twitchConnection.platform_username}&apos;s latest Twitch clips
            </h2>
            <select
              value={twitchPeriod}
              onChange={(e) => {
                setTwitchPeriod(e.target.value as TwitchPeriod)
                setTwitchShowAll(false)
              }}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="all">Top All</option>
              <option value="24h">Top 24 hours</option>
              <option value="7d">Top 7 days</option>
              <option value="30d">Top 30 days</option>
            </select>
          </div>

          {twitchClipsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : twitchClips.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {twitchClips.map((clip) => (
                  <a
                    key={clip.id}
                    href={clip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-purple-500/50 transition"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-zinc-800">
                      <img
                        src={clip.thumbnail_url}
                        alt={clip.title}
                        className="w-full h-full object-cover"
                      />
                      {/* Views badge - bottom left */}
                      <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatViews(clip.view_count)}
                      </div>
                      {/* Days ago badge - bottom right */}
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium">
                        {formatDaysAgo(clip.created_at)}
                      </div>
                      {/* Play overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-purple-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <ExternalLink className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    </div>
                    {/* Title */}
                    <div className="p-3">
                      <h3 className="font-medium text-sm truncate">
                        {clip.title}
                      </h3>
                    </div>
                  </a>
                ))}
              </div>
              {/* Show more button */}
              {!twitchShowAll && twitchClips.length >= 4 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setTwitchShowAll(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition"
                  >
                    Show more clips
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">No clips found</h3>
              <p className="text-zinc-500 text-sm">
                {twitchPeriod === 'all'
                  ? "You don't have any Twitch clips yet."
                  : "No clips in the selected time period."}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Recent Clips Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-purple-400">🎬</span>
            {profile?.username}&apos;s latest Editor clips
          </h2>
          <select className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm">
            <option>Recently edited</option>
            <option>Oldest</option>
          </select>
        </div>

        {recentClips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentClips.map((clip) => (
              <Link
                key={clip.id}
                href={`/edit/${clip.id}`}
                className="group bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-zinc-800">
                  {clip.thumbnail_path ? (
                    <img
                      src={clip.thumbnail_path}
                      alt={clip.title || 'Clip'}
                      className="w-full h-full object-cover"
                    />
                  ) : clip.signedUrl ? (
                    <video
                      src={clip.signedUrl}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-12 h-12 text-zinc-600" />
                    </div>
                  )}
                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-medium">
                    {formatDuration(clip.duration)}
                  </div>
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3">
                  <h3 className="font-medium truncate mb-1">
                    {clip.title || 'Untitled Clip'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    {formatLastEdited(clip.updated_at)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800 flex items-center justify-center">
              <Film className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium mb-2">No clips yet</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Upload your first clip to get started!
            </p>
            <Link href="/upload">
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-full font-medium transition flex items-center gap-2 mx-auto">
                Upload clip
                <Plus className="w-4 h-4" />
              </button>
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

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
  Eye,
  MoreHorizontal,
  Play
} from 'lucide-react'

type Clip = {
  id: string
  title: string | null
  video_path: string
  thumbnail_path?: string
  duration?: number
  created_at: string
  status: string
}

type Profile = {
  username: string
  avatar_url?: string
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [recentClips, setRecentClips] = useState<Clip[]>([])
  const [loading, setLoading] = useState(true)

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

      // Load recent clips
      const { data: clipsData } = await supabase
        .from('clips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6)

      if (clipsData) {
        setRecentClips(clipsData)
      }

      setLoading(false)
    }

    loadData()
  }, [])

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
      href: '/dashboard/upload?format=vertical',
      gradient: 'from-purple-500 to-pink-500',
      icon: Smartphone,
    },
    {
      title: 'Create horizontal video',
      description: 'Create a horizontal video for YouTube',
      href: '/dashboard/upload?format=horizontal',
      gradient: 'from-pink-400 to-orange-400',
      icon: Monitor,
    },
    {
      title: 'ClipGPT: AI Clipping',
      description: 'Let our AI find the best clips from your stream',
      href: '/dashboard/ai-clipping',
      gradient: 'from-violet-500 to-purple-600',
      icon: Sparkles,
    },
    {
      title: 'Create post',
      description: 'Post or plan directly to TikTok or YouTube',
      href: '/dashboard/schedule',
      gradient: 'from-emerald-400 to-cyan-400',
      icon: Share2,
    },
  ]

  const quickActions = [
    { label: 'Create a Montage', icon: Film, href: '/dashboard/montage' },
    { label: 'Create emote', icon: Smile, href: '/dashboard/emote' },
    { label: 'Create Stream Schedule', icon: Calendar, href: '/dashboard/stream-schedule' },
    { label: 'Download clips', icon: Download, href: '/dashboard/clips' },
  ]

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    return `${diffDays} days ago`
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
            <Link href="/dashboard/ai-clipping">
              <button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2.5 rounded-full font-medium transition flex items-center gap-2 mx-auto">
                Create project
                <Plus className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Clips Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-purple-400">🎬</span>
            {profile?.username}'s latest clips
          </h2>
          <select className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm">
            <option>Most recent</option>
            <option>Most viewed</option>
            <option>Oldest</option>
          </select>
        </div>

        {recentClips.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentClips.map((clip) => (
              <Link
                key={clip.id}
                href={`/dashboard/edit/${clip.id}`}
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
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      0 views
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTimeAgo(clip.created_at)}
                    </span>
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
            <Link href="/dashboard/upload">
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

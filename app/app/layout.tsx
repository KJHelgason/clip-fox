'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Home,
  Upload,
  FolderOpen,
  Sparkles,
  Calendar,
  Video,
  Settings,
  Bell,
  Link2,
  ChevronDown,
  LogOut,
  Plus,
  CreditCard,
  Zap,
  Download,
  BarChart3
} from 'lucide-react'

type Profile = {
  id: string
  email: string
  username: string
  avatar_url?: string
  role: string
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Helper to redirect to main domain (for production subdomain routing)
  const redirectToMain = (path: string = '/') => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      // If on app subdomain (production), redirect to main domain
      if (hostname.startsWith('app.')) {
        const mainDomain = hostname.replace('app.', '')
        const port = window.location.port
        const portSuffix = port ? `:${port}` : ''
        window.location.href = `${window.location.protocol}//${mainDomain}${portSuffix}${path}`
      } else {
        // Local dev or already on main domain
        router.push(path)
      }
    }
  }

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        redirectToMain('/')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      } else {
        setProfile({
          id: user.id,
          email: user.email || '',
          username: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url,
          role: 'user'
        })
      }
      setLoading(false)
    }

    loadProfile()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    redirectToMain('/')
  }

  // Note: With subdomain routing, paths are now /account, /clips, etc. instead of /dashboard/account
  const navItems = [
    { href: '/', icon: Home, label: 'Start', exact: true },
    { href: '/upload', icon: Upload, label: 'Upload Clip' },
    { href: '/clips', icon: FolderOpen, label: 'My Videos' },
    { href: '/quick-edit', icon: Zap, label: 'Quick Edit' },
    { href: '/clipgpt', icon: Sparkles, label: 'ClipGPT: AI Clipping' },
    { href: '/publish', icon: Calendar, label: 'Share & Schedule' },
    { href: '/download', icon: Download, label: 'Clip Downloader' },
    { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  ]

  const bottomNavItems = [
    { href: '/settings/billing', icon: CreditCard, label: 'Billing & Plans' },
    { href: '/connections', icon: Link2, label: 'Social Connections' },
  ]

  // Helper to check if a nav item is active
  // pathname comes in as /app/... but we want to match against /...
  const getAppPath = () => {
    // Remove /app prefix if present for matching
    return pathname.replace(/^\/app/, '') || '/'
  }

  const isActive = (href: string, exact?: boolean) => {
    const appPath = getAppPath()
    return exact ? appPath === href : appPath.startsWith(href)
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center font-bold text-sm">
              CF
            </div>
            <span className="font-bold text-lg">ClipFox</span>
            <span className="text-xs bg-purple-600/20 text-purple-400 px-1.5 py-0.5 rounded">Beta</span>
          </Link>
        </div>

        {/* Create New Button */}
        <div className="p-4">
          <Link href="/upload">
            <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Create new
            </button>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? 'bg-purple-600/20 text-purple-400'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-zinc-800 px-3 py-3 space-y-1">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* User Profile */}
        <div className="border-t border-zinc-800 p-3">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="flex-1 text-left text-sm font-medium truncate">
                {profile?.username}
              </span>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Menu Dropdown */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-zinc-800 rounded-lg border border-zinc-700 shadow-xl overflow-hidden">
                <Link
                  href="/account"
                  className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-zinc-700 transition"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Account Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

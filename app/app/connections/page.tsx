'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SocialPublishPlatform } from '@/lib/types'
import {
  Youtube,
  Instagram,
  Trash2,
  RefreshCw,
  Plus,
  AlertCircle,
  Check,
  ExternalLink,
  Shield
} from 'lucide-react'

type SocialConnection = {
  id: string
  platform: SocialPublishPlatform
  platform_user_id?: string
  platform_username?: string
  platform_display_name?: string
  platform_avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

type AuthProvider = 'google' | 'twitch' | 'discord'

// Platform configuration
const PLATFORMS: {
  id: SocialPublishPlatform
  name: string
  description: string
  color: string
  bgColor: string
  available: boolean
  comingSoon?: boolean
}[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Post Shorts and videos to your YouTube channel',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    available: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Share clips directly to your TikTok profile',
    color: 'text-white',
    bgColor: 'bg-zinc-800',
    available: true,
  },
  {
    id: 'twitch',
    name: 'Twitch',
    description: 'Import clips and manage your Twitch content',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    available: true,
  },
  {
    id: 'kick',
    name: 'Kick',
    description: 'Connect your Kick channel for clips',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    available: false,
    comingSoon: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Post Reels to your Instagram account',
    color: 'text-pink-400',
    bgColor: 'bg-gradient-to-br from-purple-500/10 to-pink-500/10',
    available: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Share videos to your Facebook page',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    available: false,
    comingSoon: true,
  },
]

// Platform icon component
function PlatformIcon({ platform, className = 'w-5 h-5' }: { platform: SocialPublishPlatform, className?: string }) {
  switch (platform) {
    case 'youtube':
      return <Youtube className={`${className} text-red-500`} />
    case 'tiktok':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
        </svg>
      )
    case 'instagram':
      return <Instagram className={`${className} text-pink-400`} />
    case 'twitch':
      return (
        <svg className={`${className} text-purple-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
        </svg>
      )
    case 'kick':
      return (
        <svg className={`${className} text-green-400`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M1.333 0v24h10.666V12h4l4 12h4L19.333 12 24 0h-4l-4 12V0z" />
        </svg>
      )
    case 'twitter':
      return (
        <svg className={`${className}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )
    case 'facebook':
      return (
        <svg className={`${className} text-blue-500`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )
    default:
      return null
  }
}

export default function SocialConnectionsPage() {
  const router = useRouter()
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null)
  const [authProviderUsername, setAuthProviderUsername] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<SocialPublishPlatform | null>(null)
  const [showConnectModal, setShowConnectModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      // Check auth provider (how user signed up)
      const provider = user.app_metadata?.provider as AuthProvider | undefined
      const providers = user.app_metadata?.providers as string[] | undefined

      if (provider) {
        setAuthProvider(provider)
      }

      // Get username from auth metadata for primary provider
      if (provider === 'twitch') {
        setAuthProviderUsername(user.user_metadata?.user_name || user.user_metadata?.name || null)
      } else if (provider === 'google') {
        setAuthProviderUsername(user.user_metadata?.name || user.email?.split('@')[0] || null)
      } else if (provider === 'discord') {
        setAuthProviderUsername(user.user_metadata?.full_name || user.user_metadata?.name || null)
      }

      // Load social connections
      const { data: connectionsData, error } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading connections:', error)
      } else if (connectionsData) {
        setConnections(connectionsData)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (platform: SocialPublishPlatform) => {
    setConnecting(platform)

    // For now, show a placeholder since OAuth is not yet implemented
    // In production, this would initiate the OAuth flow
    alert(`Connect ${platform} - OAuth integration coming soon!\n\nThis will redirect you to ${platform}'s authorization page to connect your account.`)

    setConnecting(null)
    setShowConnectModal(false)
  }

  const handleDisconnect = async (connection: SocialConnection) => {
    // Check if this is the auth provider account
    const isAuthAccount = authProvider === connection.platform

    if (isAuthAccount) {
      const confirmed = window.confirm(
        `You signed in with ${connection.platform}. Disconnecting this account will not affect your login, ` +
        `but you won't be able to publish content to it until you reconnect.\n\nContinue?`
      )
      if (!confirmed) return
    } else {
      const confirmed = window.confirm(
        `Are you sure you want to disconnect ${connection.platform_username || connection.platform}?`
      )
      if (!confirmed) return
    }

    setDisconnecting(connection.id)

    try {
      const { error } = await supabase
        .from('social_connections')
        .delete()
        .eq('id', connection.id)

      if (error) throw error

      setConnections(prev => prev.filter(c => c.id !== connection.id))
    } catch (err) {
      console.error('Error disconnecting:', err)
      alert('Failed to disconnect account. Please try again.')
    } finally {
      setDisconnecting(null)
    }
  }

  const handleRefresh = async (connection: SocialConnection) => {
    // Placeholder for token refresh
    alert(`Refreshing ${connection.platform} connection...\n\nThis would refresh the OAuth tokens for this account.`)
  }

  const getConnectedPlatform = (platformId: SocialPublishPlatform) => {
    return connections.find(c => c.platform === platformId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Social Connections</h1>
        <p className="text-zinc-400">
          Connect your social media accounts to publish clips directly from ClipFox.
        </p>
      </div>

      {/* Auth Provider Notice */}
      {authProvider && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-start gap-3">
          <Shield className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-purple-300">
              Signed in with {authProvider.charAt(0).toUpperCase() + authProvider.slice(1)}
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              {authProviderUsername && (
                <span>Account: <span className="text-white">{authProviderUsername}</span> • </span>
              )}
              Your login is managed separately from content publishing connections.
            </p>
          </div>
        </div>
      )}

      {/* Connected Accounts Section */}
      {connections.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            Connected Accounts ({connections.length})
          </h2>
          <div className="space-y-3">
            {connections.map(connection => {
              const platformConfig = PLATFORMS.find(p => p.id === connection.platform)
              const isAuthAccount = authProvider === connection.platform

              return (
                <div
                  key={connection.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar / Icon */}
                    <div className="relative">
                      {connection.platform_avatar_url ? (
                        <img
                          src={connection.platform_avatar_url}
                          alt={connection.platform_username || connection.platform}
                          className="w-12 h-12 rounded-full"
                          width={48}
                          height={48}
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full ${platformConfig?.bgColor || 'bg-zinc-800'} flex items-center justify-center`}>
                          <PlatformIcon platform={connection.platform} className="w-6 h-6" />
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
                        <PlatformIcon platform={connection.platform} className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {connection.platform_display_name || connection.platform_username || connection.platform}
                        </p>
                        {isAuthAccount && (
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">
                            Login Account
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500">
                        {connection.platform_username && `@${connection.platform_username} • `}
                        {platformConfig?.name}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Status */}
                    <span className="flex items-center gap-1.5 text-sm text-green-400 mr-2">
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                      Connected
                    </span>

                    {/* Refresh Button */}
                    <button
                      onClick={() => handleRefresh(connection)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition"
                      aria-label={`Refresh ${connection.platform} connection`}
                      title="Refresh connection"
                    >
                      <RefreshCw className="w-4 h-4 text-zinc-400" />
                    </button>

                    {/* Disconnect Button */}
                    <button
                      onClick={() => handleDisconnect(connection)}
                      disabled={disconnecting === connection.id}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition disabled:opacity-50"
                      aria-label={`Disconnect ${connection.platform}`}
                      title="Disconnect account"
                    >
                      {disconnecting === connection.id ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Platforms Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-zinc-400" />
          {connections.length > 0 ? 'Connect More Accounts' : 'Connect Your Accounts'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PLATFORMS.map(platform => {
            const connected = getConnectedPlatform(platform.id)

            return (
              <div
                key={platform.id}
                className={`bg-zinc-900 border rounded-xl p-4 transition ${
                  connected
                    ? 'border-green-500/30 opacity-60'
                    : platform.available
                    ? 'border-zinc-800 hover:border-zinc-700'
                    : 'border-zinc-800 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${platform.bgColor} flex items-center justify-center`}>
                      <PlatformIcon platform={platform.id} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{platform.name}</h3>
                        {platform.comingSoon && (
                          <span className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full">
                            Coming Soon
                          </span>
                        )}
                        {connected && (
                          <Check className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <p className="text-sm text-zinc-500 mt-0.5">{platform.description}</p>
                    </div>
                  </div>
                </div>

                {!connected && platform.available && (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {connecting === platform.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Connect {platform.name}
                      </>
                    )}
                  </button>
                )}

                {connected && (
                  <div className="mt-4 text-center text-sm text-green-400">
                    Already connected
                  </div>
                )}

                {!platform.available && !platform.comingSoon && (
                  <div className="mt-4 text-center text-sm text-zinc-500">
                    Not available
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-zinc-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium mb-1">How connections work</h3>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• <strong>Login accounts</strong> (Twitch, Google, Discord) are used to sign in to ClipFox</li>
              <li>• <strong>Publishing accounts</strong> allow you to post clips directly to each platform</li>
              <li>• You can connect multiple accounts for different purposes</li>
              <li>• Disconnecting a publishing account won&apos;t affect your ClipFox login</li>
              <li>• Tokens are securely stored and automatically refreshed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

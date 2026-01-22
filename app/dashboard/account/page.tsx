'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Settings,
  CreditCard,
  FileText,
  Users,
  Edit2,
  Check,
  X,
  Trash2,
  Plus,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Crown,
  Zap,
  Youtube,
  Instagram,
  MessageCircle
} from 'lucide-react'

type Profile = {
  id: string
  email: string
  username: string
  avatar_url?: string
  twitch_name?: string
}

type SocialConnection = {
  id: string
  platform: string
  platform_username: string
  avatar_url?: string
  connected_at: string
}

type Template = {
  id: string
  name: string
  preview_text: string
  created_at: string
}

type Subscription = {
  id: string
  plan_id: string
  status: string
  billing_interval: string
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
}

type Invoice = {
  id: string
  date: string
  amount: number
  status: string
  receipt_url?: string
}

const tabs = [
  { id: 'account', label: 'Account Settings', icon: Settings },
  { id: 'billing', label: 'Plans & Billing', icon: CreditCard },
  { id: 'templates', label: 'My Templates', icon: FileText },
  { id: 'partners', label: 'Brand partners', icon: Users },
]

const planDetails: Record<string, { name: string; icon: typeof Zap; color: string }> = {
  free: { name: 'Free', icon: Zap, color: 'text-zinc-400' },
  pro: { name: 'Pro', icon: Sparkles, color: 'text-purple-400' },
  business: { name: 'Business', icon: Crown, color: 'text-yellow-400' },
}

export default function AccountPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('account')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const [colorMode, setColorMode] = useState('device')
  const [saveNewVideo, setSaveNewVideo] = useState(false)

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

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setNewUsername(profileData.username)
      } else {
        setProfile({
          id: user.id,
          email: user.email || '',
          username: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url,
        })
        setNewUsername(user.user_metadata?.name || user.email?.split('@')[0] || 'User')
      }

      // Load social connections
      const { data: connectionsData } = await supabase
        .from('social_connections')
        .select('*')
        .eq('user_id', user.id)

      if (connectionsData) {
        setConnections(connectionsData)
      }

      // Load templates
      const { data: templatesData } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (templatesData) {
        setTemplates(templatesData)
      }

      // Load subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (subData) {
        setSubscription(subData)
      }

      // Load mock invoices (in production, fetch from Stripe)
      setInvoices([
        { id: '1', date: '2026-01-08', amount: 15.00, status: 'paid' },
        { id: '2', date: '2025-12-08', amount: 15.00, status: 'paid' },
        { id: '3', date: '2025-11-08', amount: 27.00, status: 'paid' },
      ])

    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUsername = async () => {
    if (!profile || !newUsername.trim()) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: newUsername.trim() })
        .eq('id', profile.id)

      if (error) throw error

      setProfile(prev => prev ? { ...prev, username: newUsername.trim() } : null)
      setEditingUsername(false)
    } catch (err) {
      console.error('Error updating username:', err)
      alert('Failed to update username')
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }
    alert('Account deletion is not implemented yet.')
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })
      const { url, error } = await response.json()
      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err) {
      console.error('Portal error:', err)
      alert('Failed to open billing portal.')
    } finally {
      setPortalLoading(false)
    }
  }

  const handleConnectSocial = (platform: string) => {
    alert(`Connect ${platform} - OAuth flow not implemented`)
  }

  const handleDisconnectSocial = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return

    try {
      const { error } = await supabase
        .from('social_connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setConnections(prev => prev.filter(c => c.id !== connectionId))
    } catch (err) {
      console.error('Error disconnecting:', err)
      alert('Failed to disconnect account')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error

      setTemplates(prev => prev.filter(t => t.id !== templateId))
    } catch (err) {
      console.error('Error deleting template:', err)
      alert('Failed to delete template')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getPlatformIcon = (platform: string) => {
    const iconClass = "w-4 h-4"
    switch (platform.toLowerCase()) {
      case 'youtube': return <Youtube className={`${iconClass} text-red-500`} />
      case 'tiktok': return <span className={`${iconClass} font-bold`}>♪</span>
      case 'instagram': return <Instagram className={`${iconClass} text-pink-500`} />
      case 'discord': return <MessageCircle className={`${iconClass} text-indigo-400`} />
      case 'twitter': return <span className={`${iconClass} font-bold`}>𝕏</span>
      case 'twitch': return <span className={`${iconClass} font-bold text-purple-400`}>⌘</span>
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    )
  }

  const currentPlan = planDetails[subscription?.plan_id || 'free']
  const PlanIcon = currentPlan.icon

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-zinc-900/50 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Account Settings Tab */}
      {activeTab === 'account' && (
        <div className="space-y-8">
          <h1 className="text-2xl font-bold">Account Settings</h1>

          {/* Account Info Card */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-6">
            {/* Twitch Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Twitch name</label>
              <p className="text-xs text-zinc-500 mb-2">This is used to suggest clips on your personal home page</p>
              <div className="flex items-center gap-2">
                {editingUsername ? (
                  <>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                      name="twitch-name"
                      autoComplete="username"
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition"
                      aria-label="Save username"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingUsername(false)
                        setNewUsername(profile?.username || '')
                      }}
                      className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
                      aria-label="Cancel editing"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                      {profile?.twitch_name || profile?.username}
                    </div>
                    <button
                      onClick={() => setEditingUsername(true)}
                      className="p-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition"
                      aria-label="Edit username"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-1">Email address</label>
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-400">
                {profile?.email}
              </div>
            </div>

            {/* UI Settings */}
            <div>
              <label className="block text-sm font-medium mb-3">UI Settings</label>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-400">Color mode</span>
                <select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
                  name="color-mode"
                  aria-label="Color mode"
                >
                  <option value="device">Device</option>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </div>
            </div>

            {/* Export Preference */}
            <div>
              <label className="block text-sm font-medium mb-3">Export preference</label>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-medium">Save as new video</p>
                    <p className="text-xs text-zinc-500">Re-exports will replace the old video.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSaveNewVideo(!saveNewVideo)}
                  className={`w-12 h-6 rounded-full transition ${saveNewVideo ? 'bg-purple-600' : 'bg-zinc-700'}`}
                  role="switch"
                  aria-checked={saveNewVideo}
                  aria-label="Toggle save as new video"
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${saveNewVideo ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium mb-3">Notifications</label>
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">ClipGPT e-mail notification</p>
                    <p className="text-xs text-zinc-500">By upgrading, you can automatically generate clips from your stream with ClipGPT!</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition">
                  Learn more
                </button>
              </div>
            </div>
          </div>

          {/* Social Media Connections */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Social media connections</h2>
              <button
                onClick={() => handleConnectSocial('new')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
              >
                Connect new account
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {connections.length === 0 ? (
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-8 text-center">
                  <p className="text-zinc-400">No social accounts connected yet</p>
                  <p className="text-sm text-zinc-500 mt-1">Connect your accounts to publish clips directly</p>
                </div>
              ) : (
                connections.map(connection => (
                  <div
                    key={connection.id}
                    className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {connection.avatar_url ? (
                          <img
                            src={connection.avatar_url}
                            alt={connection.platform_username}
                            className="w-12 h-12 rounded-full"
                            width={48}
                            height={48}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                            {getPlatformIcon(connection.platform)}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center">
                          {getPlatformIcon(connection.platform)}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium">{connection.platform_username}</p>
                        <p className="text-xs text-zinc-500">{connection.platform}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-sm text-green-400">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        Connected
                      </span>
                      <button
                        onClick={() => {}}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition"
                        aria-label="Refresh connection"
                      >
                        <RefreshCw className="w-4 h-4 text-zinc-400" />
                      </button>
                      <button
                        onClick={() => handleDisconnectSocial(connection.id)}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition"
                        aria-label="Disconnect account"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h2 className="text-xl font-bold mb-4">Danger zone</h2>
            <div className="bg-zinc-900 rounded-xl border border-red-900/50 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Delete my account</p>
                <p className="text-sm text-zinc-500">Once you delete your account, there is no going back. Please be certain.</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
              >
                Delete my account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans & Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-8">
          <h1 className="text-2xl font-bold">Plans & Billing</h1>

          {/* Current Subscription */}
          <div>
            <h2 className="text-lg font-medium mb-4">Your subscriptions</h2>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold">ClipFox {currentPlan.name}</span>
                  <PlanIcon className={`w-5 h-5 ${currentPlan.color}`} />
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="text-sm text-purple-400 hover:text-purple-300 transition"
                  >
                    Manage subscription
                  </button>
                  {subscription?.status === 'active' && (
                    <button
                      onClick={handleManageSubscription}
                      className="text-sm text-zinc-400 hover:text-red-400 transition"
                    >
                      Cancel subscription
                    </button>
                  )}
                </div>
              </div>
              {subscription && (
                <p className="text-sm text-zinc-400 mt-2">
                  Your plan renews on {formatDate(subscription.current_period_end)}
                </p>
              )}
            </div>
          </div>

          {/* Settings */}
          <div>
            <h2 className="text-lg font-medium text-zinc-400 mb-4">Settings</h2>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Billing Cycle</p>
                <p className="text-sm text-zinc-400">
                  Currently set to <span className="font-medium text-white">{subscription?.billing_interval || 'monthly'}</span> billing
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                className="text-sm text-purple-400 hover:text-purple-300 transition"
              >
                Change billing cycle
              </button>
            </div>
          </div>

          {/* Billing History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium">Billing history</h2>
                {subscription && (
                  <p className="text-sm text-zinc-400">
                    Your next payment is due on {formatDate(subscription.current_period_end)}
                  </p>
                )}
              </div>
              <button
                onClick={handleManageSubscription}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition"
              >
                Update payment information
              </button>
            </div>

            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-zinc-400">Amount</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-zinc-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="border-b border-zinc-800 last:border-0">
                      <td className="px-4 py-3 text-sm">{formatDate(invoice.date)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="flex items-center gap-2">
                          ${invoice.amount.toFixed(2)}
                          {invoice.status === 'paid' && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="px-3 py-1.5 border border-zinc-700 rounded-lg text-sm hover:bg-zinc-800 transition flex items-center gap-2 ml-auto">
                          <ExternalLink className="w-3 h-3" />
                          Download receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* My Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">My Templates</h1>

          {templates.length === 0 ? (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
              <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No templates saved yet</p>
              <p className="text-sm text-zinc-500 mt-1">Save your edit configurations as templates to reuse them later</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(template => (
                <div
                  key={template.id}
                  className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-sm font-medium text-purple-400 min-w-[200px]">
                      {template.name}
                    </span>
                    <span className="px-3 py-1 bg-zinc-800 rounded text-sm">
                      {template.preview_text || template.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition"
                    aria-label="Delete template"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Brand Partners Tab */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Brand partners</h1>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400">No brand partnerships yet</p>
            <p className="text-sm text-zinc-500 mt-1">Partner with brands to get sponsored templates and features</p>
            <button className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition">
              Learn about partnerships
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

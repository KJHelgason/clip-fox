'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  CreditCard,
  Calendar,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Check,
  Sparkles,
  Crown,
  Zap,
  ArrowLeft
} from 'lucide-react'
import { Subscription, SubscriptionPlan, UsageLog } from '@/lib/types'

type PlanDetails = {
  id: string
  name: string
  icon: typeof Zap
  color: string
}

const planDetails: Record<string, PlanDetails> = {
  free: { id: 'free', name: 'Free', icon: Zap, color: 'text-zinc-400' },
  pro: { id: 'pro', name: 'Pro', icon: Sparkles, color: 'text-purple-400' },
  business: { id: 'business', name: 'Business', icon: Crown, color: 'text-yellow-400' },
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [usage, setUsage] = useState({ exports: 0, limit: 3 })
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (subData) {
        setSubscription(subData)

        // Load plan details
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', subData.plan_id)
          .single()

        if (planData) {
          setPlan(planData)
          const limits = planData.limits as { exports_per_month?: number }
          setUsage(prev => ({
            ...prev,
            limit: limits?.exports_per_month ?? 3,
          }))
        }
      }

      // Load this month's usage
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: usageData, error: usageError } = await supabase
        .from('usage_logs')
        .select('credits_used')
        .eq('user_id', user.id)
        .eq('action_type', 'export')
        .gte('created_at', startOfMonth.toISOString())

      if (usageData && !usageError) {
        const totalExports = usageData.reduce((sum, log) => sum + (log.credits_used || 1), 0)
        setUsage(prev => ({ ...prev, exports: totalExports }))
      }
    } catch (err) {
      console.error('Error loading billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      const { url, error } = await response.json()

      if (error) {
        console.error('Portal error:', error)
        alert('Failed to open billing portal. Please try again.')
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Portal error:', err)
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
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
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-white transition flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold">Billing & Subscription</h1>
          <p className="text-zinc-400 mt-1">Manage your subscription and billing details</p>
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center ${currentPlan.color}`}>
              <PlanIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{currentPlan.name} Plan</h2>
                {subscription?.status === 'active' && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                    Active
                  </span>
                )}
                {subscription?.cancel_at_period_end && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                    Canceling
                  </span>
                )}
              </div>
              <p className="text-zinc-400 text-sm mt-1">
                {plan?.description || 'Get started with basic features'}
              </p>
            </div>
          </div>

          <Link
            href="/pricing"
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
          >
            {subscription?.plan_id === 'free' ? 'Upgrade' : 'Change Plan'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Usage Stats */}
        <div className="mt-6 pt-6 border-t border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">This Month&apos;s Usage</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400">Exports Used</div>
              <div className="text-2xl font-bold mt-1">
                {usage.exports}
                <span className="text-sm font-normal text-zinc-500">
                  /{usage.limit === -1 ? '∞' : usage.limit}
                </span>
              </div>
              {usage.limit !== -1 && (
                <div className="mt-2 h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full transition-all"
                    style={{ width: `${Math.min((usage.exports / usage.limit) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400">Max Resolution</div>
              <div className="text-2xl font-bold mt-1">
                {(plan?.limits as { max_resolution?: string })?.max_resolution || '720p'}
              </div>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4">
              <div className="text-sm text-zinc-400">Storage</div>
              <div className="text-2xl font-bold mt-1">
                {(plan?.limits as { storage_gb?: number })?.storage_gb || 1}
                <span className="text-sm font-normal text-zinc-500"> GB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Details */}
      {subscription && subscription.plan_id !== 'free' && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4">Billing Details</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-zinc-400" />
                <span className="text-zinc-400">Billing Period</span>
              </div>
              <span className="capitalize">{subscription.billing_interval}</span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-zinc-400" />
                <span className="text-zinc-400">Next Payment</span>
              </div>
              <span>
                {subscription.cancel_at_period_end
                  ? 'No upcoming payment'
                  : formatDate(subscription.current_period_end)}
              </span>
            </div>

            {subscription.cancel_at_period_end && (
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-500">Subscription Canceling</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Your subscription will end on {formatDate(subscription.current_period_end)}.
                    You&apos;ll be downgraded to the Free plan after that.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="mt-6 flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition disabled:opacity-50"
          >
            {portalLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                Opening portal...
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Manage Subscription in Stripe
              </>
            )}
          </button>
        </div>
      )}

      {/* Feature Comparison */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Your Plan Features</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {plan?.features?.map((feature: string, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-zinc-300">{feature}</span>
            </div>
          ))}
        </div>

        {subscription?.plan_id !== 'business' && (
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm">
              Want more features?{' '}
              <Link href="/pricing" className="text-purple-400 hover:text-purple-300">
                Upgrade your plan
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

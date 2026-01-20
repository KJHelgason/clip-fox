import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Subscription,
  SubscriptionPlan,
  PlanLimits,
  PlanId,
  UsageLogAction,
} from '@/lib/types'

type UseSubscriptionReturn = {
  subscription: Subscription | null
  plan: SubscriptionPlan | null
  limits: PlanLimits | null
  loading: boolean
  error: Error | null
  // Feature checks
  canExport: () => Promise<boolean>
  canUseAICaptions: () => boolean
  canUseClipGPT: () => boolean
  canUseSocialPublishing: () => boolean
  canUseAutoClip: () => boolean
  canUseAnalytics: () => boolean
  hasWatermark: () => boolean
  getMaxResolution: () => '720p' | '1080p' | '1440p' | '4k'
  getExportsRemaining: () => Promise<number>
  // Usage tracking
  logUsage: (actionType: UsageLogAction, resourceId?: string, metadata?: Record<string, unknown>) => Promise<void>
  // Refresh
  refresh: () => Promise<void>
}

// Default limits for free plan
const DEFAULT_LIMITS: PlanLimits = {
  exports_per_month: 3,
  max_resolution: '720p',
  watermark: true,
  ai_captions: false,
  clipgpt: false,
  social_publishing: false,
  storage_gb: 1,
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [limits, setLimits] = useState<PlanLimits | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const loadSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setUserId(user.id)

      // Load subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (subError && subError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" - that's ok, they're on free plan
        throw subError
      }

      const currentSub = subData || {
        id: '',
        user_id: user.id,
        plan_id: 'free' as PlanId,
        status: 'active',
        billing_interval: 'monthly',
        cancel_at_period_end: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setSubscription(currentSub)

      // Load plan details
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', currentSub.plan_id)
        .single()

      if (planError) {
        console.error('Error loading plan:', planError)
        // Use default free plan limits
        setLimits(DEFAULT_LIMITS)
      } else if (planData) {
        setPlan(planData)
        setLimits(planData.limits as PlanLimits)
      }
    } catch (err) {
      console.error('Error loading subscription:', err)
      setError(err instanceof Error ? err : new Error('Failed to load subscription'))
      setLimits(DEFAULT_LIMITS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSubscription()
  }, [loadSubscription])

  // Get current month's usage count for a specific action
  const getMonthlyUsage = useCallback(async (actionType: UsageLogAction): Promise<number> => {
    if (!userId) return 0

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('usage_logs')
      .select('credits_used')
      .eq('user_id', userId)
      .eq('action_type', actionType)
      .gte('created_at', startOfMonth.toISOString())

    if (error) {
      console.error('Error getting usage:', error)
      return 0
    }

    return data?.reduce((sum, log) => sum + (log.credits_used || 1), 0) || 0
  }, [userId])

  // Check if user can export
  const canExport = useCallback(async (): Promise<boolean> => {
    const currentLimits = limits || DEFAULT_LIMITS

    // -1 means unlimited
    if (currentLimits.exports_per_month === -1) return true

    const used = await getMonthlyUsage('export')
    return used < currentLimits.exports_per_month
  }, [limits, getMonthlyUsage])

  // Get remaining exports
  const getExportsRemaining = useCallback(async (): Promise<number> => {
    const currentLimits = limits || DEFAULT_LIMITS

    // -1 means unlimited
    if (currentLimits.exports_per_month === -1) return Infinity

    const used = await getMonthlyUsage('export')
    return Math.max(0, currentLimits.exports_per_month - used)
  }, [limits, getMonthlyUsage])

  // Feature checks
  const canUseAICaptions = useCallback((): boolean => {
    return limits?.ai_captions || false
  }, [limits])

  const canUseClipGPT = useCallback((): boolean => {
    return limits?.clipgpt || false
  }, [limits])

  const canUseSocialPublishing = useCallback((): boolean => {
    return limits?.social_publishing || false
  }, [limits])

  const canUseAutoClip = useCallback((): boolean => {
    return limits?.auto_clip || false
  }, [limits])

  const canUseAnalytics = useCallback((): boolean => {
    return limits?.analytics || false
  }, [limits])

  const hasWatermark = useCallback((): boolean => {
    return limits?.watermark ?? true
  }, [limits])

  const getMaxResolution = useCallback((): '720p' | '1080p' | '1440p' | '4k' => {
    return limits?.max_resolution || '720p'
  }, [limits])

  // Log usage
  const logUsage = useCallback(async (
    actionType: UsageLogAction,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    if (!userId) return

    const { error } = await supabase
      .from('usage_logs')
      .insert({
        user_id: userId,
        action_type: actionType,
        resource_id: resourceId,
        metadata: metadata || {},
        credits_used: 1,
      })

    if (error) {
      console.error('Error logging usage:', error)
    }
  }, [userId])

  return {
    subscription,
    plan,
    limits,
    loading,
    error,
    canExport,
    canUseAICaptions,
    canUseClipGPT,
    canUseSocialPublishing,
    canUseAutoClip,
    canUseAnalytics,
    hasWatermark,
    getMaxResolution,
    getExportsRemaining,
    logUsage,
    refresh: loadSubscription,
  }
}

// Helper hook for checking a single feature
export function useCanAccessFeature(feature: keyof PlanLimits): boolean {
  const { limits, loading } = useSubscription()

  if (loading || !limits) return false

  const value = limits[feature]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return false
}

// Helper hook for upgrade prompts
export function useUpgradePrompt(): {
  shouldShowUpgrade: boolean
  requiredPlan: PlanId
  message: string
} {
  const { subscription, limits } = useSubscription()

  // If they're on free and have used all exports
  if (subscription?.plan_id === 'free') {
    return {
      shouldShowUpgrade: true,
      requiredPlan: 'pro',
      message: 'Upgrade to Pro for more exports and no watermark',
    }
  }

  // If they're on Pro and want ClipGPT/social publishing
  if (subscription?.plan_id === 'pro' && (!limits?.clipgpt || !limits?.social_publishing)) {
    return {
      shouldShowUpgrade: false, // Don't nag Pro users unless they try to use Business features
      requiredPlan: 'business',
      message: 'Upgrade to Business for ClipGPT and social publishing',
    }
  }

  return {
    shouldShowUpgrade: false,
    requiredPlan: subscription?.plan_id || 'free',
    message: '',
  }
}

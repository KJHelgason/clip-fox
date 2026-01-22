import Stripe from 'stripe'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// Pricing configuration
export const STRIPE_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    price_monthly: 0,
    price_yearly: 0,
    stripe_price_id_monthly: null,
    stripe_price_id_yearly: null,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Perfect for growing creators',
    price_monthly: 1200, // $12.00
    price_yearly: 9600, // $96.00 ($8/mo)
    stripe_price_id_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripe_price_id_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For professional content creators',
    price_monthly: 2900, // $29.00
    price_yearly: 23200, // $232.00 (~$19.33/mo)
    stripe_price_id_monthly: process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    stripe_price_id_yearly: process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID,
  },
} as const

export type StripePlanId = keyof typeof STRIPE_PLANS

// Helper to get the price ID for a plan and interval
export function getStripePriceId(planId: StripePlanId, interval: 'monthly' | 'yearly'): string | null {
  const plan = STRIPE_PLANS[planId]
  return interval === 'monthly' ? plan.stripe_price_id_monthly ?? null : plan.stripe_price_id_yearly ?? null
}

// Format price for display
export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

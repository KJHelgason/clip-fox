import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe, getStripePriceId, STRIPE_PLANS } from '@/lib/stripe'
import type { StripePlanId } from '@/lib/stripe'

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { planId, interval } = await req.json() as {
      planId: StripePlanId
      interval: 'monthly' | 'yearly'
    }

    // Validate plan
    if (!planId || !STRIPE_PLANS[planId]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (planId === 'free') {
      return NextResponse.json({ error: 'Cannot checkout for free plan' }, { status: 400 })
    }

    // Get user from auth header/cookie
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

    // Get user session from Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create Stripe customer
    let customerId: string

    // Check if user already has a subscription with a Stripe customer ID
    const { data: existingSub } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id

      // Update or create subscription record with customer ID
      await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          plan_id: 'free',
          status: 'active',
        }, {
          onConflict: 'user_id',
        })
    }

    // Get the Stripe price ID for the selected plan and interval
    const priceId = getStripePriceId(planId, interval)

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured for this plan. Please contact support.' },
        { status: 400 }
      )
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: {
          plan_id: planId,
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        plan_id: planId,
        interval,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

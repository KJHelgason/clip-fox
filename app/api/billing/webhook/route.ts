import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

// Create admin Supabase client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Disable body parsing, we need the raw body for webhook signature verification
export const dynamic = 'force-dynamic'

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const planId = subscription.metadata.plan_id || 'pro'

  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
  const userId = customer.metadata.supabase_user_id

  if (!userId) {
    console.error('No user ID found for customer:', customerId)
    return
  }

  // Update subscription in database
  await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_id: planId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status === 'trialing' ? 'trialing' : 'active',
      billing_interval: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    }, {
      onConflict: 'user_id',
    })

  console.log(`Subscription created for user ${userId}: ${planId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
  const userId = customer.metadata.supabase_user_id

  if (!userId) {
    console.error('No user ID found for customer:', customerId)
    return
  }

  // Determine the plan from the price
  let planId = subscription.metadata.plan_id || 'pro'
  const priceId = subscription.items.data[0]?.price?.id

  // Map price ID to plan (you may want to use a lookup table)
  if (priceId) {
    if (priceId.includes('business')) planId = 'business'
    else if (priceId.includes('pro')) planId = 'pro'
  }

  // Map Stripe status to our status
  let status: string = 'active'
  switch (subscription.status) {
    case 'active':
      status = 'active'
      break
    case 'trialing':
      status = 'trialing'
      break
    case 'past_due':
      status = 'past_due'
      break
    case 'canceled':
      status = 'canceled'
      break
    case 'incomplete':
    case 'incomplete_expired':
      status = 'incomplete'
      break
    default:
      status = 'active'
  }

  // Update subscription in database
  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan_id: planId,
      status,
      billing_interval: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  console.log(`Subscription updated for user ${userId}: ${planId} (${status})`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string

  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
  const userId = customer.metadata.supabase_user_id

  if (!userId) {
    console.error('No user ID found for customer:', customerId)
    return
  }

  // Downgrade to free plan
  await supabaseAdmin
    .from('subscriptions')
    .update({
      plan_id: 'free',
      status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  console.log(`Subscription deleted for user ${userId}, downgraded to free`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Get user ID from customer metadata
  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer
  const userId = customer.metadata.supabase_user_id

  if (!userId) {
    console.error('No user ID found for customer:', customerId)
    return
  }

  // Update status to past_due
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  console.log(`Payment failed for user ${userId}`)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      case 'invoice.paid':
        // Subscription renewed successfully, update period dates
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
          await handleSubscriptionUpdated(subscription)
        }
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

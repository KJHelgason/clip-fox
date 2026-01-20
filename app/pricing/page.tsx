'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, Sparkles, ChevronRight } from 'lucide-react'

type BillingInterval = 'monthly' | 'yearly'

const plans = [
  {
    id: 'silver',
    name: 'Silver',
    description: 'The essentials for creating and posting clips',
    price_monthly: 7.77,
    price_yearly: 62.16, // ~$5.18/mo
    features: [
      { name: 'Export without watermarks', included: true },
      { name: 'Export in 1080p 60fps', included: true },
      { name: 'Basic Clip Editor features', included: true },
      { name: 'Add Captions to your clips', included: true },
      { name: 'Post directly to social media', included: true },
      { name: 'Connect one social account', included: true },
    ],
    cta: 'Upgrade now',
    popular: false,
    everything_in: 'Free',
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Advanced clip editing and content scheduling',
    price_monthly: 12.96,
    price_yearly: 103.68, // ~$8.64/mo
    features: [
      { name: 'Export in the background', included: true },
      { name: 'Export faster in 1080p 60fps', included: true },
      { name: 'All Clip Editor features', included: true },
      { name: 'Add Captions and Special Effects', included: true },
      { name: 'Post and schedule to social media', included: true },
      { name: 'Connect multiple social accounts', included: true },
    ],
    cta: 'Upgrade now',
    popular: false,
    everything_in: 'Silver',
  },
  {
    id: 'gold-plus',
    name: 'Gold +',
    badge: 'AI Clipping',
    description: 'Process entire streams with AI for quick highlight clipping',
    price_monthly: 23.32,
    price_yearly: 186.56, // ~$15.55/mo
    features: [
      { name: 'Unlimited use of ClipGPT AI Clipping', included: true },
      { name: 'ClipGPT finds clips from streams', included: true },
      { name: 'Up to 30 clips from each stream', included: true },
      { name: 'Fully edited clips ready to post', included: true },
      { name: 'Auto Captions, Hashtags and Hooks', included: true },
      { name: 'ClipGPT supports Twitch & Kick', included: true },
    ],
    cta: 'Upgrade now',
    popular: true,
    everything_in: 'Gold',
  },
]

const featuredCreators = [
  { name: 'Ninja', followers: '23.8M', platform: 'youtube' },
  { name: 'GamerDad', followers: '52.2K', platform: 'twitch' },
  { name: 'SloppyWalrusX', followers: '79.0K', platform: 'twitch' },
  { name: 'phonecats', followers: '259.0K', platform: 'twitch' },
  { name: 'GMHikaru', followers: '1.9M', platform: 'youtube' },
  { name: 'TEDDY127', followers: '56.0K', platform: 'twitch' },
  { name: 'Mallow_n21', followers: '13.7K', platform: 'twitch' },
]

export default function PricingPage() {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [])

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free') {
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/')
      }
      return
    }

    setLoading(planId)

    if (!user) {
      localStorage.setItem('selectedPlan', JSON.stringify({ planId, interval }))
      router.push('/?redirect=checkout')
      return
    }

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, interval }),
      })

      const { url, error } = await response.json()

      if (error) {
        console.error('Checkout error:', error)
        alert('Failed to start checkout. Please try again.')
        setLoading(null)
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (err) {
      console.error('Checkout error:', err)
      alert('Failed to start checkout. Please try again.')
      setLoading(null)
    }
  }

  const getPrice = (plan: typeof plans[0]) => {
    if (interval === 'yearly') {
      return (plan.price_yearly / 12).toFixed(2)
    }
    return plan.price_monthly.toFixed(2)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-purple-500 to-purple-400">
      {/* Navigation */}
      <nav className="sticky top-0 bg-transparent z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-bold text-xl text-white">ClipFox</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/dashboard/publish" className="text-sm text-white/80 hover:text-white transition">
                Content publisher
              </Link>
              <Link href="/dashboard/emote" className="text-sm text-white/80 hover:text-white transition">
                EmoteMaker
              </Link>
              <Link href="#" className="text-sm text-white/80 hover:text-white transition">
                Blog
              </Link>
              <Link href="/pricing" className="text-sm text-white font-medium transition">
                Pricing
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm bg-white text-zinc-900 hover:bg-zinc-100 px-5 py-2.5 rounded-full font-medium transition flex items-center gap-1"
            >
              Login
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-12 pb-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Plans & Pricing
          </h1>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            ClipFox is free for anyone to use. However if you want to support the
            development, you can subscribe and in return you'll get some cool extra
            features
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex flex-col items-center">
            <p className="text-white/80 text-sm mb-2 flex items-center gap-2">
              Get 2 months free on a yearly plan!
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 17l5-5-5-5M12 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </p>
            <div className="bg-white rounded-full p-1 flex items-center gap-1">
              <button
                onClick={() => setInterval('monthly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                  interval === 'monthly'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval('yearly')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                  interval === 'yearly'
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl p-6 flex flex-col ${
                plan.popular ? 'ring-2 ring-pink-500' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-6">
                  <span className="bg-zinc-100 text-zinc-700 text-xs font-medium px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-zinc-900">{plan.name}</h3>
                  {plan.badge && (
                    <span className="bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-zinc-900">
                    €{getPrice(plan)}
                  </span>
                  <span className="text-zinc-500">/ month</span>
                </div>
              </div>

              <button
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-lg font-medium transition mb-6 ${
                  plan.popular
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-white border-2 border-zinc-200 hover:border-zinc-300 text-zinc-900'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  plan.cta
                )}
              </button>

              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-900">
                  Everything in {plan.everything_in} +
                </p>
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 flex-shrink-0 text-green-500 mt-0.5" />
                    <span className="text-sm text-zinc-600">{feature.name}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-6">
                <button className="text-sm text-purple-600 hover:text-purple-700 font-medium transition">
                  View all plans
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Compare Plans Link */}
      <section className="pb-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <button className="text-white/90 hover:text-white text-sm font-medium underline underline-offset-4 transition">
            Compare plans
          </button>
        </div>
      </section>

      {/* Featured Creators */}
      <section className="py-12 px-4 bg-gradient-to-b from-purple-400 to-rose-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-6 overflow-x-auto scrollbar-hide py-4">
            {featuredCreators.map((creator) => (
              <div key={creator.name} className="flex flex-col items-center flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full mb-2 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20" />
                  {/* Platform badge */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow">
                    {creator.platform === 'twitch' && (
                      <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
                      </svg>
                    )}
                    {creator.platform === 'youtube' && (
                      <svg className="w-4 h-4 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    )}
                  </div>
                </div>
                <p className="font-semibold text-zinc-900">{creator.name}</p>
                <p className="text-sm text-zinc-500">{creator.followers}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-rose-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-900 mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I switch plans anytime?',
                a: 'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged a prorated amount. When downgrading, the change takes effect at the end of your billing period.',
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards (Visa, Mastercard, American Express) and PayPal through our secure payment provider, Stripe.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Yes! All paid plans come with a 7-day free trial. You won\'t be charged until the trial ends, and you can cancel anytime during the trial period.',
              },
              {
                q: 'What happens to my clips if I cancel?',
                a: 'Your clips and projects will remain accessible, but you won\'t be able to export new clips beyond the free tier limits. You can always resubscribe to regain full access.',
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-zinc-900 mb-2">{faq.q}</h3>
                <p className="text-zinc-600 text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-bold text-lg text-purple-600">CF</span>
                <span className="font-bold text-lg">ClipFox</span>
              </div>
              <p className="text-sm text-zinc-500">
                Convert your Twitch clips to viral TikTok, YouTube Shorts or Instagram Reels videos.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 mb-4">Products</h4>
              <ul className="space-y-2">
                {['Clip Downloader', 'Clip Editor', 'ClipGPT', 'Content Publisher', 'Emote Maker'].map((name) => (
                  <li key={name}>
                    <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 transition">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 mb-4">Features</h4>
              <ul className="space-y-2">
                {['Add Gifs', 'Automatic Captions', 'Custom Layouts', 'Stickers', 'Zoom In'].map((name) => (
                  <li key={name}>
                    <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 transition">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 mb-4">ClipFox</h4>
              <ul className="space-y-2">
                {['About us', 'Careers', 'Terms of Service', 'Privacy Policy'].map((name) => (
                  <li key={name}>
                    <Link href="#" className="text-sm text-zinc-500 hover:text-zinc-900 transition">
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-zinc-900 mb-4">Alternatives</h4>
              <ul className="space-y-2">
                {['Twitch Auto Clips', 'Powder GG', 'CapCut', 'Opus Clip'].map((name) => (
                  <li key={name}>
                    <span className="text-sm text-zinc-500">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-zinc-200">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <a href="#" className="text-zinc-400 hover:text-zinc-600 transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/>
                </svg>
              </a>
              <a href="#" className="text-zinc-400 hover:text-zinc-600 transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className="text-zinc-400 hover:text-zinc-600 transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
              <a href="#" className="text-zinc-400 hover:text-zinc-600 transition">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
            </div>
            <p className="text-sm text-zinc-500">
              Copyright &copy; {new Date().getFullYear()} ClipFox.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

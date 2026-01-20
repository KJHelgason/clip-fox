'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  Play,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Star,
  Calendar,
  Scissors,
  Type,
  Zap,
  Layout,
  Volume2,
  Sticker,
  ZoomIn,
} from 'lucide-react'

// Platform badges for hero
const platformBadges = [
  { name: 'YOUTUBE', color: 'bg-red-500', textColor: 'text-white' },
  { name: 'KICK', color: 'bg-white', textColor: 'text-black' },
  { name: 'TWITCH', color: 'bg-purple-600', textColor: 'text-white' },
  { name: 'UPLOAD', color: 'bg-white border border-zinc-300', textColor: 'text-black' },
]

// Sample clips for carousel (placeholder data)
const sampleClips = [
  { id: 1, thumbnail: 'https://picsum.photos/seed/clip1/300/533', caption: 'I MEAN, BRO, LIKE,' },
  { id: 2, thumbnail: 'https://picsum.photos/seed/clip2/300/533', caption: 'THIS IS, LIKE, ONE OF' },
  { id: 3, thumbnail: 'https://picsum.photos/seed/clip3/300/533', caption: 'ARE YOU KIDDING ME?' },
  { id: 4, thumbnail: 'https://picsum.photos/seed/clip4/300/533', caption: 'HE NEEDS TO BREAK' },
  { id: 5, thumbnail: 'https://picsum.photos/seed/clip5/300/533', caption: 'LIKE' },
]

// Benefits cards data
const benefitsCards = [
  {
    title: 'Crop, trim & edit easily',
    description: '',
    color: 'bg-gradient-to-br from-purple-500 to-purple-600',
    size: 'large',
    icon: Scissors,
  },
  {
    title: 'Schedule & Post',
    description: 'Create, schedule, and auto-post to socials. Less hassle, more GG.',
    color: 'bg-yellow-400',
    size: 'medium',
    icon: Calendar,
  },
  {
    title: 'Over 20 unique caption styles to choose from',
    description: 'Choose from 20+ styles to make your clips pop. Fast and simple.',
    color: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    size: 'medium',
    icon: Type,
  },
  {
    title: 'Edit faster',
    description: 'Quick edits mean more time streaming. Less grind, more shine.',
    color: 'bg-blue-500',
    size: 'medium',
    icon: Zap,
  },
]

// How it works steps
const howItWorksSteps = [
  {
    step: 1,
    title: 'Upload your Clip',
    description: 'Paste the URL of the clip you want (you can also upload it from your device, or select from Twitch, directly from our dashboard).',
    color: 'bg-green-400',
  },
  {
    step: 2,
    title: 'Customise it',
    description: 'Customise the clip however you want! You can change the layout, crop, add effects, add captions, sound effects... Have your clip perfect for social media channels!',
    color: 'bg-pink-400',
  },
  {
    step: 3,
    title: 'Export or Schedule',
    description: 'When you\'re done, you can either download the final file, or use our Content Publisher to schedule it on TikTok, Instagram Reels, or YouTube Shorts.',
    color: 'bg-purple-400',
  },
]

// Testimonials data
const testimonials = [
  {
    name: 'itsmewmewen',
    platform: 'twitch.tv',
    rating: 5,
    text: 'Helped me reduce my workload by a ton by helping me doing clips! Would absolutely recommend',
  },
  {
    name: 'Olumz',
    rating: 5,
    text: 'amazing app, im pushing so much content out!!',
  },
  {
    name: 'copycat_fr',
    platform: 'twitch.tv',
    rating: 5,
    text: 'BEST CLIPPING SITE THERE IS, PERFECT FOR ANY STREAMER AND HAS HELPED ME OUT ON HOURS OF FINDING CLIPS TO MAKE VIDEOS ON.',
  },
  {
    name: 'trazushii',
    platform: 'twitch.tv',
    rating: 5,
    text: 'Absolutely love how easy they make it to get clips - sometimes going through hours and hours of video is daunting, especially as a small creator! StreamLadder makes the process easier.',
  },
  {
    name: 'Hector Guerrero',
    rating: 5,
    text: 'Super easy to use! I started streaming just for fun, and this has been a lifesaver for turning my clips into short videos.',
  },
  {
    name: 'Perfectwulf',
    platform: 'twitch.tv',
    rating: 5,
    text: 'I have used ClipFox for a month now, and I have seen quite a bit of improvement with my clips!',
  },
]

// Featured creators
const featuredCreators = [
  { name: 'matteohsoff', platform: 'instagram', followers: '146K' },
  { name: 'chica', platform: 'tiktok', followers: '7M' },
  { name: 'l4nier', platform: 'instagram', followers: '34.1K' },
  { name: 'sheebitv', platform: 'tiktok', followers: '1.3M' },
  { name: 'jinnytty0728', platform: 'tiktok', followers: '218.2K' },
  { name: 'sloppywalrusx', platform: 'tiktok', followers: '205.3K' },
  { name: 'epsylone', platform: 'tiktok', followers: '2M' },
  { name: 'agpt333', platform: 'tiktok', followers: '632.5K' },
  { name: 'Gamerdadtv', platform: 'tiktok', followers: '367K' },
]

// FAQ data
const faqData = [
  {
    question: 'What is ClipFox?',
    answer: 'ClipFox is an AI-powered video editing platform that helps content creators turn their Twitch, YouTube, and Kick clips into viral short-form content for TikTok, Instagram Reels, and YouTube Shorts.',
  },
  {
    question: 'How does ClipFox work?',
    answer: 'Simply paste a clip URL or upload a video, customize it with our editor (add captions, effects, stickers), and export or schedule it directly to your social media accounts.',
  },
  {
    question: 'Is ClipFox free to use?',
    answer: 'Yes! ClipFox offers a free tier with 3 exports per month. You can upgrade to Pro or Business plans for more features and unlimited exports.',
  },
  {
    question: 'What tools does ClipFox offer?',
    answer: 'ClipFox includes a clip editor, AI captions, ClipGPT (AI VOD analysis), content publisher, emote maker, montage maker, schedule maker, and more.',
  },
  {
    question: 'How can I sign up for ClipFox?',
    answer: 'Click the "Start for free today" button and sign in with your Twitch, Google, or Discord account. No credit card required!',
  },
  {
    question: "What's ClipFox's goal?",
    answer: 'Our goal is to help content creators save time and grow their audience by making professional video editing accessible to everyone.',
  },
]

// Footer links
const footerLinks = {
  products: [
    { name: 'Clip Downloader', href: '/dashboard/download' },
    { name: 'Clip Editor', href: '/dashboard' },
    { name: 'ClipGPT', href: '/dashboard/clipgpt' },
    { name: 'Content Publisher', href: '/dashboard/publish' },
    { name: 'Emote Maker', href: '/dashboard/emote' },
    { name: 'Montage Maker', href: '/dashboard/montage' },
    { name: 'Schedule Maker', href: '/dashboard/stream-schedule' },
  ],
  features: [
    { name: 'Add Gifs', href: '#' },
    { name: 'Automatic Captions', href: '#' },
    { name: 'Custom Layouts', href: '#' },
    { name: 'Custom Text', href: '#' },
    { name: 'Safe Zones', href: '#' },
    { name: 'Sound effects', href: '#' },
    { name: 'Stickers', href: '#' },
    { name: 'Zoom In', href: '#' },
  ],
  company: [
    { name: 'About us', href: '#' },
    { name: 'Careers', href: '#' },
    { name: 'Terms of Service', href: '#' },
    { name: 'Privacy Policy', href: '#' },
  ],
}

export default function LandingPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        router.replace('/dashboard')
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/dashboard')
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [router])

  const handleOAuth = async (provider: 'google' | 'twitch' | 'discord') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) console.error(error.message)
  }

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 320
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-purple-600 to-purple-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-emerald-50">
      {/* Navigation */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-lg z-50 border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-bold text-xl text-zinc-900">ClipFox</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <div className="relative group">
                <button className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 transition">
                  Tools
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <Link href="#" className="text-sm text-zinc-600 hover:text-zinc-900 transition">
                Blogs
              </Link>
              <Link href="/pricing" className="text-sm text-zinc-600 hover:text-zinc-900 transition">
                Pricing
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOAuth('google')}
              className="text-sm text-zinc-600 hover:text-zinc-900 transition px-4 py-2"
            >
              Login
            </button>
            <button
              onClick={() => handleOAuth('google')}
              className="text-sm bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-900 px-4 py-2 rounded-full font-medium transition shadow-sm"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Purple gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500 via-purple-600 to-purple-700 h-[600px]" />

        <div className="relative pt-16 pb-8 px-4">
          <div className="max-w-5xl mx-auto text-center">
            {/* Platform badges */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {platformBadges.map((badge) => (
                <span
                  key={badge.name}
                  className={`${badge.color} ${badge.textColor} px-4 py-1.5 rounded-full text-xs font-bold tracking-wide`}
                >
                  {badge.name}
                </span>
              ))}
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight italic">
              Editing and posting<br />clips made easy
            </h1>

            <p className="text-lg text-purple-100 mb-8 max-w-2xl mx-auto">
              Save time by turning your Twitch, YouTube, Kick, or custom videos into short-form
              content that can blow up your stream and take your channel to the next level.
            </p>

            <button
              onClick={() => handleOAuth('google')}
              className="inline-flex items-center justify-center bg-lime-400 hover:bg-lime-500 text-zinc-900 px-8 py-4 rounded-full font-semibold text-lg transition shadow-lg hover:shadow-xl"
            >
              Start for free today
            </button>
          </div>
        </div>

        {/* Clip Carousel */}
        <div className="relative px-4 pb-16 mt-8">
          <div className="max-w-7xl mx-auto">
            <div className="relative">
              {/* Left arrow */}
              <button
                onClick={() => scrollCarousel('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-zinc-50 transition -ml-6"
              >
                <ChevronLeft className="w-6 h-6 text-zinc-600" />
              </button>

              {/* Carousel */}
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth px-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {sampleClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="flex-shrink-0 w-[220px] aspect-[9/16] rounded-2xl overflow-hidden relative shadow-xl"
                  >
                    <img
                      src={clip.thumbnail}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white text-sm font-bold drop-shadow-lg bg-black/30 px-2 py-1 rounded">
                        {clip.caption}
                      </p>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition bg-black/20">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <Play className="w-8 h-8 text-purple-600 ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right arrow */}
              <button
                onClick={() => scrollCarousel('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-zinc-50 transition -mr-6"
              >
                <ChevronRight className="w-6 h-6 text-zinc-600" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Banner */}
      <section className="py-16 px-4 bg-gradient-to-b from-rose-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-orange-400" />
            <Sparkles className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 leading-relaxed">
            Join 500k+{' '}
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg">Streamers</span>
            {' '}big and small, who{' '}
            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-lg">save time</span>
            {' '}with ClipFox, making it easy to turn your best moments into{' '}
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg">viral clips</span>
          </h2>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-rose-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-pink-500 font-medium mb-2">The benefits</p>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900">
              <span className="text-purple-500">Your all-in-one tool</span> for<br />
              editing and posting clips
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Large card - Crop, trim & edit */}
            <div className="md:col-span-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl p-8 text-white overflow-hidden relative min-h-[300px]">
              <h3 className="text-2xl font-bold mb-4">Crop, trim & edit easily</h3>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-purple-400/30 rounded-t-lg flex items-center justify-center">
                <div className="w-[90%] h-4 bg-purple-300/50 rounded-full flex items-center gap-1 px-2">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className={`w-1 h-2 rounded-full ${i < 3 ? 'bg-yellow-400' : 'bg-white/60'}`} />
                  ))}
                </div>
              </div>
              <div className="absolute bottom-8 left-8 w-16 h-16 bg-white/10 rounded-lg transform -rotate-12" />
              <div className="absolute bottom-8 right-8 w-16 h-16 bg-white/10 rounded-lg transform rotate-12" />
            </div>

            {/* Schedule & Post */}
            <div className="bg-yellow-400 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4 flex gap-2">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </div>
              </div>
              <div className="mb-4">
                <svg className="w-16 h-16 text-zinc-800" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-2">Schedule & Post</h3>
              <p className="text-zinc-700 text-sm">Create, schedule, and auto-post to socials. Less hassle, more GG.</p>
            </div>

            {/* Caption styles */}
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl p-8 relative overflow-hidden">
              <div className="grid grid-cols-4 gap-2 mb-6">
                {['LIT!', 'GAMING YUU!', 'BEAST!', 'NINJA!', 'BIG GLOW', 'SWAG CITY', 'BIG SLICK', 'Quirkonia'].map((style) => (
                  <div key={style} className="bg-teal-600/50 rounded-xl p-2 text-center">
                    <span className="text-white text-xs font-bold">{style}</span>
                  </div>
                ))}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Over 20 unique caption styles to choose from</h3>
              <p className="text-teal-100 text-sm">Choose from 20+ styles to make your clips pop. Fast and simple.</p>
            </div>

            {/* Edit faster */}
            <div className="md:col-span-2 md:grid md:grid-cols-2 gap-6">
              <div className="bg-blue-500 rounded-3xl p-8 flex flex-col justify-end min-h-[200px]">
                <h3 className="text-xl font-bold text-white mb-2">Edit faster</h3>
                <p className="text-blue-100 text-sm">Quick edits mean more time streaming. Less grind, more shine.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gradient-to-b from-rose-50 to-emerald-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-pink-500 font-medium mb-2">How it works</p>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900">
              Super fast, <span className="text-purple-500">super easy</span>.
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line connector */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-zinc-200 hidden md:block" />

            <div className="space-y-16">
              {howItWorksSteps.map((step, idx) => (
                <div
                  key={step.step}
                  className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8`}
                >
                  {/* Image placeholder */}
                  <div className={`flex-1 ${idx % 2 === 0 ? 'md:pr-16' : 'md:pl-16'}`}>
                    <div className={`${step.color} rounded-3xl aspect-video flex items-center justify-center shadow-xl`}>
                      <div className="text-white/30 text-6xl font-bold">{step.step}</div>
                    </div>
                  </div>

                  {/* Step number circle */}
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {step.step}
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${idx % 2 === 0 ? 'md:pl-16' : 'md:pr-16'}`}>
                    <h3 className="text-2xl font-bold text-zinc-900 mb-3">{step.title}</h3>
                    <p className="text-zinc-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Creators */}
      <section className="py-12 px-4 bg-gradient-to-b from-emerald-50 to-teal-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-8 overflow-x-auto scrollbar-hide py-4">
            {featuredCreators.map((creator) => (
              <div key={creator.name} className="flex flex-col items-center flex-shrink-0">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mb-2 relative">
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                    {creator.platform === 'instagram' && (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                        <defs>
                          <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#FFDC80" />
                            <stop offset="50%" stopColor="#F56040" />
                            <stop offset="100%" stopColor="#833AB4" />
                          </linearGradient>
                        </defs>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    )}
                    {creator.platform === 'tiktok' && (
                      <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                      </svg>
                    )}
                  </div>
                </div>
                <p className="text-sm font-medium text-zinc-700">{creator.followers}</p>
                <p className="text-xs text-zinc-500">{creator.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gradient-to-b from-teal-50 to-emerald-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-pink-500 font-medium mb-2">Testimonials</p>
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-4">
              ClipFox Powers<br />
              <span className="text-green-500">500K+</span> Content Creators
            </h2>
            <p className="text-zinc-600">
              500k of the best creators, Twitch Streamer, Kick Streamers<br />
              and YouTubers are growing fast with ClipFox
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full" />
                  <div>
                    <p className="font-medium text-zinc-900 text-sm">
                      {testimonial.platform ? `${testimonial.platform}/${testimonial.name}` : testimonial.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-zinc-600 text-sm leading-relaxed">{testimonial.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-zinc-900">
              Frequently Asked <span className="text-purple-500">Questions</span>
            </h2>
            <p className="text-zinc-600 mt-2">Have questions? We are here to help.</p>
          </div>

          <div className="space-y-3">
            {faqData.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl border border-zinc-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-50 transition"
                >
                  <span className="font-medium text-zinc-900">{faq.question}</span>
                  <div className={`w-6 h-6 rounded-full border-2 border-zinc-300 flex items-center justify-center transition ${openFaq === idx ? 'bg-purple-500 border-purple-500' : ''}`}>
                    {openFaq === idx ? (
                      <span className="text-white text-sm">−</span>
                    ) : (
                      <span className="text-zinc-400 text-sm">+</span>
                    )}
                  </div>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4">
                    <p className="text-zinc-600 text-sm">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Big Logo Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-white to-purple-100 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-[8rem] md:text-[12rem] font-bold text-purple-300/50 tracking-tight">
            ClipFox
          </h2>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            {/* Logo & description */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="font-bold text-lg text-purple-600">SL</span>
                <span className="font-bold text-lg">ClipFox</span>
              </div>
              <p className="text-sm text-zinc-500">
                Convert your Twitch clips to viral TikTok, YouTube Shorts or Instagram Reels videos.
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className="font-semibold text-zinc-900 mb-4">Products</h4>
              <ul className="space-y-2">
                {footerLinks.products.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-zinc-500 hover:text-zinc-900 transition">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-semibold text-zinc-900 mb-4">Features</h4>
              <ul className="space-y-2">
                {footerLinks.features.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-zinc-500 hover:text-zinc-900 transition">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-zinc-900 mb-4">ClipFox</h4>
              <ul className="space-y-2">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link href={link.href} className="text-sm text-zinc-500 hover:text-zinc-900 transition">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Alternatives */}
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

          {/* Bottom row */}
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

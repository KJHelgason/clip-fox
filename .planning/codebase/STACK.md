# Technology Stack

**Analysis Date:** 2026-01-22

## Languages

**Primary:**
- TypeScript 5 - Full codebase (frontend, backend, utilities)
- JavaScript - Configuration files and Next.js setup

**Secondary:**
- SQL - Supabase database schema and migrations (`supabase/setup.sql`)

## Runtime

**Environment:**
- Node.js (inferred from Next.js 15.4.1 and package.json structure)

**Package Manager:**
- npm (inferred from package.json format)
- Lockfile: Present (package-lock.json in git status)

## Frameworks

**Core:**
- Next.js 15.4.1 - Full-stack web framework with App Router
  - Server components, API routes, middleware
  - Dynamic routes and nested layouts
  - Subdomain routing via `middleware.ts`

**Frontend:**
- React 19.1.0 - UI components and state management
- Framer Motion 12.26.2 - Complex animations (sticker system, timeline)
- TailwindCSS 3.4.1 - Utility-first CSS styling
  - Dark mode support (via `[class]` darkMode strategy)
  - Custom color system with CSS variables
  - Plugins: `tailwindcss-animate` 1.0.7

**UI Components:**
- Radix UI primitives:
  - `@radix-ui/react-avatar` 1.1.10
  - `@radix-ui/react-dialog` 1.1.14
  - `@radix-ui/react-dropdown-menu` 2.1.15
  - `@radix-ui/react-slider` 1.3.5
  - `@radix-ui/react-slot` 1.2.3
- Custom UI components (`components/ui/`) built on Radix UI with Tailwind

**Icon Library:**
- Lucide React 0.525.0 - SVG icon set with barrel imports optimized

**Testing:**
- Not detected

**Build/Dev:**
- TypeScript - Type checking
- ESLint 9 - Code linting
  - Config: `eslint-config-next` 15.4.1
- PostCSS 8.5.6 - CSS processing pipeline
  - Autoprefixer 10.4.21 - Vendor prefixing
  - TailwindCSS PostCSS plugin

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.52.0 - PostgreSQL database client (browser)
- `@supabase/ssr` 0.6.1 - Server-side Supabase client for auth/data
- `stripe` 14.14.0 - Payment processing (server)
- `@stripe/stripe-js` 2.4.0 - Payment UI (browser)
- `openai` 5.10.1 - AI/LLM integration (transcription, hooks, captions)
- `langchain` 0.3.30 - LLM orchestration framework

**Media & Video:**
- `@ffmpeg/ffmpeg` 0.12.10 - Browser-based video processing (WASM)
- `@ffmpeg/util` 0.12.1 - FFmpeg utilities

**State & Data:**
- `swr` 2.3.8 - Client-side data fetching with caching
- `uuid` 11.1.0 - Unique ID generation
- `date-fns` 3.6.0 - Date formatting and manipulation

**Utilities:**
- `clsx` 2.1.1 - Conditional CSS class builder
- `tailwind-merge` 3.3.1 - Smart Tailwind class merging
- `class-variance-authority` 0.7.1 - Component variant management
- `dotenv` 17.2.0 - Environment variable loading

## Configuration

**Environment:**
- `.env.local` - Development secrets (git-ignored)
- `.env.example` - Template for required env vars
- Environment variables required:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key (server-only)
  - `STRIPE_SECRET_KEY` - Stripe API secret
  - `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing key
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
  - `STRIPE_PRO_MONTHLY_PRICE_ID` - Stripe price ID
  - `STRIPE_PRO_YEARLY_PRICE_ID` - Stripe price ID
  - `STRIPE_BUSINESS_MONTHLY_PRICE_ID` - Stripe price ID
  - `STRIPE_BUSINESS_YEARLY_PRICE_ID` - Stripe price ID
  - `NEXT_PUBLIC_APP_URL` - Application URL for redirects
  - `APP_SUBDOMAIN` - Subdomain for authenticated app (default: `app`)
  - `ROOT_DOMAIN` - Root domain for localhost/production
  - `OPENAI_API_KEY` - OpenAI API key (optional, required for transcription)
  - `GIPHY_API_KEY` - Giphy API key (optional, required for GIFs/stickers)
  - `TWITCH_CLIENT_ID` - Twitch API client ID (optional)
  - `TWITCH_CLIENT_SECRET` - Twitch API client secret (optional)

**Build:**
- `tsconfig.json` - TypeScript compiler options
  - Target: ES2017
  - Strict mode enabled
  - Module resolution: bundler
  - JSX: preserve (Next.js handles)
  - Path alias: `@/*` → root
- `next.config.ts` - Next.js configuration
  - React strict mode enabled
  - Subdomain origins allowed for development
  - Package import optimization for `lucide-react`, `@radix-ui/react-icons`
- `tailwind.config.js` - Tailwind CSS configuration
  - Dark mode: class-based
  - Custom color variables system
  - Plugins: tailwindcss-animate
- `postcss.config.js` - PostCSS pipeline
  - TailwindCSS processor
  - Autoprefixer

## Platform Requirements

**Development:**
- Node.js runtime
- npm or yarn package manager
- Modern browser supporting:
  - ES2017+
  - WASM (for FFmpeg)
  - Canvas API (for video preview)
  - Web Workers (for background tasks)
- Supabase project (PostgreSQL + Auth + Storage)
- Stripe account (for payment processing)

**Production:**
- Node.js server (Next.js on Vercel or self-hosted)
- PostgreSQL database (Supabase)
- S3-compatible storage (Supabase Storage or separate)
- Stripe webhook endpoint
- CDN for static assets (Vercel, CloudFront, etc.)

---

*Stack analysis: 2026-01-22*

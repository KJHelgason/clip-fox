# External Integrations

**Analysis Date:** 2026-01-22

## APIs & External Services

**Payment Processing:**
- Stripe - Subscription billing, invoices, customer management
  - SDK: `stripe` 14.14.0 (server), `@stripe/stripe-js` 2.4.0 (browser)
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - Endpoints: `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook`
  - Status: Built and integrated
  - Webhook events: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`

**AI & LLM:**
- OpenAI - Transcription (Whisper API), hooks, captions
  - SDK: `openai` 5.10.1
  - Auth: `OPENAI_API_KEY`
  - Endpoint: `/api/ai/transcribe`
  - Status: Route built (mock data currently, ready for Whisper API)
  - Usage: AI captions (Pro+ plan requirement)

**Media & GIFs:**
- Giphy - Animated GIFs and stickers
  - API: REST (no SDK)
  - Auth: `GIPHY_API_KEY` (query parameter)
  - Endpoint: `/api/giphy`
  - Status: Built and integrated
  - Features: Search GIFs, trending GIFs, search stickers, trending stickers
  - Client requests: `components/editor/ElementsPanel.tsx` (lines 1005, 1035)
  - Rate limit: 43 requests/hour (public beta key, upgrade for production)

**Streaming Platforms:**

- **Twitch**
  - OAuth: Client credentials flow (app access token)
  - Endpoints: `/api/twitch/emotes` (7TV-powered), `/api/social/callback/twitch`
  - Auth: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`
  - Features:
    - Get channel emotes (`/api/twitch/emotes?channel=username`)
    - Emote caching with app access token validation
    - Returns emote URLs at multiple scales (1x, 2x, 3x, 4x)
  - Status: Built

- **YouTube/Google**
  - OAuth: Via Supabase (Google provider)
  - Auth: Handled through Supabase OAuth flow
  - Endpoints: `/api/social/callback/route.ts`, `/api/social/connect`
  - Usage: Video downloads (URL parsing), channel authentication
  - Status: OAuth flow prepared, download implementation pending

- **TikTok**
  - OAuth: Custom OAuth (not Supabase-supported)
  - Endpoints: `/api/social/connect`, `/api/social/callback/tiktok`
  - Status: Route structure prepared, implementation pending

- **Kick**
  - OAuth: Custom OAuth
  - Endpoints: `/api/social/connect`, `/api/social/callback/route.ts`
  - Status: Route structure prepared, implementation pending

- **Instagram/Facebook**
  - OAuth: Custom OAuth
  - Endpoints: `/api/social/callback/instagram`, `/api/social/callback/facebook`
  - Status: Route structure prepared, implementation pending

**Emote APIs (No Auth Required):**
- 7TV - Twitch channel emotes
  - API: `https://7tv.io/v3/users/twitch/{username}`
  - No API key required
  - Used in: `components/editor/ElementsPanel.tsx`
  - Status: Integrated

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Client: `@supabase/supabase-js` 2.52.0 (browser), `@supabase/ssr` 0.6.1 (server)
  - Auth: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser), `SUPABASE_SERVICE_ROLE_KEY` (server)
  - Tables:
    - `profiles` - User profiles with role management
    - `clips` - Video clips with edit metadata
    - `exports` - Export history and status
    - `subscriptions` - User subscription status
    - `subscription_plans` - Plan definitions with limits
    - `usage_logs` - Usage tracking for billing
    - `captions` - AI-generated captions
    - `social_connections` - OAuth tokens for platforms
    - `scheduled_posts` - Content calendar
    - `custom_elements` - User-uploaded elements
    - `social_usernames` - Platform-specific usernames
    - `clipgpt_projects` - AI VOD analysis projects
    - `clipgpt_moments` - Detected moments from videos
    - `auto_clip_settings` - Auto-clip pipeline configuration
    - `auto_clip_queue` - Queued clips for auto-processing
    - `montages` - Montage projects
    - `stream_schedules` - Stream schedule templates

**File Storage:**
- Supabase Storage (S3-compatible)
  - Buckets:
    - `clips` - Video files
    - `thumbnails` - Clip thumbnails
    - `exports` - Processed export files
    - `custom_elements` - User-uploaded elements
  - Signed URLs: Generated with 1-hour expiry for direct access
  - Policies: Row-level security (RLS) enforced per user

**Caching:**
- Client-side: SWR (stale-while-revalidate) with `swr` 2.3.8
- API caching: Next.js native (Giphy: 5min trending, 1min search)
- Twitch token cache: In-memory with expiry check

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Strategy: Custom email/password + OAuth integrations
  - Implementation: `lib/supabase.ts`, `lib/supabase/useUser.ts`
  - Browser client: `@supabase/supabase-js`
  - Server client: `@supabase/ssr`
  - Cookies: Supabase auto-manages auth tokens in cookies
  - Subdomain routing: Auth via cookies + JWT extraction in `middleware.ts` (lines 15-96)
  - OAuth providers:
    - Google (for YouTube)
    - Twitch
    - Discord
    - TikTok, Instagram, Facebook (custom OAuth)

**Session Management:**
- JWT tokens stored in Supabase-managed cookies
- Token extraction: Middleware parses JWT from cookies to identify users
- Server routes: Use `SUPABASE_SERVICE_ROLE_KEY` for admin operations
- Client routes: Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` with auth cookies

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, LogRocket, etc.)
- Errors logged to console via `console.error()`

**Logs:**
- Console logging throughout codebase
- Database-backed: `usage_logs` table for action tracking
- Webhook events: Logged to console for debugging

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from Next.js config, subdomain routing pattern)
- Self-hosted Node.js server supported (standard Next.js)

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, etc.)

## Environment Configuration

**Required env vars:**
- Database: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, price IDs (4)
- AI: `OPENAI_API_KEY` (optional)
- Giphy: `GIPHY_API_KEY` (optional)
- Twitch: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET` (optional)
- App: `NEXT_PUBLIC_APP_URL`, `APP_SUBDOMAIN`, `ROOT_DOMAIN`

**Secrets location:**
- `.env.local` (development, git-ignored)
- Environment variables (production, set in hosting platform)

## Webhooks & Callbacks

**Incoming:**
- Stripe webhooks: `/api/billing/webhook`
  - Events: subscription lifecycle, invoice payment status
  - Verification: Signature validation with `STRIPE_WEBHOOK_SECRET`
  - Processing: Updates subscription status in database

**Outgoing:**
- None detected

## Data Flow Patterns

**Payment Flow:**
1. Client: User selects plan → calls `/api/billing/checkout`
2. Server: Creates Stripe checkout session
3. Stripe: User completes payment
4. Stripe: Sends webhook to `/api/billing/webhook`
5. Server: Updates `subscriptions` table via Supabase
6. Client: SWR re-validates subscription status

**AI Transcription Flow:**
1. Client: Requests transcription → calls `/api/ai/transcribe`
2. Server: Checks subscription plan (Pro+ required)
3. Server: Gets signed URL for video from Supabase Storage
4. Server: Calls OpenAI Whisper API (currently mocked)
5. Server: Stores segments in `captions` table
6. Server: Logs usage in `usage_logs` table
7. Client: Polls for caption status

**Video Download Flow:**
1. Client: Pastes URL → calls `/api/download`
2. Server: Parses URL (Twitch/YouTube/Kick detector)
3. Server: Logs download usage (if authenticated)
4. Server: Returns video info (currently mock, needs yt-dlp backend)

**Social Connection Flow:**
1. Client: Requests OAuth → calls `/api/social/connect`
2. Server: Returns OAuth URL or Supabase provider config
3. User: Completes auth on OAuth provider
4. Provider: Redirects to `/api/social/callback/[platform]`
5. Server: Stores access token in `social_connections` table
6. Server: Redirects to `/dashboard/connections`

---

*Integration audit: 2026-01-22*

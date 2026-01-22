# Architecture

**Analysis Date:** 2026-01-22

## Pattern Overview

**Overall:** Next.js 14 Full-Stack Monolith with Client-Server Separation

**Key Characteristics:**
- Subdomain-based routing (main domain → marketing; `app.domain.com` → authenticated app)
- Client-side state management for editor (React hooks + context)
- Server-side authorization and data validation
- Composition of heavy editor panels via dynamic imports
- Real-time database synchronization with Supabase
- Stripe-integrated subscription and usage metering

## Layers

**Presentation Layer (Client):**
- Purpose: Interactive video editor UI with multi-tab interface and real-time preview
- Location: `components/editor/`, `components/ui/`
- Contains: React components (Timeline, ElementsPanel, AudioPanel, ExportPanel, etc.)
- Depends on: React, framer-motion, lucide-react, local state
- Used by: Page components in `app/app/` and `app/dashboard/`

**Page & Routing Layer:**
- Purpose: Maps URLs to page components; handles auth checks; coordinates sidebar navigation
- Location: `app/app/`, `app/dashboard/`, `app/api/`, `app/pricing/`, `app/page.tsx`
- Contains: Page.tsx files (client components), API routes (server functions)
- Depends on: Next.js routing, middleware, Supabase auth
- Used by: Browser requests

**Business Logic Layer:**
- Purpose: Reusable hooks, utility functions, and type definitions
- Location: `lib/hooks/`, `lib/stripe.ts`, `lib/types.ts`, `lib/utils.ts`
- Contains: useClip, useSubscription, usePreviewCropDrag, stripe client setup
- Depends on: Supabase, Stripe SDK, React hooks
- Used by: Client components and page components

**Data Layer:**
- Purpose: Authenticaton, database access, file storage
- Location: Supabase (backend), `lib/supabase.ts` (client), `middleware.ts` (auth gateway)
- Contains: Auth tokens, profiles table, clips table, subscriptions, usage_logs, custom_elements
- Depends on: Supabase client SDK
- Used by: All other layers via API routes or client library

**API Layer:**
- Purpose: Server-side HTTP endpoints for auth validation, data mutation, billing operations
- Location: `app/api/` (billing, clips, export, social, twitch, ai, download, giphy)
- Contains: POST/GET/PATCH/DELETE handlers with subscription limit checks
- Depends on: Supabase admin client, Stripe, Next.js server context
- Used by: Client components making fetch() calls

## Data Flow

**Clip Upload & Editing Flow:**

1. User navigates to `/app/upload` (or `/dashboard/upload` which redirects via middleware)
2. Page component authenticates via Supabase and loads user profile
3. Upload form submitted → File stored in Supabase storage bucket `clips`
4. Clip metadata stored in `clips` table with `edit_data` JSON field
5. User navigates to `/app/edit/[id]` with clip ID
6. Editor page calls `useClip(id)` hook which fetches clip + generates signed URL
7. User makes edits: overlays, zoom, audio, captions (stored in local React state)
8. User clicks Export → POST to `/api/export` with editor state
9. API validates subscription limits, logs usage, queues export job
10. Export response returned to client with export ID

**Subscription & Billing Flow:**

1. User clicks "Upgrade" on pricing page or billing settings
2. Modal opens → User selects plan (Pro/Business) and interval (monthly/yearly)
3. Form submitted → POST to `/api/billing/checkout`
4. API verifies user auth, creates/retrieves Stripe customer, creates checkout session
5. Redirect to Stripe Checkout URL
6. User completes payment in Stripe
7. Stripe webhook fires → Webhook handler at `/api/billing/webhook`
8. Webhook creates/updates `subscriptions` record with new plan_id and stripe_subscription_id
9. User's subsequent exports checked against new plan limits

**Editor Element Timeline Flow:**

1. User adds overlay element (text, image, sticker) via ElementsPanel
2. Element added to local state array `overlays: OverlayElement[]`
3. Element rendered in preview at position (videoLeft, videoTop, videoWidth, videoHeight)
4. Element bar rendered on Timeline at position (timelineLeft, timelineTop) with start/endTime
5. User drags element on preview → `usePreviewCropDrag` updates videoLeft/videoTop
6. User drags element bar on timeline → Updates startTime/endTime
7. Timeline updates rows to avoid overlaps via `findAvailableRow()` helper
8. Element deleted → Removed from overlays array, preview updates
9. On export, all overlays serialized to EditorState JSON and sent to API

## Key Abstractions

**OverlayElement:**
- Purpose: Represents any visual element added to video (text, image, sticker, caption, reaction)
- Examples: `lib/types.ts` (lines 409-464), ElementsPanel.tsx, Timeline.tsx
- Pattern: Discriminated union by `type` field ('text' | 'image' | 'sticker' | 'caption' | 'social-sticker' | 'reaction')
- Properties: Position (video + timeline coords), timing (startTime/endTime), content-specific fields (fontSize, src, etc.)

**EditorState:**
- Purpose: Serializable representation of all editor changes (can be saved/restored)
- Examples: `lib/types.ts` (lines 799-808), useClip.ts parseEditData()
- Pattern: JSON-serialized object containing aspectRatio, overlays[], zoomKeyframes[], trimmed video bounds
- Usage: Stored in `clips.edit_data` as JSON string; passed to /api/export for processing

**StickerRenderer & StickerConfig:**
- Purpose: Renders animated social stickers with configurable platform, template, animation
- Examples: `components/editor/stickers/StickerRenderer.tsx` (900+ lines)
- Pattern: Framer-motion variants-driven animation system; sticker data + animation type → React component
- Supports: Complex multi-step animations (logoAndBanner, glowType, cardFlip, etc.)

**Subscription & PlanLimits:**
- Purpose: Encodes feature availability and usage quotas per tier
- Examples: `lib/types.ts` (lines 13-36, 7)
- Pattern: PlanId → plan_id (free/pro/business) → PlanLimits with exports_per_month, max_resolution, feature flags
- Usage: Checked on export API route; displayed on pricing page

**AudioTrack:**
- Purpose: Represents one sound on the timeline (user uploaded or library sound)
- Examples: `lib/types.ts` (lines 753-765), AudioPanel.tsx
- Pattern: Tracks start position, trim points, volume; can be assigned to regions of timeline
- Serialization: Included in EditorState for export

## Entry Points

**Web Browser (`app/layout.tsx`):**
- Location: `app/layout.tsx`
- Triggers: User navigates to any URL on the domain
- Responsibilities: Root HTML layout, Google Fonts preload, dark mode setup, metadata

**Marketing Landing Page (`app/page.tsx`):**
- Location: `app/page.tsx`
- Triggers: User visits `/` or `clipfox.com`
- Responsibilities: OAuth login buttons, hero section, testimonials, pricing CTA, redirect to dashboard if authenticated

**App Dashboard (`app/app/page.tsx`):**
- Location: `app/app/page.tsx` (or `/dashboard/page.tsx` which redirects via middleware)
- Triggers: Authenticated user visits `/` on app subdomain
- Responsibilities: Display user's clips grid, usage stats, quick actions (Upload, ClipGPT, Publish, etc.)

**Editor Page (`app/app/edit/[id]/page.tsx`):**
- Location: `app/app/edit/[id]/page.tsx`
- Triggers: User clicks "Edit" on a clip from dashboard
- Responsibilities: Load clip video, initialize editor state, render Timeline + ElementsPanel + preview, coordinate all editing interactions

**API Export Route (`app/api/export/route.ts`):**
- Location: `app/api/export/route.ts`
- Triggers: User clicks "Export" in editor, or automatic clip processing
- Responsibilities: Verify auth + ownership, check subscription limits, log usage, queue video export job, return export ID

**Middleware Auth Gateway (`middleware.ts`):**
- Location: `middleware.ts`
- Triggers: Every non-API, non-static request
- Responsibilities: Extract subdomain, check if on app.domain.com, validate admin role, rewrite URL to /app/*, redirect unauthenticated users

## Error Handling

**Strategy:** Fallback to error states in UI; console logging for debugging; graceful degradation for failed exports

**Patterns:**

- **Authentication Errors:** If Supabase auth fails, redirect to `/` (main domain) or show login modal
  - File: `app/app/layout.tsx` (line 64-69), middleware.ts (line 156-179)

- **Clip Load Errors:** useClip hook catches Supabase errors, returns `isError: true`; page shows "Clip not found"
  - File: `lib/hooks/useClip.ts` (line 30)

- **Subscription Limit Errors:** Export API returns 403 with "Export limit reached" message; client shows toast
  - File: `app/api/export/route.ts` (lines 66-80)

- **Stripe Errors:** Checkout/webhook errors logged; user notified via email or dashboard message
  - File: `app/api/billing/checkout/route.ts`, `app/api/billing/webhook/route.ts`

- **Storage/Upload Errors:** Supabase storage failures caught; user directed to retry or contact support
  - File: `components/editor/ElementsPanel.tsx` (custom upload handler)

## Cross-Cutting Concerns

**Logging:** Console.log() in development; structured logs via Supabase audit trails for database changes

**Validation:**
- Frontend: Form validation in React components; type checking via TypeScript
- Backend: Request body validation in API routes; Supabase RLS policies enforce authorization

**Authentication:**
- Supabase OAuth (Google, Twitch, Discord) for user login
- JWT tokens stored in HTTP-only cookies by Supabase
- Server-side token verification in API routes and middleware

**Authorization:**
- Supabase RLS policies on tables (clips, subscriptions, usage_logs)
- API routes check user_id matches request context
- Middleware checks admin role before allowing `/admin` routes

**Rate Limiting:** Not explicitly implemented; relies on Supabase connection limits and Stripe API rate limits

**Caching:**
- SWR hook on useClip with 1-minute deduplication interval
- No explicit client-side cache invalidation; mutations call `mutate()` to revalidate

---

*Architecture analysis: 2026-01-22*

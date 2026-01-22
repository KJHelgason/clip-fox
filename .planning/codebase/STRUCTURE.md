# Codebase Structure

**Analysis Date:** 2026-01-22

## Directory Layout

```
ai-clipper/
├── app/                          # Next.js App Router pages and API routes
│   ├── (marketing)/              # Main domain routes (marketing landing)
│   │   ├── page.tsx              # Landing page at /
│   │   └── pricing/page.tsx       # Pricing page at /pricing
│   ├── app/                       # App subdomain authenticated routes
│   │   ├── page.tsx              # Dashboard (start page)
│   │   ├── account/page.tsx       # User account settings
│   │   ├── clips/page.tsx         # Video library
│   │   ├── connections/page.tsx   # Social auth connections
│   │   ├── edit/[id]/page.tsx     # Main clip editor
│   │   ├── edit/layout.tsx        # Editor layout (sidebar + content)
│   │   ├── upload/page.tsx        # Upload clip form
│   │   ├── settings/billing/page.tsx  # Subscription management
│   │   └── layout.tsx             # App layout with sidebar + auth
│   ├── dashboard/                # Legacy routes (redirect to /app via middleware)
│   │   ├── page.tsx, edit/[id]/page.tsx, settings/billing/page.tsx, etc.
│   ├── api/                       # API endpoints (work on both domains)
│   │   ├── billing/
│   │   │   ├── checkout/route.ts      # Create Stripe checkout session
│   │   │   ├── portal/route.ts        # Customer portal redirect
│   │   │   └── webhook/route.ts       # Stripe webhook handler
│   │   ├── export/
│   │   │   ├── route.ts               # POST create export, GET list exports
│   │   │   └── [id]/route.ts          # GET/PATCH/DELETE single export
│   │   ├── clips/
│   │   │   └── [id]/route.ts          # GET/PATCH/DELETE clip metadata
│   │   ├── ai/
│   │   │   └── transcribe/route.ts    # AI transcription placeholder
│   │   ├── social/
│   │   │   ├── connect/route.ts       # OAuth initiate
│   │   │   ├── disconnect/route.ts    # Revoke connection
│   │   │   ├── callback/route.ts      # OAuth callback (TikTok, Instagram)
│   │   │   └── callback/[platform]/route.ts  # Platform-specific callbacks
│   │   ├── twitch/
│   │   │   ├── clips/route.ts         # Fetch user's Twitch clips
│   │   │   └── emotes/route.ts        # Fetch 7TV emotes by username
│   │   ├── download/route.ts          # Parse clip URL and download
│   │   └── giphy/route.ts             # Search Giphy stickers/GIFs
│   ├── admin/                     # Admin routes (role-gated by middleware)
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── users/page.tsx
│   ├── layout.tsx                 # Root layout (fonts, metadata, dark mode)
│   └── globals.css                # Global styles (animations, prefers-reduced-motion)
├── components/                    # Reusable React components
│   ├── editor/                    # Video editor components
│   │   ├── ElementsPanel.tsx      # Add/edit text, images, stickers (3742 lines)
│   │   ├── Timeline.tsx           # Overlay timeline + video scrubber (2019 lines)
│   │   ├── AudioPanel.tsx         # Sound/music library + trim modal (640 lines)
│   │   ├── ExportPanel.tsx        # Export settings + download button
│   │   ├── OverlayProperties.tsx  # Edit selected element properties
│   │   ├── CaptionEditor.tsx      # Auto-caption styling
│   │   ├── LayoutTemplates.tsx    # Preset layouts (9:16, split-screen, etc.)
│   │   ├── EffectOverlay.tsx      # Visual effects (zoom, blur, shake)
│   │   ├── ZoomEffects.tsx        # Zoom keyframe editor
│   │   ├── ZoomOverlay.tsx        # Zoom preview with crop region
│   │   ├── AspectRatioPreview.tsx # Video preview with aspect ratio crop
│   │   ├── CropToolbar.tsx        # Crop mode controls
│   │   ├── PreviewCropRegion.tsx  # Draggable crop preview overlay
│   │   ├── TrimAudioModal.tsx     # Audio trim UI
│   │   ├── TrimSlider.tsx         # Dual-handle trim slider
│   │   └── stickers/
│   │       └── StickerRenderer.tsx # Animated social sticker rendering (900+ lines)
│   ├── ui/                        # Shadcn-style base UI components
│   │   ├── button.tsx             # Styled button
│   │   ├── card.tsx               # Card container
│   │   ├── input.tsx              # Text input field
│   │   ├── slider.tsx             # Range slider
│   │   ├── dialog.tsx             # Modal dialog
│   │   ├── dropdown-menu.tsx       # Dropdown menu
│   │   ├── badge.tsx              # Pill badge
│   │   └── avatar.tsx             # User avatar circle
│   ├── AuthForm.tsx               # OAuth login form
│   ├── LoggedInUI.tsx             # Auth state wrapper
│   └── TrimSlider.tsx             # Shared trim slider
├── lib/                           # Utilities, types, and hooks
│   ├── types.ts                   # Central type definitions (846 lines)
│   │   ├── Subscription/Billing types (PlanId, SubscriptionStatus, PlanLimits)
│   │   ├── Auto-Clip Pipeline types (AutoClipSettings, AutoClipQueueItem)
│   │   ├── ClipGPT types (ClipGPTProject, ClipGPTMoment)
│   │   ├── Social Publishing types (SocialConnection, ScheduledPost)
│   │   ├── Editor types (OverlayElement, EditorState, ZoomKeyframe)
│   │   ├── Aspect ratios (ASPECT_RATIOS, LAYOUT_TEMPLATES)
│   │   ├── Sticker types (SocialSticker, StickerTemplate, STICKER_CATEGORIES)
│   │   ├── Caption styles (CaptionStyle, CAPTION_STYLES)
│   │   └── Helper functions (findAvailableRow, timeToPosition, formatTime)
│   ├── hooks/
│   │   ├── useClip.ts             # Fetch clip + signed URL with SWR caching
│   │   ├── useClipEdit.ts         # MISSING - for edit state management (planned)
│   │   ├── usePreviewCropDrag.ts  # Dragging/resizing elements in preview
│   │   ├── useSounds.ts           # Sound library fetching
│   │   └── useSubscription.ts     # Check user's current plan
│   ├── supabase/
│   │   └── useUser.ts             # Get authenticated user profile
│   ├── supabase.ts                # Supabase browser client setup
│   ├── stripe.ts                  # Stripe SDK + plan configuration
│   ├── utils.ts                   # Utility functions (cn(), etc.)
│   └── contexts/
│       └── (None found - consider adding for global editor state)
├── supabase/                      # Database schema and migrations
│   ├── setup.sql                  # Initial schema (tables, RLS policies, triggers)
│   └── migrations/
│       └── 20260120_add_twitch_kick_to_social_connections.sql
├── public/                        # Static assets (images, fonts, etc.)
│   ├── stickers/                  # Sticker PNG files
│   ├── layouts/                   # Layout template preview images
│   └── (other static files)
├── .planning/                     # GSD planning documents
│   └── codebase/                  # Architecture/structure analysis
├── middleware.ts                  # Next.js middleware (subdomain routing + auth gating)
├── next.config.ts                 # Next.js config (optimize package imports)
├── tsconfig.json                  # TypeScript config (path alias @/*)
├── package.json                   # Dependencies (Next.js, React, Supabase, Stripe, framer-motion)
└── .env.example                   # Environment variable template
```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router - all page components and API endpoints
- Key files: layout.tsx (root + per-section), page.tsx (each route)
- Structure: Follows Next.js file-based routing with `(group)` and `[dynamic]` segments

**app/api/:**
- Purpose: Server-side HTTP endpoints for client requests
- Patterns: Each folder represents an endpoint group; route.ts is the handler
- Auth: Uses Supabase admin client or Bearer token from request header
- Returns: JSON responses with status codes

**components/editor/:**
- Purpose: Complex, interactive video editing UI
- Size: ElementsPanel (3742 lines), Timeline (2019 lines), AudioPanel (640 lines) - very large components
- Patterns: Heavy use of local state (useState), refs for drag tracking, dynamic imports in parent page
- Note: These should be split into smaller sub-components in a future refactor

**lib/types.ts:**
- Purpose: Single source of truth for all TypeScript types
- Size: 846 lines
- Pattern: Discriminated unions for overlay types; constant arrays for preset options (layouts, captions, stickers)
- Usage: Imported throughout codebase to ensure type consistency

**lib/hooks/:**
- Purpose: Reusable React hooks for data fetching and state management
- Pattern: useClip uses SWR for caching; usePreviewCropDrag uses useRef for drag state
- Note: Missing centralized editor state hook (currently inline in page component)

**supabase/setup.sql:**
- Purpose: Database schema definition
- Contains: Table definitions (clips, subscriptions, profiles, usage_logs, etc.), RLS policies, triggers
- Process: Run once to initialize Postgres schema in Supabase

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root HTML, Google Fonts, dark mode meta tags
- `app/page.tsx`: Landing page (OAuth login, hero, features, testimonials, FAQ)
- `app/app/layout.tsx`: Authenticated app layout (sidebar navigation)
- `app/app/edit/[id]/page.tsx`: Main editor (coordinator of all editor panels)

**Configuration:**
- `middleware.ts`: Subdomain routing rules + auth checks
- `next.config.ts`: Icon optimization (lucide-react barrel file imports)
- `tsconfig.json`: Path alias `@/*` → root directory
- `.env.example`: Template for env vars (Supabase, Stripe, API keys)

**Core Logic:**
- `lib/types.ts`: All type definitions
- `lib/hooks/useClip.ts`: Clip fetching with signed URLs
- `lib/supabase.ts`: Supabase client initialization
- `lib/stripe.ts`: Stripe SDK + plan/price configuration

**Testing:**
- Not found - no test files detected in codebase

## Naming Conventions

**Files:**
- Page routes: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx` (Next.js convention)
- API handlers: `route.ts` (Next.js convention)
- Components: PascalCase (e.g., `ElementsPanel.tsx`, `Timeline.tsx`)
- Utilities: camelCase (e.g., `useClip.ts`, `supabase.ts`)
- Types: PascalCase for exported types (e.g., `OverlayElement`, `PlanLimits`)
- Constants: UPPER_SNAKE_CASE for constants (e.g., `ASPECT_RATIOS`, `CAPTION_STYLES`)

**Directories:**
- Feature-based (e.g., `editor/`, `billing/`, `social/`)
- Lowercase (e.g., `components/`, `lib/`, `hooks/`)
- Grouped routes wrapped in parentheses (e.g., `(marketing)/`, not exposed in URL)

**Variables & Functions:**
- camelCase for functions (e.g., `handleExport()`, `findAvailableRow()`)
- camelCase for variables (e.g., `clipId`, `isLoading`, `overlays`)
- Boolean prefixed with is/has/can (e.g., `isLoading`, `hasError`, `canExport`)

## Where to Add New Code

**New Feature (e.g., Analytics Dashboard):**
- Primary code: `app/app/analytics/page.tsx` (page), `components/analytics/` (components)
- API routes: `app/api/analytics/route.ts` (if needed)
- Types: Add to `lib/types.ts` under new section
- Tests: Create `app/app/analytics/__tests__/page.test.tsx` (when testing added)

**New Component/Module (e.g., New Editor Panel):**
- Implementation: `components/editor/NewPanel.tsx` or `components/editor/newPanel/index.tsx`
- If large (>1500 lines), split into sub-components: `components/editor/newPanel/Header.tsx`, `components/editor/newPanel/Content.tsx`
- Export from barrel file: `components/editor/index.ts` (if created)
- Import in parent: Use dynamic() if heavy; static import if < 5KB

**Utilities/Helpers:**
- Single-use: Define inline in component or in same file as usage
- Multi-use: Create in `lib/utils.ts` or new file in `lib/` (e.g., `lib/video-processing.ts`)
- Hooks: Place in `lib/hooks/` with use prefix (e.g., `useVideoMetadata.ts`)

**Database Changes:**
- Schema: Add to `supabase/setup.sql` for fresh setups
- Migrations: Create new file in `supabase/migrations/` with timestamp (e.g., `20260122_add_feature_table.sql`)
- RLS: Add policies in setup.sql or migration
- Trigger functions: Define in PostgreSQL, call from application

**API Routes:**
- RESTful: Group by resource (`/api/clips/`, `/api/export/`)
- Auth check: Always verify token at start of route handler
- Error handling: Return JSON with descriptive error messages
- Usage logging: Call `/api/export` to log actions for metering

## Special Directories

**app/(marketing)/:**
- Purpose: Public pages (no auth required)
- Generated: Not generated
- Committed: Yes
- Contains: Landing page, pricing, FAQ, blog (planned)

**app/api/:**
- Purpose: Server-side handlers
- Generated: No
- Committed: Yes
- Note: Each route.ts handles one HTTP method (POST, GET, etc.)

**public/:**
- Purpose: Static assets served at root URL
- Generated: No (managed manually)
- Committed: Yes
- Structure: Organized by asset type (stickers/, layouts/, fonts/)

**supabase/migrations/:**
- Purpose: Version-controlled database schema changes
- Generated: No (created manually)
- Committed: Yes
- Pattern: Filename format `YYYYMMDD_description.sql`
- Process: Applied in order; immutable once committed

**node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (from package.json + lock file)
- Committed: No (in .gitignore)

**.next/:**
- Purpose: Build output (compiled pages, server functions, type definitions)
- Generated: Yes (from `npm run build`)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-01-22*

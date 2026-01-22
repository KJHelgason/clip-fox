# AI Clipper - Full Platform Development

## Project Overview
Video editing application with clip editing, elements overlay, and export functionality. Designed to match and exceed StreamLadder's capabilities.

---

## Subdomain Routing Architecture

Like StreamLadder, ClipFox uses subdomain routing:
- **Main domain** (clipfox.com) - Marketing/landing pages
- **App subdomain** (app.clipfox.com) - Authenticated app pages (dashboard, editor, account, etc.)

### How It Works
1. **middleware.ts** intercepts all requests and checks the subdomain
2. If on `app.domain.com`, requests are rewritten to `/app/*` routes internally
3. Auth is checked on the app subdomain - unauthenticated users are redirected to main domain

### Folder Structure
```
app/
├── (marketing)/          # Main domain pages (landing, pricing, etc.)
│   ├── page.tsx          # Landing page at clipfox.com/
│   └── pricing/page.tsx  # Pricing at clipfox.com/pricing
├── app/                  # App subdomain pages (served at app.clipfox.com/)
│   ├── layout.tsx        # App layout with sidebar
│   ├── page.tsx          # Dashboard at app.clipfox.com/
│   ├── account/page.tsx  # Account at app.clipfox.com/account
│   ├── clips/page.tsx    # Clips at app.clipfox.com/clips
│   ├── edit/[id]/page.tsx# Editor at app.clipfox.com/edit/[id]
│   ├── upload/page.tsx   # Upload at app.clipfox.com/upload
│   └── connections/page.tsx
└── api/                  # API routes (work on both domains)
```

### Local Development
To test subdomain routing locally:
1. Access `app.localhost:3000` for the app subdomain
2. Access `localhost:3000` for the main domain
3. Modern browsers support `*.localhost` subdomains natively

### Environment Variables
```bash
APP_SUBDOMAIN=app         # Subdomain for authenticated app
ROOT_DOMAIN=localhost:3000 # Root domain (for production: clipfox.com)
```

---

## TODO - Setup Required (User Action Items)

Before the payment system and new features work, complete these setup steps:

### 1. Set up Stripe Products/Prices
- Go to [Stripe Dashboard](https://dashboard.stripe.com/products)
- Create products for "Pro" and "Business" plans
- Create prices for each (monthly and yearly):
  - Pro Monthly: $12/mo
  - Pro Yearly: $96/yr ($8/mo)
  - Business Monthly: $29/mo
  - Business Yearly: $232/yr (~$19.33/mo)
- Copy the Price IDs (e.g., `price_xxx`)

### 2. Add Environment Variables
Copy `.env.example` to `.env.local` and fill in:
```bash
# Stripe (from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx  # From webhook setup
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Stripe Price IDs (from step 1)
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxx
STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up Stripe Webhook
- Go to [Stripe Webhooks](https://dashboard.stripe.com/webhooks)
- Add endpoint: `https://your-domain.com/api/billing/webhook`
- Select events: `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

### 4. Run Database Migrations
In Supabase SQL Editor, run the updated `supabase/setup.sql` to create:
- `subscription_plans` table with Free/Pro/Business tiers
- `subscriptions` table for user subscriptions
- `usage_logs` table for tracking exports/AI calls
- Auto-clip, ClipGPT, social publishing tables
- Helper functions for usage tracking

### 5. Implement Video Processing Backend
For actual video exports (currently placeholder):
- Option A: Vercel Background Functions with FFmpeg
- Option B: Dedicated video processing server
- Option C: Third-party service (Mux, Cloudinary Video)

---

## Platform Roadmap (StreamLadder Competitor)

### Target Feature Parity with StreamLadder
| Feature | StreamLadder | AI Clipper Status |
|---------|--------------|-------------------|
| Clip Editor | Yes | Built (needs export backend) |
| Payment/Billing | Yes | Built (Stripe integration) |
| Pricing Page | Yes | Built (/pricing) |
| ClipGPT (AI VOD Analysis) | Yes | API route built, UI planned |
| Content Publisher | Yes | DB schema ready, UI planned |
| Montage Maker | Yes | DB schema ready, UI planned |
| Emote Maker | Yes (Free) | Planned |
| Clip Downloader | Yes (Free) | API route built, UI planned |
| Schedule Maker | Yes | DB schema ready, UI planned |

### Pricing Tiers (Stripe)
| Tier | Price | Features |
|------|-------|----------|
| Free | $0/mo | 3 exports/mo, 720p, watermark, basic elements |
| Pro | $12/mo | 30 exports/mo, 1080p, no watermark, AI captions, all elements |
| Business | $29/mo | Unlimited, 4K, ClipGPT, social publishing, analytics |

### Unique Differentiators (Exceed StreamLadder)

1. **Auto-Clip Pipeline** (MAJOR FEATURE)
   - Automatically monitors user's YouTube/Twitch/Kick channels
   - AI detects best moments from VODs, clips, uploads
   - Applies user's configured edits (captions, zoom, stickers, etc.)
   - Auto-publish mode: Schedules and posts to social platforms
   - Approval mode: Queues clips for user review before posting
   - Requires: `auto_clip_settings` and `auto_clip_queue` database tables

2. **URL Quick-Edit**
   - User pastes any YouTube/Twitch/Kick URL
   - System downloads, analyzes, and edits automatically
   - Returns viral-ready clips based on user's presets
   - Works with any public video, not just user's own content

3. **AI Auto-Editor** - One-click: Upload VOD → get viral-ready clips
4. **Analytics Dashboard** - Track views across all platforms
5. **Brand Kit** - Save brand colors, fonts, logos for consistent branding
6. **Bulk Operations** - Apply edits to multiple clips, batch export

### Pages Status
```
/pricing                        - Public pricing page [BUILT]
/dashboard/settings/billing     - Subscription management [BUILT]
/dashboard/auto-clip            - Auto-Clip Pipeline settings (P1)
/dashboard/auto-clip/queue      - Review pending auto-clips (P1)
/dashboard/auto-clip/history    - Auto-clip processing history (P1)
/dashboard/quick-edit           - URL Quick-Edit - paste & edit (P1)
/dashboard/clipgpt              - AI VOD analysis projects (manual)
/dashboard/clipgpt/new          - Create ClipGPT project
/dashboard/clipgpt/[id]         - View analyzed moments
/dashboard/publish              - Content calendar
/dashboard/publish/accounts     - Manage social connections
/dashboard/analytics            - Performance tracking (P2)
/dashboard/download             - Clip downloader
/dashboard/montage              - Montage maker
/dashboard/emote                - Emote maker
/dashboard/stream-schedule      - Schedule maker
/dashboard/templates            - Template marketplace
/dashboard/brand-kit            - Brand settings
```

### New Database Tables Required
```sql
-- Subscription system
subscription_plans (id, name, price_monthly, price_yearly, features, limits, stripe_price_ids)
subscriptions (id, user_id, plan_id, stripe_subscription_id, status, period_start/end)
usage_logs (id, user_id, action_type, resource_id, metadata)

-- Auto-Clip Pipeline (MAJOR FEATURE)
auto_clip_settings (id, user_id, platform, enabled, monitor_types, edit_preferences, output_settings, auto_publish, publish_destinations, approval_required)
auto_clip_queue (id, user_id, source_platform, source_url, source_type, detected_moments, status, edit_result_url, scheduled_publish_at, published_urls)

-- ClipGPT
clipgpt_projects (id, user_id, vod_url, platform, status, clips_found)
clipgpt_moments (id, project_id, start_time, end_time, virality_score, title, hashtags)

-- Social publishing
social_connections (id, user_id, platform, access_token, refresh_token, expires_at)
scheduled_posts (id, user_id, clip_id, platform, scheduled_for, title, description, status)

-- Additional tools
montages (id, user_id, title, clip_ids, transitions, output_path, status)
stream_schedules (id, user_id, template_name, timezone, schedule, style_settings)
```

### API Routes Status
```
app/api/
├── billing/                    [BUILT]
│   ├── checkout/route.ts       - Create Stripe checkout session
│   ├── portal/route.ts         - Open Stripe customer portal
│   └── webhook/route.ts        - Handle Stripe webhooks
├── export/                     [BUILT]
│   ├── route.ts                - Create export with subscription limits
│   └── [id]/route.ts           - Get export status, cancel export
├── clips/                      [BUILT]
│   └── [id]/route.ts           - GET/PATCH/DELETE clip
├── ai/                         [PARTIAL]
│   └── transcribe/route.ts     - AI transcription (placeholder)
│   └── censor, silence, hook   - TODO
├── social/                     [TODO]
│   └── auth/[platform], publish, schedule
└── download/route.ts           [BUILT] - URL parser for Twitch/YT/Kick
```

### Dependencies Added
```json
{
  "@stripe/stripe-js": "^2.4.0",    // [INSTALLED]
  "stripe": "^14.14.0",             // [INSTALLED]
  "@ffmpeg/ffmpeg": "^0.12.10",     // [INSTALLED]
  "@ffmpeg/util": "^0.12.1",        // [INSTALLED]
  "date-fns": "^3.6.0",             // [INSTALLED]
  "yt-dlp-exec": "^2.x"             // TODO - for actual downloads
}
```

---

## TODO - UI/UX Web Interface Guidelines Fixes

**Reviewed against Vercel Web Interface Guidelines (January 2026)**

### Critical Issues (Must Fix)

#### 1. Icon Buttons Missing `aria-label` (~20+ buttons)
**Files to fix:**
- `components/editor/Timeline.tsx`
  - Line 958-977: frameBack, play/pause, frameForward buttons
  - Line 1025-1059: zoomOut, zoomIn, shortcuts, collapse buttons
  - Line 1941: Close button in shortcuts modal
- `components/editor/AudioPanel.tsx`
  - Line 387-399: Play/pause button
  - Line 459-465: Add to timeline button
  - Line 448-456: Delete button
- `app/pricing/page.tsx`
  - Line 446-465: Social media link icons (Discord, X, Instagram, TikTok)

**Fix pattern:**
```tsx
// Before
<button onClick={frameBack} className="...">
  <SkipBack className="w-4 h-4" />
</button>

// After
<button onClick={frameBack} className="..." aria-label="Previous frame">
  <SkipBack className="w-4 h-4" />
</button>
```

#### 2. Missing `color-scheme: dark` on HTML Element
**File:** `app/layout.tsx`
```tsx
// Before
<html lang="en">

// After
<html lang="en" style={{ colorScheme: 'dark' }}>
```

#### 3. Missing Theme Color Meta Tag
**File:** `app/layout.tsx`
```tsx
// Add to <head>
<meta name="theme-color" content="#0a0a12" />
```

#### 4. Form Inputs Missing `name` and `autocomplete`
**Files to fix:**
- `components/ui/input.tsx` - Add sensible defaults
- `components/editor/AudioPanel.tsx:522-527` - Search input needs `name="search"` and `autocomplete="off"`
- `components/editor/AudioPanel.tsx:405-416` - Rename input needs `name` and `autocomplete`
- `components/editor/Timeline.tsx:1011-1019` - Volume input needs label
- `components/editor/Timeline.tsx:1043-1050` - Zoom input needs label

#### 5. Add `prefers-reduced-motion` Support
**File:** `app/globals.css`
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Medium Priority Issues

#### 6. Images Missing Explicit Dimensions
**Files to fix:**
- `components/editor/Timeline.tsx:1774-1778` - Thumbnails need width/height
- `components/editor/ElementsPanel.tsx` - Multiple image instances
- `app/dashboard/layout.tsx:177`

#### 7. Destructive Actions Need Confirmation
**Files to fix:**
- `components/editor/AudioPanel.tsx:448-456` - Delete sound should confirm
- `components/editor/Timeline.tsx:1161-1169` - Delete selected should confirm

**Fix pattern:**
```tsx
const handleDelete = () => {
  if (window.confirm('Are you sure you want to delete this?')) {
    // perform deletion
  }
}
```

#### 8. Touch Improvements
**File:** `components/editor/Timeline.tsx`
- Add `touch-action: manipulation` to timeline scrub area

**File:** `components/ui/dialog.tsx`
- Add `overscroll-behavior: contain` to modal overlay

#### 9. URL State for Filters
**File:** `app/pricing/page.tsx`
- Billing interval (`monthly`/`yearly`) should be in URL params
```tsx
// Use useSearchParams to persist interval in URL
const searchParams = useSearchParams()
const interval = searchParams.get('interval') || 'monthly'
```

### Implementation Checklist

- [ ] **Phase 1: Accessibility (Critical)**
  - [ ] Add aria-labels to all icon buttons in Timeline.tsx
  - [ ] Add aria-labels to all icon buttons in AudioPanel.tsx
  - [ ] Add aria-labels to social links in pricing page
  - [ ] Add accessible labels to range inputs (volume, zoom)

- [ ] **Phase 2: Dark Mode & Meta**
  - [ ] Add `color-scheme: dark` to html element
  - [ ] Add `<meta name="theme-color">` tag
  - [ ] Verify dark mode works on all form controls

- [ ] **Phase 3: Forms**
  - [ ] Add name/autocomplete to Input component
  - [ ] Fix search input in AudioPanel
  - [ ] Fix rename input in AudioPanel

- [ ] **Phase 4: Animation & Motion**
  - [ ] Add prefers-reduced-motion media query to globals.css
  - [ ] Test all animations respect the preference

- [ ] **Phase 5: Images & Performance**
  - [ ] Add explicit width/height to Timeline thumbnails
  - [ ] Audit ElementsPanel images for dimensions
  - [ ] Add loading="lazy" to below-fold images

- [ ] **Phase 6: UX Improvements**
  - [ ] Add confirmation dialogs for delete actions
  - [ ] Add touch-action to timeline
  - [ ] Add overscroll-behavior to dialogs
  - [ ] Persist billing interval in URL

---

## TODO - Upcoming Features

### AI Features (Not Yet Implemented)
These features require external AI APIs and are planned for future implementation:

1. **AI Word Censoring**
   - **Detection**: Use OpenAI Whisper API (~$0.006/min) for speech-to-text with word-level timestamps
   - **Alternative**: AssemblyAI (has built-in profanity detection)
   - **Censoring Options**: Mute/silence, bleep (1kHz tone), or audio ducking
   - **Implementation**: Extract audio → Whisper transcription → Find matching words → FFmpeg to mute segments

2. **AI Remove Silences**
   - **Approach**: FFmpeg's `silencedetect` filter (no heavy AI needed)
   - **Threshold**: -30dB to -50dB for silence detection
   - **Command**: `ffmpeg -i input.mp4 -af silencedetect=noise=-30dB:d=0.5 -f null -`
   - **Implementation**: Parse silence_start/silence_end timestamps → FFmpeg to remove segments

3. **AI Hook Intro Title**
   - **Approach**: Send video transcript to GPT-4/Claude
   - **Prompt**: "Generate a 5-10 word attention-grabbing hook for this clip"
   - **Optional**: Analyze video thumbnail for context
   - **Cost**: ~$0.01-0.03 per generation

4. **Text to Speech**
   - **Recommended**: ElevenLabs API (high quality, 29+ voices)
   - **Cost**: ~$0.30/1000 characters (Starter plan)
   - **Alternatives**: Google Cloud TTS, Amazon Polly, Azure Speech
   - **Popular Voices**: Rachel (calm), Josh (deep), Bella (soft), Antoni (well-rounded)

**Estimated Total Cost**: ~$0.03-0.10 per clip for all AI features

### Zoom Feature - FIXED
1. **Zoom preview now shows**:
   - Full source video (landscape 16:9)
   - Vertical mobile crop overlay (9:16 aspect ratio) that user can drag horizontally
   - Darkened overlay outside the crop area for clarity
   - "Add Zoom" button that adds zoom keyframes to timeline at current time
   - Zoom level slider (110% - 300%)
   - Saved zooms section for presets

2. **Element tab behavior - FIXED**:
   - Added `requestEditView` prop to ElementsPanel
   - Edit view only opens when user clicks "Edit" button in element context menu
   - Clicking elements on Elements tab no longer auto-opens edit panel
   - Implementation: `setRequestElementEditView(true)` + `setActiveTab('elements')` on Edit button click

---

## Recent Updates (Session 4)

### New Element Sections Added
1. **Animated Stickers** (Giphy powered)
   - 3-column grid, 9 items in main view
   - Search functionality with Giphy API
   - Uses public beta API key (replace for production)

2. **GIFs** (Giphy powered)
   - 3-column grid, 9 items in main view
   - Search + trending GIFs

3. **Twitch Emotes** (7TV powered)
   - 4-column grid, 12 items in main view
   - Search by Twitch username
   - No API key required (7TV public API)

4. **Reactions**
   - 4 platforms: Twitch, TikTok, Instagram, Twitter
   - Modal with username/message inputs
   - Dark mode toggle
   - Live preview

### API Keys
```typescript
// Giphy - Public beta key (limited rate)
const GIPHY_API_KEY = 'GlVGYHkr3WSBnllca54iNt0yFbjz7L65'
// For production: https://developers.giphy.com/

// 7TV - No key required
// Endpoint: https://7tv.io/v3/users/twitch/{username}
```

---

## Session 3 Updates

### Social Stickers Improvements
1. **Sticker display on video** - Fixed by using StickerRenderer component in video preview
2. **Thumbnail sizing** - Increased height from 56px to 72px with proper padding
3. **Username input lag** - Fixed with local state + debounced database save (500ms)
4. **Professional visual styling** - All sticker templates updated with:
   - Gradient backgrounds instead of flat colors
   - Multi-layer box shadows for depth
   - Better typography with tracking adjustments
   - Style variations (dark/light/gradient/default)

### Complex Multi-Step Animations
Created `COMPLEX_ANIMATIONS` system for professional sticker animations:

```typescript
// Available in StickerRenderer.tsx
export const COMPLEX_ANIMATIONS = {
  logoAndBanner,   // Logo slides up, banner reveals from left
  glowType,        // Icon pops with glow, text reveals with clip-path
  cardFlip,        // 3D card flip with perspective
  elasticBounce,   // Spring physics with overshoot
  cinematicZoom,   // Zoom from blur effect
  splitReveal      // Elements from opposite directions
}
```

### Fit Calculation Bug Fixed
- Added ResizeObserver to detect container size changes
- Added useEffect triggered on `overlays.length` changes
- Prevents preview from filling entire screen height

---

## Session 2 Bug Fixes - COMPLETED

1. **Elements not movable/resizable in preview** - Global document event listeners
2. **Timeline element dragging** - overlayDragState ref for move/resize
3. **Preview zoom controls** - Dropdown with Fit/75%/50%/33%/25%
4. **Delete element navigation** - Resets to 'main' view
5. **Text element UI redundancy** - Hidden when on Elements tab
6. **Animated stickers** - Framer-motion with 12+ animation variants

---

## Animated Stickers System (Complete Reference)

### Architecture Overview
The sticker animation system uses Framer Motion with a two-tier approach:
1. **Simple animations** - Single-element transitions (fadeIn, slideUp, etc.)
2. **Complex animations** - Multi-step sequences with independent element timing

### How to Add New Complex Animations

1. **Define the animation in COMPLEX_ANIMATIONS** (`StickerRenderer.tsx`):
```typescript
newAnimation: {
  container: {
    hidden: { /* initial state */ },
    visible: { /* final state + transition */ }
  },
  icon: {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, delay: 0 }
    }
  },
  banner: {
    hidden: { opacity: 0, scaleX: 0 },
    visible: {
      opacity: 1,
      scaleX: 1,
      transition: { duration: 0.4, delay: 0.3 }
    }
  },
  text: {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.25, delay: 0.5 }
    }
  }
}
```

2. **Use in a sticker component**:
```typescript
const animationType = config.animation || 'logoAndBanner'
const complexAnim = COMPLEX_ANIMATIONS[animationType] || COMPLEX_ANIMATIONS.logoAndBanner

return (
  <motion.div variants={complexAnim.container} initial="hidden" animate="visible">
    <motion.div variants={complexAnim.icon}>{icon}</motion.div>
    <motion.div variants={complexAnim.banner}>
      <motion.span variants={complexAnim.text}>{username}</motion.span>
    </motion.div>
  </motion.div>
)
```

3. **Add to SOCIAL_STICKERS in ElementsPanel.tsx**:
```typescript
{
  id: 'new-sticker',
  template: 'follow',
  type: 'animated',
  animation: 'newAnimation', // matches key in COMPLEX_ANIMATIONS
  // ...other props
}
```

### Animation Timing Tips
- **Icon**: 0ms delay (first element)
- **Banner/Container**: 300-400ms delay
- **Text**: 500-600ms delay
- **Total duration**: ~800ms for full sequence
- Use `ease: [0.25, 0.46, 0.45, 0.94]` for smooth motion
- Use `type: 'spring'` for bouncy effects

### Current Sticker → Animation Mapping
| Template | Default Animation | Style |
|----------|------------------|-------|
| basic | glowType | Icon glow + text reveal |
| follow | logoAndBanner | Icon bounce + banner slide |
| card | cardFlip | 3D flip perspective |
| subscribe | containerVariants | Simple stagger |
| banner | containerVariants | Simple stagger |

---

## Elements Panel Implementation - COMPLETED

### A. Custom Elements
- [x] Custom element upload system with Supabase storage
- [x] Custom elements grid (4 cols default, 2 cols in full view)
- [x] Custom element interaction (add to preview, resize, animations)

### B. Social Stickers
- [x] Social stickers grid layout (2 cols, top 6 in default)
- [x] Social sticker view with filters and username customization
- [x] Sticker templates with dynamic rendering
- [x] Complex multi-step animations

### C. Text Elements
- [x] Text elements grid (2 cols, top 6 in default)
- [x] Text element editing (Edit, Style, Animations, Presets tabs)
- [ ] Font dropdown improvements (WIP)
- [ ] Style menu overhaul (WIP)

---

## Data-Driven Sticker System

### Sticker Templates
```typescript
type StickerTemplate =
  | 'basic'      // Icon + username (pill shape)
  | 'follow'     // "FOLLOW" label + icon + username
  | 'subscribe'  // YouTube-style button
  | 'banner'     // Wide with gradient
  | 'badge'      // Compact mini badge
  | 'card'       // Icon on top, text below
  | 'minimal'    // No background, just icon + text
```

### Sticker Styles
```typescript
type StickerStyle = 'default' | 'dark' | 'light' | 'gradient'
```

### Platform Colors
```typescript
const PLATFORM_STYLES = {
  twitch: '#9146FF',
  youtube: '#FF0000',
  tiktok: '#000000',
  instagram: '#E4405F',
  kick: '#53FC18',
  twitter: '#000000',
  facebook: '#1877F2',
  discord: '#5865F2'
}
```

---

## File Structure

```
components/editor/
  ElementsPanel.tsx       - All element management (~1,600 lines)
  stickers/
    StickerRenderer.tsx   - Sticker rendering + animations (~900 lines)
  PreviewCropRegion.tsx   - Crop region rendering
  Timeline.tsx            - Timeline with overlay dragging
  OverlayProperties.tsx   - Element editing panel

lib/
  types.ts                - Type definitions (OverlayElement, StickerTemplate, etc.)

app/
  globals.css             - CSS keyframe animations
  dashboard/edit/[id]/
    page.tsx              - Main editor page

supabase/
  setup.sql               - Database schema
```

---

## Database Schema

```sql
-- Custom elements storage
custom_elements (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name TEXT,
  file_path TEXT,
  file_url TEXT,
  file_type TEXT,
  width INT,
  height INT,
  file_size BIGINT,
  created_at TIMESTAMP
)

-- User social usernames
social_usernames (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users,
  youtube TEXT,
  tiktok TEXT,
  instagram TEXT,
  twitch TEXT,
  kick TEXT,
  twitter TEXT,
  facebook TEXT,
  discord TEXT
)
```

---

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit
```

## Dependencies
- framer-motion: ^12.26.2 (animations)
- @supabase/supabase-js (database)
- lucide-react (icons)

## Performance Notes

1. ElementsPanel uses dynamic imports for lazy loading
2. Overlays filtered by currentTime before rendering
3. Aspect ratio preserved via `aspectRatio` property
4. Z-index managed per row (100 + row for content layer)
5. Stickers render as React components (no external assets)
6. Preview thumbnails don't animate (isPreview flag)
7. Global mouse events for smooth dragging
8. ResizeObserver for responsive fit calculation
9. Debounced username saves (500ms)

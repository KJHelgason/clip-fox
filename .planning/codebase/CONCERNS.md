# Codebase Concerns

**Analysis Date:** 2026-01-22

## Tech Debt

### Video Processing Backend Not Implemented

**Issue:** Export and video download functionality are placeholder stubs that simulate processing.

**Files:**
- `app/api/export/route.ts` (lines 134-140)
- `app/api/export/[id]/route.ts`
- `app/api/download/route.ts` (lines 150-154)
- `components/editor/ExportPanel.tsx` (lines 88-115, simulates progress with setTimeout)

**Impact:**
- Exports create database records but don't produce actual video files
- Download endpoint returns mock responses without fetching actual video data
- Video transcoding functionality entirely missing
- Users see success messages but no playable output
- Development/testing cannot verify end-to-end workflow

**Fix Approach:**
1. Implement FFmpeg wrapper for video processing (local or cloud worker)
2. Set up background job queue (Vercel Functions, AWS Lambda, Bull Queue, or similar)
3. Create video processing worker that handles:
   - Video transcoding with specified resolution
   - Overlay rendering onto video track
   - Audio processing (silence removal, effects)
   - Format conversion (MP4, WebM, etc.)
4. Update `/api/export/[id]/route.ts` to poll actual processing status
5. Connect Supabase Storage upload for output files

---

### AI Transcription Not Connected

**Issue:** Transcription endpoint returns hardcoded mock data instead of connecting to Whisper API.

**Files:**
- `app/api/ai/transcribe/route.ts` (lines 147-155)

**Impact:**
- AI captions feature is non-functional
- Premium "Pro" plan feature doesn't work
- Billing logic for AI usage not validated
- Users cannot generate actual captions
- Speech-to-text timestamps are fake, breaking caption sync

**Fix Approach:**
1. Extract audio from video file (FFmpeg)
2. Send to OpenAI Whisper API for transcription
3. Parse response with word-level timestamps
4. Store segments in database with language and accuracy metadata
5. Implement cost tracking (Whisper costs ~$0.006/min)
6. Add error handling for API failures and rate limiting

---

### Template Save Not Implemented

**Issue:** Save Template feature shows modal but doesn't persist to database.

**Files:**
- `components/editor/ExportPanel.tsx` (line 125)

**Impact:**
- Users cannot save preset export configurations
- Each export requires manual setup
- Template feature in UI is non-functional
- No database schema for template storage yet

**Fix Approach:**
1. Create `export_templates` table in Supabase:
   - `id`, `user_id`, `name`, `config` (JSONB), `thumbnail`, `created_at`
2. Add INSERT permissions in RLS policies
3. Implement actual database save in `handleSaveTemplate()`
4. Add list/delete endpoints for template management
5. Load templates on editor page for quick-select

---

## Known Bugs

### Frame Navigation Shows Wrong Visual Feedback

**Issue:** Frame backward/forward buttons in Timeline don't properly sync visual position with actual playback time.

**Files:**
- `components/editor/Timeline.tsx` (lines 958-977)

**Symptoms:**
- Timeline scrubber position doesn't match displayed frame
- User clicks frame buttons but video position appears stuck
- Frame counter may not update correctly

**Trigger:** Click frame navigation buttons while video is playing or immediately after pause.

**Workaround:** Manually scrub timeline to correct position.

---

### Element Delete Doesn't Reset Edit Panel

**Issue:** When deleting an overlay element while in edit mode, the edit panel keeps displaying the deleted element's properties until you manually switch tabs.

**Files:**
- `components/editor/Timeline.tsx`
- `components/editor/OverlayProperties.tsx`

**Symptoms:**
- Edit panel shows ghost data of deleted element
- User can modify "deleted" element properties (changes don't persist)
- Visual confusion about what element is selected

**Workaround:** Click Elements tab, then click another element to refresh the edit panel.

---

### Sticker Username Debounce Not Cancellable

**Issue:** When changing Twitch usernames for stickers, if user types quickly and then changes aspect ratio, the old username might still save after debounce fires.

**Files:**
- `components/editor/ElementsPanel.tsx` (dynamic username save with 500ms debounce)

**Symptoms:**
- Wrong username persists on sticker after aspect ratio change
- User's latest input gets overridden by older debounced save

**Trigger:** Type username for sticker → quickly change aspect ratio before 500ms debounce fires.

**Workaround:** Wait for debounce to complete before changing settings, or manually refresh the component.

---

### Audio Panel Search Input Lag

**Issue:** Despite local state for search, there's still UI lag when typing in the Giphy/emote search field due to re-filtering large datasets on each keystroke.

**Files:**
- `components/editor/AudioPanel.tsx` (lines 522-527)

**Symptoms:**
- Search input feels unresponsive
- Typing appears to stutter
- Grid doesn't filter smoothly

**Cause:** No debounce on search input before filtering ~100+ items.

**Workaround:** Type slower or use 300-500ms input debounce.

---

## Security Considerations

### OAuth State Parameter Uses Base64 Encoding Instead of Cryptographic Signing

**Issue:** OAuth state parameter is base64-encoded but not signed, making it vulnerable to tampering.

**Files:**
- `app/api/social/connect/route.ts` (line 133)
- `app/api/social/callback/tiktok/route.ts` (line 27)
- `app/api/social/callback/instagram/route.ts` (line 28)
- `app/api/social/callback/facebook/route.ts` (line 28)

**Risk:**
- Attacker can modify state parameter to inject different `returnUrl` or `userId`
- No way to verify state integrity
- Could redirect user to malicious site after OAuth
- Could associate user with wrong account

**Current Mitigation:**
- URL parameter is validated but not cryptographically verified
- `returnUrl` is user-controlled without whitelist

**Recommendations:**
1. Sign state with HMAC-SHA256 using server secret
2. Verify signature on callback before using state data
3. Whitelist allowed redirect URLs (no user-provided returnUrl)
4. Add CSRF token validation to OAuth initiation

---

### JWT Decoding in Middleware Lacks Verification

**Issue:** Middleware decodes JWT payload without verifying signature or expiry.

**Files:**
- `middleware.ts` (lines 78-91)

**Risk:**
- Attacker can forge JWT with any user ID by modifying payload
- Expired tokens are accepted if cookie still exists
- No cryptographic validation of token authenticity
- Could allow unauthorized access to admin routes

**Current Mitigation:**
- Token is checked against Supabase auth table for admin role (database check)
- Cookie-based, so must pass browser same-origin policy

**Recommendations:**
1. Use `supabaseAdmin.auth.getUser(token)` to verify token (already done in API routes)
2. Add expiry check before accepting JWT
3. Verify JWT signature using Supabase public key
4. Add request-level logging for failed authentications

---

### API Routes Missing Input Validation

**Issue:** Multiple API endpoints accept user input without comprehensive validation or sanitization.

**Files:**
- `app/api/download/route.ts` (line 107) - URL not validated beyond protocol check
- `app/api/export/route.ts` (line 23) - exportSettings object not validated
- `app/api/clips/[id]/route.ts` (line 70) - PATCH body unchecked
- `app/api/social/connect/route.ts` (line 24) - platform parameter not validated against whitelist

**Risk:**
- Malformed input could cause crashes
- Invalid resolution/quality values bypass limits
- Could allow exfiltration of unintended data
- Clip IDs could be invalid UUIDs

**Example:**
```typescript
// Current: accepts any object structure
const body = await req.json() as { clipId: string; exportSettings: ExportSettings }

// Should validate:
if (!isValidUUID(body.clipId)) { return error }
if (!['720p', '1080p', '1440p', '4k'].includes(body.exportSettings.resolution)) { return error }
```

**Recommendations:**
1. Add Zod or io-ts schema validation to all POST/PATCH endpoints
2. Validate enum values against allowed list
3. Sanitize string inputs (no control characters)
4. Validate array lengths (limits on overlays, etc.)
5. Add request size limits to prevent DoS

---

### Service Role Key Exposed in Middleware and API Routes

**Issue:** `SUPABASE_SERVICE_ROLE_KEY` used in many places, increases exposure risk.

**Files:**
- `middleware.ts` (line 7)
- `app/api/export/route.ts` (line 8)
- `app/api/ai/transcribe/route.ts` (line 8)
- `app/api/download/route.ts` (line 7)
- `app/api/billing/webhook/route.ts` (line 9)
- `app/api/social/connect/route.ts` (line 5)
- Plus 15+ more files

**Risk:**
- Service role has full database access
- Multiple attack surfaces (middleware, 10+ API routes)
- If any endpoint is compromised, full database access is exposed
- Rate limiting and access control bypassed

**Current Mitigation:**
- Env var (not hardcoded)
- Used server-side only
- Each route checks user auth separately

**Recommendations:**
1. Create service role for specific operations only (e.g., webhook updates)
2. Use row-level security policies instead of service role for user operations
3. Consider using Supabase session tokens instead of service role
4. Rotate service role key quarterly
5. Log all service role operations for audit trail

---

### Stripe Webhook Signature Verification Requires STRIPE_WEBHOOK_SECRET

**Issue:** Webhook secret must be set correctly or webhook will fail silently.

**Files:**
- `app/api/billing/webhook/route.ts` (line 177)

**Risk:**
- If secret is wrong, webhooks are rejected (good)
- No logging to distinguish signature failure from other errors
- Subscription sync can get out of sync with Stripe

**Current Mitigation:**
- Returns 400 on invalid signature (prevents processing)

**Recommendations:**
1. Add detailed logging of signature errors vs other errors
2. Implement webhook event replay in case of processing failure
3. Add metrics/alerts when webhooks are consistently failing
4. Document webhook secret setup in README

---

## Performance Bottlenecks

### ElementsPanel Component is 3,742 Lines

**Issue:** Single component handles elements grid, search, uploads, stickers, text editor, animations, and preview.

**Files:**
- `components/editor/ElementsPanel.tsx` (3,742 lines)

**Problem:**
- Re-renders entire panel when any state changes
- Color picker alone is 100+ lines of inline code
- State management is tangled across multiple concerns
- Testing nearly impossible due to size
- Performance degrades with many custom elements

**Cause:**
- Built incrementally without refactoring
- Multiple features (text, stickers, GIFs, custom elements) grouped together

**Improvement Path:**
1. Split into smaller components:
   - `<ElementsGridSection>` - Grid display and filtering
   - `<TextElementEditor>` - Text editing controls
   - `<CustomElementUpload>` - File upload logic
   - `<ColorPickerDialog>` - Extracted color picker
   - `<SocialStickerPanel>` - Social sticker management
   - `<AnimationControls>` - Animation selection
2. Use React.memo() on grid items to prevent re-renders
3. Move state to context or Zustand for shared state
4. Consider virtualizing grid for 100+ items

---

### Timeline Component 2,019 Lines with Global Event Listeners

**Issue:** Timeline is complex with global mouse/touch listeners and multiple overlapping concerns.

**Files:**
- `components/editor/Timeline.tsx` (2,019 lines)

**Problem:**
- Global document event listeners not cleaned up properly
- Scrubbing performance degrades with 100+ overlays
- Re-renders entire timeline on every audio pan or scrub
- Mouse event handlers attached to document (memory leak risk)

**Cause:**
- Drag/drop implemented with global listeners instead of pointer events
- No debouncing on scrub position updates
- Overlay rendering not optimized for large counts

**Improvement Path:**
1. Use React Pointer Events API instead of global listeners
2. Add debounce to scrub position (50-100ms)
3. Virtualize overlay rows for large counts
4. Memoize overlay items to prevent re-renders
5. Use state machine for drag state instead of refs

---

### Color Picker HSB Conversion Runs on Every Keystroke

**Issue:** HSB↔Hex conversion functions run inline without memoization.

**Files:**
- `components/editor/ElementsPanel.tsx` (lines 44-80)

**Problem:**
- `hexToHsb` and `hsbToHex` called repeatedly during color input
- No useCallback or memoization
- Unnecessary re-renders of color picker

**Improvement Path:**
1. Wrap conversion functions with useCallback
2. Use useMemo for computed color values
3. Move to separate util file for reuse
4. Add memoization for HSL input validation

---

### No Lazy Loading of Heavy Components

**Issue:** All editor components load eagerly, even if not visible.

**Files:**
- `app/app/edit/[id]/page.tsx` (line 1409)
- `app/dashboard/edit/[id]/page.tsx` (line 1409)

**Problem:**
- AudioPanel (640 lines) loads even if user doesn't use audio
- StickerRenderer (1,276 lines) with animations loads upfront
- ZoomEffects loads regardless of aspect ratio
- Giphy/7TV APIs requested on mount

**Improvement Path:**
1. Use React.lazy() + Suspense for AudioPanel
2. Load StickerRenderer only when Elements tab active
3. Defer API calls (Giphy, 7TV) until search is attempted
4. Use dynamic imports for non-critical panels

---

## Fragile Areas

### Subdomain Routing Middleware Complexity

**Issue:** Subdomain routing logic is fragile with multiple special cases and debug logging.

**Files:**
- `middleware.ts` (entire file, especially lines 14-96)

**Why Fragile:**
- Complex JWT parsing with multiple fallback paths
- Assumes specific cookie naming patterns (`sb-*-auth-token`)
- Special handling for chunked cookies that might change
- Cookie format is implementation detail of Supabase (not guaranteed)
- Extensive console logging left in production code
- Multiple base64 decode attempts in try-catch chain

**Safe Modification:**
1. Use Supabase SDK functions instead of manual JWT parsing
2. Add comprehensive tests for all cookie formats
3. Remove console.log statements before production
4. Document cookie format assumptions
5. Add fallback to reject access rather than guess

**Test Coverage:**
- No tests for subdomain routing
- Cookie parsing logic is untested
- Edge cases (malformed JWT, missing cookies) not covered

---

### Social OAuth State Parameter Handling

**Issue:** OAuth state validation is done separately from initiation, risk of mismatch.

**Files:**
- `app/api/social/connect/route.ts` (line 133 - state creation)
- `app/api/social/callback/*/route.ts` (lines 27-28 - state parsing)

**Why Fragile:**
- State is base64-encoded without signature
- No atomic verification of state consistency
- Callback routes must parse state identically or fail
- If parsing logic changes, old states in browser storage become invalid
- No fallback if state is corrupted

**Safe Modification:**
1. Create utility function for state encode/decode used everywhere
2. Add HMAC signature to state
3. Store state server-side with expiry (Redis/Supabase)
4. Use `state_verifier` parameter as per OAuth 2.0 spec
5. Add comprehensive error messages if state is invalid

**Test Coverage:**
- No tests for state parameter flow
- Callback logic untested with malformed state
- Token exchange logic not covered

---

### Plan Limit Checking Distributed Across Routes

**Issue:** Plan limit logic duplicated and inline in multiple API routes.

**Files:**
- `app/api/export/route.ts` (lines 47-96)
- `app/api/ai/transcribe/route.ts` (lines 48-70)

**Why Fragile:**
- Same limit checking logic in different places
- Changes to limits require updates in multiple files
- Easy to miss a route when adding new features
- Limits hardcoded as string enum values
- No single source of truth for limit enforcement

**Safe Modification:**
1. Create `lib/limits.ts` with centralized function:
   ```typescript
   async function checkLimit(userId: string, action: UsageLogAction, planId: string): Promise<boolean> {}
   ```
2. Use in all routes
3. Add comprehensive unit tests for limit logic
4. Add admin route to view/update limits

---

## Scaling Limits

### Database Plan Lookup on Every API Request

**Issue:** Every API route calls `subscriptions` → `subscription_plans` to get limits.

**Files:**
- `app/api/export/route.ts` (lines 48-63)
- `app/api/ai/transcribe/route.ts` (lines 49-62)
- Multiple other routes

**Current Capacity:**
- 2 database queries per request (subscriptions + subscription_plans)
- No caching
- Works fine with 100-1,000 concurrent users

**Limit:**
- At 10,000 concurrent users: ~20,000 queries/sec to subscription tables
- Database connection pool exhaustion risk
- Subscription table queries become bottleneck
- Supabase free tier has 50MB storage limit

**Scaling Path:**
1. Cache subscription + limits in Redis with 5-minute TTL
2. Implement tier/quota cache layer in middleware
3. Use `cache: 3600` in Supabase queries
4. Query only `subscriptions` and denormalize `plan_limits` columns
5. Consider moving plan limits to configuration (not database query)

---

### Storage Strategy Has No Cleanup

**Issue:** All exports, thumbnails, and custom elements stored in Supabase Storage indefinitely.

**Files:**
- Export uploads (no retention policy)
- Custom element uploads (no cleanup)
- Clip thumbnails (no TTL)

**Current Capacity:**
- Free Supabase: 200MB
- Pro Supabase: 1GB per month
- Each export: 50-500MB

**Scaling Limit:**
- After 5-10 exports per user, storage quota exceeded
- No cleanup = permanent storage cost
- Deleted clips don't delete storage files

**Scaling Path:**
1. Implement storage TTL (30 days for exports)
2. Add cleanup job to delete old exports and thumbnails
3. Implement user storage quota
4. Add cost warnings when approaching quota
5. Move exports to cold storage (AWS S3 Glacier) after 90 days

---

### No Rate Limiting on API Routes

**Issue:** API routes have no rate limiting, vulnerable to abuse.

**Files:**
- `app/api/export/route.ts` (POST)
- `app/api/ai/transcribe/route.ts` (POST)
- All export routes unprotected

**Current Capacity:**
- Single user can spam 1000 export requests/minute
- No throttling
- Could fill storage/queue instantly
- DoS risk

**Scaling Limit:**
- At 100 abusive users: instant system overload
- Queue backs up indefinitely
- Bill from AI APIs (Whisper, etc.) explodes

**Scaling Path:**
1. Add rate limiting per user (10 exports/min, 100/day)
2. Use `upstash` or `ioredis` for distributed rate limiting
3. Return 429 status when limit exceeded
4. Add metrics/alerts for rate limit violations
5. Implement per-plan rate limits (free: 3/day, pro: 100/day)

---

## Dependencies at Risk

### Mock Data in Production Code

**Issue:** Transcription endpoint returns mock data in production instead of failing.

**Files:**
- `app/api/ai/transcribe/route.ts` (lines 150-155)

**Risk:**
- Users think feature works when it's fake
- Bills users for non-functional feature
- Feedback system breaks if based on mock captions

**Migration Plan:**
1. Add feature flag: `const TRANSCRIBE_ENABLED = process.env.OPENAI_API_KEY && process.env.AI_ENABLED`
2. Return 501 Not Implemented if disabled
3. Document in feature availability matrix
4. Remove mock data entirely before production

---

### FFmpeg Not Installed or Configured

**Issue:** `@ffmpeg/ffmpeg` package installed but never actually used.

**Files:**
- `package.json` includes `@ffmpeg/ffmpeg`: "^0.12.10"`
- No actual usage in codebase (only import in types)
- Export endpoint doesn't call FFmpeg

**Risk:**
- False impression that video processing is ready
- Package doesn't work with server-side Node.js (WASM only)
- Would need different solution for backend processing

**Migration Plan:**
1. Remove `@ffmpeg/ffmpeg` from package.json if using external service
2. Add `ffmpeg-static` or use Docker if self-hosted
3. Document video processing approach in README
4. Add CI check that export routes actually call video processor

---

### Missing Environment Variables Will Crash Routes at Runtime

**Issue:** Many routes assume env vars exist without fallback.

**Files:**
- `app/api/social/callback/tiktok/route.ts` - requires `TIKTOK_CLIENT_KEY`
- `app/api/social/callback/instagram/route.ts` - requires `INSTAGRAM_CLIENT_ID`
- `app/api/billing/webhook/route.ts` - requires `STRIPE_WEBHOOK_SECRET`

**Risk:**
- Routes crash if env vars missing
- No clear error messages
- Social OAuth fails silently if env vars wrong

**Migration Plan:**
1. Create `lib/config.ts` that validates all env vars at startup
2. Exit with clear message if required vars missing:
   ```typescript
   if (!process.env.STRIPE_WEBHOOK_SECRET) {
     throw new Error('STRIPE_WEBHOOK_SECRET is required. See .env.example')
   }
   ```
3. Export config object used by all routes
4. Add pre-flight check in `middleware.ts` for required vars

---

## Missing Critical Features

### No Observability/Monitoring

**Issue:** No logging, metrics, or error tracking in production.

**Files:**
- All API routes use `console.error` (not production-safe)
- No error tracking service (Sentry, LogRocket)
- No metrics collection (Datadog, Prometheus)

**Problem:**
- Cannot debug production issues
- Cannot track feature adoption
- Cannot see performance degradation until users complain
- Billing system has no audit trail

**Blocking:**
- Cannot monitor export success rate
- Cannot track export performance
- Cannot see why webhooks fail

**Solution:**
1. Add error tracking: Sentry or Rollbar
2. Add metrics: PostHog or Mixpanel for events
3. Add structured logging: Pino or Winston with JSON output
4. Add APM: Vercel Analytics already included
5. Log all subscription changes for audit trail

---

### No Email Notifications

**Issue:** No email system for subscription changes, exports, or errors.

**Files:**
- Billing webhook updates subscription but no email sent
- Export completion has no notification
- Payment failures have no alert

**Problem:**
- Users don't know when export completes
- Users don't know when subscription changes
- User doesn't know if payment failed
- Premium features are invisible

**Solution:**
1. Add email provider (SendGrid, Resend, or AWS SES)
2. Create email templates for:
   - Subscription confirmation
   - Payment success/failure
   - Export completion
   - Upgrade prompts
3. Add queue for email sending (avoid blocking requests)

---

### No Audit Trail for Critical Operations

**Issue:** Subscription changes, exports, and deletions not audited.

**Files:**
- No audit table in database
- Billing webhook updates have no audit log
- Clip/export deletion has no record

**Problem:**
- Cannot investigate user disputes
- Cannot track data deletion compliance
- Cannot see who changed what when

**Solution:**
1. Create `audit_logs` table:
   - `id, user_id, action, resource_type, resource_id, old_value, new_value, created_at`
2. Add trigger to log all subscription/export changes
3. Implement admin audit log viewer
4. Implement data deletion log for compliance

---

## Test Coverage Gaps

### No Tests for Video Processing

**Issue:** Export and transcription endpoints have no tests.

**Files:**
- `app/api/export/route.ts` - No test file
- `app/api/ai/transcribe/route.ts` - No test file
- `app/api/export/[id]/route.ts` - No test file

**Risk:**
- Regressions in placeholder code won't be caught
- Integration with real FFmpeg will break existing code
- Billing logic changes could break export limits

**Priority:** High

**Solution:**
1. Add `__tests__/api/export.test.ts` with mocked FFmpeg
2. Add `__tests__/api/transcribe.test.ts` with mocked Whisper
3. Test limit enforcement with different plans
4. Test database record creation and status updates

---

### No Tests for Authentication/Authorization

**Issue:** No tests for auth flows, middleware, or permission checks.

**Files:**
- `middleware.ts` - Untested subdomain routing and JWT parsing
- `app/api/*/route.ts` - All routes check auth but no tests
- Admin route protection untested

**Risk:**
- Security regressions (e.g., auth bypass) won't be caught
- Subdomain routing changes could break app access
- Admin route protection could be accidentally removed

**Priority:** Critical

**Solution:**
1. Add `__tests__/middleware.test.ts` for subdomain routing
2. Add `__tests__/api/auth.test.ts` for JWT and token handling
3. Test admin route access with different user roles
4. Test OAuth state parameter flow end-to-end

---

### No Tests for Billing and Subscription Logic

**Issue:** Stripe webhook handling and plan limit enforcement untested.

**Files:**
- `app/api/billing/webhook/route.ts` - No tests
- Subscription limit checking - No tests
- Plan upgrade/downgrade flows - No tests

**Risk:**
- Webhook failures go unnoticed until billing issues arise
- Limits might not enforce correctly for all plan types
- Users could potentially downgrade without losing features temporarily

**Priority:** Critical

**Solution:**
1. Add `__tests__/api/billing.test.ts` with mock Stripe events
2. Test all subscription state transitions
3. Test limit enforcement across all plan types
4. Test webhook signature verification

---

### No Tests for Database Constraints

**Issue:** No verification that database constraints prevent invalid states.

**Files:**
- Database RLS policies - Not tested
- Clip/export ownership - Not verified in tests
- Cascading deletes - Not tested

**Risk:**
- User might access another user's clips due to RLS bypass
- Exports might orphan if clips are deleted
- Database constraints might not work as intended

**Priority:** High

**Solution:**
1. Add integration tests for RLS policies
2. Test clip isolation between users
3. Test cascading deletes on clip deletion
4. Test subscription deletion reverts to free tier

---

### No E2E Tests for Editor Workflow

**Issue:** No end-to-end tests for clip upload → edit → export.

**Files:**
- All editor components untested
- No integration tests for data flow

**Risk:**
- Breaking changes in state management undetected
- Export data corruption undetected
- Export settings not persisting correctly

**Priority:** Medium

**Solution:**
1. Add E2E test with Playwright for basic workflow:
   - Upload clip
   - Add overlay
   - Save export settings
   - Verify export record created
2. Test aspect ratio changes
3. Test element deletion and undo


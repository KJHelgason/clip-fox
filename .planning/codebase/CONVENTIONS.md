# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- PascalCase for React components: `ElementsPanel.tsx`, `Timeline.tsx`, `StickerRenderer.tsx`
- camelCase for utility files: `useClip.ts`, `useSubscription.ts`, `usePreviewCropDrag.ts`
- camelCase for API routes with descriptive segments: `route.ts` (Next.js convention)
- API route structure follows resource hierarchy: `app/api/billing/webhook/route.ts`, `app/api/export/[id]/route.ts`

**Functions:**
- camelCase for all functions: `handleSubscriptionCreated`, `parseEditData`, `findAvailableRow`, `formatTime`
- useX pattern for custom hooks: `useClip`, `useSubscription`, `useCanAccessFeature`, `useUpgradePrompt`, `useSounds`, `useUser`, `usePreviewCropDrag`
- Handler functions prefixed with `handle`: `handleColorChange`, `handleHexSubmit`, `handleSubscriptionCreated`, `handleSubscriptionUpdated`
- Formatting utilities have explicit purpose names: `formatTime`, `formatTimeSmooth`, `formatTimeDuration`, `timeToPosition`, `positionToTime`

**Variables:**
- camelCase for all variables and constants
- SCREAMING_SNAKE_CASE reserved for API keys and critical config: `GIPHY_API_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Discriminator unions use descriptive type values: `type: 'text' | 'image' | 'sticker' | 'caption' | 'social-sticker' | 'reaction'`
- Boolean variables prefixed with `is`, `has`, or `can`: `isLoading`, `isError`, `hasCaptions`, `canUndo`, `canAccessFeature`
- Collections use plural names: `overlays`, `clips`, `segments`, `zoomKeyframes`, `thumbnails`

**Types:**
- PascalCase for all types and interfaces: `OverlayElement`, `AudioTrack`, `ZoomKeyframe`, `ExportSettings`, `EditorState`
- Union types explicitly list all variants: `PlanId = 'free' | 'pro' | 'business'`
- Type files group by domain: `lib/types.ts` contains all shared types with section comments
- Generic types named descriptively: `UseSubscriptionReturn`, `StickerConfig`, `CropRegion`, `EditData`
- Enum-like constants exported as const objects: `ASPECT_RATIOS`, `LAYOUT_TEMPLATES`, `CAPTION_STYLES`, `STICKER_CATEGORIES`

## Code Style

**Formatting:**
- Tool: ESLint 9 with Next.js + TypeScript rules
- Configured via: `eslint.config.mjs` (flat config)
- Extends: `next/core-web-vitals`, `next/typescript`
- No Prettier configuration detected - uses ESLint defaults

**Linting:**
- All TypeScript strict mode enabled
- Includes Next.js core web vitals rules
- React 19 compatibility rules active
- No specific lint exceptions in codebase

**Language Features:**
- TypeScript 5 with strict mode: `noEmit: true`, `strict: true`
- Target: ES2017 (supports most modern syntax)
- Module: ESNext (for tree-shaking)
- Automatic import transformation for barrel files (lucide-react, @radix-ui/react-icons)

## Import Organization

**Order:**
1. External packages: `import { useState } from 'react'`, `import { supabase } from '@supabase/supabase-js'`
2. Internal utilities: `import { ExportSettings, EditorState } from '@/lib/types'`
3. Components: `import StickerRenderer from './stickers/StickerRenderer'`, `import { Input } from '@/components/ui/input'`
4. Styles/assets: Implicit through CSS imports

**Path Aliases:**
- Single alias configured: `@/*` → `./` (project root)
- All internal imports use `@/lib/*`, `@/components/*`, `@/app/*`

**Patterns:**
- Type imports separate from value imports when possible: `import type { Clip } from '@/lib/hooks/useClip'` and `import { useClip } from '@/lib/hooks/useClip'`
- Lucide React icons imported as named imports: `import { Upload, ArrowLeft, X, Trash2 } from 'lucide-react'`
- Radix UI components imported from individual packages: `import { Avatar } from '@radix-ui/react-avatar'`

## Error Handling

**Patterns:**
- Try-catch blocks in server-side API routes (`app/api/*/route.ts`)
- Errors logged to console with `console.error()`: `console.error('Clip not found:', error)`, `console.error('Failed to parse edit data:', e)`
- API errors return `NextResponse.json({ error: 'message' }, { status: 400/401/404 })`
- Supabase errors checked via destructuring: `const { data, error } = await supabase.from(...)`
- Error checks before accessing data: `if (error || !data) return null`
- User validation in API routes: Check auth header, validate ownership before operations
- Null/undefined checks explicit: `if (!userId)`, `if (!user)`, `if (!clip)`

**Example Error Handling:**
```typescript
// From app/api/export/route.ts
const authHeader = req.headers.get('authorization')
const token = authHeader?.replace('Bearer ', '') || req.cookies.get('sb-access-token')?.value

const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// From lib/hooks/useClip.ts
const { data, error } = await supabase
  .from('clips')
  .select('*')
  .eq('id', clipId)
  .single()

if (error || !data) {
  console.error('Clip not found:', error)
  return null
}
```

## Logging

**Framework:** console (browser and Node.js)

**Patterns:**
- `console.error()` for error conditions: Used in hooks and API routes
- Error messages include context: `console.error('Clip not found:', error)` provides both action and error object
- No info/debug logging found - errors only
- Production logs go to console (no centralized logging system detected)

**Guidelines:**
- Log errors in try-catch blocks
- Include error object for debugging
- No sensitive data logged (auth tokens, user IDs kept from logs)

## Comments

**When to Comment:**
- Type definitions have descriptive comments for complex types
- Utility functions document parameter meanings
- No JSDoc found in production code
- Complex logic (like color conversion) receives inline comments

**Example:**
```typescript
// From lib/types.ts - Comment above type definition
// Aspect ratio presets for different platforms
export const ASPECT_RATIOS = {
  '9:16': { width: 9, height: 16, label: 'TikTok / Reels', resolution: '1080×1920' },
  // ...
}

// From next.config.ts - Explanation of experimental feature
// Optimize barrel file imports for better performance
// This automatically transforms imports like `import { X } from 'lucide-react'`
// to direct imports, reducing bundle size and improving cold start times
experimental: {
  optimizePackageImports: [
    'lucide-react',
    '@radix-ui/react-icons',
  ],
}
```

**JSDoc/TSDoc:**
- Not used in codebase
- Type annotations in TypeScript serve as documentation
- Complex types documented with inline comments only

## Function Design

**Size:**
- Small focused functions preferred (most <50 lines)
- Component files can exceed 100 lines (UI state management)
- Largest files are editor components with complex state: `ElementsPanel.tsx` (3742 lines), `Timeline.tsx` (2019 lines)

**Parameters:**
- Individual params for utility functions: `function timeToPosition(t: number, duration: number, barWidth: number)`
- Object parameter pattern for components: `type Props = { duration: number, currentTime: number, playing: boolean, ... }`
- Type annotations always included: `const fetchClip = (clipId: string): Promise<Clip | null>`

**Return Values:**
- Explicit return types on all functions
- Nullable returns clearly typed: `EditData | null`, `Clip | null`
- Async functions return Promises: `Promise<Clip | null>`, `Promise<void>`
- Hook custom return types: `UseSubscriptionReturn`, explicit object shapes

**Example Function:**
```typescript
// From lib/types.ts
export function findAvailableRow(
  overlays: OverlayElement[],
  candidate: { startTime: number; endTime: number; id?: string }
): number {
  let row = 0
  while (true) {
    const overlaps = overlays.some(
      o =>
        o.row === row &&
        o.id !== candidate.id &&
        Math.max(o.startTime, candidate.startTime) < Math.min(o.endTime, candidate.endTime)
    )
    if (!overlaps) return row
    row++
  }
}
```

## Module Design

**Exports:**
- Named exports preferred for utility functions: `export function useClip(...)`, `export function parseEditData(...)`
- Types exported as named: `export type OverlayElement = {...}`, `export type Clip = {...}`
- Constants exported as named: `export const ASPECT_RATIOS = {...}`, `export const LAYOUT_TEMPLATES = [...]`
- Default exports used for React components: `export default StickerRenderer`

**Barrel Files:**
- Single barrel file pattern: `lib/types.ts` aggregates all shared types
- Component imports direct: No barrel files in `components/` or `lib/hooks/`
- Each hook file exports its specific hook and types

**Dependency Patterns:**
- Components depend on `lib/types.ts` for type definitions
- Hooks depend on `@supabase/supabase-js` and `swr` for data fetching
- API routes depend on Supabase admin client and Stripe SDK
- UI components depend on Radix UI primitives and Lucide icons

---

*Convention analysis: 2026-01-22*

# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Runner:**
- Not detected - No Jest, Vitest, or other test runner configured
- No test configuration files found (`jest.config.*`, `vitest.config.*`)
- No testing dependencies in `package.json`

**Assertion Library:**
- Not installed

**Run Commands:**
- No test commands defined in `package.json`
- Test infrastructure not present in codebase

## Test File Organization

**Location:**
- No test files found in codebase (searched for `*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`)

**Naming:**
- Not established - No tests to demonstrate pattern

**Structure:**
- Not applicable

## Current Testing Status

**Gap Analysis:**
This codebase has **zero test coverage**. The following critical areas lack test infrastructure:

1. **API Routes** - No tests for:
   - `app/api/export/route.ts` - Export creation with subscription limit checks
   - `app/api/billing/webhook/route.ts` - Stripe webhook handling
   - `app/api/clips/[id]/route.ts` - Clip CRUD operations
   - `app/api/social/*` - Social platform integrations
   - `app/api/twitch/emotes/route.ts` - Twitch API integration

2. **Custom Hooks** - No tests for:
   - `lib/hooks/useClip.ts` - Clip fetching and parsing
   - `lib/hooks/useSubscription.ts` - Subscription status and feature access
   - `lib/hooks/useSounds.ts` - Audio library management
   - `lib/hooks/usePreviewCropDrag.ts` - Complex drag/drop state
   - `lib/supabase/useUser.ts` - User authentication state

3. **Utility Functions** - No tests for:
   - `lib/types.ts` functions: `findAvailableRow`, `timeToPosition`, `positionToTime`, `durationToWidth`, `formatTime`
   - `lib/utils.ts` - `cn()` utility (classname merging)
   - Color conversion logic in ElementsPanel

4. **Components** - No tests for:
   - `components/editor/ElementsPanel.tsx` (3742 lines) - Complex element management UI
   - `components/editor/Timeline.tsx` (2019 lines) - Timeline scrubbing and overlay handling
   - `components/editor/AudioPanel.tsx` (640 lines) - Audio track management
   - Other editor components with drag/drop interactions

5. **Integration Tests** - None:
   - No Supabase integration tests
   - No Stripe integration tests
   - No authentication flows tested
   - No video editing workflows tested

## Testing Gaps by Priority

**High Priority (Business Critical):**
- Billing system: Stripe webhook handling determines subscription status
- Subscription validation: Feature access depends on `useSubscription` hook
- Clip ownership verification: API routes check user owns clips before operations
- Auth flows: User authentication in middleware not tested

**Medium Priority (Core Features):**
- Export creation workflow: Complex state management and validation
- Timeline interactions: Drag/drop, trim, zoom operations
- Element management: Adding, deleting, updating overlays
- Audio track management: Playback, trimming, volume control

**Low Priority (Nice to Have):**
- Utility functions: Simple math/string operations
- Component UI rendering: Visual output (can use E2E tests instead)
- Social integrations: API callback handling

## Setup Instructions for Testing Implementation

### Phase 1: Install Testing Framework
```bash
# Option A: Vitest (recommended for Next.js 15)
npm install --save-dev vitest @vitest/ui happy-dom

# Option B: Jest (traditional choice)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev ts-jest @types/jest
```

### Phase 2: Configuration File
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

```typescript
// jest.config.ts (if using Jest)
import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

### Phase 3: Add Test Script
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

## Example Test Structure for This Codebase

### Unit Test Example: Utility Function
```typescript
// lib/types.test.ts
import { describe, it, expect } from 'vitest'
import {
  findAvailableRow,
  timeToPosition,
  formatTime
} from '@/lib/types'

describe('Timeline Utilities', () => {
  describe('findAvailableRow', () => {
    it('returns 0 when no overlays exist', () => {
      const row = findAvailableRow([], { startTime: 0, endTime: 10 })
      expect(row).toBe(0)
    })

    it('returns next available row when overlaps exist', () => {
      const overlays = [
        {
          id: '1',
          row: 0,
          startTime: 0,
          endTime: 10,
        } as any,
      ]
      const row = findAvailableRow(overlays, { startTime: 5, endTime: 15 })
      expect(row).toBe(1)
    })

    it('does not count overlays with different id as overlap', () => {
      const overlays = [
        {
          id: '1',
          row: 0,
          startTime: 0,
          endTime: 10,
        } as any,
      ]
      const row = findAvailableRow(overlays, { startTime: 5, endTime: 15, id: '1' })
      expect(row).toBe(0)
    })
  })

  describe('timeToPosition', () => {
    it('converts time to pixel position', () => {
      const position = timeToPosition(5, 10, 1000)
      expect(position).toBe(500)
    })
  })

  describe('formatTime', () => {
    it('formats seconds as MM:SS.MS', () => {
      expect(formatTime(65.5)).toBe('1:05.50')
      expect(formatTime(0.33)).toBe('0:00.33')
    })
  })
})
```

### Hook Test Example: useClip
```typescript
// lib/hooks/useClip.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useClip } from '@/lib/hooks/useClip'
import * as supabaseModule from '@/lib/supabase'

vi.mock('@/lib/supabase')

describe('useClip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when clipId is undefined', () => {
    const { result } = renderHook(() => useClip(undefined))
    expect(result.current.clip).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('fetches clip data on mount', async () => {
    const mockClip = {
      id: 'clip-1',
      title: 'Test Clip',
      video_path: 'clips/test.mp4',
      signedUrl: 'https://example.com/test.mp4',
    }

    vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockClip, error: null }),
          }),
        }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: mockClip.signedUrl },
          }),
        }),
      },
    } as any)

    const { result } = renderHook(() => useClip('clip-1'))

    await waitFor(() => {
      expect(result.current.clip).toEqual(expect.objectContaining(mockClip))
    })
  })

  it('handles fetch errors gracefully', async () => {
    vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useClip('invalid'))

    await waitFor(() => {
      expect(result.current.clip).toBeNull()
      expect(result.current.isError).toBeTruthy()
    })
  })
})
```

### API Route Test Example: Export
```typescript
// app/api/export/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/export/route'
import { NextRequest } from 'next/server'

vi.mock('@supabase/supabase-js')
vi.mock('@/lib/stripe')

describe('POST /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no auth header provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      body: JSON.stringify({ clipId: 'clip-1' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 400 when clipId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('creates export for authorized user with valid clip', async () => {
    // Mock successful auth check
    // Mock clip ownership verification
    // Mock subscription check
    // Verify export created with correct settings
    const request = new NextRequest('http://localhost:3000/api/export', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer valid-token',
      },
      body: JSON.stringify({
        clipId: 'clip-1',
        exportSettings: { aspectRatio: '9:16', quality: 'high' },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })
})
```

## Mocking Patterns

**Framework:** Vitest `vi.mock()` or Jest `jest.mock()`

**What to Mock:**
- Supabase client calls (database operations)
- Stripe SDK (payment processing)
- External APIs (Giphy, 7TV, Twitch)
- File storage operations
- Authentication state

**What NOT to Mock:**
- Utility functions (test them directly)
- Type definitions
- Constants and configuration
- Component rendering (use component testing library)

**Example Mocking Pattern:**
```typescript
// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
  },
}))

// Mock external API
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_123' }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({ id: 'sub_123' }),
    },
  })),
}))
```

## Coverage Targets (If Implemented)

**Recommended Coverage Goals:**
- API routes: 90%+ (business critical)
- Hooks: 85%+ (core logic)
- Utilities: 95%+ (reusable functions)
- Components: 60%+ (UI rendering, less critical)
- Overall: 75%+

**View Coverage:**
```bash
npm run test:coverage
# Opens coverage report at ./coverage/index.html
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and hooks
- Approach: Vitest with mocked dependencies
- Files: `lib/**/*.test.ts`, `lib/hooks/*.test.ts`
- Example: Testing `findAvailableRow`, `formatTime`, `parseEditData`

**Integration Tests:**
- Scope: Hook + Supabase interaction
- Approach: Vitest with mocked API responses
- Files: `lib/**/*.integration.test.ts`
- Example: `useClip` fetching and parsing, `useSubscription` loading plan data

**E2E Tests:**
- Scope: Full user workflows
- Status: Not implemented
- Framework: Playwright or Cypress recommended
- Priority: Medium (after unit/integration test coverage)
- Examples: User login → create clip → edit → export flow

## Performance Testing

**Not Implemented:**
- No performance benchmarks
- No bundle size monitoring
- No render performance tests

**Future Considerations:**
- Monitor component re-render counts (React Profiler)
- Track hook performance with `useCallback` memoization
- Benchmark timeline interactions with large overlay counts
- Profile FFmpeg operations during export

---

*Testing analysis: 2026-01-22*

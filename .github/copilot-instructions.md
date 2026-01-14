# ClipFox - AI Coding Agent Instructions

## Project Overview
ClipFox is a Next.js 15 (App Router) video editing web app inspired by StreamLadder's UI. Users can trim, crop, add overlays, and export clips to multiple aspect ratios (9:16 TikTok, 16:9 YouTube, etc.). Core tech: Next.js, Supabase (auth + storage), TypeScript, Tailwind CSS, Radix UI.

## Architecture & Key Files

### Multi-Crop Video Editor (`app/dashboard/edit/[id]/page.tsx` - 1800+ lines)
The heart of the app. This single-file component handles:
- **Dual canvas system**: Source video (16:9) with crop rectangles + 9:16 preview showing cropped output
- **CropRegion type**: Each crop has `{x, y, width, height}` for source video AND `{previewX, previewY, previewWidth, previewHeight}` for preview positioning
- **Drag system**: Global `document.addEventListener` for `mousemove`/`mouseup` to maintain drag control when cursor leaves containers
- **Corner handles**: 4 resize handles on crops that maintain aspect ratio (source crop aspect, NOT preview aspect)
- **Snapping**: Separate center line state for main video (`showMainCenterXLine/YLine`) vs preview (`showPreviewCenterXLine/YLine`) - they must NOT interfere
- **Video display math**: `boxLeft/boxTop/boxW/boxH` calculations fit cropped content to preview slots - **DO NOT modify this logic**

### State Management Pattern
- All state is React `useState` - no external state management
- Crop drag state: `dragCropId`, `cropDragType`, `cropDragStart`, `cropDragStartRegion`
- Edit state saved to Supabase `clips.edit_data` as JSON string
- Overlay positions stored in BOTH video coordinates (`videoLeft/Top/Width/Height`) AND timeline coordinates

### Supabase Integration
- **Auth**: Custom middleware (`middleware.ts`) parses two-part Supabase cookies manually
- **Storage**: Videos in `clips` bucket, thumbnails in `thumbnails` bucket
- **RLS**: Role-based policies (`user` vs `admin`) - see `supabase/setup.sql`
- **Client**: `lib/supabase.ts` uses `createBrowserClient` from `@supabase/ssr`

## Critical Patterns

### Crop Resize Logic (Preview Panel)
```typescript
// CORRECT: Use dxPercent directly, calculate height from aspect ratio
const aspectRatio = cropDragStartRegion.width / cropDragStartRegion.height
const newWidth = Math.max(10, cropDragStartRegion.previewWidth + dxPercent)
const newHeight = newWidth / aspectRatio
updated.previewWidth = Math.min(100 - cropDragStartRegion.previewX, newWidth)
updated.previewHeight = Math.min(100 - cropDragStartRegion.previewY, newHeight)
```
**AVOID**: Complex delta calculations with `Math.max(abs(dx), abs(dy))` or multiple re-enforcement steps - causes jittery behavior.

### Percentage-Based Positioning
- All crop positions/sizes are **percentages (0-100)** relative to their container
- Convert mouse deltas: `((e.clientX - start.x) / containerWidth) * 100`
- Main video uses `mainVideoContainerRef`, preview uses `previewContainerRef`

### Non-Selectable Text
Always add `select-none` to labels/text on draggable elements to prevent text selection jitter:
```tsx
<div className="... select-none" style={{ backgroundColor: crop.color }}>
  {crop.name}
</div>
```

### Corner Handle Positioning
Use Tailwind negative utilities for proper centering:
```tsx
<div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white" />
```
NOT inline styles like `style={{ top: -1.5 }}` (breaks with percentage containers).

## Component Structure
- **UI Components**: `components/ui/` - Radix primitives (button, dialog, slider, etc.)
- **Editor Panels**: `components/editor/` - Modular panels for layouts, elements, captions, export
- **TrimSlider**: Custom timeline with draggable handles and overlay bars
- **Page Layouts**: `app/dashboard/layout.tsx` (sidebar nav), `app/admin/layout.tsx` (role-restricted)

## Development Commands
```bash
pnpm dev          # Start dev server (port 3000)
pnpm build        # Production build
pnpm lint         # ESLint check
```

## Type System (`lib/types.ts`)
- `OverlayElement`: Text/image/caption overlays with dual coordinate systems
- `CropRegion`: Source video crop + preview positioning (see type definition above)
- `ZoomKeyframe`: Ken Burns style zoom effects with `{time, scale, x, y}`
- `AspectRatio`: Union type `'9:16' | '16:9' | '1:1' | '4:5' | '4:3'`

## Common Pitfalls
1. **Mixing coordinate systems**: Video canvas uses pixels, crops use percentages, overlays use both
2. **Aspect ratio confusion**: Preview resize maintains SOURCE crop aspect, not preview slot aspect
3. **Drag state leaks**: Always clear center line indicators on `mouseup` AND when switching drag types
4. **Clamping loops**: Avoid re-clamping after aspect ratio enforcement - calculate once, clamp once
5. **Handle positioning**: Attach resize handles to the INNER box (`boxLeft/Top/boxW/boxH`), not outer slot container

## UI Philosophy
- **StreamLadder-inspired**: Left icon sidebar, center canvas, right properties panel
- **Dark theme**: `bg-[#0a0a14]`, `bg-[#12121f]` for panels, purple accents (`purple-500`)
- **Drag interactions**: All drags continue even when cursor leaves container (global event listeners)
- **Snapping**: 3% threshold, purple indicators (`w-[1px]` or `h-[1px]`), only during MOVE not resize

## When Editing Existing Code
- **Preserve video display logic**: If it says "DO NOT modify" in comments, don't touch it
- **Test drag interactions**: Check both main video and preview crops after changes
- **Verify aspect ratios**: Ensure crops maintain proportions when resizing
- **Check snapping isolation**: Main video snapping should not trigger preview indicators

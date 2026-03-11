# Design: Full-Screen Mobile + Slide Nav Icons

**Date:** 2026-03-11
**Status:** Approved

## Overview

Two UI enhancements to the story viewer:
1. Stories open full-screen on mobile (no black bars, no max-width cap)
2. Right-side vertical nav icons for direct slide-type jumping

## 1. Full-Screen Mobile Layout

### Approach
Responsive CSS (Option A) — no JS device detection.

### Changes

**`app/s/[slug]/page.tsx`**
- Remove centering wrapper on mobile
- New: `<main className="h-dvh w-screen bg-black sm:flex sm:items-center sm:justify-center">`
- Inner div: `<div className="h-full w-full sm:w-auto sm:max-w-sm">`

**`app/embed/[slug]/page.tsx`**
- Same responsive treatment for iframe embeds

**`components/story/StoryViewer.tsx`**
- Container: remove inline `aspectRatio` / `maxHeight` from mobile
- Use `className="... h-full w-full sm:aspect-[9/16] sm:max-h-[100dvh] sm:w-auto"`
- On mobile: fills parent `h-dvh w-screen` — true full screen
- On desktop (`sm:`): keeps 9/16 aspect ratio, max-height 100dvh

## 2. SlideNav Component

### New file: `components/story/SlideNav.tsx`

**Props:**
```ts
interface SlideNavProps {
  slides: SlideDescriptor[]
  current: number
  onJump: (index: number) => void
}
```

**Layout:**
- `absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3`
- 4 buttons (cover, first media, details, amenities)

**Each button:**
- 32×32px circle: `w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center`
- Lucide icon at 16px
- `onClick`: `e.stopPropagation()` + `onJump(targetIndex)`

**Icon mapping:**
| Slide type | Lucide icon |
|---|---|
| cover | `Home` |
| media (first) | `Images` |
| details | `AlignLeft` |
| amenities | `LayoutGrid` |

**Active state** (current slide type matches button):
- `opacity-100` on the button
- Small white dot (`w-1 h-1 rounded-full bg-white`) below the icon

**Inactive state:** `opacity-40`

### StoryViewer changes

- Add `goTo(index)` function: `setCurrent(index)` + `setProgressKey(k => k+1)`
- Auto-play resumes naturally (timer re-runs on `current` change)
- Render `<SlideNav>` inside the `!uiHidden` overlay block
- Pass `slides`, `current`, `onJump={goTo}`

## Behaviour Notes

- Tapping a nav icon stops tap-propagation — won't trigger left/right slide navigation
- Auto-advance continues from jumped-to slide (no pause)
- Icons hidden during long-press (uiHidden = true), same as all overlay UI
- Map slide has no nav icon (not in the 4 requested)

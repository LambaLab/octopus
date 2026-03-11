# Fullscreen Mobile + Slide Nav Icons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make stories open full-screen on mobile and add 4 right-side vertical nav icons for direct slide-type jumping.

**Architecture:** Responsive CSS makes the story viewer fill `100dvh × 100vw` on mobile and retain `9/16` aspect ratio on desktop (`sm:` breakpoint). A new `SlideNav` component renders 4 Lucide icon buttons absolutely positioned on the right side of the story, each jumping directly to the first slide of that type.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Tailwind CSS v4, Lucide React

---

### Task 1: Full-screen layout — story page

**Files:**
- Modify: `app/s/[slug]/page.tsx`

**Step 1: Replace the page wrapper**

Open `app/s/[slug]/page.tsx`. Replace the entire return block:

```tsx
// BEFORE
return (
  <main className="flex min-h-screen items-center justify-center bg-black">
    <div className="w-full max-w-sm mx-auto">
      <StoryViewer data={story.data!} />
    </div>
  </main>
)

// AFTER
return (
  <main className="h-dvh w-screen bg-black sm:flex sm:items-center sm:justify-center">
    <div className="h-full w-full sm:w-auto sm:max-w-sm">
      <StoryViewer data={story.data!} />
    </div>
  </main>
)
```

**Step 2: Verify build passes**

```bash
cd /Users/nagi/Apps/Octopus
npm run build 2>&1 | tail -20
```
Expected: no TypeScript or build errors.

**Step 3: Commit**

```bash
git add app/s/\[slug\]/page.tsx
git commit -m "feat: full-screen story layout on mobile"
```

---

### Task 2: Full-screen layout — embed page

**Files:**
- Modify: `app/embed/[slug]/page.tsx`

**Step 1: Replace the embed wrapper**

Open `app/embed/[slug]/page.tsx`. Replace the return block:

```tsx
// BEFORE
return (
  <div className="h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
    <div className="w-full max-w-sm mx-auto">
      <StoryViewer data={story.data!} isEmbed />
    </div>
  </div>
)

// AFTER
return (
  <div className="h-dvh w-screen bg-black sm:flex sm:items-center sm:justify-center">
    <div className="h-full w-full sm:w-auto sm:max-w-sm">
      <StoryViewer data={story.data!} isEmbed />
    </div>
  </div>
)
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add app/embed/\[slug\]/page.tsx
git commit -m "feat: full-screen embed layout on mobile"
```

---

### Task 3: Responsive StoryViewer container

**Files:**
- Modify: `components/story/StoryViewer.tsx`

**Step 1: Update the root div**

In `StoryViewer.tsx`, find the root `<div>` (line ~114):

```tsx
// BEFORE
<div
  className="story-container relative overflow-hidden bg-black select-none"
  style={{ aspectRatio: '9/16', maxHeight: '100dvh' }}
  ...
>

// AFTER
<div
  className="story-container relative overflow-hidden bg-black select-none
             h-full w-full sm:aspect-[9/16] sm:max-h-[100dvh] sm:h-auto sm:w-auto"
  ...
>
```

Remove the `style` prop entirely — the aspect ratio and max-height are now handled by Tailwind responsive classes.

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add components/story/StoryViewer.tsx
git commit -m "feat: responsive story container — fills height on mobile"
```

---

### Task 4: Create SlideNav component

**Files:**
- Create: `components/story/SlideNav.tsx`

**Step 1: Create the component**

Create `/Users/nagi/Apps/Octopus/components/story/SlideNav.tsx` with this content:

```tsx
'use client'

import { Home, Images, AlignLeft, LayoutGrid } from 'lucide-react'

type SlideDescriptor =
  | { type: 'cover' }
  | { type: 'media'; index: number }
  | { type: 'details' }
  | { type: 'amenities' }
  | { type: 'map' }

interface SlideNavProps {
  slides: SlideDescriptor[]
  current: number
  onJump: (index: number) => void
}

interface NavItem {
  type: SlideDescriptor['type']
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { type: 'cover',     icon: Home,        label: 'Cover' },
  { type: 'media',     icon: Images,      label: 'Photos' },
  { type: 'details',   icon: AlignLeft,   label: 'Details' },
  { type: 'amenities', icon: LayoutGrid,  label: 'Amenities' },
]

export function SlideNav({ slides, current, onJump }: SlideNavProps) {
  const currentType = slides[current]?.type

  function firstIndexOf(type: SlideDescriptor['type']): number {
    return slides.findIndex((s) => s.type === type)
  }

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
      {NAV_ITEMS.map(({ type, icon: Icon, label }) => {
        const targetIndex = firstIndexOf(type)
        if (targetIndex === -1) return null

        const isActive = currentType === type || (currentType === 'media' && type === 'media')

        return (
          <div key={type} className="flex flex-col items-center gap-0.5">
            <button
              aria-label={label}
              onClick={(e) => {
                e.stopPropagation()
                onJump(targetIndex)
              }}
              className={`
                w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm
                flex items-center justify-center
                transition-opacity duration-200
                ${isActive ? 'opacity-100' : 'opacity-40'}
              `}
            >
              <Icon size={16} strokeWidth={1.75} color="white" />
            </button>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-white/80" />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

**Step 2: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors. `lucide-react` is already installed.

**Step 3: Commit**

```bash
git add components/story/SlideNav.tsx
git commit -m "feat: add SlideNav component with 4 slide-type jump icons"
```

---

### Task 5: Wire SlideNav into StoryViewer

**Files:**
- Modify: `components/story/StoryViewer.tsx`

**Step 1: Add `goTo` function**

In `StoryViewer.tsx`, after the `goPrev` callback (around line 61), add:

```tsx
const goTo = useCallback((index: number) => {
  setCurrent(index)
  setProgressKey((k) => k + 1)
}, [])
```

**Step 2: Import SlideNav**

Add to the imports at the top of `StoryViewer.tsx`:

```tsx
import { SlideNav } from './SlideNav'
```

**Step 3: Export SlideDescriptor type**

The `SlideDescriptor` type is currently local to `StoryViewer.tsx`. It's also defined in `SlideNav.tsx`. To avoid duplication, remove it from `SlideNav.tsx` and instead inline the type — both files define an identical local type, which is fine for now (they're small and isolated).

No change needed — both files define their own local `SlideDescriptor` type. This is acceptable given YAGNI.

**Step 4: Add SlideNav to the overlay UI**

Inside the `{!uiHidden && (...)}` block in `StoryViewer.tsx`, add `<SlideNav>` after the `<ProgressBar>`:

```tsx
{!uiHidden && (
  <>
    <ProgressBar
      key={progressKey}
      total={totalSlides}
      current={current}
      paused={paused || isInteractive}
      durationMs={AUTO_ADVANCE_MS}
    />

    <SlideNav
      slides={slides}
      current={current}
      onJump={goTo}
    />

    {/* Arrow buttons shown on interactive slides */}
    {isInteractive && (
      <>
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20
                     rounded-full bg-black/40 p-3 text-white backdrop-blur-sm
                     text-xl leading-none"
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          aria-label="Previous slide"
        >
          ‹
        </button>
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20
                     rounded-full bg-black/40 p-3 text-white backdrop-blur-sm
                     text-xl leading-none"
          onClick={(e) => { e.stopPropagation(); goNext() }}
          aria-label="Next slide"
        >
          ›
        </button>
      </>
    )}

    {!isEmbed && <CTABar title={data.title} />}
  </>
)}
```

**Note:** The right-side arrow button on interactive slides (`right-3 top-1/2`) will now visually overlap with `SlideNav`. Fix: change the interactive right arrow to `right-14` to clear the nav icons.

```tsx
// Update right arrow button className:
className="absolute right-14 top-1/2 -translate-y-1/2 z-20
           rounded-full bg-black/40 p-3 text-white backdrop-blur-sm
           text-xl leading-none"
```

**Step 5: Verify build**

```bash
npm run build 2>&1 | tail -20
```

**Step 6: Commit**

```bash
git add components/story/StoryViewer.tsx
git commit -m "feat: wire SlideNav into StoryViewer with goTo jump"
```

---

### Task 6: Push and verify on Vercel

**Step 1: Push to GitHub**

```bash
git push
```

**Step 2: Confirm Vercel auto-deploys**

Watch `https://vercel.com/` for the new deployment to go live (~1 min).

**Step 3: Manual smoke test on mobile**

Open the story URL on a real phone:
- [ ] Story fills full screen (no black bars top/bottom)
- [ ] 4 icons visible on the right side
- [ ] Tapping `Images` icon jumps to first photo slide
- [ ] Tapping `AlignLeft` icon jumps to details slide
- [ ] Tapping `LayoutGrid` icon jumps to amenities slide
- [ ] Tapping `Home` icon jumps back to cover
- [ ] Auto-play resumes after each jump
- [ ] Icons hidden during long-press
- [ ] Desktop view still shows 9/16 centered card

# Octopus — Property Story Generator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web app that converts a Bayut property listing URL into tappable 9:16 vertical stories with a shareable URL and iframe embed code.

**Architecture:** Next.js App Router on Vercel. A streaming `POST /api/generate` route fetches Bayut's `__NEXT_DATA__` JSON (with Firecrawl as fallback), normalizes it to a Property schema, saves to Supabase, and streams progress back to the client. The story viewer renders slides at `/s/[slug]` (public) and `/embed/[slug]` (iframe-optimized).

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Supabase (PostgreSQL), Google Maps JS SDK, Lucide React, nanoid, Firecrawl (fallback), Vitest (unit tests)

---

## Reference: Final File Structure

```
/Users/nagi/Apps/Octopus/
├── app/
│   ├── page.tsx                          # Dashboard
│   ├── layout.tsx
│   ├── globals.css
│   ├── s/[slug]/page.tsx                 # Story viewer page
│   ├── embed/[slug]/page.tsx             # Lite iframe viewer
│   └── api/generate/route.ts            # Streaming scrape API
├── components/
│   ├── dashboard/
│   │   ├── URLForm.tsx
│   │   └── GenerationStatus.tsx
│   └── story/
│       ├── StoryViewer.tsx               # Main controller
│       ├── ProgressBar.tsx
│       ├── CTABar.tsx
│       └── slides/
│           ├── CoverSlide.tsx
│           ├── MediaSlide.tsx
│           ├── DetailsSlide.tsx
│           ├── AmenitiesSlide.tsx
│           └── MapSlide.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── scraping/
│   │   ├── bayut.ts                     # __NEXT_DATA__ extractor
│   │   └── firecrawl.ts                 # Fallback scraper
│   └── normalize.ts                     # Bayut raw → Property schema
├── types/
│   └── property.ts
├── supabase/
│   └── migrations/001_create_stories.sql
├── tests/
│   ├── scraping/bayut.test.ts
│   └── normalize.test.ts
├── .env.local.example
├── vitest.config.ts
└── docs/plans/...
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json` (via CLI)
- Create: `vitest.config.ts`
- Create: `.env.local.example`

### Step 1: Initialize Next.js project

```bash
cd /Users/nagi/Apps/Octopus
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --yes
```

Expected: Next.js project created in current directory.

### Step 2: Install additional dependencies

```bash
npm install @supabase/supabase-js @supabase/ssr framer-motion lucide-react nanoid @googlemaps/js-api-loader
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

### Step 3: Create `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

### Step 4: Add test script to `package.json`

In `package.json`, add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

### Step 5: Create `.env.local.example`

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key

# Scraping fallback
FIRECRAWL_API_KEY=your-firecrawl-key

# CTA contact info (no country code prefix needed for tel:, include for wa.me)
NEXT_PUBLIC_PHONE=+971501234567
NEXT_PUBLIC_WHATSAPP=971501234567
```

Copy to `.env.local` and fill in values before running.

### Step 6: Create `.env.local` from example

```bash
cp .env.local.example .env.local
```

Fill in real values in `.env.local`.

### Step 7: Commit

```bash
git init
git add .
git commit -m "chore: initialize Next.js project with dependencies"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `types/property.ts`

### Step 1: Create `types/property.ts`

```typescript
export interface PropertyLocation {
  lat: number
  lng: number
  address: string
}

export interface Property {
  id: string
  source_url: string
  title: string
  price: string
  currency: string
  beds: number
  baths: number
  area_sqft: number
  location: PropertyLocation
  images: string[]       // direct CDN URLs
  amenities: string[]
  description: string
}

export type StoryStatus = 'pending' | 'ready' | 'failed'

export interface Story {
  id: string
  slug: string
  source_url: string
  status: StoryStatus
  data: Property | null
  error: string | null
  created_at: string
}

// Streaming event types from /api/generate
export type GenerateEvent =
  | { type: 'status'; message: string }
  | { type: 'existing'; slug: string; data: Property }
  | { type: 'complete'; slug: string; data: Property }
  | { type: 'error'; message: string }
```

### Step 2: Commit

```bash
git add types/
git commit -m "feat: add Property and Story TypeScript types"
```

---

## Task 3: Supabase Setup

**Files:**
- Create: `supabase/migrations/001_create_stories.sql`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`

### Step 1: Create the SQL migration

Create `supabase/migrations/001_create_stories.sql`:

```sql
create extension if not exists "pgcrypto";

create table if not exists stories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  source_url  text unique not null,
  status      text not null default 'pending'
                check (status in ('pending', 'ready', 'failed')),
  data        jsonb,
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists stories_slug_idx on stories (slug);
create index if not exists stories_source_url_idx on stories (source_url);
```

### Step 2: Run migration in Supabase

Go to your Supabase project → SQL Editor → paste and run the migration above.

Alternatively, if you have Supabase CLI installed:
```bash
supabase db push
```

### Step 3: Create `lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// Service role client for API routes (bypasses RLS)
export function createServiceClient() {
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )
}
```

### Step 4: Create `lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Step 5: Commit

```bash
git add supabase/ lib/supabase/
git commit -m "feat: add Supabase migrations and client utilities"
```

---

## Task 4: Bayut Scraper (`__NEXT_DATA__` Extraction)

**Files:**
- Create: `lib/scraping/bayut.ts`
- Create: `tests/scraping/bayut.test.ts`

This is the highest-risk component. We extract Bayut's embedded Next.js JSON from the raw HTML.

### Step 1: Write the failing test

Create `tests/scraping/bayut.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { extractNextData, parseBayutListing } from '@/lib/scraping/bayut'

// Minimal HTML with __NEXT_DATA__ shape that Bayut actually uses
const MOCK_HTML = `
<html>
<head></head>
<body>
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "listing": {
        "id": 14059216,
        "title": "Stunning 2BR Apartment in Downtown Dubai",
        "price": 2500000,
        "rentFrequency": null,
        "rooms": 2,
        "baths": 2,
        "area": 1250.5,
        "location": [
          { "name": "Downtown Dubai" }
        ],
        "geography": {
          "lat": 25.1972,
          "lng": 55.2744
        },
        "coverPhoto": {
          "url": "https://cdn.bayut.com/listing/14059216/photo1.jpg"
        },
        "photos": [
          { "url": "https://cdn.bayut.com/listing/14059216/photo1.jpg" },
          { "url": "https://cdn.bayut.com/listing/14059216/photo2.jpg" }
        ],
        "amenities": ["Pool", "Gym", "Parking"],
        "description": "A beautiful apartment in the heart of Dubai.",
        "price_hidden": false
      }
    }
  }
}
</script>
</body>
</html>
`

describe('extractNextData', () => {
  it('extracts __NEXT_DATA__ JSON from HTML', () => {
    const result = extractNextData(MOCK_HTML)
    expect(result).not.toBeNull()
    expect(result?.props?.pageProps?.listing?.id).toBe(14059216)
  })

  it('returns null when __NEXT_DATA__ is missing', () => {
    const result = extractNextData('<html><body></body></html>')
    expect(result).toBeNull()
  })
})

describe('parseBayutListing', () => {
  it('maps Bayut listing to Property schema', () => {
    const nextData = extractNextData(MOCK_HTML)!
    const property = parseBayutListing(
      nextData,
      'https://www.bayut.com/property/details-14059216.html'
    )

    expect(property).not.toBeNull()
    expect(property!.title).toBe('Stunning 2BR Apartment in Downtown Dubai')
    expect(property!.price).toBe('2,500,000')
    expect(property!.currency).toBe('AED')
    expect(property!.beds).toBe(2)
    expect(property!.baths).toBe(2)
    expect(property!.area_sqft).toBe(1250.5)
    expect(property!.location.lat).toBe(25.1972)
    expect(property!.location.lng).toBe(55.2744)
    expect(property!.images).toHaveLength(2)
    expect(property!.images[0]).toBe('https://cdn.bayut.com/listing/14059216/photo1.jpg')
    expect(property!.amenities).toContain('Pool')
    expect(property!.description).toBe('A beautiful apartment in the heart of Dubai.')
  })

  it('returns null when listing data is missing', () => {
    const result = parseBayutListing({ props: { pageProps: {} } }, 'https://bayut.com')
    expect(result).toBeNull()
  })
})
```

### Step 2: Run test to verify it fails

```bash
npm run test:run -- tests/scraping/bayut.test.ts
```

Expected: FAIL — "Cannot find module '@/lib/scraping/bayut'"

### Step 3: Implement `lib/scraping/bayut.ts`

```typescript
import type { Property } from '@/types/property'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractNextData(html: string): any | null {
  const match = html.match(
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  )
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseBayutListing(nextData: any, sourceUrl: string): Property | null {
  const listing = nextData?.props?.pageProps?.listing
  if (!listing) return null

  const images: string[] = (listing.photos ?? [])
    .map((p: { url: string }) => p.url)
    .filter(Boolean)

  // Fall back to coverPhoto if photos array is empty
  if (images.length === 0 && listing.coverPhoto?.url) {
    images.push(listing.coverPhoto.url)
  }

  const lat: number = listing.geography?.lat ?? 0
  const lng: number = listing.geography?.lng ?? 0

  // Build address from location breadcrumb array
  const locationParts: string[] = (listing.location ?? [])
    .map((l: { name: string }) => l.name)
    .filter(Boolean)
  const address = locationParts.join(', ')

  // Format price with commas
  const priceNum = Number(listing.price ?? 0)
  const price = priceNum.toLocaleString('en-US')

  // Bayut always shows AED for UAE listings
  const currency = listing.currency ?? 'AED'

  const amenities: string[] = (listing.amenities ?? [])
    .map((a: string | { text: string }) =>
      typeof a === 'string' ? a : a?.text
    )
    .filter(Boolean)

  return {
    id: String(listing.id),
    source_url: sourceUrl,
    title: listing.title ?? 'Property',
    price,
    currency,
    beds: Number(listing.rooms ?? 0),
    baths: Number(listing.baths ?? 0),
    area_sqft: Number(listing.area ?? 0),
    location: { lat, lng, address },
    images,
    amenities,
    description: listing.description ?? '',
  }
}

export async function scrapeBayutListing(url: string): Promise<Property | null> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    // Next.js caches fetch by default; opt-out for fresh scrapes
    cache: 'no-store',
  })

  if (!res.ok) return null

  const html = await res.text()
  const nextData = extractNextData(html)
  if (!nextData) return null

  return parseBayutListing(nextData, url)
}
```

### Step 4: Run test to verify it passes

```bash
npm run test:run -- tests/scraping/bayut.test.ts
```

Expected: All 4 tests PASS.

### Step 5: Commit

```bash
git add lib/scraping/bayut.ts tests/scraping/
git commit -m "feat: add Bayut __NEXT_DATA__ scraper with tests"
```

---

## Task 5: Firecrawl Fallback Scraper

**Files:**
- Create: `lib/scraping/firecrawl.ts`

This is the fallback when Bayut blocks the direct fetch. Firecrawl returns clean markdown + structured content.

### Step 1: Create `lib/scraping/firecrawl.ts`

```typescript
import type { Property } from '@/types/property'

interface FirecrawlResponse {
  success: boolean
  data?: {
    markdown?: string
    metadata?: {
      title?: string
      ogImage?: string
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    llm_extraction?: any
  }
  error?: string
}

export async function scrapeWithFirecrawl(url: string): Promise<Property | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not set')

  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'extract'],
      extract: {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            price: { type: 'string' },
            currency: { type: 'string', default: 'AED' },
            beds: { type: 'number' },
            baths: { type: 'number' },
            area_sqft: { type: 'number' },
            address: { type: 'string' },
            lat: { type: 'number' },
            lng: { type: 'number' },
            images: { type: 'array', items: { type: 'string' } },
            amenities: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
          },
        },
        prompt:
          'Extract the property listing details: title, price, currency, number of bedrooms (beds), bathrooms (baths), area in square feet (area_sqft), full address, latitude, longitude, all photo/image URLs, amenities list, and description.',
      },
    }),
  })

  const json: FirecrawlResponse = await res.json()
  if (!json.success || !json.data?.llm_extraction) return null

  const e = json.data.llm_extraction
  const urlId = url.match(/details-(\d+)/)?.[1] ?? Date.now().toString()

  return {
    id: urlId,
    source_url: url,
    title: e.title ?? 'Property',
    price: String(e.price ?? '0').replace(/[^0-9,]/g, ''),
    currency: e.currency ?? 'AED',
    beds: Number(e.beds ?? 0),
    baths: Number(e.baths ?? 0),
    area_sqft: Number(e.area_sqft ?? 0),
    location: {
      lat: Number(e.lat ?? 0),
      lng: Number(e.lng ?? 0),
      address: e.address ?? '',
    },
    images: Array.isArray(e.images) ? e.images : [],
    amenities: Array.isArray(e.amenities) ? e.amenities : [],
    description: e.description ?? '',
  }
}
```

### Step 2: Commit

```bash
git add lib/scraping/firecrawl.ts
git commit -m "feat: add Firecrawl fallback scraper"
```

---

## Task 6: Generate API Route (Streaming)

**Files:**
- Create: `app/api/generate/route.ts`
- Create: `lib/nanoid.ts`

### Step 1: Create `lib/nanoid.ts`

```typescript
import { customAlphabet } from 'nanoid'

// URL-safe alphabet, 10 chars (~1 billion combinations)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export function generateSlug(): string {
  return nanoid()
}
```

### Step 2: Create `app/api/generate/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scrapeBayutListing } from '@/lib/scraping/bayut'
import { scrapeWithFirecrawl } from '@/lib/scraping/firecrawl'
import { generateSlug } from '@/lib/nanoid'
import type { GenerateEvent, Property } from '@/types/property'

function send(controller: ReadableStreamDefaultController, event: GenerateEvent) {
  const data = JSON.stringify(event) + '\n'
  controller.enqueue(new TextEncoder().encode(data))
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  // Validate URL
  if (!url || !url.match(/^https?:\/\/(www\.)?bayut\.com\/property\/details-\d+/)) {
    return new Response(
      JSON.stringify({ error: 'Invalid URL. Must be a bayut.com property URL.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const supabase = createServiceClient()

      try {
        // Idempotency: check if story already exists
        const { data: existing } = await supabase
          .from('stories')
          .select('slug, data')
          .eq('source_url', url)
          .eq('status', 'ready')
          .maybeSingle()

        if (existing) {
          send(controller, {
            type: 'existing',
            slug: existing.slug,
            data: existing.data as Property,
          })
          controller.close()
          return
        }

        // Create pending story record
        const slug = generateSlug()
        await supabase.from('stories').insert({
          slug,
          source_url: url,
          status: 'pending',
        })

        // Step 1: Try __NEXT_DATA__ extraction
        send(controller, { type: 'status', message: 'Fetching listing...' })
        let property: Property | null = await scrapeBayutListing(url)

        // Step 2: Fallback to Firecrawl
        if (!property) {
          send(controller, {
            type: 'status',
            message: 'Falling back to Firecrawl...',
          })
          property = await scrapeWithFirecrawl(url)
        }

        if (!property) {
          await supabase
            .from('stories')
            .update({ status: 'failed', error: 'Failed to extract property data' })
            .eq('slug', slug)
          send(controller, {
            type: 'error',
            message: 'Could not extract property data from this URL.',
          })
          controller.close()
          return
        }

        // Step 3: Save to Supabase
        send(controller, { type: 'status', message: 'Building story...' })
        await supabase
          .from('stories')
          .update({ status: 'ready', data: property })
          .eq('slug', slug)

        send(controller, { type: 'complete', slug, data: property })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        send(controller, { type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
```

### Step 3: Commit

```bash
git add app/api/ lib/nanoid.ts
git commit -m "feat: add streaming generate API route with idempotency"
```

---

## Task 7: Dashboard Page

**Files:**
- Modify: `app/page.tsx`
- Create: `components/dashboard/URLForm.tsx`
- Create: `components/dashboard/GenerationStatus.tsx`

### Step 1: Create `components/dashboard/URLForm.tsx`

```tsx
'use client'

import { useState } from 'react'

interface URLFormProps {
  onSubmit: (url: string) => void
  isLoading: boolean
}

export function URLForm({ onSubmit, isLoading }: URLFormProps) {
  const [url, setUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Property URL
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.bayut.com/property/details-XXXXXXX.html"
        disabled={isLoading}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3
                   text-white placeholder-gray-500 focus:border-blue-500
                   focus:outline-none focus:ring-1 focus:ring-blue-500
                   disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white
                   hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50
                   transition-colors"
      >
        {isLoading ? 'Generating...' : 'Generate Story'}
      </button>
    </form>
  )
}
```

### Step 2: Create `components/dashboard/GenerationStatus.tsx`

```tsx
'use client'

interface GenerationStatusProps {
  messages: string[]
  error: string | null
  completedSlug: string | null
}

export function GenerationStatus({ messages, error, completedSlug }: GenerationStatusProps) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const storyUrl = completedSlug ? `${appUrl}/s/${completedSlug}` : null
  const embedCode = completedSlug
    ? `<iframe src="${appUrl}/embed/${completedSlug}" width="400" height="711" frameborder="0" allow="fullscreen"></iframe>`
    : null

  if (messages.length === 0 && !error) return null

  return (
    <div className="w-full max-w-xl space-y-4 mt-6">
      {/* Status steps */}
      <div className="space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
            {msg}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Success output */}
      {storyUrl && (
        <div className="space-y-3 rounded-lg border border-green-800 bg-green-950 px-4 py-4">
          <p className="text-sm font-medium text-green-300">Story generated!</p>

          <div>
            <p className="mb-1 text-xs text-gray-400">Shareable link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={storyUrl}
                className="flex-1 rounded bg-gray-900 px-3 py-2 text-sm text-white"
              />
              <button
                onClick={() => navigator.clipboard.writeText(storyUrl)}
                className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">Iframe embed code</p>
            <textarea
              readOnly
              value={embedCode ?? ''}
              rows={3}
              className="w-full rounded bg-gray-900 px-3 py-2 text-xs text-gray-300
                         font-mono resize-none"
            />
          </div>

          <a
            href={storyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm
                       font-semibold text-white hover:bg-blue-500"
          >
            Open Story →
          </a>
        </div>
      )}
    </div>
  )
}
```

### Step 3: Replace `app/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { URLForm } from '@/components/dashboard/URLForm'
import { GenerationStatus } from '@/components/dashboard/GenerationStatus'
import type { GenerateEvent } from '@/types/property'

export default function Dashboard() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [completedSlug, setCompletedSlug] = useState<string | null>(null)

  async function handleSubmit(url: string) {
    setIsLoading(true)
    setMessages([])
    setError(null)
    setCompletedSlug(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n').filter(Boolean)

        for (const line of lines) {
          const event: GenerateEvent = JSON.parse(line)

          if (event.type === 'status') {
            setMessages((prev) => [...prev, event.message])
          } else if (event.type === 'existing') {
            setMessages(['Story already exists!'])
            setCompletedSlug(event.slug)
            // Auto-redirect after 1s
            setTimeout(() => router.push(`/s/${event.slug}`), 1000)
          } else if (event.type === 'complete') {
            setMessages((prev) => [...prev, 'Story ready!'])
            setCompletedSlug(event.slug)
          } else if (event.type === 'error') {
            setError(event.message)
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start
                      bg-gray-950 px-4 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-white">🐙 Octopus</h1>
        <p className="mt-2 text-gray-400">
          Turn any Bayut listing into a tappable story
        </p>
      </div>

      <URLForm onSubmit={handleSubmit} isLoading={isLoading} />
      <GenerationStatus
        messages={messages}
        error={error}
        completedSlug={completedSlug}
      />
    </main>
  )
}
```

### Step 4: Run dev server to verify UI

```bash
npm run dev
```

Open `http://localhost:3000`. You should see the dashboard with the URL input form.

### Step 5: Commit

```bash
git add app/page.tsx components/dashboard/
git commit -m "feat: add dashboard with URL form and streaming status display"
```

---

## Task 8: Story Viewer — Core State Machine

**Files:**
- Create: `components/story/StoryViewer.tsx`

This is the central controller for the story experience. It manages:
- Current slide index
- Auto-advance timer (6s)
- Paused state (long-press, map slide)
- Touch/tap navigation

### Step 1: Create `components/story/StoryViewer.tsx`

```tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Property } from '@/types/property'
import { ProgressBar } from './ProgressBar'
import { CTABar } from './CTABar'
import { CoverSlide } from './slides/CoverSlide'
import { MediaSlide } from './slides/MediaSlide'
import { DetailsSlide } from './slides/DetailsSlide'
import { AmenitiesSlide } from './slides/AmenitiesSlide'
import { MapSlide } from './slides/MapSlide'

interface StoryViewerProps {
  data: Property
  isEmbed?: boolean
}

// Build the ordered list of slide types from property data
function buildSlides(data: Property) {
  const slides: { type: string; index?: number }[] = [
    { type: 'cover' },
    ...data.images.map((_, i) => ({ type: 'media', index: i })),
    { type: 'details' },
    { type: 'amenities' },
    { type: 'map' },
  ]
  return slides
}

const AUTO_ADVANCE_MS = 6000
const LONG_PRESS_MS = 300

export function StoryViewer({ data, isEmbed = false }: StoryViewerProps) {
  const slides = buildSlides(data)
  const totalSlides = slides.length

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressStartRef = useRef<number>(Date.now())
  const [progressKey, setProgressKey] = useState(0) // forces animation restart

  const currentSlide = slides[current]
  const isInteractive = currentSlide.type === 'map' || currentSlide.type === 'details'

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, totalSlides - 1))
    setProgressKey((k) => k + 1)
    progressStartRef.current = Date.now()
  }, [totalSlides])

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0))
    setProgressKey((k) => k + 1)
    progressStartRef.current = Date.now()
  }, [])

  // Auto-advance timer
  useEffect(() => {
    if (paused || isInteractive) return

    timerRef.current = setTimeout(goNext, AUTO_ADVANCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, paused, isInteractive, goNext])

  // Tap handler: left 30% = prev, right 70% = next
  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const clientX =
      'touches' in e
        ? e.changedTouches[0]?.clientX ?? 0
        : (e as React.MouseEvent).clientX
    const tapX = clientX - rect.left
    const ratio = tapX / rect.width

    if (ratio < 0.3) {
      goPrev()
    } else {
      goNext()
    }
  }

  // Long-press: pause and hide UI
  function handlePointerDown() {
    longPressRef.current = setTimeout(() => {
      setPaused(true)
      setUiHidden(true)
      if (timerRef.current) clearTimeout(timerRef.current)
    }, LONG_PRESS_MS)
  }

  function handlePointerUp() {
    if (longPressRef.current) clearTimeout(longPressRef.current)
    if (uiHidden) {
      setPaused(false)
      setUiHidden(false)
      setProgressKey((k) => k + 1)
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
  }

  return (
    <div
      className="story-container relative overflow-hidden bg-black select-none"
      style={{ aspectRatio: '9/16', maxHeight: '100dvh' }}
      onClick={handleTap}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      {/* Slide content */}
      {currentSlide.type === 'cover' && <CoverSlide data={data} />}
      {currentSlide.type === 'media' && (
        <MediaSlide imageUrl={data.images[currentSlide.index!]} />
      )}
      {currentSlide.type === 'details' && <DetailsSlide data={data} />}
      {currentSlide.type === 'amenities' && <AmenitiesSlide amenities={data.amenities} />}
      {currentSlide.type === 'map' && (
        <MapSlide
          lat={data.location.lat}
          lng={data.location.lng}
          address={data.location.address}
          onNavigate={goNext}
        />
      )}

      {/* Overlay UI — hidden on long-press */}
      {!uiHidden && (
        <>
          <ProgressBar
            key={progressKey}
            total={totalSlides}
            current={current}
            paused={paused || isInteractive}
            durationMs={AUTO_ADVANCE_MS}
          />

          {/* Arrow buttons for interactive slides */}
          {isInteractive && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20
                           rounded-full bg-black/40 p-2 text-white backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
              >
                ‹
              </button>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20
                           rounded-full bg-black/40 p-2 text-white backdrop-blur-sm"
                onClick={(e) => { e.stopPropagation(); goNext() }}
              >
                ›
              </button>
            </>
          )}

          {!isEmbed && (
            <CTABar title={data.title} />
          )}
        </>
      )}
    </div>
  )
}
```

### Step 2: Commit

```bash
git add components/story/StoryViewer.tsx
git commit -m "feat: add StoryViewer core with tap navigation, long-press pause, auto-advance"
```

---

## Task 9: Progress Bar

**Files:**
- Create: `components/story/ProgressBar.tsx`

### Step 1: Create `components/story/ProgressBar.tsx`

```tsx
'use client'

import { useEffect, useRef } from 'react'

interface ProgressBarProps {
  total: number
  current: number
  paused: boolean
  durationMs: number
}

export function ProgressBar({ total, current, paused, durationMs }: ProgressBarProps) {
  // Each segment: filled (past), animating (current), empty (future)
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-2">
      {Array.from({ length: total }).map((_, i) => (
        <Segment
          key={i}
          state={i < current ? 'filled' : i === current ? 'active' : 'empty'}
          paused={paused}
          durationMs={durationMs}
        />
      ))}
    </div>
  )
}

function Segment({
  state,
  paused,
  durationMs,
}: {
  state: 'filled' | 'active' | 'empty'
  paused: boolean
  durationMs: number
}) {
  const fillRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const pausedAtRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)

  useEffect(() => {
    if (state !== 'active') return

    function animate(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp - elapsedRef.current
      }

      if (!paused) {
        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / durationMs, 1)

        if (fillRef.current) {
          fillRef.current.style.width = `${progress * 100}%`
        }

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        }
      } else {
        // Track how much time has elapsed so we can resume
        if (pausedAtRef.current === null) {
          pausedAtRef.current = timestamp
          elapsedRef.current = timestamp - startTimeRef.current
        }
        rafRef.current = requestAnimationFrame(animate)
      }

      if (!paused && pausedAtRef.current !== null) {
        // Resume: adjust start time
        const pauseDuration = timestamp - pausedAtRef.current
        startTimeRef.current += pauseDuration
        pausedAtRef.current = null
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [state, paused, durationMs])

  return (
    <div className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
      {state === 'filled' && (
        <div className="h-full w-full bg-white" />
      )}
      {state === 'active' && (
        <div ref={fillRef} className="h-full bg-white" style={{ width: '0%' }} />
      )}
    </div>
  )
}
```

### Step 2: Commit

```bash
git add components/story/ProgressBar.tsx
git commit -m "feat: add Instagram-style animated progress bar"
```

---

## Task 10: CTA Bar

**Files:**
- Create: `components/story/CTABar.tsx`

### Step 1: Create `components/story/CTABar.tsx`

```tsx
interface CTABarProps {
  title: string
}

export function CTABar({ title }: CTABarProps) {
  const phone = process.env.NEXT_PUBLIC_PHONE ?? ''
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP ?? ''
  const encodedMsg = encodeURIComponent(`Hi, I'm interested in: ${title}`)
  const waUrl = `https://wa.me/${whatsapp}?text=${encodedMsg}`

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex gap-2 px-3 pb-4 pt-3
                 bg-gradient-to-t from-black/80 to-transparent"
      onClick={(e) => e.stopPropagation()}
    >
      <a
        href={`tel:${phone}`}
        className="flex-1 rounded-xl bg-white/10 backdrop-blur-sm border
                   border-white/20 py-3 text-center text-sm font-semibold
                   text-white hover:bg-white/20 transition-colors"
      >
        📞 Call
      </a>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 rounded-xl bg-green-600/90 backdrop-blur-sm py-3
                   text-center text-sm font-semibold text-white
                   hover:bg-green-500 transition-colors"
      >
        💬 WhatsApp
      </a>
    </div>
  )
}
```

### Step 2: Commit

```bash
git add components/story/CTABar.tsx
git commit -m "feat: add persistent CTA bar with call and WhatsApp buttons"
```

---

## Task 11: Cover Slide

**Files:**
- Create: `components/story/slides/CoverSlide.tsx`

### Step 1: Create `components/story/slides/CoverSlide.tsx`

```tsx
import Image from 'next/image'
import type { Property } from '@/types/property'

interface CoverSlideProps {
  data: Property
}

export function CoverSlide({ data }: CoverSlideProps) {
  const heroImage = data.images[0] ?? '/placeholder.jpg'

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Blurred background */}
      <Image
        src={heroImage}
        alt=""
        fill
        className="object-cover scale-110 blur-xl brightness-50"
        priority
        unoptimized
      />

      {/* Sharp centered image */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
          <Image
            src={heroImage}
            alt={data.title}
            fill
            className="rounded-lg object-cover shadow-2xl"
            priority
            unoptimized
          />
        </div>
      </div>

      {/* Info overlay at bottom */}
      <div className="absolute bottom-20 left-0 right-0 px-5 pb-2">
        <div className="rounded-xl bg-black/50 backdrop-blur-md px-4 py-3 space-y-1">
          <p className="text-lg font-bold text-white leading-tight line-clamp-2">
            {data.title}
          </p>
          <p className="text-2xl font-extrabold text-white">
            {data.currency} {data.price}
          </p>
          <div className="flex gap-4 text-sm text-gray-300 mt-1">
            {data.beds > 0 && <span>🛏 {data.beds} Beds</span>}
            {data.baths > 0 && <span>🚿 {data.baths} Baths</span>}
            {data.area_sqft > 0 && (
              <span>📐 {data.area_sqft.toLocaleString()} sqft</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Commit

```bash
git add components/story/slides/CoverSlide.tsx
git commit -m "feat: add Cover slide with hero image and property stats"
```

---

## Task 12: Media Slide

**Files:**
- Create: `components/story/slides/MediaSlide.tsx`

### Step 1: Create `components/story/slides/MediaSlide.tsx`

```tsx
import Image from 'next/image'

interface MediaSlideProps {
  imageUrl: string
}

export function MediaSlide({ imageUrl }: MediaSlideProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Blurred background */}
      <Image
        src={imageUrl}
        alt=""
        fill
        className="object-cover scale-110 blur-xl brightness-50"
        unoptimized
      />

      {/* Sharp centered image */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
          <Image
            src={imageUrl}
            alt="Property photo"
            fill
            className="rounded-lg object-cover shadow-2xl"
            unoptimized
          />
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Commit

```bash
git add components/story/slides/MediaSlide.tsx
git commit -m "feat: add Media slide with blurred background effect"
```

---

## Task 13: Details Slide

**Files:**
- Create: `components/story/slides/DetailsSlide.tsx`

### Step 1: Create `components/story/slides/DetailsSlide.tsx`

```tsx
'use client'

import type { Property } from '@/types/property'

interface DetailsSlideProps {
  data: Property
}

const statRows = (data: Property) => [
  { label: 'Price', value: `${data.currency} ${data.price}` },
  { label: 'Bedrooms', value: data.beds > 0 ? `${data.beds}` : 'Studio' },
  { label: 'Bathrooms', value: String(data.baths) },
  { label: 'Area', value: `${data.area_sqft.toLocaleString()} sqft` },
  { label: 'Location', value: data.location.address },
]

export function DetailsSlide({ data }: DetailsSlideProps) {
  return (
    <div className="relative h-full w-full bg-gray-950 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950" />

      <div className="relative h-full overflow-y-auto px-5 pt-16 pb-24">
        <h2 className="mb-5 text-xl font-bold text-white">Property Details</h2>

        {/* Stats table */}
        <div className="mb-6 divide-y divide-gray-800 rounded-xl bg-gray-900 overflow-hidden">
          {statRows(data)
            .filter((r) => r.value && r.value !== '0')
            .map((row) => (
              <div key={row.label} className="flex justify-between px-4 py-3">
                <span className="text-sm text-gray-400">{row.label}</span>
                <span className="text-sm font-medium text-white text-right max-w-[60%]">
                  {row.value}
                </span>
              </div>
            ))}
        </div>

        {/* Description */}
        {data.description && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Description
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {data.description}
            </p>
          </div>
        )}
      </div>

      {/* Fade at bottom */}
      <div className="absolute bottom-16 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 pointer-events-none" />
    </div>
  )
}
```

### Step 2: Commit

```bash
git add components/story/slides/DetailsSlide.tsx
git commit -m "feat: add Details slide with scrollable specs and description"
```

---

## Task 14: Amenities Slide

**Files:**
- Create: `components/story/slides/AmenitiesSlide.tsx`

### Step 1: Create `components/story/slides/AmenitiesSlide.tsx`

```tsx
import {
  Waves, Dumbbell, Car, Shield, Wind, Wifi, Flame,
  WashingMachine, BedDouble, Baby, Trees, Footprints,
  Building2, ShowerHead, UtensilsCrossed, CircleDot,
} from 'lucide-react'

interface AmenitiesSlideProps {
  amenities: string[]
}

// Map common real estate amenity strings to Lucide icons
const AMENITY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  pool: Waves,
  'swimming pool': Waves,
  gym: Dumbbell,
  'fitness center': Dumbbell,
  parking: Car,
  'covered parking': Car,
  security: Shield,
  'cctv': Shield,
  'air conditioning': Wind,
  'central ac': Wind,
  wifi: Wifi,
  internet: Wifi,
  bbq: Flame,
  'barbecue area': Flame,
  laundry: WashingMachine,
  'maid room': BedDouble,
  'kids play area': Baby,
  "children's play area": Baby,
  garden: Trees,
  'landscaped garden': Trees,
  'jogging track': Footprints,
  'concierge': Building2,
  spa: ShowerHead,
  'sauna': ShowerHead,
  'jacuzzi': ShowerHead,
  'restaurant': UtensilsCrossed,
  'cafeteria': UtensilsCrossed,
}

function getIcon(amenity: string) {
  const key = amenity.toLowerCase()
  for (const [pattern, Icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(pattern)) return Icon
  }
  return CircleDot // default icon
}

export function AmenitiesSlide({ amenities }: AmenitiesSlideProps) {
  if (amenities.length === 0) {
    return (
      <div className="h-full w-full bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">No amenities listed</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950" />

      <div className="relative h-full overflow-y-auto px-5 pt-16 pb-24">
        <h2 className="mb-5 text-xl font-bold text-white">Amenities</h2>

        <div className="grid grid-cols-3 gap-3">
          {amenities.map((amenity) => {
            const Icon = getIcon(amenity)
            return (
              <div
                key={amenity}
                className="flex flex-col items-center gap-2 rounded-xl
                           bg-gray-900 px-2 py-4 text-center"
              >
                <Icon size={24} className="text-blue-400" />
                <span className="text-xs text-gray-300 leading-tight">
                  {amenity}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute bottom-16 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 pointer-events-none" />
    </div>
  )
}
```

### Step 2: Commit

```bash
git add components/story/slides/AmenitiesSlide.tsx
git commit -m "feat: add Amenities slide with Lucide icon grid"
```

---

## Task 15: Map Slide

**Files:**
- Create: `components/story/slides/MapSlide.tsx`

### Step 1: Create `components/story/slides/MapSlide.tsx`

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface MapSlideProps {
  lat: number
  lng: number
  address: string
  onNavigate: () => void
}

export function MapSlide({ lat, lng, address }: MapSlideProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      version: 'weekly',
    })

    loader.load().then(() => {
      const position = { lat, lng }

      const map = new google.maps.Map(mapRef.current!, {
        center: position,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b9e' }] },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#2a2a4a' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#0d1b2a' }],
          },
        ],
      })

      new google.maps.Marker({
        position,
        map,
        title: address,
        animation: google.maps.Animation.DROP,
      })

      mapInstanceRef.current = map
    })
  }, [lat, lng, address])

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {/* Location label at top */}
      <div className="absolute top-12 left-0 right-0 px-4 pointer-events-none">
        <div className="rounded-xl bg-black/60 backdrop-blur-sm px-4 py-2">
          <p className="text-xs text-gray-300 truncate">📍 {address}</p>
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Commit

```bash
git add components/story/slides/MapSlide.tsx
git commit -m "feat: add Map slide with Google Maps SDK and dark theme"
```

---

## Task 16: Story Viewer Page

**Files:**
- Create: `app/s/[slug]/page.tsx`

### Step 1: Create `app/s/[slug]/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { StoryViewer } from '@/components/story/StoryViewer'
import type { Story } from '@/types/property'
import type { Metadata } from 'next'

interface PageProps {
  params: { slug: string }
}

async function getStory(slug: string): Promise<Story | null> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'ready')
    .maybeSingle()
  return data as Story | null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const story = await getStory(params.slug)
  if (!story?.data) return { title: 'Octopus Story' }

  return {
    title: `${story.data.title} — Octopus`,
    description: `${story.data.currency} ${story.data.price} | ${story.data.beds} beds | ${story.data.location.address}`,
    openGraph: {
      images: story.data.images[0] ? [story.data.images[0]] : [],
    },
  }
}

export default async function StoryPage({ params }: PageProps) {
  const story = await getStory(params.slug)

  if (!story) notFound()

  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      {/* Desktop: centered card. Mobile: full screen */}
      <div className="w-full max-w-sm mx-auto">
        <StoryViewer data={story.data!} />
      </div>
    </main>
  )
}
```

### Step 2: Commit

```bash
git add app/s/
git commit -m "feat: add story viewer page at /s/[slug]"
```

---

## Task 17: Embed Page

**Files:**
- Create: `app/embed/[slug]/page.tsx`

### Step 1: Create `app/embed/[slug]/page.tsx`

```tsx
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { StoryViewer } from '@/components/story/StoryViewer'
import type { Story } from '@/types/property'

interface PageProps {
  params: { slug: string }
}

export default async function EmbedPage({ params }: PageProps) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('slug', params.slug)
    .eq('status', 'ready')
    .maybeSingle()

  const story = data as Story | null
  if (!story) notFound()

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#000' }}>
        <StoryViewer data={story.data!} isEmbed />
      </body>
    </html>
  )
}
```

> Note: The embed page renders its own `<html>` to avoid the main `app/layout.tsx` chrome.

### Step 2: Commit

```bash
git add app/embed/
git commit -m "feat: add lite embed page at /embed/[slug] for iframe use"
```

---

## Task 18: Next.js Config (Image Domains)

**Files:**
- Modify: `next.config.ts`

### Step 1: Update `next.config.ts`

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.bayut.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.propertyfinder.ae',
      },
    ],
  },
}

export default nextConfig
```

### Step 2: Commit

```bash
git add next.config.ts
git commit -m "chore: allow Bayut CDN images in Next.js Image component"
```

---

## Task 19: End-to-End Validation

This is a manual test step to verify the full pipeline works with a real Bayut URL.

### Step 1: Start the dev server

```bash
npm run dev
```

### Step 2: Test with the example URL

Open `http://localhost:3000`. Paste this URL:

```
https://www.bayut.com/property/details-14059216.html
```

Click "Generate Story".

**Expected behavior:**
1. Status messages stream in: "Fetching listing..." → "Building story..."
2. Within ~5-10 seconds: "Story ready!" appears
3. Shareable URL and iframe embed code shown
4. Click "Open Story →" — should see 9:16 story with real property images

### Step 3: Verify each slide type

Navigate through all slides:
- [ ] Cover: hero image with blur background, title + price + stats
- [ ] Media slides: multiple images, blurred background
- [ ] Details slide: specs table + scrollable description
- [ ] Amenities slide: icon grid
- [ ] Map slide: interactive Google Maps with property pin, progress bar paused

### Step 4: Test tap navigation

On mobile (or Chrome DevTools responsive mode):
- [ ] Tap left 30%: goes to previous slide
- [ ] Tap right 70%: goes to next slide
- [ ] Long-press: pauses and hides UI, release resumes

### Step 5: Test idempotency

Paste the same Bayut URL again and submit. Should return "Story already exists!" immediately without re-scraping.

### Step 6: Test iframe embed

Copy the embed code from the dashboard. Open a plain HTML file and paste it:

```html
<!DOCTYPE html>
<html>
<body style="background:#eee; display:flex; justify-content:center; padding:40px">
  <!-- paste iframe code here -->
</body>
</html>
```

Open in browser. Story should render inside the iframe.

### Step 7: Fix any issues found, then commit

```bash
git add -A
git commit -m "fix: end-to-end validation fixes"
```

---

## Task 20: Deploy to Vercel

### Step 1: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/octopus.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to vercel.com → New Project → Import your repo
2. Framework: Next.js (auto-detected)
3. Add all environment variables from `.env.local`
4. Deploy

### Step 3: Verify production deployment

Open the deployed URL. Repeat Task 19 steps 2-6 against production.

If Bayut blocks the fetch (Cloudflare), add your Firecrawl API key to Vercel env vars — the fallback will kick in automatically.

---

## Summary of Env Vars to Set in Vercel

```
SUPABASE_URL
SUPABASE_SERVICE_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
FIRECRAWL_API_KEY
NEXT_PUBLIC_PHONE
NEXT_PUBLIC_WHATSAPP
```

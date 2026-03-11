# Octopus — Property Story Generator: Design Document

**Date:** 2026-03-11
**Status:** Approved

---

## 1. Summary

Octopus is a personal/internal web app that converts a Bayut property listing URL into tappable 9:16 vertical stories (Instagram/AMP Stories style). The output is a shareable public URL and an iframe embed code. No authentication required.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), Tailwind CSS, Framer Motion |
| Backend | Next.js API Routes (Vercel serverless) |
| Database | Supabase (PostgreSQL) |
| Scraping | `__NEXT_DATA__` extraction (free) → Firecrawl API (fallback) |
| Maps | Google Maps JavaScript SDK |
| Deployment | Vercel (free tier, targeting < 10s pipeline) |

---

## 3. Pages

| Route | Description |
|---|---|
| `/` | Dashboard — URL input form, generation status, output |
| `/s/[slug]` | Story viewer (public, no auth) |
| `/embed/[slug]` | Lite story viewer for iframe embedding |

---

## 4. User Flow

1. User pastes a `bayut.com/property/details-*` URL into the dashboard
2. On submit, `POST /api/generate` is called as a streaming response
3. Dashboard shows live status steps as data streams back (skeleton preview)
4. On completion: redirect to `/s/[slug]`
5. Story viewer renders all slides
6. Dashboard also shows the shareable URL and iframe embed code snippet

---

## 5. Scraping Pipeline (`POST /api/generate`)

```
1. Validate URL — must match bayut.com/property/details-* pattern
2. Idempotency check — query Supabase for existing source_url
   → Found: return existing slug + data
   → Not found: continue
3. Create pending story record in Supabase → get slug (nanoid)
4. Stream: "Fetching listing..."
   → Server-side fetch of Bayut HTML
   → Extract <script id="__NEXT_DATA__"> JSON
   → Parse + normalize to Property schema
   → If fails: Stream "Falling back to Firecrawl..." → call Firecrawl API
5. Stream: "Extracting images..."
   → Extract image CDN URLs directly (no re-hosting for V1)
6. Stream: "Building story..."
   → UPDATE stories SET status='ready', data={...} WHERE slug=...
7. Stream: return { slug, data }
   → Client redirects to /s/[slug]
```

**Risk:** Bayut may block server-side fetches (Cloudflare). The `__NEXT_DATA__` approach is tried first. If it fails consistently, Firecrawl is the reliable fallback.

---

## 6. Story Structure

| Slide | Type | Content | Auto-advance |
|---|---|---|---|
| 1 | Cover | Hero image (blurred bg) + Title + Price + Beds/Baths/Size | 6s |
| 2–N | Media | One per listing image. Blurred duplicate bg, centered sharp image | 6s |
| N+1 | Details | Specs table + scrollable full description | 6s (paused while scrolling) |
| N+2 | Amenities | Lucide icon grid of all amenities | 6s |
| N+3 | Map | Interactive Google Maps embed, property pin | **Paused** (manual advance) |

**All listing images are included (no cap).**

---

## 7. Story Viewer — Interaction Model

**Layout:**
- 9:16 aspect ratio container
- Mobile: fills full viewport height
- Desktop: centered card with surrounding chrome

**Navigation:**
- Tap left 30% of screen → previous slide
- Tap right 70% of screen → next slide
- Long-press (touchstart hold, `preventDefault` to block browser context menu) → pause + hide UI overlay
- Translucent arrow buttons on Map slide for discoverability

**Progress bar:**
- Instagram-style segmented bar at the top
- Each active segment animates from 0→100% over 6s
- Pauses on Map slide
- Reflects state on tap navigation

**CTA bar (always visible, pinned bottom):**
- `Call` → `tel:${NEXT_PUBLIC_PHONE}`
- `WhatsApp` → `https://wa.me/${NEXT_PUBLIC_WHATSAPP}?text=Hi, I'm interested in [property title]`

---

## 8. Data Schema

### Supabase: `stories` table

```sql
stories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,        -- nanoid short ID
  source_url  text UNIQUE NOT NULL,        -- for idempotency
  status      text DEFAULT 'pending',      -- 'pending' | 'ready' | 'failed'
  data        jsonb,                       -- Property object (see below)
  error       text,                        -- error message if status='failed'
  created_at  timestamptz DEFAULT now()
)
```

### Property JSON Schema

```typescript
{
  id: string;
  source_url: string;
  title: string;
  price: string;
  currency: string;
  beds: number;
  baths: number;
  area_sqft: number;
  location: { lat: number; lng: number; address: string };
  images: string[];       // CDN URLs from Bayut (direct, not re-hosted)
  amenities: string[];
  description: string;
}
```

---

## 9. Iframe Embed

Story viewer at `/embed/[slug]` renders the full `<StoryViewer>` component without any dashboard chrome. The dashboard surfaces this snippet after generation:

```html
<iframe
  src="https://yourapp.com/embed/abc123xyz"
  width="400"
  height="711"
  frameborder="0"
  allow="fullscreen">
</iframe>
```

(400×711 = 9:16 ratio)

---

## 10. Environment Variables

```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Maps
GOOGLE_MAPS_API_KEY=

# Scraping fallback
FIRECRAWL_API_KEY=

# CTA contact info (static, global)
NEXT_PUBLIC_PHONE=
NEXT_PUBLIC_WHATSAPP=
```

---

## 11. V1 Constraints (Intentional Scope Limits)

- **Portal:** Bayut only
- **Language:** English only
- **Images:** Direct CDN URLs (no re-hosting to Supabase Storage)
- **Auth:** None
- **Video:** Not supported
- **Editing:** No post-scrape editing of story content
- **History:** No dashboard history/list of past stories
- **CTA contacts:** Hardcoded via env vars, not per-story

---

## 12. Success Criteria

- URL → visible story in < 10 seconds
- Story slides interactive in < 2 seconds on load
- Works correctly on mobile (full-screen) and desktop (centered card)
- Shareable URL always publicly accessible
- Iframe embed works in external websites

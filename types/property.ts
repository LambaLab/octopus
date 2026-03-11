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

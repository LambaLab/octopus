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
    extract?: any
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
  if (!json.success || !json.data?.extract) return null

  const e = json.data.extract
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

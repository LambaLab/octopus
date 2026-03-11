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

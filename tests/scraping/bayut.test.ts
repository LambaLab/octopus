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

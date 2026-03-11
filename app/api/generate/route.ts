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

  // Validate URL — must be a Bayut property details URL
  if (!url || !String(url).match(/^https?:\/\/(www\.)?bayut\.com\/property\/details-\d+/)) {
    return new Response(
      JSON.stringify({ error: 'Invalid URL. Must be a bayut.com property URL.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const supabase = createServiceClient()

      try {
        // Idempotency: check if story already exists and is ready
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

        // Create a pending story record to get a slug
        const slug = generateSlug()
        await supabase.from('stories').insert({
          slug,
          source_url: url,
          status: 'pending',
        })

        // Step 1: Try __NEXT_DATA__ extraction (free, fast)
        send(controller, { type: 'status', message: 'Fetching listing...' })
        let property: Property | null = await scrapeBayutListing(url)

        // Step 2: Fallback to Firecrawl if direct fetch failed
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

        // Save to Supabase
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

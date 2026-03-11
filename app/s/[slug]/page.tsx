import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { StoryViewer } from '@/components/story/StoryViewer'
import type { Story } from '@/types/property'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
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
  const { slug } = await params
  const story = await getStory(slug)
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
  const { slug } = await params
  const story = await getStory(slug)

  if (!story) notFound()

  return (
    <main className="h-dvh w-screen bg-black sm:flex sm:items-center sm:justify-center">
      <div className="h-full w-full sm:w-auto sm:max-w-sm">
        <StoryViewer data={story.data!} />
      </div>
    </main>
  )
}

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { StoryViewer } from '@/components/story/StoryViewer'
import type { Story } from '@/types/property'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EmbedPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'ready')
    .maybeSingle()

  const story = data as Story | null
  if (!story) notFound()

  // Minimal wrapper for iframe embedding — no chrome, just the story
  return (
    <div className="h-dvh w-screen bg-black sm:flex sm:items-center sm:justify-center">
      <div className="h-full w-full sm:w-auto sm:max-w-sm">
        <StoryViewer data={story.data!} isEmbed />
      </div>
    </div>
  )
}

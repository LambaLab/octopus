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
    <div className="h-screen w-screen overflow-hidden bg-black flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto">
        <StoryViewer data={story.data!} isEmbed />
      </div>
    </div>
  )
}

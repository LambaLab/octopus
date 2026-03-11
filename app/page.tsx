'use client'

import { useState } from 'react'
import { URLForm } from '@/components/dashboard/URLForm'
import { GenerationStatus } from '@/components/dashboard/GenerationStatus'
import type { GenerateEvent } from '@/types/property'

export default function Dashboard() {
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
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const event: GenerateEvent = JSON.parse(line)

          if (event.type === 'status') {
            setMessages((prev) => [...prev, event.message])
          } else if (event.type === 'existing') {
            setMessages(['Story already exists!'])
            setCompletedSlug(event.slug)
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

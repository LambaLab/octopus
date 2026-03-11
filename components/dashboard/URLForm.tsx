'use client'

import { useState } from 'react'

interface URLFormProps {
  onSubmit: (url: string) => void
  isLoading: boolean
}

export function URLForm({ onSubmit, isLoading }: URLFormProps) {
  const [url, setUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        Property URL
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.bayut.com/property/details-XXXXXXX.html"
        disabled={isLoading}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3
                   text-white placeholder-gray-500 focus:border-blue-500
                   focus:outline-none focus:ring-1 focus:ring-blue-500
                   disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={isLoading || !url.trim()}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white
                   hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50
                   transition-colors"
      >
        {isLoading ? 'Generating...' : 'Generate Story'}
      </button>
    </form>
  )
}

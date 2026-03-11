'use client'

interface GenerationStatusProps {
  messages: string[]
  error: string | null
  completedSlug: string | null
}

export function GenerationStatus({ messages, error, completedSlug }: GenerationStatusProps) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const storyUrl = completedSlug ? `${appUrl}/s/${completedSlug}` : null
  const embedCode = completedSlug
    ? `<iframe src="${appUrl}/embed/${completedSlug}" width="400" height="711" frameborder="0" allow="fullscreen"></iframe>`
    : null

  if (messages.length === 0 && !error) return null

  return (
    <div className="w-full max-w-xl space-y-4 mt-6">
      {/* Status steps */}
      <div className="space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
            {msg}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Success output */}
      {storyUrl && (
        <div className="space-y-3 rounded-lg border border-green-800 bg-green-950 px-4 py-4">
          <p className="text-sm font-medium text-green-300">Story generated!</p>

          <div>
            <p className="mb-1 text-xs text-gray-400">Shareable link</p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={storyUrl}
                className="flex-1 rounded bg-gray-900 px-3 py-2 text-sm text-white"
              />
              <button
                onClick={() => navigator.clipboard.writeText(storyUrl)}
                className="rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-gray-400">Iframe embed code</p>
            <textarea
              readOnly
              value={embedCode ?? ''}
              rows={3}
              className="w-full rounded bg-gray-900 px-3 py-2 text-xs text-gray-300
                         font-mono resize-none"
            />
          </div>

          <a
            href={storyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded bg-blue-600 px-4 py-2 text-sm
                       font-semibold text-white hover:bg-blue-500"
          >
            Open Story →
          </a>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'

interface ProgressBarProps {
  total: number
  current: number
  paused: boolean
  durationMs: number
}

export function ProgressBar({ total, current, paused, durationMs }: ProgressBarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-2">
      {Array.from({ length: total }).map((_, i) => (
        <Segment
          key={i}
          state={i < current ? 'filled' : i === current ? 'active' : 'empty'}
          paused={paused}
          durationMs={durationMs}
        />
      ))}
    </div>
  )
}

function Segment({
  state,
  paused,
  durationMs,
}: {
  state: 'filled' | 'active' | 'empty'
  paused: boolean
  durationMs: number
}) {
  const fillRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)
  const pausedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (state !== 'active') return

    // Reset state when this segment becomes active
    startTimeRef.current = null
    elapsedRef.current = 0
    pausedAtRef.current = null

    function animate(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      if (paused) {
        if (pausedAtRef.current === null) {
          pausedAtRef.current = timestamp
          elapsedRef.current = timestamp - startTimeRef.current
        }
        rafRef.current = requestAnimationFrame(animate)
        return
      }

      // Resume after pause: shift the start time forward
      if (pausedAtRef.current !== null) {
        const pauseDuration = timestamp - pausedAtRef.current
        startTimeRef.current += pauseDuration
        pausedAtRef.current = null
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / durationMs, 1)

      if (fillRef.current) {
        fillRef.current.style.width = `${progress * 100}%`
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, durationMs])

  // Handle pause changes separately without restarting the animation
  useEffect(() => {
    // The animate loop checks `paused` via closure — this effect just
    // ensures the RAF loop is running when unpausing from outside
    if (state !== 'active' || !paused) return
    // nothing to do here; the RAF loop handles pause inline
  }, [state, paused])

  return (
    <div className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
      {state === 'filled' && <div className="h-full w-full bg-white" />}
      {state === 'active' && (
        <div ref={fillRef} className="h-full bg-white" style={{ width: '0%' }} />
      )}
    </div>
  )
}

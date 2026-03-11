'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Property } from '@/types/property'
import { ProgressBar } from './ProgressBar'
import { CTABar } from './CTABar'
import { CoverSlide } from './slides/CoverSlide'
import { MediaSlide } from './slides/MediaSlide'
import { DetailsSlide } from './slides/DetailsSlide'
import { AmenitiesSlide } from './slides/AmenitiesSlide'
import { MapSlide } from './slides/MapSlide'
import { SlideNav } from './SlideNav'
import type { SlideDescriptor } from './types'

interface StoryViewerProps {
  data: Property
  isEmbed?: boolean
}

function buildSlides(data: Property): SlideDescriptor[] {
  return [
    { type: 'cover' },
    ...data.images.map((_, i): SlideDescriptor => ({ type: 'media', index: i })),
    { type: 'details' },
    { type: 'amenities' },
    { type: 'map' },
  ]
}

const AUTO_ADVANCE_MS = 6000
const LONG_PRESS_MS = 300

export function StoryViewer({ data, isEmbed = false }: StoryViewerProps) {
  const slides = useMemo(() => buildSlides(data), [data])
  const totalSlides = slides.length

  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [uiHidden, setUiHidden] = useState(false)
  const [progressKey, setProgressKey] = useState(0)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSlide = slides[current]
  const isInteractive = currentSlide.type === 'map' || currentSlide.type === 'details'

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, totalSlides - 1))
    setProgressKey((k) => k + 1)
  }, [totalSlides])

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0))
    setProgressKey((k) => k + 1)
  }, [])

  const goTo = useCallback((index: number) => {
    setCurrent(index)
    setProgressKey((k) => k + 1)
  }, [])

  // Auto-advance timer — reset whenever current slide or paused state changes
  useEffect(() => {
    if (paused || isInteractive) return
    timerRef.current = setTimeout(goNext, AUTO_ADVANCE_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [current, paused, isInteractive, goNext])

  // Tap handler: left 30% = prev, right 70% = next
  function handleTap(e: React.MouseEvent | React.TouchEvent) {
    // Don't navigate if we were in a long-press pause (just released)
    if (uiHidden) return

    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    const clientX =
      'changedTouches' in e
        ? e.changedTouches[0]?.clientX ?? 0
        : (e as React.MouseEvent).clientX
    const ratio = (clientX - rect.left) / rect.width

    if (ratio < 0.3) {
      goPrev()
    } else {
      goNext()
    }
  }

  function handlePointerDown() {
    longPressRef.current = setTimeout(() => {
      setPaused(true)
      setUiHidden(true)
      if (timerRef.current) clearTimeout(timerRef.current)
    }, LONG_PRESS_MS)
  }

  function handlePointerUp() {
    if (longPressRef.current) clearTimeout(longPressRef.current)
    if (uiHidden) {
      setPaused(false)
      setUiHidden(false)
      setProgressKey((k) => k + 1)
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
  }

  return (
    <div
      className="story-container relative overflow-hidden bg-black select-none h-full w-full sm:aspect-[9/16] sm:max-h-[100dvh] sm:h-auto sm:w-full"
      onClick={handleTap}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      {/* Slide content */}
      {currentSlide.type === 'cover' && <CoverSlide data={data} />}
      {currentSlide.type === 'media' && (
        <MediaSlide imageUrl={data.images[(currentSlide as { type: 'media'; index: number }).index]} />
      )}
      {currentSlide.type === 'details' && <DetailsSlide data={data} />}
      {currentSlide.type === 'amenities' && <AmenitiesSlide amenities={data.amenities} />}
      {currentSlide.type === 'map' && (
        <MapSlide
          lat={data.location.lat}
          lng={data.location.lng}
          address={data.location.address}
        />
      )}

      {/* Overlay UI — hidden during long-press */}
      {!uiHidden && (
        <>
          <ProgressBar
            key={progressKey}
            total={totalSlides}
            current={current}
            paused={paused || isInteractive}
            durationMs={AUTO_ADVANCE_MS}
          />

          <SlideNav
            slides={slides}
            current={current}
            onJump={goTo}
          />

          {/* Arrow buttons shown on interactive slides */}
          {isInteractive && (
            <>
              <button
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20
                           rounded-full bg-black/40 p-3 text-white backdrop-blur-sm
                           text-xl leading-none"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                aria-label="Previous slide"
              >
                ‹
              </button>
              <button
                className="absolute right-14 top-1/2 -translate-y-1/2 z-20
                           rounded-full bg-black/40 p-3 text-white backdrop-blur-sm
                           text-xl leading-none"
                onClick={(e) => { e.stopPropagation(); goNext() }}
                aria-label="Next slide"
              >
                ›
              </button>
            </>
          )}

          {!isEmbed && <CTABar title={data.title} />}
        </>
      )}
    </div>
  )
}

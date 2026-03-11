'use client'

import { useEffect, useRef } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

interface MapSlideProps {
  lat: number
  lng: number
  address: string
}

export function MapSlide({ lat, lng, address }: MapSlideProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    if (!lat || !lng) return

    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      v: 'weekly',
    })

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
    ]).then(([{ Map }, { Marker }]) => {
      if (!mapRef.current) return
      const position = { lat, lng }

      const map = new Map(mapRef.current, {
        center: position,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8b8b9e' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
        ],
      })

      new Marker({
        position,
        map,
        title: address,
        animation: google.maps.Animation.DROP,
      })

      mapInstanceRef.current = map
    })
  }, [lat, lng, address])

  // Show placeholder if no coordinates
  if (!lat || !lng) {
    return (
      <div className="h-full w-full bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Location not available</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {/* Location label */}
      <div className="absolute top-12 left-0 right-0 px-4 pointer-events-none z-10">
        <div className="rounded-xl bg-black/60 backdrop-blur-sm px-4 py-2">
          <p className="text-xs text-gray-300 truncate">📍 {address}</p>
        </div>
      </div>
    </div>
  )
}

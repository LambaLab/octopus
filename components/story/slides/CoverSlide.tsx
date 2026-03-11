import Image from 'next/image'
import type { Property } from '@/types/property'

interface CoverSlideProps {
  data: Property
}

export function CoverSlide({ data }: CoverSlideProps) {
  const heroImage = data.images[0] ?? ''

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Blurred background */}
      {heroImage && (
        <Image
          src={heroImage}
          alt=""
          fill
          className="object-cover scale-110 blur-xl brightness-50"
          priority
          unoptimized
        />
      )}

      {/* Sharp centered image */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
          {heroImage && (
            <Image
              src={heroImage}
              alt={data.title}
              fill
              className="rounded-lg object-cover shadow-2xl"
              priority
              unoptimized
            />
          )}
        </div>
      </div>

      {/* Info overlay at bottom */}
      <div className="absolute bottom-20 left-0 right-0 px-5 pb-2">
        <div className="rounded-xl bg-black/50 backdrop-blur-md px-4 py-3 space-y-1">
          <p className="text-lg font-bold text-white leading-tight line-clamp-2">
            {data.title}
          </p>
          <p className="text-2xl font-extrabold text-white">
            {data.currency} {data.price}
          </p>
          <div className="flex gap-4 text-sm text-gray-300 mt-1 flex-wrap">
            {data.beds > 0 && <span>🛏 {data.beds} Beds</span>}
            {data.baths > 0 && <span>🚿 {data.baths} Baths</span>}
            {data.area_sqft > 0 && (
              <span>📐 {data.area_sqft.toLocaleString()} sqft</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

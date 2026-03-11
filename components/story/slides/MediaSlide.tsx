import Image from 'next/image'

interface MediaSlideProps {
  imageUrl: string
}

export function MediaSlide({ imageUrl }: MediaSlideProps) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Blurred background */}
      <Image
        src={imageUrl}
        alt=""
        fill
        className="object-cover scale-110 blur-xl brightness-50"
        unoptimized
      />

      {/* Sharp centered image */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
          <Image
            src={imageUrl}
            alt="Property photo"
            fill
            className="rounded-lg object-cover shadow-2xl"
            unoptimized
          />
        </div>
      </div>
    </div>
  )
}

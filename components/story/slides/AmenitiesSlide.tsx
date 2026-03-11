export function AmenitiesSlide({ amenities }: { amenities: string[] }) {
  return <div className="h-full w-full bg-gray-900 flex items-center justify-center text-white">{amenities.join(', ')}</div>
}

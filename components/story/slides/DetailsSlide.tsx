import type { Property } from '@/types/property'

interface DetailsSlideProps {
  data: Property
}

function statRows(data: Property) {
  return [
    { label: 'Price', value: `${data.currency} ${data.price}` },
    { label: 'Bedrooms', value: data.beds > 0 ? `${data.beds}` : 'Studio' },
    { label: 'Bathrooms', value: String(data.baths) },
    { label: 'Area', value: data.area_sqft > 0 ? `${data.area_sqft.toLocaleString()} sqft` : '' },
    { label: 'Location', value: data.location.address },
  ].filter((r) => r.value && r.value !== '0')
}

export function DetailsSlide({ data }: DetailsSlideProps) {
  return (
    <div className="relative h-full w-full bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950" />

      <div className="relative h-full overflow-y-auto px-5 pt-16 pb-24">
        <h2 className="mb-5 text-xl font-bold text-white">Property Details</h2>

        {/* Stats table */}
        <div className="mb-6 divide-y divide-gray-800 rounded-xl bg-gray-900 overflow-hidden">
          {statRows(data).map((row) => (
            <div key={row.label} className="flex justify-between px-4 py-3">
              <span className="text-sm text-gray-400">{row.label}</span>
              <span className="text-sm font-medium text-white text-right max-w-[60%]">
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Description */}
        {data.description && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Description
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {data.description}
            </p>
          </div>
        )}
      </div>

      {/* Fade at bottom to indicate scrollable content */}
      <div className="absolute bottom-16 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 pointer-events-none" />
    </div>
  )
}

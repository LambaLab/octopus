import type { Property } from '@/types/property'
export function DetailsSlide({ data }: { data: Property }) {
  return <div className="h-full w-full bg-gray-900 flex items-center justify-center text-white">Details: {data.title}</div>
}

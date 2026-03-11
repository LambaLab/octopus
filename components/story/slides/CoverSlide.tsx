import type { Property } from '@/types/property'
export function CoverSlide({ data }: { data: Property }) {
  return <div className="h-full w-full bg-gray-900 flex items-center justify-center text-white">Cover: {data.title}</div>
}

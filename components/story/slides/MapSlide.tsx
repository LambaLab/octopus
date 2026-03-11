export function MapSlide({ lat, lng, address }: { lat: number; lng: number; address: string }) {
  return <div className="h-full w-full bg-gray-900 flex items-center justify-center text-white">Map: {address} ({lat},{lng})</div>
}

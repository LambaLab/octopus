import {
  Waves, Dumbbell, Car, Shield, Wind, Wifi, Flame,
  WashingMachine, BedDouble, Baby, Trees, Footprints,
  Building2, ShowerHead, UtensilsCrossed, CircleDot,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

interface AmenitiesSlideProps {
  amenities: string[]
}

type IconComponent = React.ComponentType<LucideProps>

const AMENITY_ICONS: Record<string, IconComponent> = {
  pool: Waves,
  'swimming pool': Waves,
  gym: Dumbbell,
  'fitness center': Dumbbell,
  parking: Car,
  'covered parking': Car,
  security: Shield,
  cctv: Shield,
  'air conditioning': Wind,
  'central ac': Wind,
  wifi: Wifi,
  internet: Wifi,
  bbq: Flame,
  'barbecue area': Flame,
  laundry: WashingMachine,
  'maid room': BedDouble,
  'kids play area': Baby,
  "children's play area": Baby,
  garden: Trees,
  'landscaped garden': Trees,
  'jogging track': Footprints,
  concierge: Building2,
  spa: ShowerHead,
  sauna: ShowerHead,
  jacuzzi: ShowerHead,
  restaurant: UtensilsCrossed,
  cafeteria: UtensilsCrossed,
}

function getIcon(amenity: string): IconComponent {
  const key = amenity.toLowerCase()
  for (const [pattern, Icon] of Object.entries(AMENITY_ICONS)) {
    if (key.includes(pattern)) return Icon
  }
  return CircleDot
}

export function AmenitiesSlide({ amenities }: AmenitiesSlideProps) {
  if (amenities.length === 0) {
    return (
      <div className="h-full w-full bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">No amenities listed</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-gray-950 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 to-gray-950" />

      <div className="relative h-full overflow-y-auto px-5 pt-16 pb-24">
        <h2 className="mb-5 text-xl font-bold text-white">Amenities</h2>

        <div className="grid grid-cols-3 gap-3">
          {amenities.map((amenity) => {
            const Icon = getIcon(amenity)
            return (
              <div
                key={amenity}
                className="flex flex-col items-center gap-2 rounded-xl
                           bg-gray-900 px-2 py-4 text-center"
              >
                <Icon size={24} className="text-blue-400" />
                <span className="text-xs text-gray-300 leading-tight">
                  {amenity}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="absolute bottom-16 left-0 right-0 h-12 bg-gradient-to-t from-gray-950 pointer-events-none" />
    </div>
  )
}

'use client'

import type { ComponentType } from 'react'
import { Home, Images, AlignLeft, LayoutGrid } from 'lucide-react'

type SlideDescriptor =
  | { type: 'cover' }
  | { type: 'media'; index: number }
  | { type: 'details' }
  | { type: 'amenities' }
  | { type: 'map' }

interface SlideNavProps {
  slides: SlideDescriptor[]
  current: number
  onJump: (index: number) => void
}

interface NavItem {
  type: SlideDescriptor['type']
  icon: ComponentType<{ size?: number; strokeWidth?: number; color?: string }>
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { type: 'cover',     icon: Home,        label: 'Cover' },
  { type: 'media',     icon: Images,      label: 'Photos' },
  { type: 'details',   icon: AlignLeft,   label: 'Details' },
  { type: 'amenities', icon: LayoutGrid,  label: 'Amenities' },
]

export function SlideNav({ slides, current, onJump }: SlideNavProps) {
  const currentType = slides[current]?.type

  function firstIndexOf(type: SlideDescriptor['type']): number {
    return slides.findIndex((s) => s.type === type)
  }

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3">
      {NAV_ITEMS.map(({ type, icon: Icon, label }) => {
        const targetIndex = firstIndexOf(type)
        if (targetIndex === -1) return null

        const isActive = currentType === type

        return (
          <div key={type} className="flex flex-col items-center gap-0.5">
            <button
              aria-label={label}
              onClick={(e) => {
                e.stopPropagation()
                onJump(targetIndex)
              }}
              className={`
                w-8 h-8 rounded-full bg-black/25 backdrop-blur-sm
                flex items-center justify-center
                transition-opacity duration-200
                ${isActive ? 'opacity-100' : 'opacity-40'}
              `}
            >
              <Icon size={16} strokeWidth={1.75} color="white" />
            </button>
            {isActive && (
              <span className="w-1 h-1 rounded-full bg-white/80" />
            )}
          </div>
        )
      })}
    </div>
  )
}

'use client'

import type { ComponentType } from 'react'
import { Home, Images, AlignLeft, LayoutGrid } from 'lucide-react'
import type { SlideDescriptor } from './types'

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
  { type: 'cover',     icon: Home,       label: 'Home'    },
  { type: 'media',     icon: Images,     label: 'Photos'  },
  { type: 'details',   icon: AlignLeft,  label: 'Details' },
  { type: 'amenities', icon: LayoutGrid, label: 'Features'},
]

const shadow = '0 1px 4px rgba(0,0,0,0.55)'

export function SlideNav({ slides, current, onJump }: SlideNavProps) {
  const currentType = slides[current]?.type

  function firstIndexOf(type: SlideDescriptor['type']): number {
    return slides.findIndex((s) => s.type === type)
  }

  return (
    <div className="absolute right-2 bottom-[12%] z-20 flex flex-col gap-5">
      {NAV_ITEMS.map(({ type, icon: Icon, label }) => {
        const targetIndex = firstIndexOf(type)
        if (targetIndex === -1) return null

        const isActive = currentType === type

        return (
          <button
            key={type}
            aria-label={label}
            onClick={(e) => {
              e.stopPropagation()
              onJump(targetIndex)
            }}
            className={`
              flex items-center justify-center w-10 h-10
              transition-opacity duration-200
              ${isActive ? 'opacity-100' : 'opacity-55'}
            `}
          >
            <span style={{ filter: `drop-shadow(${shadow})` }}>
              <Icon size={24} strokeWidth={1.75} color="white" />
            </span>
          </button>
        )
      })}
    </div>
  )
}

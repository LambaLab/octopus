export type SlideDescriptor =
  | { type: 'cover' }
  | { type: 'media'; index: number }
  | { type: 'details' }
  | { type: 'amenities' }
  | { type: 'map' }

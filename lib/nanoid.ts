import { customAlphabet } from 'nanoid'

// URL-safe lowercase alphabet, 10 chars
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export function generateSlug(): string {
  return nanoid()
}

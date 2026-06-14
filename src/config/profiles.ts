import type { TimberProfile } from './types'

export const PROFILE_LIBRARY: TimberProfile[] = [
  { id: '25x50', label: '25×50', thickness: 25, width: 50, length: 3000 },
  { id: '50x100', label: '50×100', thickness: 50, width: 100, length: 4000 },
  { id: '50x120', label: '50×120', thickness: 50, width: 120, length: 4500 },
  { id: '50x150', label: '50×150', thickness: 50, width: 150, length: 3000 },
  { id: '25x200', label: '25×200', thickness: 25, width: 200, length: 4000 },
]

export const DEFAULT_PROFILE_LENGTH = 4800

export function findProfile(profiles: TimberProfile[], id: string): TimberProfile {
  const found = profiles.find((p) => p.id === id)
  if (!found) throw new Error(`Unknown timber profile: ${id}`)
  return found
}

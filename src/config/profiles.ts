import type { TimberProfile } from './types'

export const PROFILE_LIBRARY: TimberProfile[] = [
  { id: 'batten-25x50', label: 'Batten 25×50', thickness: 25, width: 50 },
  { id: 'stud-45x70', label: 'Stud 45×70', thickness: 45, width: 70 },
  { id: 'stud-45x95', label: 'Stud 45×95', thickness: 45, width: 95 },
  { id: 'joist-45x120', label: 'Joist 45×120', thickness: 45, width: 120 },
  { id: 'joist-45x145', label: 'Joist 45×145', thickness: 45, width: 145 },
  { id: 'rafter-45x145', label: 'Rafter 45×145', thickness: 45, width: 145 },
  { id: 'rafter-45x170', label: 'Rafter 45×170', thickness: 45, width: 170 },
  { id: 'beam-45x170', label: 'Beam 45×170', thickness: 45, width: 170 },
  { id: 'beam-45x195', label: 'Beam 45×195', thickness: 45, width: 195 },
  { id: 'beam-70x195', label: 'Beam 70×195', thickness: 70, width: 195 },
  { id: 'header-90x145', label: 'Header 90×145', thickness: 90, width: 145 },
  { id: 'fascia-25x225', label: 'Fascia 25×225', thickness: 25, width: 225 },
]

export function findProfile(profiles: TimberProfile[], id: string): TimberProfile {
  const found = profiles.find((p) => p.id === id)
  if (!found) throw new Error(`Unknown timber profile: ${id}`)
  return found
}

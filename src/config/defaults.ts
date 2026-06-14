import type { FoundationConfig, ShedConfig } from './types'
import { PROFILE_LIBRARY } from './profiles'
import { DEFAULT_FASTENERS } from './fasteners'

export function deriveFoundation(countX: number, countY: number, exposedHeight = 200): FoundationConfig {
  return { countX, countY, exposedHeight }
}

export function defaultConfig(): ShedConfig {
  const base = { width: 6000, depth: 4000 }
  return {
    base,
    heights: { min: 2400, max: 3000 },
    profiles: PROFILE_LIBRARY.map((p) => ({ ...p })),
    roles: {
      gradeBeam: 'beam-45x195',
      joist: 'joist-45x145',
      rafter: 'rafter-45x145',
      stud: 'stud-45x95',
      plate: 'stud-45x95',
      header: 'header-90x145',
      batten: 'batten-25x50',
      fascia: 'fascia-25x225',
    },
    foundation: deriveFoundation(4, 3),
    floor: { joistSpacing: 400, deckThickness: 18 },
    walls: {
      studSpacing: 600,
      battenSpacing: 600,
      osbThickness: 11,
      facadeType: 'cladding',
      cladding: { width: 150, length: 3600 },
      membrane: { rollWidth: 1500, rollLength: 50000, overlap: 150 },
      insulation: { enabled: true, rollLength: 8000 },
      topPlateCount: 2,
      bottomPlateCount: 1,
    },
    roof: {
      type: 'mono-pitch',
      covering: 'shingles',
      battens: true,
      battenSpacing: 300,
      rafterSpacing: 600,
      osbThickness: 18,
      shingle: { width: 1000, height: 300, exposure: 145 },
      metalShingle: { width: 1100, height: 400, exposure: 350 },
      membrane: { rollWidth: 1000, rollLength: 20000, overlap: 100 },
      insulation: { enabled: true, rollLength: 6000 },
      overhangs: { front: 200, rear: 150, sides: 150 },
    },
    openings: [
      { id: 'door-1', wall: 'front', type: 'door', width: 900, height: 2050, sillHeight: 0, offsetAlongWall: 3000 },
      { id: 'window-1', wall: 'front', type: 'window', width: 1000, height: 800, sillHeight: 1000, offsetAlongWall: 1600 },
    ],
    fasteners: structuredClone(DEFAULT_FASTENERS),
    preset: 'normal',
    stock: { sheetWidth: 1200, sheetHeight: 2400 },
  }
}

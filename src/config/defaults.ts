import type { FoundationConfig, ShedConfig } from './types'
import { PROFILE_LIBRARY } from './profiles'
import { DEFAULT_FASTENERS } from './fasteners'
import { DEFAULT_PRICES } from './prices'

export function deriveFoundation(countX: number, countY: number, exposedHeight = 200): FoundationConfig {
  return { countX, countY, exposedHeight }
}

export function defaultConfig(): ShedConfig {
  const base = { width: 6000, depth: 4000 }
  return {
    base,
    heights: { min: 2200, max: 2600 },
    profiles: PROFILE_LIBRARY.map((p) => ({ ...p })),
    roles: {
      gradeBeam: '50x150',
      joist: '50x150',
      rafter: '50x150',
      stud: '50x100',
      plate: '50x100',
      header: '50x150',
      batten: '25x50',
      fascia: '25x150',
    },
    foundation: deriveFoundation(3, 3),
    floor: { joistSpacing: 400, deckThickness: 18 },
    walls: {
      studSpacing: 700,
      battenSpacing: 600,
      osbThickness: 10,
      facadeType: 'metal',
      claddingOrientation: 'vertical',
      counterBattens: true,
      cladding: { width: 1000, length: 2400 },
      membrane: { rollWidth: 1500, rollLength: 50000, overlap: 150 },
      insulation: { enabled: true, rollLength: 7500 },
      topPlateCount: 1,
      bottomPlateCount: 1,
    },
    roof: {
      type: 'mono-pitch',
      covering: 'shingles',
      battens: true,
      battenSpacing: 400,
      rafterSpacing: 700,
      osbThickness: 18,
      shingle: { width: 320, height: 1000, exposure: 855 },
      metalShingle: { width: 1000, height: 400, exposure: 150 },
      membrane: { rollWidth: 1500, rollLength: 50000, overlap: 150 },
      insulation: { enabled: true, rollLength: 7500 },
      overhangs: { front: 450, rear: 225, sides: 225 },
    },
    openings: [
      { id: 'door-1', wall: 'front', type: 'door', width: 1350, height: 2100, sillHeight: 0, offsetAlongWall: 2800 },
      { id: 'window-1', wall: 'front', type: 'window', width: 789, height: 811, sillHeight: 1000, offsetAlongWall: 1277 },
    ],
    fasteners: structuredClone(DEFAULT_FASTENERS),
    preset: 'normal',
    stock: { sheetWidth: 1250, sheetHeight: 2500 },
    prices: { ...DEFAULT_PRICES },
    currency: '₴',
  }
}

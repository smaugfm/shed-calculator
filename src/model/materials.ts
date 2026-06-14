import type { FacadeType, MembraneConfig, ShedConfig } from '../config/types'
import { findProfile } from '../config/profiles'

export type MaterialId =
  | 'osb-floor'
  | 'osb-wall'
  | 'osb-roof'
  | 'cladding'
  | 'roofing'
  | 'membrane-wall'
  | 'membrane-roof'
  | 'insulation-wall'
  | 'insulation-roof'

export interface MaterialSpec {
  id: MaterialId
  label: string
  pieceW: number
  pieceH: number
  courseStep: number
  columnStep: number
  stagger: boolean
  thickness: number
  dims: string
}

export const FACADE_THICKNESS: Record<FacadeType, number> = {
  cladding: 20,
  metal: 18,
}

export const ROOFING_THICKNESS = 8
export const MEMBRANE_THICKNESS = 2
// Insulation sits recessed inside the framing depth (per face) so its surfaces don't tear against
// the stud/rafter faces.
export const INSULATION_RECESS = 5

function sheet(id: MaterialId, label: string, config: ShedConfig, thickness: number): MaterialSpec {
  const w = config.stock.sheetWidth
  const h = config.stock.sheetHeight
  return { id, label, pieceW: w, pieceH: h, courseStep: h, columnStep: w, stagger: false, thickness, dims: `${w}×${h}` }
}

// Membrane: horizontal rolls. Roll width is the course height; courses step up by (width − overlap)
// so each overlaps the one below; the run is tiled along the roll length.
function membrane(id: MaterialId, label: string, m: MembraneConfig): MaterialSpec {
  return {
    id,
    label,
    pieceW: m.rollLength,
    pieceH: m.rollWidth,
    courseStep: Math.max(1, m.rollWidth - m.overlap),
    columnStep: m.rollLength,
    stagger: false,
    thickness: MEMBRANE_THICKNESS,
    dims: `${m.rollWidth}×${m.rollLength}`,
  }
}

// Insulation: vertical rolls, one per framing bay. The roll width is the bay (stud/rafter spacing);
// it unrolls along the surface height/slope, cut into roll-length segments. Thickness is the framing
// depth less a recess per face (see INSULATION_RECESS) so it tucks inside the studs/rafters.
function insulation(id: MaterialId, label: string, rollLength: number, spacing: number, thickness: number): MaterialSpec {
  return {
    id,
    label,
    pieceW: spacing,
    pieceH: rollLength,
    courseStep: rollLength,
    columnStep: spacing,
    stagger: false,
    thickness,
    dims: `${spacing}×${rollLength}`,
  }
}

export function materialSpecs(config: ShedConfig): Record<MaterialId, MaterialSpec> {
  const stud = findProfile(config.profiles, config.roles.stud)
  const rafter = findProfile(config.profiles, config.roles.rafter)
  const clad = config.walls.cladding
  const facadeLabel = config.walls.facadeType === 'metal' ? 'Facade — corrugated metal' : 'Facade — timber cladding'
  const sh = config.roof.covering === 'shingles' ? config.roof.shingle : config.roof.metalShingle
  const roofingLabel = config.roof.covering === 'shingles' ? 'Asphalt shingles' : 'Metal shingles'
  return {
    'osb-floor': sheet('osb-floor', 'OSB floor deck', config, config.floor.deckThickness),
    'osb-wall': sheet('osb-wall', 'OSB wall sheathing', config, config.walls.osbThickness),
    'osb-roof': sheet('osb-roof', 'OSB roof sheathing', config, config.roof.osbThickness),
    cladding: {
      id: 'cladding',
      label: facadeLabel,
      pieceW: clad.width,
      pieceH: clad.length,
      courseStep: clad.length,
      columnStep: clad.width,
      stagger: false,
      thickness: FACADE_THICKNESS[config.walls.facadeType],
      dims: `${clad.width}×${clad.length}`,
    },
    roofing: {
      id: 'roofing',
      label: roofingLabel,
      pieceW: sh.width,
      pieceH: sh.height,
      courseStep: sh.exposure,
      columnStep: sh.width,
      stagger: true,
      thickness: ROOFING_THICKNESS,
      dims: `${sh.width}×${sh.height}`,
    },
    'membrane-wall': membrane('membrane-wall', 'Breather membrane (walls)', config.walls.membrane),
    'membrane-roof': membrane('membrane-roof', config.roof.covering === 'shingles' ? 'EPDM membrane (roof)' : 'Breather membrane (roof)', config.roof.membrane),
    'insulation-wall': insulation(
      'insulation-wall',
      'Mineral wool (walls)',
      config.walls.insulation.rollLength,
      config.walls.studSpacing,
      Math.max(1, stud.width - 2 * INSULATION_RECESS),
    ),
    'insulation-roof': insulation(
      'insulation-roof',
      'Mineral wool (roof)',
      config.roof.insulation.rollLength,
      config.roof.rafterSpacing,
      Math.max(1, rafter.width - 2 * INSULATION_RECESS),
    ),
  }
}

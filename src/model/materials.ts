import type { FacadeType, ShedConfig } from '../config/types'

export type MaterialId = 'osb-floor' | 'osb-wall' | 'osb-roof' | 'cladding' | 'roofing'

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

function sheet(id: MaterialId, label: string, config: ShedConfig, thickness: number): MaterialSpec {
  const w = config.stock.sheetWidth
  const h = config.stock.sheetHeight
  return { id, label, pieceW: w, pieceH: h, courseStep: h, columnStep: w, stagger: false, thickness, dims: `${w}×${h}` }
}

export function materialSpecs(config: ShedConfig): Record<MaterialId, MaterialSpec> {
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
  }
}

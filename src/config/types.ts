export type Millimetres = number

export interface TimberProfile {
  id: string
  label: string
  thickness: Millimetres
  width: Millimetres
}

export type StructuralRole =
  | 'gradeBeam'
  | 'joist'
  | 'rafter'
  | 'stud'
  | 'plate'
  | 'header'
  | 'batten'
  | 'fascia'

export type RoleProfiles = Record<StructuralRole, string>

export type FastenerKind = 'nail' | 'screw' | 'hanger' | 'anchor' | 'bracket' | 'adhesive'

export interface FastenerSpec {
  id: string
  kind: FastenerKind
  label: string
  size: string
}

export interface SheathingFastening {
  specId: string
  perimeterSpacing: Millimetres
  fieldSpacing: Millimetres
}

export interface SpacedFastening {
  specId: string
  spacing: Millimetres
}

export interface PerJointFastening {
  specId: string
  perJoint: number
}

export interface PerEndFastening {
  specId: string
  perEnd: number
}

export interface PerPileFastening {
  specId: string
  perPile: number
}

export type RoofCoveringFasteningKind = 'nailsPerSqm' | 'screwsPerSqm' | 'adhesiveLitresPerSqm'

export interface RoofCoveringFastening {
  specId: string
  kind: RoofCoveringFasteningKind
  ratePerSqm: number
}

export interface FastenerConfig {
  catalog: FastenerSpec[]
  sheathing: SheathingFastening
  cladding: SpacedFastening
  batten: SpacedFastening
  framing: PerJointFastening
  joistHanger: PerEndFastening
  rafterFixing: PerEndFastening
  postAnchor: PerPileFastening
  roofCovering: RoofCoveringFastening
}

export interface FoundationConfig {
  countX: number
  countY: number
  exposedHeight: Millimetres
}

export interface FloorConfig {
  joistSpacing: Millimetres
  deckThickness: Millimetres
}

export type FacadeType = 'cladding' | 'metal'

export interface WallConfig {
  studSpacing: Millimetres
  battenSpacing: Millimetres
  osbThickness: Millimetres
  facadeType: FacadeType
  cladding: { width: Millimetres; length: Millimetres }
  topPlateCount: 1 | 2
  bottomPlateCount: 1 | 2
}

export interface ShingleSpec {
  width: Millimetres
  height: Millimetres
  exposure: Millimetres
}

export type RoofCovering = 'shingles' | 'ventilated'

export interface RoofConfig {
  type: 'mono-pitch'
  covering: RoofCovering
  battens: boolean
  battenSpacing: Millimetres
  rafterSpacing: Millimetres
  osbThickness: Millimetres
  shingle: ShingleSpec
  metalShingle: ShingleSpec
  overhangs: { front: Millimetres; rear: Millimetres; sides: Millimetres }
}

export type WallSide = 'front' | 'back' | 'left' | 'right'
export type OpeningType = 'door' | 'window'

export interface OpeningConfig {
  id: string
  wall: WallSide
  type: OpeningType
  width: Millimetres
  height: Millimetres
  sillHeight: Millimetres
  offsetAlongWall: Millimetres
}

export type PresetName = 'light' | 'normal' | 'heavy' | 'custom'

export interface ShedConfig {
  base: { width: Millimetres; depth: Millimetres }
  heights: { min: Millimetres; max: Millimetres }
  profiles: TimberProfile[]
  roles: RoleProfiles
  foundation: FoundationConfig
  floor: FloorConfig
  walls: WallConfig
  roof: RoofConfig
  openings: OpeningConfig[]
  fasteners: FastenerConfig
  preset: PresetName
  stock: {
    timberLength: Millimetres
    sheetWidth: Millimetres
    sheetHeight: Millimetres
  }
}

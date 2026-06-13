import type { OpeningType, StructuralRole, WallSide } from '../config/types'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Member {
  id: string
  role: StructuralRole
  profileId: string
  thickness: number
  width: number
  start: Vec3
  end: Vec3
  up: Vec3
  length: number
}

export type PanelKind =
  | 'osb-floor'
  | 'osb-wall'
  | 'osb-roof'
  | 'membrane-wall'
  | 'membrane-roof'
  | 'cladding'
  | 'roofing'
  | 'soffit'
  | 'glazing'

export type PanelShape = 'rect' | 'triangle'

export interface Panel {
  id: string
  kind: PanelKind
  origin: Vec3
  u: Vec3
  v: Vec3
  normal: Vec3
  thickness: number
  offset: number
  shape: PanelShape
  area: number
}

export interface Pile {
  id: string
  x: number
  z: number
  top: number
  bottom: number
  size: number
}

export interface ResolvedOpening {
  id: string
  wall: WallSide
  type: OpeningType
  origin: Vec3
  u: Vec3
  v: Vec3
  width: number
  height: number
}

export interface JointTally {
  framingJoints: number
  joistEnds: number
  rafterEnds: number
}

export interface ShedModel {
  members: Member[]
  panels: Panel[]
  piles: Pile[]
  openings: ResolvedOpening[]
  joints: JointTally
  floorTopY: number
  bbox: { min: Vec3; max: Vec3 }
}

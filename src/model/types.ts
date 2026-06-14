import type { OpeningType, StructuralRole, WallSide } from '../config/types'
import type { MaterialId } from './materials'

/** A point/vector in world space (mm). Y is up, X = width, Z = depth. */
export interface Vec3 {
  x: number
  y: number
  z: number
}

/**
 * A 2D point in a surface's own plane (the parametric "UV" convention).
 * u/v rather than x/y because a surface (a sloped roof, a vertical wall) is tilted in 3D — its
 * in-plane axes are not world X/Y. `u` runs along the surface's width, `v` along its height; the
 * owning Piece carries the `uDir`/`vDir`/`origin` that map (u, v) back to world Vec3.
 */
export interface Vec2 {
  u: number
  v: number
}

/**
 * One discrete cut sheet/board/shingle (OSB sheet, cladding board, single shingle), produced by
 * the tiler (`model/tiling.ts`). It's a flat polygon living in a planar surface:
 *  - `uv`       — the (possibly clipped) polygon in the surface's UV plane
 *  - `origin`/`uDir`/`vDir` — map UV → world: worldPoint = origin + u·uDir + v·vDir
 *  - `normal`/`offset`/`thickness` — the piece is extruded `thickness` along `normal`, offset from
 *    the surface so layers stack (OSB → membrane → cladding, etc.)
 *  - `nominalArea` — full stock-piece area (what you buy); `usedArea` — the clipped (installed) area.
 *    The difference is offcut/waste, fed to the BOM.
 */
export interface Piece {
  materialId: MaterialId
  uv: Vec2[]
  origin: Vec3
  uDir: Vec3
  vDir: Vec3
  normal: Vec3
  offset: number
  thickness: number
  nominalArea: number
  usedArea: number
}

/**
 * A single piece of structural timber (a stud, joist, rafter, plate, beam, batten, fascia…) — a
 * cross-section swept along a centerline. `start`/`end` are the centerline endpoints in world
 * space; `thickness`×`width` is the cross-section (from the role's TimberProfile); `up` orients
 * the cross-section (which way `width` points) so the renderer can build the oriented box.
 */
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

export type PanelKind = 'osb-floor' | 'osb-wall' | 'osb-roof' | 'membrane-wall' | 'membrane-roof' | 'cladding' | 'roofing' | 'soffit' | 'glazing'

export type PanelShape = 'rect' | 'triangle'

/**
 * A continuous (un-tiled) planar sheet — used for goods that come on a roll and aren't cut into
 * countable pieces: membrane and the soffit (for now). Defined by a corner `origin` plus two edge vectors
 * `u` and `v` (full-length world vectors, not unit dirs — unlike Piece's uDir/vDir), so the panel
 * spans origin → origin+u → origin+v. `normal`/`offset`/`thickness` place/extrude it like a Piece,
 * and `shape` is a rectangle or right-triangle (the gable). `area` (m²) feeds the BOM directly.
 */
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
  pieces: Piece[]
  piles: Pile[]
  openings: ResolvedOpening[]
  joints: JointTally
  floorTopY: number
  bbox: { min: Vec3; max: Vec3 }
}

import type { ShedConfig, WallSide } from '../config/types'
import { findProfile } from '../config/profiles'
import type { Member, Piece, ResolvedOpening } from './types'
import { add, makeMember, normalize, scale, sub, v } from './geometry'
import { spacedPositions } from './floor'
import { buildOpeningFraming, type WallFrame } from './openings'
import { subtractIntervals, type Interval, type UvRect } from './sheets'
import { FACADE_THICKNESS, MEMBRANE_THICKNESS, materialSpecs } from './materials'
import { rectMinusRects, tileBays, tilePolygon, type Surface } from './tiling'

const GAP = 1.5

export interface WallsResult {
  members: Member[]
  pieces: Piece[]
  openings: ResolvedOpening[]
  framingJoints: number
}

interface SideSpec {
  length: number
  map: (u: number, y: number) => { x: number; y: number; z: number }
  normal: { x: number; y: number; z: number }
  rectTopY: number
  gableTopYAt: ((u: number) => number) | null
}

function sideSpec(side: WallSide, config: ShedConfig, floorTopY: number): SideSpec {
  const { base, heights } = config
  const minTop = floorTopY + heights.min
  const maxTop = floorTopY + heights.max
  const slope = (heights.max - heights.min) / base.depth
  switch (side) {
    case 'front':
      return { length: base.width, map: (u, y) => ({ x: u, y, z: 0 }), normal: { x: 0, y: 0, z: -1 }, rectTopY: maxTop, gableTopYAt: null }
    case 'back':
      return { length: base.width, map: (u, y) => ({ x: u, y, z: base.depth }), normal: { x: 0, y: 0, z: 1 }, rectTopY: minTop, gableTopYAt: null }
    case 'left':
      return { length: base.depth, map: (u, y) => ({ x: 0, y, z: u }), normal: { x: -1, y: 0, z: 0 }, rectTopY: minTop, gableTopYAt: (u) => maxTop - slope * u }
    case 'right':
      return {
        length: base.depth,
        map: (u, y) => ({ x: base.width, y, z: u }),
        normal: { x: 1, y: 0, z: 0 },
        rectTopY: minTop,
        gableTopYAt: (u) => maxTop - slope * u,
      }
  }
}

function isBlocked(u: number, intervals: Interval[]): boolean {
  return intervals.some(([a, b]) => u > a && u < b)
}

function buildWall(side: WallSide, config: ShedConfig, floorTopY: number): WallsResult {
  const stud = findProfile(config.profiles, config.roles.stud)
  const plate = findProfile(config.profiles, config.roles.plate)
  const header = findProfile(config.profiles, config.roles.header)
  const batten = findProfile(config.profiles, config.roles.batten)
  const spec = sideSpec(side, config, floorTopY)
  const { length: L, map, normal, rectTopY, gableTopYAt } = spec
  const isSide = gableTopYAt != null

  const inset = stud.width / 2
  const frameMap = (u: number, y: number) => add(map(u, y), scale(normal, -inset))
  const t = plate.thickness
  const nb = config.walls.bottomPlateCount
  const nt = config.walls.topPlateCount
  const bottomPlateTop = floorTopY + nb * t
  const topPlatesBottom = rectTopY - nt * t

  const fStart = isSide ? stud.width : 0
  const fEnd = isSide ? L - stud.width : L

  const members: Member[] = []
  const openings: ResolvedOpening[] = []
  let framingJoints = 0

  for (let i = 0; i < nb; i++) {
    const yc = floorTopY + (i + 0.5) * t
    members.push(makeMember('plate', plate, frameMap(fStart, yc), frameMap(fEnd, yc), normal))
  }
  for (let i = 0; i < nt; i++) {
    const yc = rectTopY - (i + 0.5) * t
    members.push(makeMember('plate', plate, frameMap(fStart, yc), frameMap(fEnd, yc), normal))
  }

  const frame: WallFrame = { side, length: L, map, frameMap, normal, rectTopY, topPlatesBottom }
  const blocked: Interval[] = []
  const holes: UvRect[] = []
  // Footprints (u / world-y) of every solid framing member, used to carve the insulation cavities.
  const framingSolids: UvRect[] = []
  for (const opening of config.openings.filter((o) => o.wall === side)) {
    const framing = buildOpeningFraming(frame, opening, floorTopY, bottomPlateTop, { stud, header, plate }, config.walls.studSpacing)
    members.push(...framing.members)
    blocked.push(framing.blocked)
    framingJoints += framing.joints
    framingSolids.push(...framing.solids)
    const { u0, u1, v0, v1 } = framing.rect
    holes.push({ u0, u1, v0, v1 })
    const origin = map(u0, v0)
    openings.push({ id: opening.id, wall: side, type: opening.type, origin, u: sub(map(u1, v0), origin), v: v(0, v1 - v0, 0), width: u1 - u0, height: v1 - v0 })
  }

  const slope = (config.heights.max - config.heights.min) / config.base.depth
  const endInset = stud.thickness / 2
  const studUs = spacedPositions(fEnd - fStart, config.walls.studSpacing).map((p) => Math.min(Math.max(p + fStart, fStart + endInset), fEnd - endInset))

  for (const u of studUs) {
    if (isBlocked(u, blocked)) continue
    members.push(makeMember('stud', stud, frameMap(u, bottomPlateTop), frameMap(u, topPlatesBottom), normal))
    framingSolids.push({ u0: u - stud.thickness / 2, u1: u + stud.thickness / 2, v0: bottomPlateTop, v1: topPlatesBottom })
    framingJoints += 2
  }

  // Gable studs and rake plate stay under the sloped cladding edge (clip by slope * half thickness).
  if (gableTopYAt) {
    for (const u of studUs) {
      const top = gableTopYAt(u) - slope * (stud.thickness / 2)
      if (top - rectTopY < 50) continue
      members.push(makeMember('stud', stud, frameMap(u, rectTopY), frameMap(u, top), normal))
    }
    members.push(makeMember('plate', plate, frameMap(fStart, gableTopYAt(fStart)), frameMap(fEnd, gableTopYAt(fEnd)), normal))
  }

  // up = horizontal wall tangent so the batten's thickness (not width) forms the vent cavity depth.
  const tangent = normalize(sub(map(1, 0), map(0, 0)))
  const battenFaceOffset = config.walls.osbThickness + GAP + MEMBRANE_THICKNESS + GAP + batten.thickness / 2
  for (const u of spacedPositions(L, config.walls.battenSpacing)) {
    const top = gableTopYAt ? gableTopYAt(u) - slope * (batten.thickness / 2) : rectTopY
    const battenHoles: Interval[] = holes.filter((h) => u >= h.u0 && u <= h.u1).map((h) => [h.v0, h.v1] as Interval)
    for (const [s0, s1] of subtractIntervals([floorTopY, top], battenHoles)) {
      members.push(makeMember('batten', batten, add(map(u, s0), scale(normal, battenFaceOffset)), add(map(u, s1), scale(normal, battenFaceOffset)), tangent))
    }
  }

  const fac = FACADE_THICKNESS[config.walls.facadeType]
  const osb = config.walls.osbThickness
  const osbOffset = osb / 2
  const membraneOffset = osb + GAP + MEMBRANE_THICKNESS / 2
  const claddingOffset = osb + 2 * GAP + MEMBRANE_THICKNESS + batten.thickness + GAP + fac / 2
  const lapOf = (offset: number, thickness: number) => (gableTopYAt ? offset - thickness / 2 : offset + thickness / 2)

  // OSB, membrane, and cladding are discrete pieces, cut to the wall outline (trapezoid for gables)
  // and around openings. (Membrane = overlapping horizontal rolls — see materialSpecs.)
  const specs = materialSpecs(config)
  const origin = map(0, floorTopY)
  const topAt = (u: number) => (gableTopYAt ? gableTopYAt(u) : rectTopY) - floorTopY
  const holesUv = holes.map((h) => ({ u0: h.u0, u1: h.u1, v0: h.v0 - floorTopY, v1: h.v1 - floorTopY }))
  const outline = (lap: number) => [
    { u: -lap, v: 0 },
    { u: L + lap, v: 0 },
    { u: L + lap, v: topAt(L + lap) },
    { u: -lap, v: topAt(-lap) },
  ]
  const surface = (offset: number): Surface => ({ origin, uDir: tangent, vDir: v(0, 1, 0), normal, offset })
  const pieces: Piece[] = [
    ...tilePolygon(surface(osbOffset), outline(lapOf(osbOffset, osb)), holesUv, specs['osb-wall']),
    ...tilePolygon(surface(membraneOffset), outline(lapOf(membraneOffset, MEMBRANE_THICKNESS)), holesUv, specs['membrane-wall']),
    ...tilePolygon(surface(claddingOffset), outline(lapOf(claddingOffset, fac)), holesUv, specs.cladding),
  ]

  // Insulation sits in the *real* cavities: the wall band between the plates, minus every framing
  // footprint (studs, king/jack/cripple studs, header, sill) and the openings. This follows the
  // framing above/below openings correctly instead of breaking on the bare stud grid.
  if (config.walls.insulation.enabled) {
    const half = stud.thickness / 2
    const band: UvRect = { u0: fStart, u1: fEnd, v0: bottomPlateTop, v1: topPlatesBottom }
    const bays: UvRect[] = rectMinusRects(band, framingSolids)
      .filter((r) => r.u1 - r.u0 > 20 && r.v1 - r.v0 > 20)
      .map((r) => ({ u0: r.u0, u1: r.u1, v0: r.v0 - floorTopY, v1: r.v1 - floorTopY }))
    // Gable triangle: studs sit on the regular grid here (no openings), so simple per-bay strips
    // clipped to the rake via the outline.
    if (gableTopYAt) {
      const bounds = [fStart, ...studUs, fEnd].sort((a, b) => a - b)
      const maxTop = floorTopY + config.heights.max
      for (let i = 0; i < bounds.length - 1; i++) {
        const u0 = bounds[i] + half
        const u1 = bounds[i + 1] - half
        if (u1 - u0 > 1) bays.push({ u0, u1, v0: rectTopY - floorTopY, v1: maxTop - floorTopY })
      }
    }
    pieces.push(...tileBays(surface(-stud.width / 2), bays, outline(0), [], specs['insulation-wall']))
  }

  return { members, pieces, openings, framingJoints }
}

export function buildWalls(config: ShedConfig, floorTopY: number): WallsResult {
  const sides: WallSide[] = ['front', 'back', 'left', 'right']
  const result: WallsResult = { members: [], pieces: [], openings: [], framingJoints: 0 }
  for (const side of sides) {
    const wall = buildWall(side, config, floorTopY)
    result.members.push(...wall.members)
    result.pieces.push(...wall.pieces)
    result.openings.push(...wall.openings)
    result.framingJoints += wall.framingJoints
  }
  return result
}

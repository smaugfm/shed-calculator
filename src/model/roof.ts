import type { ShedConfig } from '../config/types'
import { findProfile } from '../config/profiles'
import type { Member, Panel, Vec3 } from './types'
import { add, makeMember, makePanel, normalize, scale, sub, v } from './geometry'
import { spacedPositions } from './floor'

const MEMBRANE_THICKNESS = 2
const ROOFING_THICKNESS = 8
const GAP = 1.5

export interface RoofResult {
  members: Member[]
  panels: Panel[]
  rafterCount: number
  rafterEnds: number
}

export function buildRoof(config: ShedConfig, floorTopY: number): RoofResult {
  const { base, heights, roof } = config
  const rafter = findProfile(config.profiles, config.roles.rafter)
  const batten = findProfile(config.profiles, config.roles.batten)
  const fascia = findProfile(config.profiles, config.roles.fascia)
  const { front, rear, sides } = roof.overhangs

  const delta = heights.max - heights.min
  const slope = delta / base.depth
  const normal = normalize(v(0, base.depth, delta))
  const bearingFrontY = floorTopY + heights.max
  const bearY = (z: number) => bearingFrontY - slope * z
  const half = rafter.width / 2

  const zStart = -front
  const zEnd = base.depth + rear
  const xL = -sides
  const xR = base.width + sides

  const members: Member[] = []
  const half2 = rafter.thickness / 2
  const rafterXs = spacedPositions(base.width, roof.rafterSpacing).map((x) => Math.min(Math.max(x, half2), base.width - half2))
  for (const x of rafterXs) {
    const start = add(v(x, bearY(zStart), zStart), scale(normal, half))
    const end = add(v(x, bearY(zEnd), zEnd), scale(normal, half))
    members.push(makeMember('rafter', rafter, start, end, normal))
  }

  const osb = config.roof.osbThickness
  const hasBattens = roof.covering === 'ventilated' && roof.battens
  const osbOffset = rafter.width + osb / 2
  const membraneOffset = rafter.width + osb + GAP + MEMBRANE_THICKNESS / 2
  const battenOffset = rafter.width + osb + GAP + MEMBRANE_THICKNESS + GAP + batten.thickness / 2
  const roofingOffset = rafter.width + osb + 2 * GAP + MEMBRANE_THICKNESS + (hasBattens ? batten.thickness + GAP : 0) + ROOFING_THICKNESS / 2
  // Top of the roof stack along the normal; fascia/barge boards hang just under the roofing edge
  // (tucked in by `reveal` so the roofing laps over them — no lip and no coplanar z-fighting).
  const topN = roofingOffset + ROOFING_THICKNESS / 2
  const reveal = ROOFING_THICKNESS / 2
  const fasciaCenterN = topN - reveal - fascia.width / 2
  const slopeTangent = normalize(sub(v(0, bearY(zEnd), zEnd), v(0, bearY(zStart), zStart)))

  if (hasBattens) {
    // up = down-slope tangent so the batten's thickness (not width) forms the vent cavity depth.
    const addBatten = (z: number) => {
      const a = add(v(xL, bearY(z), z), scale(normal, battenOffset))
      const b = add(v(xR, bearY(z), z), scale(normal, battenOffset))
      members.push(makeMember('batten', batten, a, b, slopeTangent))
    }
    // Inset both ends so battens clear the square-cut eave fascias: the normal offset shifts the
    // batten along the slope (push) and the batten's own width needs room behind the fascia (edge).
    const push = (battenOffset - fasciaCenterN) * normal.z
    const edge = (slopeTangent.z * (batten.width + fascia.thickness)) / 2
    const zFirst = zStart - push + edge
    const zLast = zEnd - push - edge
    const step = config.roof.battenSpacing > 0 ? config.roof.battenSpacing : 300
    for (let z = zFirst; z < zLast; z += step) addBatten(z)
    addBatten(zLast)
  }

  const origin: Vec3 = v(xL, bearY(zStart), zStart)
  const uVec = v(xR - xL, 0, 0)
  const vVec = v(0, bearY(zEnd) - bearY(zStart), zEnd - zStart)

  const panels: Panel[] = [
    makePanel('osb-roof', origin, uVec, vVec, normal, config.roof.osbThickness, osbOffset),
    makePanel('membrane-roof', origin, uVec, vVec, normal, MEMBRANE_THICKNESS, membraneOffset),
    makePanel('roofing', origin, uVec, vVec, normal, ROOFING_THICKNESS, roofingOffset),
  ]

  // Soffit closes the overhang ring from below, on the rafter-underside plane.
  const down = normalize(v(0, -base.depth, -delta))
  const under = (x: number, z: number) => v(x, bearY(z), z)
  const soffit = (x0: number, x1: number, z0: number, z1: number) => {
    const o = under(x0, z0)
    return makePanel('soffit', o, sub(under(x1, z0), o), sub(under(x0, z1), o), down, 18, 9)
  }
  panels.push(
    soffit(0, base.width, zStart, 0),
    soffit(0, base.width, base.depth, zEnd),
    soffit(xL, 0, zStart, zEnd),
    soffit(base.width, xR, zStart, zEnd),
  )

  // Corner convention: rake/barge boards run the full length along the sides and the square-cut
  // eave fascias butt between them. Eaves are square-cut (up = roof normal) so the sloped
  // rafters/battens/roofing butt into them rather than protruding.
  const ft2 = fascia.thickness / 2
  const eaveFascia = (z: number) =>
    makeMember('fascia', fascia, add(v(xL + ft2, bearY(z), z), scale(normal, fasciaCenterN)), add(v(xR - ft2, bearY(z), z), scale(normal, fasciaCenterN)), normal)
  const trimY = (z: number) => bearY(z) + (topN - reveal) * normal.y - fascia.width / 2
  members.push(
    eaveFascia(zStart),
    eaveFascia(zEnd),
    makeMember('fascia', fascia, v(xL, trimY(zStart), zStart), v(xL, trimY(zEnd), zEnd), v(0, 1, 0)),
    makeMember('fascia', fascia, v(xR, trimY(zStart), zStart), v(xR, trimY(zEnd), zEnd), v(0, 1, 0)),
  )

  return { members, panels, rafterCount: rafterXs.length, rafterEnds: rafterXs.length * 2 }
}

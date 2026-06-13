import type { ShedConfig } from '../config/types'
import { findProfile } from '../config/profiles'
import type { Member, Panel, Vec3 } from './types'
import { add, makeMember, makePanel, normalize, scale, v } from './geometry'
import { spacedPositions } from './floor'

const ROOF_BATTEN_SPACING = 300
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
  const overhang = roof.overhang

  const delta = heights.max - heights.min
  const slope = delta / base.depth
  const normal = normalize(v(0, base.depth, delta))
  const bearingFrontY = floorTopY + heights.max
  const bearY = (z: number) => bearingFrontY - slope * z
  const half = rafter.width / 2

  const zStart = -overhang
  const zEnd = base.depth + overhang

  const members: Member[] = []
  const half2 = rafter.thickness / 2
  const rafterXs = spacedPositions(base.width, roof.rafterSpacing).map((x) => Math.min(Math.max(x, half2), base.width - half2))
  for (const x of rafterXs) {
    const start = add(v(x, bearY(zStart), zStart), scale(normal, half))
    const end = add(v(x, bearY(zEnd), zEnd), scale(normal, half))
    members.push(makeMember('rafter', rafter, start, end, normal))
  }

  const osb = config.roof.osbThickness
  const ventilated = roof.covering === 'ventilated'
  const battenOffset = rafter.width + osb + GAP + MEMBRANE_THICKNESS + GAP + batten.thickness / 2
  if (ventilated) {
    for (let z = 0; z <= base.depth; z += ROOF_BATTEN_SPACING) {
      const base0 = v(0, bearY(z), z)
      members.push(makeMember('batten', batten, add(base0, scale(normal, battenOffset)), add(v(base.width, bearY(z), z), scale(normal, battenOffset)), normal))
    }
  }

  const origin: Vec3 = v(-overhang, bearY(zStart), zStart)
  const uVec = v(base.width + 2 * overhang, 0, 0)
  const vVec = v(0, bearY(zEnd) - bearY(zStart), zEnd - zStart)

  const osbOffset = rafter.width + osb / 2
  const membraneOffset = rafter.width + osb + GAP + MEMBRANE_THICKNESS / 2
  const roofingOffset = rafter.width + osb + 2 * GAP + MEMBRANE_THICKNESS + (ventilated ? batten.thickness + GAP : 0) + ROOFING_THICKNESS / 2

  const panels: Panel[] = [
    makePanel('osb-roof', origin, uVec, vVec, normal, config.roof.osbThickness, osbOffset),
    makePanel('membrane-roof', origin, uVec, vVec, normal, MEMBRANE_THICKNESS, membraneOffset),
    makePanel('roofing', origin, uVec, vVec, normal, ROOFING_THICKNESS, roofingOffset),
  ]

  return { members, panels, rafterCount: rafterXs.length, rafterEnds: rafterXs.length * 2 }
}

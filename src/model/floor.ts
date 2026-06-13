import type { ShedConfig } from '../config/types'
import { findProfile } from '../config/profiles'
import type { Member, Panel } from './types'
import { makeMember, makePanel, v } from './geometry'
import { pilePositions } from './foundation'

export function spacedPositions(span: number, spacing: number): number[] {
  if (spacing <= 0 || !Number.isFinite(spacing)) return [0, span]
  const positions: number[] = []
  for (let p = 0; p < span; p += spacing) positions.push(p)
  if (positions[positions.length - 1] !== span) positions.push(span)
  return positions
}

export interface FloorResult {
  members: Member[]
  panels: Panel[]
  floorTopY: number
  joistCount: number
  joistEnds: number
  framingJoints: number
}

export function buildFloor(config: ShedConfig): FloorResult {
  const { base, foundation, floor } = config
  const beam = findProfile(config.profiles, config.roles.gradeBeam)
  const joist = findProfile(config.profiles, config.roles.joist)

  const bearerBottom = foundation.exposedHeight
  const bearerCenterY = bearerBottom + beam.width / 2
  const joistBottom = bearerBottom + beam.width
  const joistCenterY = joistBottom + joist.width / 2
  const floorTopY = joistBottom + joist.width + floor.deckThickness

  const members: Member[] = []
  const { xs, zs } = pilePositions(config, beam.thickness / 2)

  const edgeZ = (z: number) => z === zs[0] || z === zs[zs.length - 1]
  const edgeX = (x: number) => x === xs[0] || x === xs[xs.length - 1]
  for (const z of zs) {
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = edgeZ(z) && i === 0 ? 0 : xs[i]
      const x1 = edgeZ(z) && i === xs.length - 2 ? base.width : xs[i + 1]
      members.push(makeMember('gradeBeam', beam, v(x0, bearerCenterY, z), v(x1, bearerCenterY, z), v(0, 1, 0)))
    }
  }
  for (const x of xs) {
    for (let j = 0; j < zs.length - 1; j++) {
      const z0 = edgeX(x) && j === 0 ? 0 : zs[j]
      const z1 = edgeX(x) && j === zs.length - 2 ? base.depth : zs[j + 1]
      members.push(makeMember('gradeBeam', beam, v(x, bearerCenterY, z0), v(x, bearerCenterY, z1), v(0, 1, 0)))
    }
  }

  const halfT = joist.thickness / 2
  const insetX = (x: number) => (x <= 0 ? halfT : x >= base.width ? base.width - halfT : x)
  const joistXs = spacedPositions(base.width, floor.joistSpacing)
  for (const x of joistXs) {
    const xx = insetX(x)
    members.push(makeMember('joist', joist, v(xx, joistCenterY, 0), v(xx, joistCenterY, base.depth), v(0, 1, 0)))
  }

  members.push(
    makeMember('joist', joist, v(0, joistCenterY, halfT), v(base.width, joistCenterY, halfT), v(0, 1, 0)),
    makeMember('joist', joist, v(0, joistCenterY, base.depth - halfT), v(base.width, joistCenterY, base.depth - halfT), v(0, 1, 0)),
  )

  const deck = makePanel('osb-floor', v(0, floorTopY, 0), v(base.width, 0, 0), v(0, 0, base.depth), v(0, 1, 0), floor.deckThickness, -floor.deckThickness / 2)

  return {
    members,
    panels: [deck],
    floorTopY,
    joistCount: joistXs.length,
    joistEnds: joistXs.length * 2,
    framingJoints: joistXs.length * zs.length,
  }
}

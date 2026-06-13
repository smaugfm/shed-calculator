import type { ShedConfig } from '../config/types'
import { findProfile } from '../config/profiles'
import type { Pile } from './types'
import { uid } from './geometry'

const PILE_EMBED = 400

export function pilePositions(config: ShedConfig, edgeInset = 0): { xs: number[]; zs: number[] } {
  const { foundation, base } = config
  return {
    xs: axisPositions(base.width, foundation.countX, foundation.spacingX, edgeInset),
    zs: axisPositions(base.depth, foundation.countY, foundation.spacingY, edgeInset),
  }
}

function axisPositions(span: number, count: number, spacing: number, edgeInset: number): number[] {
  if (count <= 1) return [span / 2]
  const used = spacing * (count - 1)
  const start = (span - used) / 2
  const positions = Array.from({ length: count }, (_, i) => start + i * spacing)
  positions[0] += edgeInset
  positions[positions.length - 1] -= edgeInset
  return positions
}

export function buildFoundation(config: ShedConfig): Pile[] {
  const beam = findProfile(config.profiles, config.roles.gradeBeam)
  const size = beam.thickness
  const { xs, zs } = pilePositions(config, beam.thickness / 2)
  const top = config.foundation.exposedHeight
  const piles: Pile[] = []
  for (const x of xs) {
    for (const z of zs) {
      piles.push({ id: uid('pile'), x, z, top, bottom: -PILE_EMBED, size })
    }
  }
  return piles
}

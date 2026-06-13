import type { ShedConfig } from '../config/types'
import type { Member, Panel, Piece, ShedModel, Vec3 } from './types'
import { add, resetIds } from './geometry'
import { buildFoundation } from './foundation'
import { buildFloor } from './floor'
import { buildWalls } from './walls'
import { buildRoof } from './roof'

export function buildModel(config: ShedConfig): ShedModel {
  resetIds()

  const piles = buildFoundation(config)
  const floor = buildFloor(config)
  const walls = buildWalls(config, floor.floorTopY)
  const roof = buildRoof(config, floor.floorTopY)

  const members: Member[] = [...floor.members, ...walls.members, ...roof.members]
  const panels: Panel[] = [...walls.panels, ...roof.panels]
  const pieces: Piece[] = [...floor.pieces, ...walls.pieces, ...roof.pieces]

  const joints = {
    framingJoints: floor.framingJoints + walls.framingJoints,
    joistEnds: floor.joistEnds,
    rafterEnds: roof.rafterEnds,
  }

  return {
    members,
    panels,
    pieces,
    piles,
    openings: walls.openings,
    joints,
    floorTopY: floor.floorTopY,
    bbox: computeBbox(members, panels),
  }
}

function computeBbox(members: Member[], panels: Panel[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity }
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity }
  const expand = (p: Vec3) => {
    min.x = Math.min(min.x, p.x)
    min.y = Math.min(min.y, p.y)
    min.z = Math.min(min.z, p.z)
    max.x = Math.max(max.x, p.x)
    max.y = Math.max(max.y, p.y)
    max.z = Math.max(max.z, p.z)
  }
  for (const m of members) {
    expand(m.start)
    expand(m.end)
  }
  for (const p of panels) {
    expand(p.origin)
    expand(add(add(p.origin, p.u), p.v))
  }
  return { min, max }
}

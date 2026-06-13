import type { OpeningConfig, TimberProfile, WallSide } from '../config/types'
import type { Member, Vec3 } from './types'
import { makeMember, v } from './geometry'
import { spacedPositions } from './floor'

export interface WallFrame {
  side: WallSide
  length: number
  map: (u: number, y: number) => Vec3
  frameMap: (u: number, y: number) => Vec3
  normal: Vec3
  rectTopY: number
  topPlatesBottom: number
}

export interface ResolvedOpeningRect {
  u0: number
  u1: number
  v0: number
  v1: number
}

export interface OpeningFraming {
  members: Member[]
  blocked: [number, number]
  rect: ResolvedOpeningRect
  joints: number
}

interface FramingProfiles {
  stud: TimberProfile
  header: TimberProfile
  plate: TimberProfile
}

export function buildOpeningFraming(
  wall: WallFrame,
  opening: OpeningConfig,
  floorTopY: number,
  bottomPlateTop: number,
  profiles: FramingProfiles,
  crippleSpacing: number,
): OpeningFraming {
  const { stud, header } = profiles
  const map = wall.frameMap
  const up = wall.normal
  const uStart = opening.offsetAlongWall
  const uEnd = opening.offsetAlongWall + opening.width

  const sillY = clamp(floorTopY + opening.sillHeight, bottomPlateTop, wall.topPlatesBottom - header.width - 100)
  const maxOpeningTopY = wall.topPlatesBottom - header.width
  const headY = Math.min(sillY + opening.height, maxOpeningTopY)
  const headerTop = headY + header.width
  const members: Member[] = []

  members.push(
    makeMember('stud', stud, map(uStart, bottomPlateTop), map(uStart, wall.topPlatesBottom), up),
    makeMember('stud', stud, map(uEnd, bottomPlateTop), map(uEnd, wall.topPlatesBottom), up),
  )

  const jackInset = stud.thickness
  const jackLeft = uStart + jackInset
  const jackRight = uEnd - jackInset
  members.push(
    makeMember('stud', stud, map(jackLeft, bottomPlateTop), map(jackLeft, headY), up),
    makeMember('stud', stud, map(jackRight, bottomPlateTop), map(jackRight, headY), up),
  )

  members.push(makeMember('header', header, map(uStart, headY + header.width / 2), map(uEnd, headY + header.width / 2), v(0, 1, 0)))

  for (const u of spacedPositions(opening.width, crippleSpacing)) {
    const uu = uStart + u
    if (uu <= jackLeft || uu >= jackRight) continue
    if (wall.topPlatesBottom - headerTop > stud.thickness) {
      members.push(makeMember('stud', stud, map(uu, headerTop), map(uu, wall.topPlatesBottom), up))
    }
  }

  if (sillY > bottomPlateTop + 1) {
    members.push(makeMember('stud', stud, map(uStart, sillY - stud.thickness / 2), map(uEnd, sillY - stud.thickness / 2), up))
    for (const u of spacedPositions(opening.width, crippleSpacing)) {
      const uu = uStart + u
      if (uu <= jackLeft || uu >= jackRight) continue
      members.push(makeMember('stud', stud, map(uu, bottomPlateTop), map(uu, sillY - stud.thickness), up))
    }
  }

  return {
    members,
    blocked: [uStart - stud.thickness, uEnd + stud.thickness],
    rect: { u0: uStart, u1: uEnd, v0: sillY, v1: headY },
    joints: members.length * 2,
  }
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

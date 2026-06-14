import type { OpeningConfig, TimberProfile, WallSide } from '../config/types'
import type { Member, Vec3 } from './types'
import type { UvRect } from './sheets'
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
  // Footprints (in u / world-y) of the opening framing + the opening void, so insulation can be
  // carved to the real cavities instead of the bare stud grid.
  solids: UvRect[]
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

  const ht = stud.thickness / 2
  const hasSill = sillY > bottomPlateTop + 1
  // The sill is a flat board (thickness running vertically) resting on the cripples, so its bottom
  // face — where the below-sill insulation must stop — is one stud thickness below the opening sill.
  const sillBottom = hasSill ? Math.max(bottomPlateTop, sillY - stud.thickness) : sillY
  const aboveOpen = wall.topPlatesBottom - headerTop > stud.thickness
  const solids: UvRect[] = [
    { u0: uStart - ht, u1: uStart + ht, v0: bottomPlateTop, v1: wall.topPlatesBottom }, // king left
    { u0: uEnd - ht, u1: uEnd + ht, v0: bottomPlateTop, v1: wall.topPlatesBottom }, // king right
    { u0: jackLeft - ht, u1: jackLeft + ht, v0: bottomPlateTop, v1: headY }, // jack left
    { u0: jackRight - ht, u1: jackRight + ht, v0: bottomPlateTop, v1: headY }, // jack right
    { u0: uStart, u1: uEnd, v0: sillBottom, v1: headerTop }, // sill + opening void + header
  ]
  for (const u of spacedPositions(opening.width, crippleSpacing)) {
    const uu = uStart + u
    if (uu <= jackLeft || uu >= jackRight) continue
    if (aboveOpen) solids.push({ u0: uu - ht, u1: uu + ht, v0: headerTop, v1: wall.topPlatesBottom }) // cripple above
    if (hasSill) solids.push({ u0: uu - ht, u1: uu + ht, v0: bottomPlateTop, v1: sillBottom }) // cripple below
  }

  return {
    members,
    blocked: [uStart - stud.thickness, uEnd + stud.thickness],
    rect: { u0: uStart, u1: uEnd, v0: sillY, v1: headY },
    joints: members.length * 2,
    solids,
  }
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

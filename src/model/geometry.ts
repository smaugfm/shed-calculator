import type { StructuralRole, TimberProfile } from '../config/types'
import type { Member, Panel, PanelKind, PanelShape, Vec3 } from './types'

export function v(x: number, y: number, z: number): Vec3 {
  return { x, y, z }
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

export function scale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s }
}

export function length(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
}

export function normalize(a: Vec3): Vec3 {
  const l = length(a)
  return l === 0 ? v(0, 0, 0) : scale(a, 1 / l)
}

let counter = 0
export function uid(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}`
}

export function resetIds(): void {
  counter = 0
}

export function makeMember(role: StructuralRole, profile: TimberProfile, start: Vec3, end: Vec3, up: Vec3): Member {
  return {
    id: uid(role),
    role,
    profileId: profile.id,
    thickness: profile.thickness,
    width: profile.width,
    start,
    end,
    up,
    length: length(sub(end, start)),
  }
}

export function makePanel(
  kind: PanelKind,
  origin: Vec3,
  u: Vec3,
  v2: Vec3,
  normal: Vec3,
  thickness: number,
  offset: number,
  shape: PanelShape = 'rect',
): Panel {
  const rectArea = (length(u) * length(v2)) / 1e6
  return {
    id: uid(kind),
    kind,
    origin,
    u,
    v: v2,
    normal,
    thickness,
    offset,
    shape,
    area: shape === 'triangle' ? rectArea / 2 : rectArea,
  }
}

import type { MaterialSpec } from './materials'
import type { Piece, Vec2, Vec3 } from './types'

export interface UvRect {
  u0: number
  u1: number
  v0: number
  v1: number
}

export interface Surface {
  origin: Vec3
  uDir: Vec3
  vDir: Vec3
  normal: Vec3
  offset: number
}

const EPS = 1

function polyArea(poly: Vec2[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p.u * q.v - q.u * p.v
  }
  return Math.abs(a) / 2
}

function rectMinusRect(r: UvRect, h: UvRect): UvRect[] {
  const ix0 = Math.max(r.u0, h.u0)
  const ix1 = Math.min(r.u1, h.u1)
  const iy0 = Math.max(r.v0, h.v0)
  const iy1 = Math.min(r.v1, h.v1)
  if (ix0 >= ix1 || iy0 >= iy1) return [r]
  const out: UvRect[] = []
  if (r.v1 > iy1) out.push({ u0: r.u0, u1: r.u1, v0: iy1, v1: r.v1 })
  if (r.v0 < iy0) out.push({ u0: r.u0, u1: r.u1, v0: r.v0, v1: iy0 })
  if (r.u0 < ix0) out.push({ u0: r.u0, u1: ix0, v0: iy0, v1: iy1 })
  if (r.u1 > ix1) out.push({ u0: ix1, u1: r.u1, v0: iy0, v1: iy1 })
  return out
}

function rectMinusRects(r: UvRect, holes: UvRect[]): UvRect[] {
  let rects = [r]
  for (const h of holes) rects = rects.flatMap((x) => rectMinusRect(x, h))
  return rects
}

function insideEdge(p: Vec2, a: Vec2, b: Vec2): boolean {
  return (b.u - a.u) * (p.v - a.v) - (b.v - a.v) * (p.u - a.u) >= -1e-6
}

function intersectEdge(p: Vec2, q: Vec2, a: Vec2, b: Vec2): Vec2 {
  const r = { u: q.u - p.u, v: q.v - p.v }
  const s = { u: b.u - a.u, v: b.v - a.v }
  const denom = r.u * s.v - r.v * s.u
  const t = ((a.u - p.u) * s.v - (a.v - p.v) * s.u) / denom
  return { u: p.u + t * r.u, v: p.v + t * r.v }
}

// Sutherland–Hodgman: clip a subject polygon by a convex (CCW) clip polygon.
function clipToConvex(subject: Vec2[], clip: Vec2[]): Vec2[] {
  let out = subject
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i]
    const b = clip[(i + 1) % clip.length]
    const input = out
    out = []
    for (let j = 0; j < input.length; j++) {
      const cur = input[j]
      const prev = input[(j + input.length - 1) % input.length]
      const curIn = insideEdge(cur, a, b)
      const prevIn = insideEdge(prev, a, b)
      if (curIn) {
        if (!prevIn) out.push(intersectEdge(prev, cur, a, b))
        out.push(cur)
      } else if (prevIn) {
        out.push(intersectEdge(prev, cur, a, b))
      }
    }
    if (out.length === 0) return []
  }
  return out
}

function rectCorners(r: UvRect): Vec2[] {
  return [
    { u: r.u0, v: r.v0 },
    { u: r.u1, v: r.v0 },
    { u: r.u1, v: r.v1 },
    { u: r.u0, v: r.v1 },
  ]
}

function allInside(corners: Vec2[], outline: Vec2[]): boolean {
  for (const c of corners) {
    for (let i = 0; i < outline.length; i++) {
      if (!insideEdge(c, outline[i], outline[(i + 1) % outline.length])) return false
    }
  }
  return true
}

function makePiece(surface: Surface, spec: MaterialSpec, uv: Vec2[]): Piece {
  return {
    materialId: spec.id,
    uv,
    origin: surface.origin,
    uDir: surface.uDir,
    vDir: surface.vDir,
    normal: surface.normal,
    offset: surface.offset,
    thickness: spec.thickness,
    nominalArea: (spec.pieceW * spec.pieceH) / 1e6,
    usedArea: polyArea(uv) / 1e6,
  }
}

// Tile a convex outline (CCW, in surface UV) with pieces, cutting at the outline and around holes.
export function tilePolygon(surface: Surface, outline: Vec2[], holes: UvRect[], spec: MaterialSpec): Piece[] {
  const us = outline.map((p) => p.u)
  const vs = outline.map((p) => p.v)
  const uMin = Math.min(...us)
  const uMax = Math.max(...us)
  const vMax = Math.max(...vs)
  const pieces: Piece[] = []

  let courseIndex = 0
  for (let vb = 0; vb < vMax - EPS; vb += spec.courseStep, courseIndex++) {
    const shift = spec.stagger && courseIndex % 2 === 1 ? spec.columnStep / 2 : 0
    const kStart = Math.floor((uMin - shift) / spec.columnStep) - 1
    const kEnd = Math.ceil((uMax - shift) / spec.columnStep) + 1
    for (let k = kStart; k <= kEnd; k++) {
      const u0 = shift + k * spec.columnStep
      const cell: UvRect = { u0, u1: u0 + spec.pieceW, v0: vb, v1: vb + spec.pieceH }
      // Cut openings out first (rect − rects), then clip each remainder to the outline.
      for (const r of rectMinusRects(cell, holes)) {
        if (r.u1 - r.u0 <= EPS || r.v1 - r.v0 <= EPS) continue
        const corners = rectCorners(r)
        if (allInside(corners, outline)) {
          pieces.push(makePiece(surface, spec, corners))
        } else {
          const clipped = clipToConvex(corners, outline)
          if (clipped.length >= 3 && polyArea(clipped) > EPS * EPS) pieces.push(makePiece(surface, spec, clipped))
        }
      }
    }
  }
  return pieces
}

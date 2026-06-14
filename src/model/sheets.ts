export interface UvRect {
  u0: number
  u1: number
  v0: number
  v1: number
}

export type Interval = [number, number]

export function subtractIntervals(range: Interval, holes: Interval[]): Interval[] {
  let segments: Interval[] = [range]
  for (const [h0, h1] of holes) {
    const next: Interval[] = []
    for (const [s0, s1] of segments) {
      if (h1 <= s0 || h0 >= s1) {
        next.push([s0, s1])
        continue
      }
      if (h0 > s0) next.push([s0, h0])
      if (h1 < s1) next.push([h1, s1])
    }
    segments = next
  }
  return segments.filter(([a, b]) => b - a > 1)
}

export function decomposeWall(uStart: number, uEnd: number, y0: number, y1: number, holes: UvRect[]): UvRect[] {
  const breaks = new Set<number>([y0, y1])
  for (const h of holes) {
    if (h.v0 > y0 && h.v0 < y1) breaks.add(h.v0)
    if (h.v1 > y0 && h.v1 < y1) breaks.add(h.v1)
  }
  const ys = [...breaks].sort((a, b) => a - b)
  const rects: UvRect[] = []
  for (let i = 0; i < ys.length - 1; i++) {
    const bandV0 = ys[i]
    const bandV1 = ys[i + 1]
    const bandHoles: Interval[] = holes.filter((h) => h.v0 <= bandV0 + 0.5 && h.v1 >= bandV1 - 0.5).map((h) => [h.u0, h.u1] as Interval)
    for (const [u0, u1] of subtractIntervals([uStart, uEnd], bandHoles)) {
      rects.push({ u0, u1, v0: bandV0, v1: bandV1 })
    }
  }
  return rects
}

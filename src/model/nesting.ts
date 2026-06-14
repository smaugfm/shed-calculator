export interface Part {
  w: number
  h: number
}

interface FreeRect {
  x: number
  y: number
  w: number
  h: number
}

const EPS = 0.5

function fits(part: Part, free: FreeRect): boolean {
  return part.w <= free.w + EPS && part.h <= free.h + EPS
}

// Guillotine-split a free rect after placing `part` at its top-left corner (shorter-axis split).
function split(free: FreeRect, part: Part): FreeRect[] {
  const right = free.w - part.w
  const bottom = free.h - part.h
  const out: FreeRect[] = []
  if (right <= bottom) {
    if (right > EPS) out.push({ x: free.x + part.w, y: free.y, w: right, h: part.h })
    if (bottom > EPS) out.push({ x: free.x, y: free.y + part.h, w: free.w, h: bottom })
  } else {
    if (bottom > EPS) out.push({ x: free.x, y: free.y + part.h, w: part.w, h: bottom })
    if (right > EPS) out.push({ x: free.x + part.w, y: free.y, w: right, h: free.h })
  }
  return out
}

// 2D guillotine cutting-stock: number of binW×binH sheets needed for the given parts.
export function packSheets(parts: Part[], binW: number, binH: number, allowRotate: boolean): number {
  const sorted = [...parts].sort((a, b) => b.w * b.h - a.w * a.h || b.w - a.w)
  const bins: FreeRect[][] = []

  const tryPlace = (free: FreeRect[], part: Part): boolean => {
    let bestIdx = -1
    let bestPart: Part | null = null
    let bestWaste = Infinity
    for (let i = 0; i < free.length; i++) {
      const orientations = allowRotate ? [part, { w: part.h, h: part.w }] : [part]
      for (const o of orientations) {
        if (!fits(o, free[i])) continue
        const waste = free[i].w * free[i].h - o.w * o.h
        if (waste < bestWaste) {
          bestWaste = waste
          bestIdx = i
          bestPart = o
        }
      }
    }
    if (bestIdx < 0 || !bestPart) return false
    const rect = free[bestIdx]
    free.splice(bestIdx, 1, ...split(rect, bestPart))
    return true
  }

  for (const part of sorted) {
    const fitW = Math.min(part.w, part.h)
    const fitH = Math.max(part.w, part.h)
    if (fitW > binW + EPS || fitH > binH + EPS) {
      // Part larger than a sheet (shouldn't happen for our pieces): charge its own sheet.
      bins.push([])
      continue
    }
    let placed = false
    for (const bin of bins) {
      if (tryPlace(bin, part)) {
        placed = true
        break
      }
    }
    if (!placed) {
      const bin: FreeRect[] = [{ x: 0, y: 0, w: binW, h: binH }]
      tryPlace(bin, part)
      bins.push(bin)
    }
  }
  return bins.length
}

// 1D first-fit-decreasing: number of stockLen boards needed to cut the given lengths.
export function packLengths(lengths: number[], stockLen: number): number {
  const sorted = [...lengths].sort((a, b) => b - a)
  const remaining: number[] = []
  for (const len of sorted) {
    if (len > stockLen + EPS) {
      // Longer than one stock unit: span several (joined end to end); last keeps the offcut.
      const n = Math.ceil(len / stockLen)
      for (let i = 0; i < n - 1; i++) remaining.push(0)
      remaining.push(n * stockLen - len)
      continue
    }
    let placed = false
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] >= len - EPS) {
        remaining[i] -= len
        placed = true
        break
      }
    }
    if (!placed) remaining.push(stockLen - len)
  }
  return remaining.length
}

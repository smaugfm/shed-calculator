import type { ShedConfig, WallSide } from '../config/types'
import { findProfile } from '../config/profiles'
import { buildModel } from '../model/build'
import { cutoffWaste } from './waste'

export interface GroupSetting {
  enabled: boolean
  pct: number
}

export interface OptimizeSettings {
  base: GroupSetting
  overhangs: GroupSetting
  openingPositions: GroupSetting
  windowSizes: GroupSetting
  downsizeBase?: boolean // when set, base dimensions may only shrink, never grow
  budgetMs?: number
}

export interface OptimizeChange {
  label: string
  from: number
  to: number
}

export interface OptimizeResult {
  config: ShedConfig
  baselineWaste: number // waste fraction (0..1) — the minimised objective
  optimizedWaste: number
  baselineCost: number // ₴ of cut-off (for display)
  optimizedCost: number
  changes: OptimizeChange[]
  evals: number
}

interface Knob {
  label: string
  value: number
  lo: number
  hi: number
  read: (c: ShedConfig) => number
  assign: (c: ShedConfig, v: number) => void
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const wallLengthOf = (c: ShedConfig, wall: WallSide) => (wall === 'front' || wall === 'back' ? c.base.width : c.base.depth)

function openingName(c: ShedConfig, index: number): string {
  const o = c.openings[index]
  const n = c.openings.slice(0, index + 1).filter((x) => x.type === o.type).length
  return `${o.type === 'window' ? 'Window' : 'Door'} ${n}`
}

function buildKnobs(cfg: ShedConfig, s: OptimizeSettings): Knob[] {
  const k: Knob[] = []
  const band = (val: number, pct: number): [number, number] => [val - (Math.abs(val) * pct) / 100, val + (Math.abs(val) * pct) / 100]

  if (s.base.enabled && s.base.pct > 0) {
    const [lw, hw] = band(cfg.base.width, s.base.pct)
    const [ld, hd] = band(cfg.base.depth, s.base.pct)
    // Downsize-only caps the upper bound at the current value.
    k.push({
      label: 'Base width',
      value: cfg.base.width,
      lo: Math.max(1000, lw),
      hi: s.downsizeBase ? cfg.base.width : Math.min(50000, hw),
      read: (c) => c.base.width,
      assign: (c, v) => (c.base.width = v),
    })
    k.push({
      label: 'Base depth',
      value: cfg.base.depth,
      lo: Math.max(1000, ld),
      hi: s.downsizeBase ? cfg.base.depth : Math.min(50000, hd),
      read: (c) => c.base.depth,
      assign: (c, v) => (c.base.depth = v),
    })
  }
  if (s.overhangs.enabled && s.overhangs.pct > 0) {
    ;(['front', 'rear', 'sides'] as const).forEach((side) => {
      const cur = cfg.roof.overhangs[side]
      const [lo, hi] = band(cur, s.overhangs.pct)
      k.push({
        label: `Overhang ${side}`,
        value: cur,
        lo: Math.max(0, lo),
        hi: Math.min(3000, hi),
        read: (c) => c.roof.overhangs[side],
        assign: (c, v) => (c.roof.overhangs[side] = v),
      })
    })
  }
  if (s.openingPositions.enabled && s.openingPositions.pct > 0) {
    cfg.openings.forEach((o, i) => {
      const delta = (wallLengthOf(cfg, o.wall) * s.openingPositions.pct) / 100
      k.push({
        label: `${openingName(cfg, i)} position`,
        value: o.offsetAlongWall,
        lo: Math.max(0, o.offsetAlongWall - delta),
        hi: o.offsetAlongWall + delta,
        read: (c) => c.openings[i].offsetAlongWall,
        assign: (c, v) => (c.openings[i].offsetAlongWall = v),
      })
    })
  }
  if (s.windowSizes.enabled && s.windowSizes.pct > 0) {
    cfg.openings.forEach((o, i) => {
      if (o.type !== 'window') return
      const [lw, hw] = band(o.width, s.windowSizes.pct)
      k.push({
        label: `${openingName(cfg, i)} width`,
        value: o.width,
        lo: Math.max(100, lw),
        hi: hw,
        read: (c) => c.openings[i].width,
        assign: (c, v) => (c.openings[i].width = v),
      })
      const [lh, hh] = band(o.height, s.windowSizes.pct)
      k.push({
        label: `${openingName(cfg, i)} height`,
        value: o.height,
        lo: Math.max(100, lh),
        hi: hh,
        read: (c) => c.openings[i].height,
        assign: (c, v) => (c.openings[i].height = v),
      })
    })
  }
  return k
}

// Clamp to mm + the cross-field validation rules so every candidate is a valid shed (doors keep
// their size — only their position can move).
function sanitize(c: ShedConfig): void {
  c.base.width = Math.round(c.base.width)
  c.base.depth = Math.round(c.base.depth)
  ;(['front', 'rear', 'sides'] as const).forEach((s) => (c.roof.overhangs[s] = Math.round(c.roof.overhangs[s])))
  for (const o of c.openings) {
    const wallLen = wallLengthOf(c, o.wall)
    if (o.type === 'window') {
      o.width = Math.max(100, Math.round(Math.min(o.width, wallLen - 100)))
      o.height = Math.max(100, Math.min(Math.round(o.height), c.heights.min - 100))
    } else {
      o.width = Math.round(o.width)
    }
    o.offsetAlongWall = Math.round(clamp(o.offsetAlongWall, 0, Math.max(0, wallLen - o.width)))
  }
}

// Openings on a wall must not overlap (leaving room for both their king studs); sanitize clamps each
// opening to its wall independently but can't see the others, so the optimizer must reject collisions.
function openingsValid(c: ShedConfig): boolean {
  const clearance = 2 * findProfile(c.profiles, c.roles.stud).thickness
  const byWall = new Map<WallSide, { a: number; b: number }[]>()
  for (const o of c.openings) {
    const arr = byWall.get(o.wall) ?? []
    arr.push({ a: o.offsetAlongWall, b: o.offsetAlongWall + o.width })
    byWall.set(o.wall, arr)
  }
  for (const arr of byWall.values()) {
    arr.sort((x, y) => x.a - y.a)
    for (let i = 1; i < arr.length; i++) if (arr[i].a < arr[i - 1].b + clearance) return false
  }
  return true
}

function candidate(base: ShedConfig, knobs: Knob[], values: number[]): ShedConfig {
  const c = structuredClone(base)
  knobs.forEach((knob, i) => knob.assign(c, values[i]))
  c.preset = 'custom'
  sanitize(c)
  return c
}

export function optimize(config: ShedConfig, settings: OptimizeSettings, onProgress?: (fraction: number) => void): OptimizeResult {
  const knobs = buildKnobs(config, settings)
  const evalAt = (values: number[]): { waste: number; cost: number; config: ShedConfig } => {
    const c = candidate(config, knobs, values)
    if (!openingsValid(c)) return { waste: Infinity, cost: Infinity, config: c }
    try {
      const w = cutoffWaste(buildModel(c), c)
      return { waste: w.fraction, cost: w.offcutCost, config: c }
    } catch {
      return { waste: Infinity, cost: Infinity, config: c }
    }
  }

  const current = knobs.map((k) => k.value)
  const baselineRun = evalAt(current)
  let bestVals = current
  let best = baselineRun
  let evals = 1

  if (knobs.length > 0) {
    const budgetMs = settings.budgetMs ?? 2000
    const MAX_EVALS = 500000 // runaway backstop only — the time budget is the real limit
    const start = Date.now()
    while (evals < MAX_EVALS && Date.now() - start < budgetMs) {
      const vals = knobs.map((k) => k.lo + Math.random() * (k.hi - k.lo))
      const r = evalAt(vals)
      evals++
      if (r.waste < best.waste) {
        best = r
        bestVals = vals
      }
      if (onProgress && (evals & 31) === 0) onProgress(Math.min(0.95, (Date.now() - start) / budgetMs))
    }
    // Coordinate-descent polish around the best.
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < knobs.length; i++) {
        const span = knobs[i].hi - knobs[i].lo
        for (const frac of [0.25, 0.1, 0.04, -0.25, -0.1, -0.04]) {
          const vals = bestVals.slice()
          vals[i] = clamp(vals[i] + span * frac, knobs[i].lo, knobs[i].hi)
          const r = evalAt(vals)
          evals++
          if (r.waste < best.waste) {
            best = r
            bestVals = vals
          }
        }
      }
    }
  }
  onProgress?.(1)

  const changes: OptimizeChange[] = []
  for (const knob of knobs) {
    const from = Math.round(knob.read(config))
    const to = knob.read(best.config)
    if (from !== to) changes.push({ label: knob.label, from, to })
  }

  return {
    config: best.config,
    baselineWaste: baselineRun.waste,
    optimizedWaste: best.waste,
    baselineCost: baselineRun.cost,
    optimizedCost: best.cost,
    changes,
    evals,
  }
}

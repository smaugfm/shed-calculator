import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../src/config/defaults'
import { buildModel } from '../src/model/build'
import { cutoffWaste } from '../src/optimizer/waste'
import { optimize, type OptimizeSettings } from '../src/optimizer/optimize'

const cfg = defaultConfig()

const settings = (budgetMs = 200): OptimizeSettings => ({
  base: { enabled: true, pct: 5 },
  overhangs: { enabled: true, pct: 25 },
  openingPositions: { enabled: true, pct: 15 },
  windowSizes: { enabled: true, pct: 15 },
  budgetMs,
})

describe('cutoffWaste', () => {
  it('reports non-negative offcut, positive cost, and a fraction in [0,1] (default prices)', () => {
    const w = cutoffWaste(buildModel(cfg), cfg)
    expect(w.timberOffcutM).toBeGreaterThanOrEqual(0)
    expect(w.osbOffcutM2).toBeGreaterThanOrEqual(0)
    expect(w.offcutCost).toBeGreaterThan(0)
    expect(w.fraction).toBeGreaterThan(0)
    expect(w.fraction).toBeLessThan(1)
  })
})

describe('optimize', () => {
  const res = optimize(cfg, settings())

  it('never increases the waste fraction versus the baseline', () => {
    expect(res.optimizedWaste).toBeLessThanOrEqual(res.baselineWaste + 1e-9)
  })

  it('produces a valid, buildable config', () => {
    expect(() => buildModel(res.config)).not.toThrow()
  })

  it('keeps every opening inside its wall', () => {
    for (const o of res.config.openings) {
      const wallLen = o.wall === 'front' || o.wall === 'back' ? res.config.base.width : res.config.base.depth
      expect(o.offsetAlongWall).toBeGreaterThanOrEqual(0)
      expect(o.offsetAlongWall + o.width).toBeLessThanOrEqual(wallLen + 1)
    }
  })

  it('never overlaps openings on the same wall', () => {
    const byWall = new Map<string, { a: number; b: number }[]>()
    for (const o of res.config.openings) {
      const arr = byWall.get(o.wall) ?? []
      arr.push({ a: o.offsetAlongWall, b: o.offsetAlongWall + o.width })
      byWall.set(o.wall, arr)
    }
    for (const arr of byWall.values()) {
      arr.sort((x, y) => x.a - y.a)
      for (let i = 1; i < arr.length; i++) expect(arr[i].a).toBeGreaterThanOrEqual(arr[i - 1].b)
    }
  })

  it('never resizes doors (only repositions them)', () => {
    const before = cfg.openings.filter((o) => o.type === 'door')
    const after = res.config.openings.filter((o) => o.type === 'door')
    before.forEach((d, i) => {
      expect(after[i].width).toBe(d.width)
      expect(after[i].height).toBe(d.height)
    })
  })

  it('keeps base dimensions within the ±% band', () => {
    expect(res.config.base.width).toBeGreaterThanOrEqual(Math.round(cfg.base.width * 0.95) - 1)
    expect(res.config.base.width).toBeLessThanOrEqual(Math.round(cfg.base.width * 1.05) + 1)
  })

  it('with downsizeBase, base dimensions never grow', () => {
    const r = optimize(cfg, { ...settings(150), downsizeBase: true })
    expect(r.config.base.width).toBeLessThanOrEqual(cfg.base.width)
    expect(r.config.base.depth).toBeLessThanOrEqual(cfg.base.depth)
  })

  it('changes nothing when all groups are disabled', () => {
    const off = optimize(cfg, {
      base: { enabled: false, pct: 0 },
      overhangs: { enabled: false, pct: 0 },
      openingPositions: { enabled: false, pct: 0 },
      windowSizes: { enabled: false, pct: 0 },
      budgetMs: 50,
    })
    expect(off.changes).toHaveLength(0)
  })
})

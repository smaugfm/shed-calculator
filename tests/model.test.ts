import { describe, expect, it } from 'vitest'
import type { Member, Piece, ShedModel } from '../src/model/types'
import type { ShedConfig, StructuralRole } from '../src/config/types'
import type { MaterialId } from '../src/model/materials'
import { defaultConfig } from '../src/config/defaults'
import { buildModel } from '../src/model/build'
import { findProfile } from '../src/config/profiles'
import { applyPreset } from '../src/config/presets'
import { spacedPositions } from '../src/model/floor'
import { computeBom } from '../src/bom/compute'

const TOL = 1 // mm

const cfg = defaultConfig()
const model = buildModel(cfg)

const beam = findProfile(cfg.profiles, cfg.roles.gradeBeam)
const joist = findProfile(cfg.profiles, cfg.roles.joist)

const role = (m: ShedModel, r: StructuralRole): Member[] => m.members.filter((x) => x.role === r)
const piecesOf = (m: ShedModel, id: MaterialId): Piece[] => m.pieces.filter((p) => p.materialId === id)
const near = (a: number, b: number) => Math.abs(a - b) <= TOL

// World X/Z of a piece's UV corner (vDir has no horizontal component for our surfaces).
const pieceX = (p: Piece, u: number) => p.origin.x + u * p.uDir.x
const pieceZ = (p: Piece, u: number) => p.origin.z + u * p.uDir.z

// Outer extent of a horizontal member along the axis perpendicular to its run (its cross-section thickness).
function memberFaces(members: Member[], axis: 'x' | 'z'): { min: number; max: number } {
  const vals: number[] = []
  for (const m of members) vals.push(m.start[axis], m.end[axis])
  return { min: Math.min(...vals), max: Math.max(...vals) }
}

describe('foundation', () => {
  it('places countX x countY piles', () => {
    expect(model.piles.length).toBe(cfg.foundation.countX * cfg.foundation.countY)
  })

  it('sizes piles to the grade-beam thickness so they tuck under the beam', () => {
    expect(model.piles.every((p) => p.size === beam.thickness)).toBe(true)
  })

  it('keeps pile outer faces inside the footprint', () => {
    const minX = Math.min(...model.piles.map((p) => p.x - p.size / 2))
    const maxX = Math.max(...model.piles.map((p) => p.x + p.size / 2))
    const minZ = Math.min(...model.piles.map((p) => p.z - p.size / 2))
    const maxZ = Math.max(...model.piles.map((p) => p.z + p.size / 2))
    expect(near(minX, 0)).toBe(true)
    expect(near(maxX, cfg.base.width)).toBe(true)
    expect(near(minZ, 0)).toBe(true)
    expect(near(maxZ, cfg.base.depth)).toBe(true)
  })

  it('extends perimeter grade beams to the corners', () => {
    const xBeams = role(model, 'gradeBeam').filter((b) => near(b.start.z, b.end.z))
    const span = memberFaces(xBeams, 'x')
    expect(near(span.min, 0)).toBe(true)
    expect(near(span.max, cfg.base.width)).toBe(true)
  })
})

describe('floor', () => {
  it('derives floorTopY from the layer stack', () => {
    expect(model.floorTopY).toBeCloseTo(cfg.foundation.exposedHeight + beam.width + joist.width + cfg.floor.deckThickness, 5)
  })

  it('lands the OSB deck flush with floor level', () => {
    const deck = piecesOf(model, 'osb-floor')
    expect(deck.length).toBeGreaterThan(0)
    for (const d of deck) {
      const top = d.origin.y + d.normal.y * (d.offset + d.thickness / 2)
      expect(near(top, model.floorTopY)).toBe(true)
    }
  })

  it('adds a joist per spacing plus two rim joists', () => {
    const expected = spacedPositions(cfg.base.width, cfg.floor.joistSpacing).length + 2
    expect(role(model, 'joist').length).toBe(expected)
  })

  it('aligns rim/edge joist outer faces with the deck edges', () => {
    const joists = role(model, 'joist')
    const along = joists.filter((j) => near(j.start.z, j.end.z)) // run along x → faces in z
    const faces = memberFaces(along, 'z')
    expect(near(faces.min - joist.thickness / 2, 0) || near(faces.min, joist.thickness / 2)).toBe(true)
  })
})

describe('walls and corners', () => {
  it('makes the front wall the higher eave', () => {
    const xPlates = role(model, 'plate').filter((p) => near(p.start.z, p.end.z)) // front/back plates run along x
    const frontTop = Math.max(...xPlates.filter((p) => p.start.z < cfg.base.depth / 2).map((p) => p.start.y))
    const backTop = Math.max(...xPlates.filter((p) => p.start.z > cfg.base.depth / 2).map((p) => p.start.y))
    expect(frontTop).toBeGreaterThan(backTop)
  })

  it('keeps every stud within the footprint (no corner stud pokes out)', () => {
    const vstuds = role(model, 'stud').filter((s) => s.end.y > s.start.y && near(s.start.x, s.end.x) && near(s.start.z, s.end.z))
    expect(vstuds.length).toBeGreaterThan(0)
    for (const s of vstuds) {
      const hx = Math.abs(s.up.x) > 0.5 ? s.width / 2 : s.thickness / 2
      const hz = Math.abs(s.up.z) > 0.5 ? s.width / 2 : s.thickness / 2
      expect(s.start.x - hx).toBeGreaterThanOrEqual(-TOL)
      expect(s.start.x + hx).toBeLessThanOrEqual(cfg.base.width + TOL)
      expect(s.start.z - hz).toBeGreaterThanOrEqual(-TOL)
      expect(s.start.z + hz).toBeLessThanOrEqual(cfg.base.depth + TOL)
    }
  })

  it('laps front/back OSB pieces outward past the corner', () => {
    const front = piecesOf(model, 'osb-wall').filter((p) => p.normal.z < -0.5)
    const xs = front.flatMap((p) => p.uv.map((c) => pieceX(p, c.u)))
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(Math.max(...xs)).toBeGreaterThan(cfg.base.width)
  })

  it('keeps side OSB pieces butted at the footprint (no outward lap)', () => {
    const left = piecesOf(model, 'osb-wall').filter((p) => p.normal.x < -0.5)
    const zs = left.flatMap((p) => p.uv.map((c) => pieceZ(p, c.u)))
    expect(near(Math.min(...zs), 0)).toBe(true)
    expect(near(Math.max(...zs), cfg.base.depth)).toBe(true)
  })

  it('extends side cladding pieces past the corner to butt the front/back cladding', () => {
    const left = piecesOf(model, 'cladding').filter((p) => p.normal.x < -0.5)
    const zs = left.flatMap((p) => p.uv.map((c) => pieceZ(p, c.u)))
    expect(Math.min(...zs)).toBeLessThan(0)
    expect(Math.max(...zs)).toBeGreaterThan(cfg.base.depth)
  })

  it('cuts openings out of the wall skin (OSB and cladding)', () => {
    const noOpenings = buildModel({ ...cfg, openings: [] })
    const used = (m: ShedModel, id: MaterialId) => piecesOf(m, id).reduce((s, p) => s + p.usedArea, 0)
    expect(used(model, 'osb-wall')).toBeLessThan(used(noOpenings, 'osb-wall'))
    expect(used(model, 'cladding')).toBeLessThan(used(noOpenings, 'cladding'))
  })
})

describe('plates', () => {
  it('produces more plate members with double plates than single', () => {
    const single = buildModel({ ...cfg, walls: { ...cfg.walls, topPlateCount: 1, bottomPlateCount: 1 } })
    const double = buildModel({ ...cfg, walls: { ...cfg.walls, topPlateCount: 2, bottomPlateCount: 2 } })
    expect(role(double, 'plate').length).toBeGreaterThan(role(single, 'plate').length)
  })
})

describe('roof', () => {
  it('adds a rafter per spacing', () => {
    expect(role(model, 'rafter').length).toBe(spacedPositions(cfg.base.width, cfg.roof.rafterSpacing).length)
  })

  it('keeps outermost rafters within the footprint (no overhang past the side walls)', () => {
    const rafters = role(model, 'rafter')
    const minX = Math.min(...rafters.map((r) => r.start.x - r.thickness / 2))
    const maxX = Math.max(...rafters.map((r) => r.start.x + r.thickness / 2))
    expect(minX).toBeGreaterThanOrEqual(-TOL)
    expect(maxX).toBeLessThanOrEqual(cfg.base.width + TOL)
  })

  const roofBattens = (m: ShedModel) => role(m, 'batten').filter((b) => Math.abs(b.start.x - b.end.x) > 1)

  it('adds roof battens only for ventilated with battens enabled', () => {
    expect(roofBattens(buildModel({ ...cfg, roof: { ...cfg.roof, covering: 'shingles' } })).length).toBe(0)
    expect(roofBattens(buildModel({ ...cfg, roof: { ...cfg.roof, covering: 'ventilated', battens: false } })).length).toBe(0)
    expect(roofBattens(buildModel({ ...cfg, roof: { ...cfg.roof, covering: 'ventilated', battens: true } })).length).toBeGreaterThan(0)
  })

  it('extends roof battens across the full roof width (to the barge boards)', () => {
    const vent = buildModel({ ...cfg, roof: { ...cfg.roof, covering: 'ventilated', battens: true } })
    const sides = cfg.roof.overhangs.sides
    const xs = roofBattens(vent).flatMap((b) => [b.start.x, b.end.x])
    expect(Math.min(...xs)).toBeCloseTo(-sides, 5)
    expect(Math.max(...xs)).toBeCloseTo(cfg.base.width + sides, 5)
  })

  it('wraps the roof perimeter with fascia/barge boards (2 eaves + 2 rakes)', () => {
    expect(role(model, 'fascia').length).toBe(4)
  })

  it('closes the overhang underside with four soffit panels', () => {
    expect(model.panels.filter((p) => p.kind === 'soffit').length).toBe(4)
  })

  it('applies independent front/rear/side overhangs', () => {
    const m = buildModel({ ...cfg, roof: { ...cfg.roof, overhangs: { front: 300, rear: 100, sides: 50 } } })
    const osb = piecesOf(m, 'osb-roof')
    const xs = osb.flatMap((p) => p.uv.map((c) => p.origin.x + c.u * p.uDir.x + c.v * p.vDir.x))
    const zs = osb.flatMap((p) => p.uv.map((c) => p.origin.z + c.u * p.uDir.z + c.v * p.vDir.z))
    expect(Math.min(...xs)).toBeCloseTo(-50, 0)
    expect(Math.max(...xs)).toBeCloseTo(cfg.base.width + 50, 0)
    expect(Math.min(...zs)).toBeCloseTo(-300, 0)
    expect(Math.max(...zs)).toBeCloseTo(cfg.base.depth + 100, 0)
  })

  it('stacks roofing outside membrane outside OSB', () => {
    const osbOff = piecesOf(model, 'osb-roof')[0].offset
    const memOff = piecesOf(model, 'membrane-roof')[0].offset
    const roofOff = piecesOf(model, 'roofing')[0].offset
    expect(memOff).toBeGreaterThan(osbOff)
    expect(roofOff).toBeGreaterThan(memOff)
  })
})

describe('discrete materials (cut list)', () => {
  const ALL: MaterialId[] = ['osb-floor', 'osb-wall', 'osb-roof', 'cladding', 'roofing', 'membrane-wall', 'membrane-roof']

  it('tiles every skin material into pieces', () => {
    for (const id of ALL) expect(piecesOf(model, id).length).toBeGreaterThan(0)
  })

  it('never uses more area than bought (leftover >= 0)', () => {
    for (const id of ALL) {
      const g = piecesOf(model, id)
      const bought = g.reduce((s, p) => s + p.nominalArea, 0)
      const used = g.reduce((s, p) => s + p.usedArea, 0)
      expect(bought + 1e-6).toBeGreaterThanOrEqual(used)
      expect(g.every((p) => p.usedArea <= p.nominalArea + 1e-6)).toBe(true)
    }
  })

  it('has full interior pieces (no offcut) and cut edge pieces (offcut) for wall OSB', () => {
    const g = piecesOf(model, 'osb-wall')
    expect(g.some((p) => Math.abs(p.usedArea - p.nominalArea) < 1e-6)).toBe(true)
    expect(g.some((p) => p.usedArea < p.nominalArea - 1e-6)).toBe(true)
  })

  it('models shingle overlap: lower exposure yields more shingles', () => {
    const overlap = piecesOf(model, 'roofing').length
    const flat = piecesOf(buildModel({ ...cfg, roof: { ...cfg.roof, shingle: { ...cfg.roof.shingle, exposure: cfg.roof.shingle.height } } }), 'roofing').length
    expect(overlap).toBeGreaterThan(flat)
  })

  it('cuts openings out of the wall membrane', () => {
    const used = (m: ShedModel) => piecesOf(m, 'membrane-wall').reduce((s, p) => s + p.usedArea, 0)
    expect(used(model)).toBeLessThan(used(buildModel({ ...cfg, openings: [] })))
  })

  it('overlaps membrane courses: more overlap yields more pieces', () => {
    const more = piecesOf(buildModel({ ...cfg, walls: { ...cfg.walls, membrane: { ...cfg.walls.membrane, overlap: 750 } } }), 'membrane-wall').length
    expect(more).toBeGreaterThan(piecesOf(model, 'membrane-wall').length)
  })
})

describe('insulation', () => {
  const noIns = buildModel({
    ...cfg,
    walls: { ...cfg.walls, insulation: { ...cfg.walls.insulation, enabled: false } },
    roof: { ...cfg.roof, insulation: { ...cfg.roof.insulation, enabled: false } },
  })

  it('emits cavity pieces only when enabled', () => {
    expect(piecesOf(model, 'insulation-wall').length).toBeGreaterThan(0)
    expect(piecesOf(model, 'insulation-roof').length).toBeGreaterThan(0)
    expect(piecesOf(noIns, 'insulation-wall').length).toBe(0)
    expect(piecesOf(noIns, 'insulation-roof').length).toBe(0)
  })

  it('sits inboard of the OSB (in the framing cavity)', () => {
    expect(piecesOf(model, 'insulation-wall')[0].offset).toBeLessThan(piecesOf(model, 'osb-wall')[0].offset)
    expect(piecesOf(model, 'insulation-roof')[0].offset).toBeLessThan(piecesOf(model, 'osb-roof')[0].offset)
  })

  it('is recessed within the framing depth (no face tearing)', () => {
    const stud = findProfile(cfg.profiles, cfg.roles.stud)
    const rafter = findProfile(cfg.profiles, cfg.roles.rafter)
    const wall = piecesOf(model, 'insulation-wall')[0]
    const roof = piecesOf(model, 'insulation-roof')[0]
    expect(wall.thickness).toBeLessThan(stud.width)
    expect(wall.thickness).toBeGreaterThan(stud.width - 20)
    expect(roof.thickness).toBeLessThan(rafter.width)
    expect(roof.thickness).toBeGreaterThan(rafter.width - 20)
  })

  it('keeps wall insulation strips between the studs (within bay bounds)', () => {
    const stud = findProfile(cfg.profiles, cfg.roles.stud)
    const studUsByWall = spacedPositions(cfg.base.width, cfg.walls.studSpacing)
    // The widest a single strip can be is one stud bay minus the recess on both sides.
    const maxBay = cfg.walls.studSpacing - stud.thickness
    for (const p of piecesOf(model, 'insulation-wall')) {
      const us = p.uv.map((c) => c.u)
      expect(Math.max(...us) - Math.min(...us)).toBeLessThanOrEqual(maxBay + 1)
    }
    expect(studUsByWall.length).toBeGreaterThan(0)
  })

  it('cuts openings out of the wall insulation', () => {
    const used = (m: ShedModel) => piecesOf(m, 'insulation-wall').reduce((s, p) => s + p.usedArea, 0)
    expect(used(model)).toBeLessThan(used(buildModel({ ...cfg, openings: [] })))
  })

  it('fills above-header insulation on the real king/cripple grid, not the bare stud grid', () => {
    // Front-wall insulation pieces (origin at z≈0, outward normal −z). uv u→world x, v→y−floorTopY.
    const front = piecesOf(model, 'insulation-wall').filter((p) => Math.abs(p.origin.z) < 1 && p.normal.z < 0)
    const covers = (u: number, v: number) =>
      front.some((p) => {
        const us = p.uv.map((c) => c.u)
        const vs = p.uv.map((c) => c.v)
        return Math.min(...us) < u && u < Math.max(...us) && Math.min(...vs) < v && v < Math.max(...vs)
      })
    // Default window: offset 1600, width 1000 → kings at 1600/2600, one cripple at 2200; head ≈ 1800,
    // so the above-header band is ~v ∈ [1945, 2910].
    expect(covers(1800, 2300)).toBe(true) // no stud at the global-grid 1800 here → must be insulated (was the bug)
    expect(covers(2200, 2300)).toBe(false) // a real cripple stud sits at 2200 → genuine gap
  })

  it('bills two roll types sized to the framing spacing, no negative offcut', () => {
    const bom = computeBom(model, cfg)
    const wall = bom.find((l) => l.category === 'Insulation' && l.label === 'Mineral wool (walls)')!
    const roof = bom.find((l) => l.category === 'Insulation' && l.label === 'Mineral wool (roof)')!
    expect(wall.spec).toContain(`${cfg.walls.studSpacing}×`)
    expect(roof.spec).toContain(`${cfg.roof.rafterSpacing}×`)
    expect(wall.qty).toBeGreaterThan(0)
    expect(roof.qty).toBeGreaterThan(0)
    for (const line of [wall, roof]) {
      const offcut = Number(line.spec.match(/·\s*([-\d.]+)\s*m²\s*offcut/)![1])
      expect(offcut).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('bom — per-profile stock length', () => {
  const studProfileId = cfg.roles.stud
  const studLabel = findProfile(cfg.profiles, studProfileId).label
  const boardCount = (c: ShedConfig) => computeBom(buildModel(c), c).find((l) => l.category === 'Timber' && l.label === studLabel)!.qty

  it('a shorter stock length needs more boards', () => {
    const short = { ...cfg, profiles: cfg.profiles.map((p) => (p.id === studProfileId ? { ...p, length: 2400 } : p)) }
    expect(boardCount(short)).toBeGreaterThan(boardCount(cfg))
  })
})

describe('openings', () => {
  it('keeps openings inside the wall (clamps height below the plates + header)', () => {
    const low: ShedConfig = { ...cfg, heights: { min: cfg.heights.min, max: 1800 } }
    const m = buildModel(low)
    const door = m.openings.find((o) => o.type === 'door')!
    const requested = cfg.openings.find((o) => o.type === 'door')!.height
    expect(door.height).toBeLessThan(requested)
    expect(door.height).toBeGreaterThan(0)
  })
})

describe('presets', () => {
  it('applies stud spacing per grade', () => {
    expect(applyPreset(cfg, 'light').walls.studSpacing).toBe(800)
    expect(applyPreset(cfg, 'normal').walls.studSpacing).toBe(600)
    expect(applyPreset(cfg, 'heavy').walls.studSpacing).toBe(400)
  })

  it('enables insulation for normal/heavy and disables it for light', () => {
    for (const grade of ['normal', 'heavy'] as const) {
      const p = applyPreset(cfg, grade)
      expect(p.walls.insulation.enabled).toBe(true)
      expect(p.roof.insulation.enabled).toBe(true)
    }
    const light = applyPreset(cfg, 'light')
    expect(light.walls.insulation.enabled).toBe(false)
    expect(light.roof.insulation.enabled).toBe(false)
  })
})

describe('determinism', () => {
  it('produces a stable member count across rebuilds', () => {
    expect(buildModel(cfg).members.length).toBe(model.members.length)
  })
})

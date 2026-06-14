import type { ShedConfig } from '../config/types'
import { DEFAULT_PROFILE_LENGTH, findProfile } from '../config/profiles'
import type { Member, Panel, PanelKind, Piece, ShedModel } from '../model/types'
import { materialSpecs, type MaterialId } from '../model/materials'
import { packLengths, packSheets } from '../model/nesting'
import type { BillOfMaterials, BomLine } from './types'

function round(n: number, dp = 1): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

function panelArea(panels: Panel[], kind: PanelKind): number {
  return panels.filter((p) => p.kind === kind).reduce((s, p) => s + p.area, 0)
}

function pieceArea(pieces: Piece[], id: MaterialId): number {
  return pieces.filter((p) => p.materialId === id).reduce((s, p) => s + p.usedArea, 0)
}

function fastenerLabel(config: ShedConfig, specId: string): string {
  return config.fasteners.catalog.find((f) => f.id === specId)?.label ?? specId
}

export function computeBom(model: ShedModel, config: ShedConfig): BillOfMaterials {
  const lines: BillOfMaterials = []
  lines.push(...timberLines(model.members, config))
  lines.push(...pieceLines(model.pieces, config))
  lines.push(...areaLines(model.panels))
  lines.push(foundationLine(model))
  lines.push(...fastenerLines(model, config))
  return lines
}

function timberLines(members: Member[], config: ShedConfig): BomLine[] {
  const byProfile = new Map<string, { count: number; totalMm: number }>()
  for (const m of members) {
    const entry = byProfile.get(m.profileId) ?? { count: 0, totalMm: 0 }
    entry.count += 1
    entry.totalMm += m.length
    byProfile.set(m.profileId, entry)
  }
  const memberLengths = new Map<string, number[]>()
  for (const m of members) {
    const arr = memberLengths.get(m.profileId) ?? []
    arr.push(m.length)
    memberLengths.set(m.profileId, arr)
  }
  const lines: BomLine[] = []
  for (const [profileId, { count, totalMm }] of byProfile) {
    const profile = findProfile(config.profiles, profileId)
    const stockLen = profile.length > 0 ? profile.length : DEFAULT_PROFILE_LENGTH
    const boards = packLengths(memberLengths.get(profileId) ?? [], stockLen)
    const offcut = (boards * stockLen - totalMm) / 1000
    lines.push({
      category: 'Timber',
      label: profile.label,
      spec: `${boards} × ${stockLen / 1000} m boards · ${count} pcs · ${round(totalMm / 1000)} m used · ${round(offcut)} m offcut`,
      qty: boards,
      unit: 'boards',
    })
  }
  return lines.sort((a, b) => a.label.localeCompare(b.label))
}

function pieceBBox(p: Piece): { w: number; h: number } {
  const us = p.uv.map((c) => c.u)
  const vs = p.uv.map((c) => c.v)
  return { w: Math.max(...us) - Math.min(...us), h: Math.max(...vs) - Math.min(...vs) }
}

// Cut pieces with offcut nesting: OSB packed into 2D sheets, cladding into 1D boards, shingles
// counted as discrete units.
function pieceLines(pieces: Piece[], config: ShedConfig): BomLine[] {
  const specs = materialSpecs(config)
  const lines: BomLine[] = []
  const sheetArea = (config.stock.sheetWidth * config.stock.sheetHeight) / 1e6

  for (const id of ['osb-floor', 'osb-wall', 'osb-roof'] as const) {
    const group = pieces.filter((p) => p.materialId === id)
    if (group.length === 0) continue
    const sheets = packSheets(group.map(pieceBBox), config.stock.sheetWidth, config.stock.sheetHeight, true)
    const bought = sheets * sheetArea
    const used = group.reduce((s, p) => s + p.usedArea, 0)
    lines.push({
      category: 'Sheets',
      label: specs[id].label,
      spec: `${sheets} sheets (${specs[id].dims}) · ${round(bought)} m² bought · ${round(bought - used)} m² offcut`,
      qty: sheets,
      unit: 'sheets',
    })
  }

  const clad = pieces.filter((p) => p.materialId === 'cladding')
  if (clad.length > 0) {
    // Nest along the board's long axis: height for vertical cladding, width for horizontal.
    const boardLen = (p: Piece) => (config.walls.claddingOrientation === 'vertical' ? pieceBBox(p).h : pieceBBox(p).w)
    const boards = packLengths(clad.map(boardLen), config.walls.cladding.length)
    const bought = (boards * config.walls.cladding.width * config.walls.cladding.length) / 1e6
    const used = clad.reduce((s, p) => s + p.usedArea, 0)
    lines.push({
      category: 'Membrane & covering',
      label: specs.cladding.label,
      spec: `${boards} boards (${specs.cladding.dims}) · ${round(bought)} m² bought · ${round(bought - used)} m² offcut`,
      qty: boards,
      unit: 'boards',
    })
  }

  // Membrane: rolls of fixed width — 1D-nest each strip's run length into the roll length.
  for (const [id, m] of [
    ['membrane-wall', config.walls.membrane],
    ['membrane-roof', config.roof.membrane],
  ] as const) {
    const group = pieces.filter((p) => p.materialId === id)
    if (group.length === 0) continue
    const rolls = packLengths(
      group.map((p) => pieceBBox(p).w),
      m.rollLength,
    )
    const bought = (rolls * m.rollWidth * m.rollLength) / 1e6
    const used = group.reduce((s, p) => s + p.usedArea, 0)
    lines.push({
      category: 'Membrane & covering',
      label: specs[id].label,
      spec: `${rolls} rolls (${specs[id].dims}) · ${round(bought)} m² bought · ${round(bought - used)} m² offcut`,
      qty: rolls,
      unit: 'rolls',
    })
  }

  // Insulation: rolls as wide as the framing bay (stud / rafter spacing) — 1D-nest each strip's
  // run length into the roll length. Two roll types.
  for (const [id, ins, width] of [
    ['insulation-wall', config.walls.insulation, config.walls.studSpacing],
    ['insulation-roof', config.roof.insulation, config.roof.rafterSpacing],
  ] as const) {
    const group = pieces.filter((p) => p.materialId === id)
    if (group.length === 0) continue
    const rolls = packLengths(
      group.map((p) => pieceBBox(p).h),
      ins.rollLength,
    )
    const bought = (rolls * width * ins.rollLength) / 1e6
    const used = group.reduce((s, p) => s + p.usedArea, 0)
    lines.push({
      category: 'Insulation',
      label: specs[id].label,
      spec: `${rolls} rolls (${specs[id].dims}) · ${round(bought)} m² bought · ${round(bought - used)} m² offcut`,
      qty: rolls,
      unit: 'rolls',
    })
  }

  const roof = pieces.filter((p) => p.materialId === 'roofing')
  if (roof.length > 0) {
    const bought = roof.reduce((s, p) => s + p.nominalArea, 0)
    const used = roof.reduce((s, p) => s + p.usedArea, 0)
    lines.push({
      category: 'Membrane & covering',
      label: specs.roofing.label,
      spec: `${roof.length} pcs (${specs.roofing.dims}) · ${round(used)} m² covered · ${round(bought - used)} m² offcut`,
      qty: roof.length,
      unit: 'pcs',
    })
  }
  return lines
}

// Continuous goods: only the soffit remains area-only.
function areaLines(panels: Panel[]): BomLine[] {
  const lines: BomLine[] = []
  const soffit = panelArea(panels, 'soffit')
  if (soffit > 0) lines.push({ category: 'Sheets', label: 'Soffit OSB', spec: `${round(soffit)} m²`, qty: round(soffit), unit: 'm²' })
  return lines
}

function foundationLine(model: ShedModel): BomLine {
  return { category: 'Foundation', label: 'Piles', spec: `${model.piles.length} positions`, qty: model.piles.length, unit: 'pcs' }
}

function fastenerLines(model: ShedModel, config: ShedConfig): BomLine[] {
  const f = config.fasteners
  const specs = materialSpecs(config)
  const counts = new Map<string, number>()
  const adhesive = new Map<string, number>()
  const bump = (specId: string, n: number) => counts.set(specId, (counts.get(specId) ?? 0) + n)

  const osbCount = model.pieces.filter((p) => p.materialId.startsWith('osb')).length
  const sheet = specs['osb-wall']
  const perSheet = (2 * (sheet.pieceW + sheet.pieceH)) / f.sheathing.perimeterSpacing + (sheet.pieceW * sheet.pieceH) / f.sheathing.fieldSpacing ** 2
  bump(f.sheathing.specId, Math.ceil(osbCount * perSheet))

  const claddingArea = pieceArea(model.pieces, 'cladding')
  bump(f.cladding.specId, Math.ceil((claddingArea * 1e6) / (f.cladding.spacing * 600)))

  const battenMm = model.members.filter((m) => m.role === 'batten').reduce((s, m) => s + m.length, 0)
  bump(f.batten.specId, Math.ceil(battenMm / f.batten.spacing))

  bump(f.framing.specId, model.joints.framingJoints * f.framing.perJoint)
  bump(f.joistHanger.specId, model.joints.joistEnds * f.joistHanger.perEnd)
  bump(f.rafterFixing.specId, model.joints.rafterEnds * f.rafterFixing.perEnd)
  bump(f.postAnchor.specId, model.piles.length * f.postAnchor.perPile)

  const coveringArea = pieceArea(model.pieces, 'roofing')
  if (f.roofCovering.kind === 'adhesiveLitresPerSqm') {
    adhesive.set(f.roofCovering.specId, (adhesive.get(f.roofCovering.specId) ?? 0) + coveringArea * f.roofCovering.ratePerSqm)
  } else {
    bump(f.roofCovering.specId, Math.ceil(coveringArea * f.roofCovering.ratePerSqm))
  }

  const lines: BomLine[] = []
  for (const [specId, qty] of counts) lines.push({ category: 'Fasteners', label: fastenerLabel(config, specId), spec: `${qty} pcs`, qty, unit: 'pcs' })
  for (const [specId, litres] of adhesive)
    lines.push({ category: 'Fasteners', label: fastenerLabel(config, specId), spec: `${round(litres)} L`, qty: round(litres), unit: 'L' })
  return lines.sort((a, b) => a.label.localeCompare(b.label))
}

import type { ShedConfig } from '../config/types'
import { findProfile } from '../config/profiles'
import type { Member, Panel, PanelKind, ShedModel } from '../model/types'
import { length } from '../model/geometry'
import type { BillOfMaterials, BomLine } from './types'

function round(n: number, dp = 1): number {
  const f = 10 ** dp
  return Math.round(n * f) / f
}

function panelArea(panels: Panel[], kind: PanelKind): number {
  return panels.filter((p) => p.kind === kind).reduce((s, p) => s + p.area, 0)
}

function fastenerLabel(config: ShedConfig, specId: string): string {
  return config.fasteners.catalog.find((f) => f.id === specId)?.label ?? specId
}

export function computeBom(model: ShedModel, config: ShedConfig): BillOfMaterials {
  const lines: BillOfMaterials = []
  lines.push(...timberLines(model.members, config))
  lines.push(...sheetLines(model.panels, config))
  lines.push(...coveringLines(model.panels, config))
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
  const lines: BomLine[] = []
  for (const [profileId, { count, totalMm }] of byProfile) {
    const profile = findProfile(config.profiles, profileId)
    const boards = Math.ceil(totalMm / config.stock.timberLength)
    lines.push({
      category: 'Timber',
      label: profile.label,
      spec: `${count} pcs · ${round(totalMm / 1000)} m total · ~${boards} × ${config.stock.timberLength / 1000} m`,
      qty: boards,
      unit: 'boards',
    })
  }
  return lines.sort((a, b) => a.label.localeCompare(b.label))
}

function sheetLines(panels: Panel[], config: ShedConfig): BomLine[] {
  const sheetArea = (config.stock.sheetWidth * config.stock.sheetHeight) / 1e6
  const kinds: Array<{ kind: PanelKind; label: string }> = [
    { kind: 'osb-floor', label: 'OSB floor deck' },
    { kind: 'osb-wall', label: 'OSB wall sheathing' },
    { kind: 'osb-roof', label: 'OSB roof sheathing' },
    { kind: 'soffit', label: 'Soffit boards' },
  ]
  const lines: BomLine[] = []
  for (const { kind, label } of kinds) {
    const area = panelArea(panels, kind)
    if (area <= 0) continue
    lines.push({
      category: 'Sheets',
      label,
      spec: `${round(area)} m² · ~${Math.ceil(area / sheetArea)} sheets (${config.stock.sheetWidth}×${config.stock.sheetHeight})`,
      qty: Math.ceil(area / sheetArea),
      unit: 'sheets',
    })
  }
  return lines
}

function coveringLines(panels: Panel[], config: ShedConfig): BomLine[] {
  const lines: BomLine[] = []
  const roofMembraneArea = panelArea(panels, 'membrane-roof')
  const wallMembraneArea = panelArea(panels, 'membrane-wall')
  const roofingArea = panelArea(panels, 'roofing')
  const claddingArea = panelArea(panels, 'cladding')

  if (roofMembraneArea > 0) {
    const label = config.roof.covering === 'shingles' ? 'EPDM membrane (roof)' : 'Breather membrane (roof)'
    lines.push({ category: 'Membrane & covering', label, spec: `${round(roofMembraneArea)} m² (incl. overhang)`, qty: round(roofMembraneArea), unit: 'm²' })
  }
  if (wallMembraneArea > 0) {
    lines.push({ category: 'Membrane & covering', label: 'Breather membrane (walls)', spec: `${round(wallMembraneArea)} m²`, qty: round(wallMembraneArea), unit: 'm²' })
  }
  if (roofingArea > 0) {
    const label = config.roof.covering === 'shingles' ? 'Asphalt shingles' : 'Metal roof sheeting'
    lines.push({ category: 'Membrane & covering', label, spec: `${round(roofingArea)} m² (incl. overhang)`, qty: round(roofingArea), unit: 'm²' })
  }
  if (claddingArea > 0) {
    const label = config.walls.facadeType === 'metal' ? 'Facade — corrugated metal' : 'Facade — timber cladding'
    lines.push({ category: 'Membrane & covering', label, spec: `${round(claddingArea)} m²`, qty: round(claddingArea), unit: 'm²' })
  }
  return lines
}

function foundationLine(model: ShedModel): BomLine {
  return { category: 'Foundation', label: 'Piles', spec: `${model.piles.length} positions`, qty: model.piles.length, unit: 'pcs' }
}

function fastenerLines(model: ShedModel, config: ShedConfig): BomLine[] {
  const f = config.fasteners
  const counts = new Map<string, number>()
  const adhesive = new Map<string, number>()
  const bump = (specId: string, n: number) => counts.set(specId, (counts.get(specId) ?? 0) + n)

  for (const panel of model.panels) {
    if (panel.kind !== 'osb-floor' && panel.kind !== 'osb-wall' && panel.kind !== 'osb-roof') continue
    const perimeterMm = 2 * (length(panel.u) + length(panel.v))
    const areaMm2 = panel.area * 1e6
    const n = perimeterMm / f.sheathing.perimeterSpacing + areaMm2 / (f.sheathing.fieldSpacing ** 2)
    bump(f.sheathing.specId, Math.ceil(n))
  }

  const claddingArea = model.panels.filter((p) => p.kind === 'cladding').reduce((s, p) => s + p.area, 0)
  bump(f.cladding.specId, Math.ceil((claddingArea * 1e6) / (f.cladding.spacing * 600)))

  const battenMm = model.members.filter((m) => m.role === 'batten').reduce((s, m) => s + m.length, 0)
  bump(f.batten.specId, Math.ceil(battenMm / f.batten.spacing))

  bump(f.framing.specId, model.joints.framingJoints * f.framing.perJoint)
  bump(f.joistHanger.specId, model.joints.joistEnds * f.joistHanger.perEnd)
  bump(f.rafterFixing.specId, model.joints.rafterEnds * f.rafterFixing.perEnd)
  bump(f.postAnchor.specId, model.piles.length * f.postAnchor.perPile)

  const coveringArea = model.panels.filter((p) => p.kind === 'roofing').reduce((s, p) => s + p.area, 0)
  if (f.roofCovering.kind === 'adhesiveLitresPerSqm') {
    adhesive.set(f.roofCovering.specId, (adhesive.get(f.roofCovering.specId) ?? 0) + coveringArea * f.roofCovering.ratePerSqm)
  } else {
    bump(f.roofCovering.specId, Math.ceil(coveringArea * f.roofCovering.ratePerSqm))
  }

  const lines: BomLine[] = []
  for (const [specId, qty] of counts) {
    lines.push({ category: 'Fasteners', label: fastenerLabel(config, specId), spec: `${qty} pcs`, qty, unit: 'pcs' })
  }
  for (const [specId, litres] of adhesive) {
    lines.push({ category: 'Fasteners', label: fastenerLabel(config, specId), spec: `${round(litres)} L`, qty: round(litres), unit: 'L' })
  }
  return lines.sort((a, b) => a.label.localeCompare(b.label))
}

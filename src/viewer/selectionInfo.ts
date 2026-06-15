import type { ShedConfig } from '../config/types'
import { findProfile } from '../config/profiles'
import { materialSpecs } from '../model/materials'
import type { Member, Panel, Piece, Pile } from '../model/types'
import { ROLE_LABELS } from '../ui/labels'

export interface SelectionInfo {
  title: string
  rows: [string, string][]
}

const mm = (n: number): string => `${Math.round(n)} mm`
const sqm = (n: number): string => `${n.toFixed(2)} m²`

export function memberInfo(m: Member, config: ShedConfig): SelectionInfo {
  const profile = findProfile(config.profiles, m.profileId)
  return {
    title: ROLE_LABELS[m.role] ?? m.role,
    rows: [
      ['Profile', profile.label],
      ['Section', `${m.thickness}×${m.width} mm`],
      ['Length', mm(m.length)],
    ],
  }
}

function bbox(p: Piece): { w: number; h: number } {
  const us = p.uv.map((c) => c.u)
  const vs = p.uv.map((c) => c.v)
  return { w: Math.max(...us) - Math.min(...us), h: Math.max(...vs) - Math.min(...vs) }
}

export function pieceInfo(p: Piece, config: ShedConfig): SelectionInfo {
  const { w, h } = bbox(p)
  return {
    title: materialSpecs(config)[p.materialId].label,
    rows: [
      ['Size', `${Math.round(w)}×${Math.round(h)} mm`],
      ['Area', sqm(p.usedArea)],
    ],
  }
}

export function panelInfo(p: Panel): SelectionInfo {
  return { title: 'Soffit', rows: [['Area', sqm(p.area)]] }
}

export function pileInfo(p: Pile): SelectionInfo {
  return {
    title: 'Foundation pile',
    rows: [
      ['Size', `${p.size}×${p.size} mm`],
      ['Height', mm(p.top - p.bottom)],
    ],
  }
}

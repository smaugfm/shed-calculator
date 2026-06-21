import type { ShedConfig } from '../config/types'
import { DEFAULT_PROFILE_LENGTH, findProfile } from '../config/profiles'
import type { Piece, ShedModel } from '../model/types'
import { packLengths, packSheets } from '../model/nesting'

export interface Waste {
  offcutCost: number // ₴ of timber + OSB cut-off (offcut × unit price)
  boughtCost: number // ₴ of all timber + OSB bought
  fraction: number // offcutCost / boughtCost — the optimizer objective (scale-invariant, no shrink bias)
  timberOffcutM: number
  osbOffcutM2: number
}

function bbox(p: Piece): { w: number; h: number } {
  const us = p.uv.map((c) => c.u)
  const vs = p.uv.map((c) => c.v)
  return { w: Math.max(...us) - Math.min(...us), h: Math.max(...vs) - Math.min(...vs) }
}

// Timber + OSB cut-off, mirroring the BOM nesting, valued with config.prices. The optimizer minimises
// `fraction` (waste as a share of material spend) — minimising absolute cost would just shrink the shed.
export function cutoffWaste(model: ShedModel, config: ShedConfig): Waste {
  let offcutCost = 0
  let boughtCost = 0
  let timberOffcutM = 0
  let osbOffcutM2 = 0

  const byProfile = new Map<string, number[]>()
  for (const m of model.members) {
    const arr = byProfile.get(m.profileId) ?? []
    arr.push(m.length)
    byProfile.set(m.profileId, arr)
  }
  for (const [profileId, lengths] of byProfile) {
    const profile = findProfile(config.profiles, profileId)
    const stock = profile.length > 0 ? profile.length : DEFAULT_PROFILE_LENGTH
    const boards = packLengths(lengths, stock)
    const usedM = lengths.reduce((s, l) => s + l, 0) / 1000
    const boughtM = (boards * stock) / 1000
    const offcutM = boughtM - usedM
    const price = config.prices[`timber:${profileId}`] ?? 0
    timberOffcutM += offcutM
    offcutCost += offcutM * price
    boughtCost += boughtM * price
  }

  const sheetArea = (config.stock.sheetWidth * config.stock.sheetHeight) / 1e6
  for (const id of ['osb-floor', 'osb-wall', 'osb-roof'] as const) {
    const group = model.pieces.filter((p) => p.materialId === id)
    if (group.length === 0) continue
    const sheets = packSheets(group.map(bbox), config.stock.sheetWidth, config.stock.sheetHeight, true)
    const bought = sheets * sheetArea
    const used = group.reduce((s, p) => s + p.usedArea, 0)
    const price = config.prices[`sheet:${id}`] ?? 0
    osbOffcutM2 += bought - used
    offcutCost += (bought - used) * price
    boughtCost += bought * price
  }

  return { offcutCost, boughtCost, fraction: boughtCost > 0 ? offcutCost / boughtCost : 0, timberOffcutM, osbOffcutM2 }
}

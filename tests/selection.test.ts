import { describe, expect, it } from 'vitest'
import { defaultConfig } from '../src/config/defaults'
import { buildModel } from '../src/model/build'
import { findProfile } from '../src/config/profiles'
import { memberInfo, pieceInfo, pileInfo } from '../src/viewer/selectionInfo'

const cfg = defaultConfig()
const model = buildModel(cfg)

describe('selection info', () => {
  it('describes a member by role, profile, section and length', () => {
    const stud = model.members.find((m) => m.role === 'stud')!
    const profile = findProfile(cfg.profiles, stud.profileId)
    const info = memberInfo(stud, cfg)
    expect(info.title).toBe('Wall stud')
    expect(info.rows).toContainEqual(['Profile', profile.label])
    expect(info.rows).toContainEqual(['Section', `${stud.thickness}×${stud.width} mm`])
    expect(info.rows.find(([k]) => k === 'Length')![1]).toMatch(/ mm$/)
  })

  it('describes a piece by material, size and area', () => {
    const osb = model.pieces.find((p) => p.materialId === 'osb-wall')!
    const info = pieceInfo(osb, cfg)
    expect(info.title).toContain('OSB')
    expect(info.rows.find(([k]) => k === 'Size')![1]).toMatch(/×.* mm$/)
    expect(info.rows.find(([k]) => k === 'Area')![1]).toMatch(/ m²$/)
  })

  it('describes a pile', () => {
    const info = pileInfo(model.piles[0])
    expect(info.title).toBe('Foundation pile')
    expect(info.rows.length).toBe(2)
  })
})

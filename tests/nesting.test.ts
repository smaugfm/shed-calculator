import { describe, expect, it } from 'vitest'
import { packLengths, packSheets, type Part } from '../src/model/nesting'

const SHEET_W = 1200
const SHEET_H = 2400
const sheetArea = SHEET_W * SHEET_H

function lowerBound(parts: Part[]): number {
  return Math.ceil(parts.reduce((s, p) => s + p.w * p.h, 0) / sheetArea)
}

describe('packSheets (2D guillotine)', () => {
  it('uses one sheet per full-size part', () => {
    const parts: Part[] = Array.from({ length: 5 }, () => ({ w: SHEET_W, h: SHEET_H }))
    expect(packSheets(parts, SHEET_W, SHEET_H, true)).toBe(5)
  })

  it('packs four quarter-sheets into a single sheet', () => {
    const parts: Part[] = Array.from({ length: 4 }, () => ({ w: SHEET_W / 2, h: SHEET_H / 2 }))
    expect(packSheets(parts, SHEET_W, SHEET_H, true)).toBe(1)
  })

  it('never goes below the area lower bound', () => {
    const parts: Part[] = Array.from({ length: 30 }, (_, i) => ({ w: 300 + (i % 4) * 150, h: 400 + (i % 3) * 200 }))
    const sheets = packSheets(parts, SHEET_W, SHEET_H, true)
    expect(sheets).toBeGreaterThanOrEqual(lowerBound(parts))
  })

  it('rotation helps fit (rotated parts use fewer sheets)', () => {
    // 2400×600 parts only fit when rotated to 600×2400.
    const parts: Part[] = Array.from({ length: 2 }, () => ({ w: 2400, h: 600 }))
    expect(packSheets(parts, SHEET_W, SHEET_H, true)).toBe(1)
    expect(packSheets(parts, SHEET_W, SHEET_H, false)).toBe(2)
  })

  it('is deterministic', () => {
    const parts: Part[] = Array.from({ length: 20 }, (_, i) => ({ w: 200 + i * 37, h: 300 + i * 53 }))
    expect(packSheets(parts, SHEET_W, SHEET_H, true)).toBe(packSheets(parts, SHEET_W, SHEET_H, true))
  })
})

describe('packLengths (1D)', () => {
  it('packs three 1000s and a 600 into one 3600 board', () => {
    expect(packLengths([1000, 1000, 1000, 600], 3600)).toBe(1)
  })

  it('opens a second board when full', () => {
    expect(packLengths([2000, 2000], 3600)).toBe(2)
  })

  it('never below the length lower bound', () => {
    const lengths = [3000, 2500, 1800, 1200, 900, 600]
    const total = lengths.reduce((s, l) => s + l, 0)
    expect(packLengths(lengths, 3600)).toBeGreaterThanOrEqual(Math.ceil(total / 3600))
  })

  it('splits an item longer than the stock across boards (no negative offcut)', () => {
    expect(packLengths([6300], 4800)).toBe(2) // 6.3 m fascia from two 4.8 m boards
    expect(packLengths([10000], 4800)).toBe(3)
    const boards = packLengths([6300, 4350, 6300, 4350], 4800)
    expect(boards * 4800).toBeGreaterThanOrEqual(6300 + 4350 + 6300 + 4350)
  })
})

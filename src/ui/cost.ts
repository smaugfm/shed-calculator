import type { BillOfMaterials } from '../bom/types'

export function formatMoney(n: number, currency: string): string {
  return `${currency}${n.toFixed(2)}`
}

// Compact form for per-line costs: ₴1.5k for thousands, whole numbers below that.
export function formatMoneyK(n: number, currency: string): string {
  if (Math.abs(n) >= 1000) return `${currency}${(n / 1000).toFixed(1)}k`
  return `${currency}${n.toFixed(0)}`
}

export function bomTotal(bom: BillOfMaterials): number {
  return bom.reduce((s, l) => s + l.cost, 0)
}

import type { BillOfMaterials } from '../bom/types'

export function formatMoney(n: number, currency: string): string {
  return `${currency}${n.toFixed(2)}`
}

export function bomTotal(bom: BillOfMaterials): number {
  return bom.reduce((s, l) => s + l.cost, 0)
}

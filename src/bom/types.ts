export type BomCategory = 'Timber' | 'Sheets' | 'Insulation' | 'Membrane & covering' | 'Foundation' | 'Fasteners'

export type PriceUnit = 'm' | 'm²' | 'pc' | 'L'

export interface BomLine {
  category: BomCategory
  label: string
  spec: string
  qty: number // purchase count (boards / sheets / rolls / pcs) — shown in the spec
  unit: string
  priceKey: string // stable id the unit price is stored under (config.prices)
  billQty: number // amount the unit price applies to, in `priceUnit`
  priceUnit: PriceUnit // m (linear timber), m² (sheets/skins), pc (counts), L (adhesive)
  unitPrice: number // price per `priceUnit`
  cost: number // billQty × unitPrice
}

export type BillOfMaterials = BomLine[]

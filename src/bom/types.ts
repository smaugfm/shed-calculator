export type BomCategory = 'Timber' | 'Sheets' | 'Insulation' | 'Membrane & covering' | 'Foundation' | 'Fasteners'

export interface BomLine {
  category: BomCategory
  label: string
  spec: string
  qty: number
  unit: string
  priceKey: string // stable id the unit price is stored under (config.prices)
  unitPrice: number // price per `unit`
  cost: number // qty × unitPrice
}

export type BillOfMaterials = BomLine[]

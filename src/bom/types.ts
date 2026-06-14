export type BomCategory = 'Timber' | 'Sheets' | 'Insulation' | 'Membrane & covering' | 'Foundation' | 'Fasteners'

export interface BomLine {
  category: BomCategory
  label: string
  spec: string
  qty: number
  unit: string
}

export type BillOfMaterials = BomLine[]

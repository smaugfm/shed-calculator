import type { BillOfMaterials, BomCategory } from '../bom/types'

const CATEGORY_ORDER: BomCategory[] = ['Timber', 'Sheets', 'Membrane & covering', 'Foundation', 'Fasteners']

export function BomTable({ bom }: { bom: BillOfMaterials }) {
  return (
    <div className="bom-panel">
      <h2>Bill of materials</h2>
      {CATEGORY_ORDER.map((category) => {
        const lines = bom.filter((l) => l.category === category)
        if (lines.length === 0) return null
        return (
          <div key={category} className="bom-group">
            <h3>{category}</h3>
            <table>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={`${category}-${i}`}>
                    <td className="bom-label">{line.label}</td>
                    <td className="bom-spec">{line.spec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

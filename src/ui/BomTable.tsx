import { useState } from 'react'
import type { BillOfMaterials, BomCategory } from '../bom/types'
import type { ShedConfig } from '../config/types'
import { NumberInput } from './fields'
import { PricesDialog } from './PricesDialog'
import { OptimizerDialog } from './OptimizerDialog'
import { bomTotal, formatMoney, formatMoneyK } from './cost'

const CATEGORY_ORDER: BomCategory[] = ['Timber', 'Sheets', 'Insulation', 'Membrane & covering', 'Foundation', 'Fasteners']

interface Props {
  bom: BillOfMaterials
  config: ShedConfig
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
}

export function BomTable({ bom, config, setConfig }: Props) {
  const currency = config.currency
  const [editing, setEditing] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const setPrice = (key: string, value: number) => setConfig((c) => ({ ...c, prices: { ...c.prices, [key]: value } }))

  return (
    <div className="bom-panel">
      {editing && <PricesDialog bom={bom} currency={currency} setConfig={setConfig} onClose={() => setEditing(false)} />}
      {optimizing && <OptimizerDialog config={config} currency={currency} setConfig={setConfig} onClose={() => setOptimizing(false)} />}
      <div className="bom-head">
        <h2>Bill of materials</h2>
        <div className="bom-head-actions">
          <button className="add-btn" onClick={() => setOptimizing(true)}>
            Optimize cut-off…
          </button>
          <button className="add-btn" onClick={() => setEditing(true)}>
            Edit costs…
          </button>
        </div>
      </div>
      {CATEGORY_ORDER.map((category) => {
        const lines = bom.filter((l) => l.category === category)
        if (lines.length === 0) return null
        return (
          <div key={category} className="bom-group">
            <h3>{category}</h3>
            <table>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.priceKey}>
                    <td className="bom-label">
                      {line.label}
                      <div className="bom-spec">{line.spec}</div>
                    </td>
                    <td className="bom-price">
                      <span className="bom-price-edit" title={`Price per ${line.priceUnit}`}>
                        <em>{currency}</em>
                        <NumberInput value={line.unitPrice} min={0} step={1} onChange={(v) => setPrice(line.priceKey, v)} />
                        <em>/{line.priceUnit}</em>
                      </span>
                      <div className="bom-cost" title={formatMoney(line.cost, currency)}>
                        {formatMoneyK(line.cost, currency)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
      <div className="bom-total">
        <span>Total</span>
        <span>{formatMoney(bomTotal(bom), currency)}</span>
      </div>
    </div>
  )
}

import type { ShedConfig } from '../config/types'
import type { BillOfMaterials } from '../bom/types'
import { NumberInput, SelectRow, type Option } from './fields'
import { bomTotal, formatMoney } from './cost'
import { Modal } from './Modal'

const CURRENCIES: Option[] = [
  { value: '£', label: 'British Pound (£)' },
  { value: '$', label: 'US Dollar ($)' },
  { value: '€', label: 'Euro (€)' },
  { value: '¥', label: 'Yen / Yuan (¥)' },
  { value: '₴', label: 'Ukrainian Hryvnia (₴)' },
  { value: 'zł', label: 'Polish Złoty (zł)' },
  { value: 'kr', label: 'Krona / Krone (kr)' },
  { value: 'Fr', label: 'Swiss Franc (Fr)' },
]

interface Props {
  bom: BillOfMaterials
  currency: string
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
  onClose: () => void
}

export function PricesDialog({ bom, currency, setConfig, onClose }: Props) {
  const setPrice = (key: string, value: number) => setConfig((c) => ({ ...c, prices: { ...c.prices, [key]: value } }))
  const setCurrency = (value: string) => setConfig((c) => ({ ...c, currency: value }))
  // Keep a custom (typed) symbol selectable in the dropdown.
  const currencyOptions = CURRENCIES.some((o) => o.value === currency) ? CURRENCIES : [{ value: currency, label: `Custom (${currency})` }, ...CURRENCIES]

  return (
    <Modal title="Edit costs" onClose={onClose}>
      <SelectRow label="Currency" value={currency} options={currencyOptions} onChange={setCurrency} />
      <label className="row">
        <span>Custom symbol</span>
        <input value={currency} maxLength={4} style={{ width: 60, textAlign: 'center' }} onChange={(e) => setCurrency(e.target.value)} />
      </label>
      <table className="prices-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {bom.map((line) => (
            <tr key={line.priceKey}>
              <td className="prices-label">{line.label}</td>
              <td className="prices-qty">
                {line.billQty} {line.priceUnit}
              </td>
              <td className="prices-price">
                <NumberInput value={line.unitPrice} min={0} step={1} onChange={(v) => setPrice(line.priceKey, v)} />
                <em>
                  {currency}/{line.priceUnit}
                </em>
              </td>
              <td className="prices-cost">{formatMoney(line.cost, currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="prices-label">Total</td>
            <td></td>
            <td></td>
            <td className="prices-cost">{formatMoney(bomTotal(bom), currency)}</td>
          </tr>
        </tfoot>
      </table>
    </Modal>
  )
}

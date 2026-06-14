import { useState, type ReactNode } from 'react'
import { Millimetres } from '../config/types.ts'

export function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  )
}

const MAX_VALUE: Millimetres = 50_000 // mm (50 m) — sane upper bound for any dimension/spacing

export function NumberRow({
  label,
  value,
  onChange,
  step = 10,
  min = 0,
  max = MAX_VALUE,
  suffix = 'mm',
  validate,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  validate?: (v: number) => string | undefined // extra cross-field check; returns an error message
}) {
  // Invalid input (out of [min, max] or failing `validate`) is held as a local draft and NOT
  // committed upstream, so the config (and thus the model / localStorage) only ever sees valid
  // values. An uncommitted draft reverts to the last valid value on blur.
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(value)

  const checkError = (n: number): string | undefined => {
    if (n < min) return `Must be ≥ ${min}`
    if (n > max) return `Must be ≤ ${max}`
    return validate?.(n)
  }
  const error = draft !== null && draft !== '' && !Number.isNaN(Number(draft)) ? checkError(Number(draft)) : undefined

  const handle = (raw: string) => {
    setDraft(raw)
    if (raw === '') return
    const n = Number(raw)
    if (Number.isNaN(n) || checkError(n)) return
    onChange(n)
    setDraft(null)
  }

  return (
    <label className={error ? 'row invalid' : 'row'}>
      <span>{label}</span>
      <span className="input-wrap">
        <input
          type="number"
          value={shown}
          step={step}
          min={min}
          max={max}
          aria-invalid={error ? true : undefined}
          title={error}
          onChange={(e) => handle(e.target.value)}
          onBlur={() => setDraft(null)}
        />
        <em>{suffix}</em>
        {error && <span className="field-error">{error}</span>}
      </span>
    </label>
  )
}

export function CheckboxRow({
  label,
  checked,
  onChange,
  disabled = false,
  title,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  title?: string
}) {
  return (
    <label className="row" title={title} style={disabled ? { opacity: 0.5 } : undefined}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export interface Option {
  value: string
  label: string
}

export function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: Option[]; onChange: (v: string) => void }) {
  return (
    <label className="row">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

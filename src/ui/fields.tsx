import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Millimetres } from '../config/types'

export function Section({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  )
}

const MAX_VALUE: Millimetres = 50_000 // mm (50 m) — sane upper bound for any dimension/spacing
const DEBOUNCE_MS = 250

interface NumberFieldOpts {
  min?: number
  max?: number
  validate?: (v: number) => string | undefined // extra cross-field check; returns an error message
}

// Shared number-input behaviour: the typed value is held as a local draft (so it can be invalid
// mid-edit) and only committed upstream — debounced — once it's valid and within [min, max].
// So the config (model / localStorage) only ever sees valid values, and doesn't churn per keystroke.
// An uncommitted draft reverts to the last valid value on blur (a valid pending one is flushed).
function useNumberField(value: number, onChange: (v: number) => void, { min = 0, max = MAX_VALUE, validate }: NumberFieldOpts) {
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => clear, [])

  const checkError = (n: number): string | undefined => {
    if (n < min) return `Must be ≥ ${min}`
    if (n > max) return `Must be ≤ ${max}`
    return validate?.(n)
  }
  const shown = draft ?? String(value)
  const error = draft !== null && draft !== '' && !Number.isNaN(Number(draft)) ? checkError(Number(draft)) : undefined

  const onInput = (raw: string) => {
    setDraft(raw)
    clear()
    if (raw === '') return
    const n = Number(raw)
    if (Number.isNaN(n) || checkError(n)) return
    timer.current = setTimeout(() => {
      timer.current = null
      onChange(n)
      setDraft(null)
    }, DEBOUNCE_MS)
  }
  const onBlur = () => {
    clear()
    if (draft === null) return
    const n = Number(draft)
    if (draft !== '' && !Number.isNaN(n) && !checkError(n)) onChange(n)
    setDraft(null)
  }
  return { shown, error, min, max, onInput, onBlur }
}

// Bare guarded+debounced number input (no label) for use inside custom layouts (e.g. the profile grid).
export function NumberInput({ value, onChange, step, min, max, validate }: { value: number; onChange: (v: number) => void; step?: number } & NumberFieldOpts) {
  const f = useNumberField(value, onChange, { min, max, validate })
  return (
    <input
      type="number"
      value={f.shown}
      step={step}
      min={f.min}
      max={f.max}
      aria-invalid={f.error ? true : undefined}
      title={f.error}
      onChange={(e) => f.onInput(e.target.value)}
      onBlur={f.onBlur}
    />
  )
}

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
  suffix?: string
} & NumberFieldOpts) {
  const f = useNumberField(value, onChange, { min, max, validate })
  return (
    <label className={f.error ? 'row invalid' : 'row'}>
      <span>{label}</span>
      <span className="input-wrap">
        <input
          type="number"
          value={f.shown}
          step={step}
          min={f.min}
          max={f.max}
          aria-invalid={f.error ? true : undefined}
          title={f.error}
          onChange={(e) => f.onInput(e.target.value)}
          onBlur={f.onBlur}
        />
        <em>{suffix}</em>
        {f.error && <span className="field-error">{f.error}</span>}
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

import { useEffect, useMemo, useState } from 'react'
import type { ShedConfig } from '../config/types'
import { defaultConfig } from '../config/defaults'
import { buildModel } from '../model/build'
import { computeBom } from '../bom/compute'
import type { ShedModel } from '../model/types'
import type { BillOfMaterials } from '../bom/types'

const STORAGE_KEY = 'shed-calculator:config'

export interface ShedState {
  config: ShedConfig
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
  reset: () => void
  model: ShedModel
  bom: BillOfMaterials
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

// Overlay stored values onto defaults, recursing into plain objects so new/missing keys keep
// their defaults (arrays and primitives are replaced wholesale).
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return base
  const out = { ...base } as Record<string, unknown>
  for (const key of Object.keys(base as Record<string, unknown>)) {
    if (!(key in override)) continue
    const b = (base as Record<string, unknown>)[key]
    const o = override[key]
    out[key] = isPlainObject(b) ? deepMerge(b, o) : o
  }
  return out as T
}

function loadConfig(): ShedConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig()
    const parsed = JSON.parse(raw)
    const merged = deepMerge(defaultConfig(), parsed)
    // prices is a dynamic-key map — overlay the stored prices onto the defaults (so new default costs
    // fill in keys the user hasn't set, while their edits win).
    const stored = isPlainObject(parsed) && isPlainObject(parsed.prices) ? (parsed.prices as Record<string, number>) : {}
    merged.prices = { ...defaultConfig().prices, ...stored }
    return merged
  } catch {
    return defaultConfig()
  }
}

export function useShed(): ShedState {
  const [config, setConfigState] = useState<ShedConfig>(loadConfig)
  const model = useMemo(() => buildModel(config), [config])
  const bom = useMemo(() => computeBom(model, config), [model, config])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // ignore quota / serialization errors
    }
  }, [config])

  const setConfig = (updater: (c: ShedConfig) => ShedConfig) => setConfigState((prev) => updater(prev))
  const reset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setConfigState(defaultConfig())
  }
  return { config, setConfig, reset, model, bom }
}

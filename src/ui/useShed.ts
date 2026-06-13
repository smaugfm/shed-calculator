import { useMemo, useState } from 'react'
import type { ShedConfig } from '../config/types'
import { defaultConfig } from '../config/defaults'
import { buildModel } from '../model/build'
import { computeBom } from '../bom/compute'
import type { ShedModel } from '../model/types'
import type { BillOfMaterials } from '../bom/types'

export interface ShedState {
  config: ShedConfig
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
  model: ShedModel
  bom: BillOfMaterials
}

export function useShed(): ShedState {
  const [config, setConfigState] = useState<ShedConfig>(() => defaultConfig())
  const model = useMemo(() => buildModel(config), [config])
  const bom = useMemo(() => computeBom(model, config), [model, config])
  const setConfig = (updater: (c: ShedConfig) => ShedConfig) => setConfigState((prev) => updater(prev))
  return { config, setConfig, model, bom }
}

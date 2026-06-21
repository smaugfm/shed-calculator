/// <reference lib="webworker" />
import type { ShedConfig } from '../config/types'
import { optimize, type OptimizeResult, type OptimizeSettings } from './optimize'

export interface OptimizeRequest {
  config: ShedConfig
  settings: OptimizeSettings
}

export type OptimizeMessage = { type: 'progress'; value: number } | { type: 'done'; result: OptimizeResult }

self.onmessage = (e: MessageEvent<OptimizeRequest>) => {
  const { config, settings } = e.data
  const result = optimize(config, settings, (value) => {
    const msg: OptimizeMessage = { type: 'progress', value }
    self.postMessage(msg)
  })
  const msg: OptimizeMessage = { type: 'done', result }
  self.postMessage(msg)
}

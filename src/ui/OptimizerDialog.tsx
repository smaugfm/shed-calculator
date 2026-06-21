import { Fragment, useEffect, useRef, useState } from 'react'
import type { ShedConfig } from '../config/types'
import type { OptimizeMessage, OptimizeRequest } from '../optimizer/optimize.worker'
import type { GroupSetting, OptimizeResult, OptimizeSettings } from '../optimizer/optimize'
import { formatMoney } from './cost'
import { Modal } from './Modal'

interface Props {
  config: ShedConfig
  currency: string
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
  onClose: () => void
}

type Group = 'base' | 'overhangs' | 'openingPositions' | 'windowSizes'

const GROUPS: { key: Group; label: string; pct: number }[] = [
  { key: 'base', label: 'Base dimensions', pct: 10 },
  { key: 'overhangs', label: 'Roof overhangs', pct: 50 },
  { key: 'openingPositions', label: 'Opening positions', pct: 30 },
  { key: 'windowSizes', label: 'Window sizes', pct: 30 },
]

const initialSettings = (): Record<Group, GroupSetting> =>
  Object.fromEntries(GROUPS.map((g) => [g.key, { enabled: true, pct: g.pct }])) as Record<Group, GroupSetting>

export function OptimizerDialog({ config, currency, setConfig, onClose }: Props) {
  const [settings, setSettings] = useState<Record<Group, GroupSetting>>(initialSettings)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [budgetMs, setBudgetMs] = useState(10000)
  const [downsizeBase, setDownsizeBase] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => () => workerRef.current?.terminate(), [])

  const update = (key: Group, patch: Partial<GroupSetting>) => setSettings((s) => ({ ...s, [key]: { ...s[key], ...patch } }))

  const run = () => {
    workerRef.current?.terminate()
    const worker = new Worker(new URL('../optimizer/optimize.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    setPhase('running')
    setProgress(0)
    setResult(null)
    worker.onmessage = (e: MessageEvent<OptimizeMessage>) => {
      const msg = e.data
      if (msg.type === 'progress') setProgress(msg.value)
      else {
        setResult(msg.result)
        setPhase('done')
        worker.terminate()
      }
    }
    const req: OptimizeRequest = { config, settings: { ...settings, downsizeBase, budgetMs } as OptimizeSettings }
    worker.postMessage(req)
  }

  const apply = () => {
    if (result) setConfig(() => result.config)
    onClose()
  }

  const pct = (f: number) => `${(f * 100).toFixed(1)}%`
  const savedPts = result ? (result.baselineWaste - result.optimizedWaste) * 100 : 0

  return (
    <Modal title="Optimize cut-off" onClose={onClose}>
      <p className="opt-hint">Vary these parameters by up to the given % to minimise the timber + OSB cut-off waste % (cost-weighted).</p>
      {GROUPS.map((g) => (
        <Fragment key={g.key}>
          <label className="row">
            <span>
              <input type="checkbox" checked={settings[g.key].enabled} onChange={(e) => update(g.key, { enabled: e.target.checked })} /> {g.label}
            </span>
            <span className="input-wrap">
              <input
                type="number"
                value={settings[g.key].pct}
                min={0}
                max={100}
                disabled={!settings[g.key].enabled}
                onChange={(e) => update(g.key, { pct: Number(e.target.value) })}
              />
              <em>%</em>
            </span>
          </label>
          {g.key === 'base' && (
            <label className="row" style={{ paddingLeft: 18 }}>
              <span>
                <input type="checkbox" checked={downsizeBase} disabled={!settings.base.enabled} onChange={(e) => setDownsizeBase(e.target.checked)} /> Only
                downsize
              </span>
            </label>
          )}
        </Fragment>
      ))}

      <label className="row">
        <span>Search time</span>
        <span className="input-wrap">
          <input
            type="range"
            min={500}
            max={10000}
            step={500}
            value={budgetMs}
            disabled={phase === 'running'}
            onChange={(e) => setBudgetMs(Number(e.target.value))}
          />
          <em>{(budgetMs / 1000).toFixed(1)} s</em>
        </span>
      </label>

      {phase === 'running' && (
        <div className="opt-progress" aria-label="optimizing">
          <div className="opt-progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}

      {phase === 'done' && result && (
        <div className="opt-result">
          <div className="opt-summary">
            <span>Waste</span>
            <span>
              {pct(result.baselineWaste)} → <strong>{pct(result.optimizedWaste)}</strong>
              {savedPts > 0.05 ? <em className="opt-saving"> −{savedPts.toFixed(1)} pts</em> : ''}
            </span>
          </div>
          <div className="opt-summary">
            <span>Cut-off cost</span>
            <span>
              {formatMoney(result.baselineCost, currency)} → {formatMoney(result.optimizedCost, currency)}
            </span>
          </div>
          {result.changes.length === 0 ? (
            <p className="opt-hint">No improvement found within these bounds — already near-optimal.</p>
          ) : (
            <table className="prices-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>From</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {result.changes.map((c) => (
                  <tr key={c.label}>
                    <td className="prices-label">{c.label}</td>
                    <td className="prices-qty">{c.from} mm</td>
                    <td className="prices-cost">{c.to} mm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="opt-actions">
        <button className="add-btn" disabled={phase === 'running'} onClick={run}>
          {phase === 'idle' ? 'Optimize' : 'Re-run'}
        </button>
        <button className="add-btn" disabled={phase !== 'done' || !result || result.changes.length === 0} onClick={apply}>
          Apply
        </button>
      </div>
    </Modal>
  )
}

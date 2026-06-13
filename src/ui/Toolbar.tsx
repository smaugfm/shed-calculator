import type { PresetName, ShedConfig } from '../config/types'
import { applyPreset } from '../config/presets'

interface Props {
  config: ShedConfig
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
  rulerActive: boolean
  onToggleRuler: () => void
  onExport: () => void
  onReset: () => void
}

export function Toolbar({ config, setConfig, rulerActive, onToggleRuler, onExport, onReset }: Props) {
  return (
    <div className="toolbar">
      <div className="brand">Shed Calculator</div>

      <label className="toolbar-field">
        Preset
        <select
          value={config.preset}
          onChange={(e) => {
            const preset = e.target.value as PresetName
            if (preset === 'custom') return
            setConfig((c) => applyPreset(c, preset))
          }}
        >
          <option value="light">Light</option>
          <option value="normal">Normal</option>
          <option value="heavy">Heavy duty</option>
          <option value="custom">Custom</option>
        </select>
      </label>

      <button className={rulerActive ? 'active' : ''} onClick={onToggleRuler}>
        📏 Ruler
      </button>

      <button className="export-btn" onClick={onExport}>
        ⬇ Export .glb
      </button>

      <button onClick={() => { if (confirm('Reset all configuration to defaults?')) onReset() }}>
        ↺ Reset
      </button>
    </div>
  )
}

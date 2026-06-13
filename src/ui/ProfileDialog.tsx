import { useState } from 'react'
import type { ShedConfig, StructuralRole, TimberProfile } from '../config/types'
import { ROLE_LABELS } from './labels'

interface Props {
  config: ShedConfig
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
  onClose: () => void
}

export function ProfileDialog({ config, setConfig, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)

  const rolesUsing = (id: string): StructuralRole[] => (Object.keys(config.roles) as StructuralRole[]).filter((r) => config.roles[r] === id)

  const update = (id: string, patch: Partial<TimberProfile>) =>
    setConfig((c) => ({ ...c, preset: 'custom', profiles: c.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))

  const remove = (p: TimberProfile) => {
    const used = rolesUsing(p.id)
    if (used.length > 0) {
      setError(`Can't remove "${p.label}" — it's assigned to: ${used.map((r) => ROLE_LABELS[r]).join(', ')}. Reassign those roles to another profile first.`)
      return
    }
    setError(null)
    setConfig((c) => ({ ...c, profiles: c.profiles.filter((x) => x.id !== p.id) }))
  }

  const add = () =>
    setConfig((c) => ({
      ...c,
      profiles: [...c.profiles, { id: `custom-${Date.now()}`, label: 'New profile', thickness: 45, width: 95 }],
    }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Timber profiles</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        {error && <div className="modal-error">{error}</div>}
        <div className="profile-cols">
          <span>Label</span>
          <span>Thickness</span>
          <span></span>
          <span>Width</span>
          <span></span>
        </div>
        <div className="profile-list">
          {config.profiles.map((p) => {
            const used = rolesUsing(p.id)
            return (
              <div key={p.id} className="profile-row">
                <input value={p.label} onChange={(e) => update(p.id, { label: e.target.value })} />
                <input type="number" min={1} value={p.thickness} onChange={(e) => update(p.id, { thickness: Number(e.target.value) })} />
                <span>×</span>
                <input type="number" min={1} value={p.width} onChange={(e) => update(p.id, { width: Number(e.target.value) })} />
                <button className="remove-btn" disabled={used.length > 0} title={used.length > 0 ? `Used by ${used.map((r) => ROLE_LABELS[r]).join(', ')}` : 'Remove profile'} onClick={() => remove(p)}>
                  Remove
                </button>
              </div>
            )
          })}
        </div>
        <button className="add-btn" onClick={add}>
          + Add profile
        </button>
      </div>
    </div>
  )
}

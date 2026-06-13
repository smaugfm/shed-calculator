import type { FacadeType, Opening, OpeningType, RoofCovering, ShedConfig, StructuralRole, WallSide } from '../config/types'
import { deriveSpacing } from '../config/defaults'
import { NumberRow, Section, SelectRow, type Option } from './fields'

interface Props {
  config: ShedConfig
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
}

const ROLE_LABELS: Record<StructuralRole, string> = {
  gradeBeam: 'Grade beam / bearer',
  joist: 'Floor joist',
  rafter: 'Roof rafter',
  stud: 'Wall stud',
  plate: 'Wall plate',
  header: 'Opening header',
  batten: 'Batten',
}

const FACADE_OPTIONS: Option[] = [
  { value: 'cladding', label: 'Timber cladding' },
  { value: 'metal', label: 'Corrugated metal' },
]

const PLATE_COUNT_OPTIONS: Option[] = [
  { value: '1', label: 'Single' },
  { value: '2', label: 'Double' },
]

const WALL_OPTIONS: Option[] = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

const OPENING_TYPE_OPTIONS: Option[] = [
  { value: 'door', label: 'Door' },
  { value: 'window', label: 'Window' },
]

export function ConfigPanel({ config, setConfig }: Props) {
  const profileOptions: Option[] = config.profiles.map((p) => ({ value: p.id, label: p.label }))
  const fastenerOptions: Option[] = config.fasteners.catalog.map((f) => ({ value: f.id, label: f.label }))

  const markCustom = (c: ShedConfig): ShedConfig => ({ ...c, preset: 'custom' })

  return (
    <div className="config-panel">
      <Section title="Dimensions" open>
        <NumberRow label="Base width" value={config.base.width} onChange={(v) => setConfig((c) => markCustom({ ...c, base: { ...c.base, width: v } }))} />
        <NumberRow label="Base depth" value={config.base.depth} onChange={(v) => setConfig((c) => markCustom({ ...c, base: { ...c.base, depth: v } }))} />
        <NumberRow label="Eave height (low)" value={config.heights.min} onChange={(v) => setConfig((c) => ({ ...c, heights: { ...c.heights, min: v } }))} />
        <NumberRow label="Eave height (high)" value={config.heights.max} onChange={(v) => setConfig((c) => ({ ...c, heights: { ...c.heights, max: v } }))} />
      </Section>

      <Section title="Foundation (piles)">
        <NumberRow label="Piles across width" value={config.foundation.countX} step={1} min={1} suffix="pcs" onChange={(v) => setConfig((c) => ({ ...c, foundation: { ...c.foundation, countX: Math.max(1, v), spacingX: deriveSpacing(c.base.width, Math.max(1, v)) } }))} />
        <NumberRow label="Piles across depth" value={config.foundation.countY} step={1} min={1} suffix="pcs" onChange={(v) => setConfig((c) => ({ ...c, foundation: { ...c.foundation, countY: Math.max(1, v), spacingY: deriveSpacing(c.base.depth, Math.max(1, v)) } }))} />
        <NumberRow label="Spacing X" value={config.foundation.spacingX} onChange={(v) => setConfig((c) => ({ ...c, foundation: { ...c.foundation, spacingX: v } }))} />
        <NumberRow label="Spacing Y" value={config.foundation.spacingY} onChange={(v) => setConfig((c) => ({ ...c, foundation: { ...c.foundation, spacingY: v } }))} />
      </Section>

      <Section title="Floor">
        <NumberRow label="Joist spacing" value={config.floor.joistSpacing} onChange={(v) => setConfig((c) => markCustom({ ...c, floor: { ...c.floor, joistSpacing: v } }))} />
        <NumberRow label="OSB deck thickness" value={config.floor.deckThickness} step={1} onChange={(v) => setConfig((c) => ({ ...c, floor: { ...c.floor, deckThickness: v } }))} />
      </Section>

      <Section title="Walls">
        <NumberRow label="Stud spacing" value={config.walls.studSpacing} onChange={(v) => setConfig((c) => markCustom({ ...c, walls: { ...c.walls, studSpacing: v } }))} />
        <NumberRow label="OSB thickness" value={config.walls.osbThickness} step={1} onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, osbThickness: v } }))} />
        <SelectRow label="Facade" value={config.walls.facadeType} options={FACADE_OPTIONS} onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, facadeType: v as FacadeType } }))} />
        <SelectRow label="Bottom plate" value={String(config.walls.bottomPlateCount)} options={PLATE_COUNT_OPTIONS} onChange={(v) => setConfig((c) => markCustom({ ...c, walls: { ...c.walls, bottomPlateCount: Number(v) as 1 | 2 } }))} />
        <SelectRow label="Top plate" value={String(config.walls.topPlateCount)} options={PLATE_COUNT_OPTIONS} onChange={(v) => setConfig((c) => markCustom({ ...c, walls: { ...c.walls, topPlateCount: Number(v) as 1 | 2 } }))} />
      </Section>

      <Section title="Roof (mono-pitch)">
        <SelectRow label="Covering" value={config.roof.covering} options={[{ value: 'shingles', label: 'Asphalt shingles (EPDM)' }, { value: 'ventilated', label: 'Ventilated roofing' }]} onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, covering: v as RoofCovering } }))} />
        <NumberRow label="Rafter spacing" value={config.roof.rafterSpacing} onChange={(v) => setConfig((c) => markCustom({ ...c, roof: { ...c.roof, rafterSpacing: v } }))} />
        <NumberRow label="OSB thickness" value={config.roof.osbThickness} step={1} onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, osbThickness: v } }))} />
        <NumberRow label="Overhang" value={config.roof.overhang} onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, overhang: v } }))} />
      </Section>

      <Section title="Timber profiles (per role)">
        {(Object.keys(ROLE_LABELS) as StructuralRole[]).map((role) => (
          <SelectRow
            key={role}
            label={ROLE_LABELS[role]}
            value={config.roles[role]}
            options={profileOptions}
            onChange={(v) => setConfig((c) => markCustom({ ...c, roles: { ...c.roles, [role]: v } }))}
          />
        ))}
      </Section>

      <Section title="Openings">
        {config.openings.map((op) => (
          <OpeningEditor key={op.id} opening={op} setConfig={setConfig} />
        ))}
        <button
          className="add-btn"
          onClick={() =>
            setConfig((c) => ({
              ...c,
              openings: [...c.openings, { id: `op-${Date.now()}`, wall: 'front', type: 'window', width: 800, height: 700, sillHeight: 1000, offset: 300 }],
            }))
          }
        >
          + Add opening
        </button>
      </Section>

      <Section title="Fasteners">
        <SelectRow label="Sheathing fixing" value={config.fasteners.sheathing.specId} options={fastenerOptions} onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, sheathing: { ...c.fasteners.sheathing, specId: v } } }))} />
        <NumberRow label="Sheathing perimeter spacing" value={config.fasteners.sheathing.perimeterSpacing} onChange={(v) => setConfig((c) => markCustom({ ...c, fasteners: { ...c.fasteners, sheathing: { ...c.fasteners.sheathing, perimeterSpacing: v } } }))} />
        <NumberRow label="Sheathing field spacing" value={config.fasteners.sheathing.fieldSpacing} onChange={(v) => setConfig((c) => markCustom({ ...c, fasteners: { ...c.fasteners, sheathing: { ...c.fasteners.sheathing, fieldSpacing: v } } }))} />
        <SelectRow label="Cladding fixing" value={config.fasteners.cladding.specId} options={fastenerOptions} onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, cladding: { ...c.fasteners.cladding, specId: v } } }))} />
        <NumberRow label="Cladding spacing" value={config.fasteners.cladding.spacing} onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, cladding: { ...c.fasteners.cladding, spacing: v } } }))} />
        <SelectRow label="Framing fixing" value={config.fasteners.framing.specId} options={fastenerOptions} onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, framing: { ...c.fasteners.framing, specId: v } } }))} />
        <NumberRow label="Framing per joint" value={config.fasteners.framing.perJoint} step={1} min={1} suffix="pcs" onChange={(v) => setConfig((c) => markCustom({ ...c, fasteners: { ...c.fasteners, framing: { ...c.fasteners.framing, perJoint: v } } }))} />
        <SelectRow label="Roof covering fixing" value={config.fasteners.roofCovering.specId} options={fastenerOptions} onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, roofCovering: { ...c.fasteners.roofCovering, specId: v } } }))} />
        <NumberRow label="Roof covering rate / m²" value={config.fasteners.roofCovering.ratePerSqm} step={1} suffix="/m²" onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, roofCovering: { ...c.fasteners.roofCovering, ratePerSqm: v } } }))} />
      </Section>
    </div>
  )
}

function OpeningEditor({ opening, setConfig }: { opening: Opening; setConfig: Props['setConfig'] }) {
  const update = (patch: Partial<Opening>) =>
    setConfig((c) => ({ ...c, openings: c.openings.map((o) => (o.id === opening.id ? { ...o, ...patch } : o)) }))
  const remove = () => setConfig((c) => ({ ...c, openings: c.openings.filter((o) => o.id !== opening.id) }))

  return (
    <div className="opening-editor">
      <div className="opening-head">
        <SelectRow label="Wall" value={opening.wall} options={WALL_OPTIONS} onChange={(v) => update({ wall: v as WallSide })} />
        <SelectRow label="Type" value={opening.type} options={OPENING_TYPE_OPTIONS} onChange={(v) => update({ type: v as OpeningType })} />
      </div>
      <NumberRow label="Width" value={opening.width} onChange={(v) => update({ width: v })} />
      <NumberRow label="Height" value={opening.height} onChange={(v) => update({ height: v })} />
      <NumberRow label="Sill height" value={opening.sillHeight} onChange={(v) => update({ sillHeight: v })} />
      <NumberRow label="Offset along wall" value={opening.offset} onChange={(v) => update({ offset: v })} />
      <button className="remove-btn" onClick={remove}>
        Remove
      </button>
    </div>
  )
}

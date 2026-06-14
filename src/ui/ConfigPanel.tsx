import { useState } from 'react'
import type { FacadeType, OpeningConfig, OpeningType, RoofCovering, ShedConfig, ShingleSpec, StructuralRole, WallSide } from '../config/types'
import { CheckboxRow, NumberRow, Section, SelectRow, type Option } from './fields'
import { ROLE_LABELS } from './labels'
import { ProfileDialog } from './ProfileDialog'

interface Props {
  config: ShedConfig
  setConfig: (updater: (c: ShedConfig) => ShedConfig) => void
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
  const [profilesOpen, setProfilesOpen] = useState(false)
  const maxWall = Math.max(config.base.width, config.base.depth)

  return (
    <div className="config-panel">
      {profilesOpen && <ProfileDialog config={config} setConfig={setConfig} onClose={() => setProfilesOpen(false)} />}
      <Section title="Dimensions" open>
        <NumberRow
          label="Base width"
          value={config.base.width}
          min={1000}
          max={50000}
          onChange={(v) => setConfig((c) => markCustom({ ...c, base: { ...c.base, width: v } }))}
        />
        <NumberRow
          label="Base depth"
          value={config.base.depth}
          min={1000}
          max={50000}
          onChange={(v) => setConfig((c) => markCustom({ ...c, base: { ...c.base, depth: v } }))}
        />
        <NumberRow
          label="Eave height (low)"
          value={config.heights.min}
          min={100}
          max={20000}
          validate={(v) => (v >= config.heights.max ? 'Must be below the high eave' : undefined)}
          onChange={(v) => setConfig((c) => ({ ...c, heights: { ...c.heights, min: v } }))}
        />
        <NumberRow
          label="Eave height (high)"
          value={config.heights.max}
          min={100}
          max={20000}
          validate={(v) => (v <= config.heights.min ? 'Must be above the low eave' : undefined)}
          onChange={(v) => setConfig((c) => ({ ...c, heights: { ...c.heights, max: v } }))}
        />
      </Section>

      <Section title="Foundation (piles)">
        <NumberRow
          label="Piles across width"
          value={config.foundation.countX}
          step={1}
          min={1}
          max={100}
          suffix="pcs"
          onChange={(v) => setConfig((c) => ({ ...c, foundation: { ...c.foundation, countX: v } }))}
        />
        <NumberRow
          label="Piles across depth"
          value={config.foundation.countY}
          step={1}
          min={1}
          max={100}
          suffix="pcs"
          onChange={(v) => setConfig((c) => ({ ...c, foundation: { ...c.foundation, countY: v } }))}
        />
      </Section>

      <Section title="Floor">
        <NumberRow
          label="Joist spacing"
          value={config.floor.joistSpacing}
          min={50}
          max={config.base.width}
          onChange={(v) => setConfig((c) => markCustom({ ...c, floor: { ...c.floor, joistSpacing: v } }))}
        />
        <NumberRow
          label="OSB deck thickness"
          value={config.floor.deckThickness}
          step={1}
          min={1}
          max={100}
          onChange={(v) => setConfig((c) => ({ ...c, floor: { ...c.floor, deckThickness: v } }))}
        />
      </Section>

      <Section title="Walls">
        <NumberRow
          label="Stud spacing"
          value={config.walls.studSpacing}
          min={50}
          max={maxWall}
          onChange={(v) => setConfig((c) => markCustom({ ...c, walls: { ...c.walls, studSpacing: v } }))}
        />
        <NumberRow
          label="Batten spacing"
          value={config.walls.battenSpacing}
          min={50}
          max={maxWall}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, battenSpacing: v } }))}
        />
        <NumberRow
          label="OSB thickness"
          value={config.walls.osbThickness}
          step={1}
          min={1}
          max={100}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, osbThickness: v } }))}
        />
        <SelectRow
          label="Facade"
          value={config.walls.facadeType}
          options={FACADE_OPTIONS}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, facadeType: v as FacadeType } }))}
        />
        <NumberRow
          label="Cladding board width"
          value={config.walls.cladding.width}
          min={20}
          max={5000}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, cladding: { ...c.walls.cladding, width: v } } }))}
        />
        <NumberRow
          label="Cladding board length"
          value={config.walls.cladding.length}
          min={500}
          max={50000}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, cladding: { ...c.walls.cladding, length: v } } }))}
        />
        <NumberRow
          label="OSB sheet width"
          value={config.stock.sheetWidth}
          min={100}
          max={5000}
          onChange={(v) => setConfig((c) => ({ ...c, stock: { ...c.stock, sheetWidth: v } }))}
        />
        <NumberRow
          label="OSB sheet height"
          value={config.stock.sheetHeight}
          min={100}
          max={5000}
          onChange={(v) => setConfig((c) => ({ ...c, stock: { ...c.stock, sheetHeight: v } }))}
        />
        <NumberRow
          label="Membrane roll width"
          value={config.walls.membrane.rollWidth}
          min={100}
          max={5000}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, membrane: { ...c.walls.membrane, rollWidth: v } } }))}
        />
        <NumberRow
          label="Membrane roll length"
          value={config.walls.membrane.rollLength}
          min={1000}
          max={50000}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, membrane: { ...c.walls.membrane, rollLength: v } } }))}
        />
        <NumberRow
          label="Membrane overlap"
          value={config.walls.membrane.overlap}
          min={0}
          max={config.walls.membrane.rollWidth - 50}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, membrane: { ...c.walls.membrane, overlap: v } } }))}
        />
        <CheckboxRow
          label="Insulation"
          checked={config.walls.insulation.enabled}
          title="Mineral-wool rolls in the stud cavity"
          onChange={(b) => setConfig((c) => markCustom({ ...c, walls: { ...c.walls, insulation: { ...c.walls.insulation, enabled: b } } }))}
        />
        <NumberRow
          label="Insulation roll length"
          value={config.walls.insulation.rollLength}
          min={1000}
          max={50000}
          onChange={(v) => setConfig((c) => ({ ...c, walls: { ...c.walls, insulation: { ...c.walls.insulation, rollLength: v } } }))}
        />
        <SelectRow
          label="Bottom plate"
          value={String(config.walls.bottomPlateCount)}
          options={PLATE_COUNT_OPTIONS}
          onChange={(v) => setConfig((c) => markCustom({ ...c, walls: { ...c.walls, bottomPlateCount: Number(v) as 1 | 2 } }))}
        />
        <SelectRow
          label="Top plate"
          value={String(config.walls.topPlateCount)}
          options={PLATE_COUNT_OPTIONS}
          onChange={(v) => setConfig((c) => markCustom({ ...c, walls: { ...c.walls, topPlateCount: Number(v) as 1 | 2 } }))}
        />
      </Section>

      <Section title="Roof (mono-pitch)">
        <SelectRow
          label="Covering"
          value={config.roof.covering}
          options={[
            { value: 'shingles', label: 'Asphalt shingles (EPDM)' },
            { value: 'ventilated', label: 'Ventilated metal' },
          ]}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, covering: v as RoofCovering } }))}
        />
        <CheckboxRow
          label="Battens"
          checked={config.roof.covering === 'ventilated' && config.roof.battens}
          disabled={config.roof.covering !== 'ventilated'}
          title={config.roof.covering !== 'ventilated' ? 'Battens apply to ventilated roofing only' : 'Counter-battens forming the roof vent cavity'}
          onChange={(b) => setConfig((c) => ({ ...c, roof: { ...c.roof, battens: b } }))}
        />
        <NumberRow
          label="Batten spacing"
          value={config.roof.battenSpacing}
          min={50}
          max={config.base.depth}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, battenSpacing: v } }))}
        />
        <NumberRow
          label="Rafter spacing"
          value={config.roof.rafterSpacing}
          min={50}
          max={config.base.width}
          onChange={(v) => setConfig((c) => markCustom({ ...c, roof: { ...c.roof, rafterSpacing: v } }))}
        />
        <NumberRow
          label="OSB thickness"
          value={config.roof.osbThickness}
          step={1}
          min={1}
          max={100}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, osbThickness: v } }))}
        />
        <ShingleRows config={config} setConfig={setConfig} />
        <NumberRow
          label="Membrane roll width"
          value={config.roof.membrane.rollWidth}
          min={100}
          max={5000}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, membrane: { ...c.roof.membrane, rollWidth: v } } }))}
        />
        <NumberRow
          label="Membrane roll length"
          value={config.roof.membrane.rollLength}
          min={1000}
          max={50000}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, membrane: { ...c.roof.membrane, rollLength: v } } }))}
        />
        <NumberRow
          label="Membrane overlap"
          value={config.roof.membrane.overlap}
          min={0}
          max={config.roof.membrane.rollWidth - 50}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, membrane: { ...c.roof.membrane, overlap: v } } }))}
        />
        <CheckboxRow
          label="Insulation"
          checked={config.roof.insulation.enabled}
          title="Mineral-wool rolls in the rafter cavity"
          onChange={(b) => setConfig((c) => markCustom({ ...c, roof: { ...c.roof, insulation: { ...c.roof.insulation, enabled: b } } }))}
        />
        <NumberRow
          label="Insulation roll length"
          value={config.roof.insulation.rollLength}
          min={1000}
          max={50000}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, insulation: { ...c.roof.insulation, rollLength: v } } }))}
        />
        <NumberRow
          label="Overhang front"
          value={config.roof.overhangs.front}
          min={0}
          max={3000}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, overhangs: { ...c.roof.overhangs, front: v } } }))}
        />
        <NumberRow
          label="Overhang rear"
          value={config.roof.overhangs.rear}
          min={0}
          max={3000}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, overhangs: { ...c.roof.overhangs, rear: v } } }))}
        />
        <NumberRow
          label="Overhang sides"
          value={config.roof.overhangs.sides}
          min={0}
          max={3000}
          onChange={(v) => setConfig((c) => ({ ...c, roof: { ...c.roof, overhangs: { ...c.roof.overhangs, sides: v } } }))}
        />
      </Section>

      <Section title="Timber profiles (per role)">
        <button className="add-btn" onClick={() => setProfilesOpen(true)}>
          Edit profiles…
        </button>
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
          <OpeningEditor key={op.id} opening={op} config={config} setConfig={setConfig} />
        ))}
        <button
          className="add-btn"
          onClick={() =>
            setConfig((c) => ({
              ...c,
              openings: [
                ...c.openings,
                { id: `op-${Date.now()}`, wall: 'front', type: 'window', width: 800, height: 700, sillHeight: 1000, offsetAlongWall: 300 },
              ],
            }))
          }
        >
          + Add opening
        </button>
      </Section>

      <Section title="Fasteners">
        <SelectRow
          label="Sheathing fixing"
          value={config.fasteners.sheathing.specId}
          options={fastenerOptions}
          onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, sheathing: { ...c.fasteners.sheathing, specId: v } } }))}
        />
        <NumberRow
          label="Sheathing perimeter spacing"
          value={config.fasteners.sheathing.perimeterSpacing}
          min={20}
          max={1000}
          onChange={(v) => setConfig((c) => markCustom({ ...c, fasteners: { ...c.fasteners, sheathing: { ...c.fasteners.sheathing, perimeterSpacing: v } } }))}
        />
        <NumberRow
          label="Sheathing field spacing"
          value={config.fasteners.sheathing.fieldSpacing}
          min={20}
          max={1000}
          onChange={(v) => setConfig((c) => markCustom({ ...c, fasteners: { ...c.fasteners, sheathing: { ...c.fasteners.sheathing, fieldSpacing: v } } }))}
        />
        <SelectRow
          label="Cladding fixing"
          value={config.fasteners.cladding.specId}
          options={fastenerOptions}
          onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, cladding: { ...c.fasteners.cladding, specId: v } } }))}
        />
        <NumberRow
          label="Cladding spacing"
          value={config.fasteners.cladding.spacing}
          min={20}
          max={2000}
          onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, cladding: { ...c.fasteners.cladding, spacing: v } } }))}
        />
        <SelectRow
          label="Framing fixing"
          value={config.fasteners.framing.specId}
          options={fastenerOptions}
          onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, framing: { ...c.fasteners.framing, specId: v } } }))}
        />
        <NumberRow
          label="Framing per joint"
          value={config.fasteners.framing.perJoint}
          step={1}
          min={1}
          max={10}
          suffix="pcs"
          onChange={(v) => setConfig((c) => markCustom({ ...c, fasteners: { ...c.fasteners, framing: { ...c.fasteners.framing, perJoint: v } } }))}
        />
        <SelectRow
          label="Roof covering fixing"
          value={config.fasteners.roofCovering.specId}
          options={fastenerOptions}
          onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, roofCovering: { ...c.fasteners.roofCovering, specId: v } } }))}
        />
        <NumberRow
          label="Roof covering rate / m²"
          value={config.fasteners.roofCovering.ratePerSqm}
          step={1}
          min={1}
          max={200}
          suffix="/m²"
          onChange={(v) => setConfig((c) => ({ ...c, fasteners: { ...c.fasteners, roofCovering: { ...c.fasteners.roofCovering, ratePerSqm: v } } }))}
        />
      </Section>
    </div>
  )
}

function ShingleRows({ config, setConfig }: Props) {
  const key = config.roof.covering === 'shingles' ? 'shingle' : 'metalShingle'
  const sh = config.roof[key]
  const set = (patch: Partial<ShingleSpec>) => setConfig((c) => ({ ...c, roof: { ...c.roof, [key]: { ...c.roof[key], ...patch } } }))
  const label = config.roof.covering === 'shingles' ? 'Shingle' : 'Metal tile'
  return (
    <>
      <NumberRow label={`${label} width`} value={sh.width} min={50} max={5000} onChange={(v) => set({ width: v })} />
      <NumberRow label={`${label} height`} value={sh.height} min={50} max={5000} onChange={(v) => set({ height: v })} />
      <NumberRow label={`${label} exposure`} value={sh.exposure} min={10} max={sh.height} onChange={(v) => set({ exposure: v })} />
    </>
  )
}

function OpeningEditor({ opening, config, setConfig }: { opening: OpeningConfig; config: ShedConfig; setConfig: Props['setConfig'] }) {
  const update = (patch: Partial<OpeningConfig>) =>
    setConfig((c) => ({ ...c, openings: c.openings.map((o) => (o.id === opening.id ? { ...o, ...patch } : o)) }))
  const remove = () => setConfig((c) => ({ ...c, openings: c.openings.filter((o) => o.id !== opening.id) }))
  const wallLen = opening.wall === 'front' || opening.wall === 'back' ? config.base.width : config.base.depth

  return (
    <div className="opening-editor">
      <div className="opening-head">
        <SelectRow label="Wall" value={opening.wall} options={WALL_OPTIONS} onChange={(v) => update({ wall: v as WallSide })} />
        <SelectRow label="Type" value={opening.type} options={OPENING_TYPE_OPTIONS} onChange={(v) => update({ type: v as OpeningType })} />
      </div>
      <NumberRow label="Width" value={opening.width} min={100} max={wallLen} onChange={(v) => update({ width: v })} />
      <NumberRow label="Height" value={opening.height} min={100} max={20000} onChange={(v) => update({ height: v })} />
      <NumberRow label="Sill height" value={opening.sillHeight} min={0} max={20000} onChange={(v) => update({ sillHeight: v })} />
      <NumberRow label="Offset along wall" value={opening.offsetAlongWall} min={0} max={wallLen} onChange={(v) => update({ offsetAlongWall: v })} />
      <button className="remove-btn" onClick={remove}>
        Remove
      </button>
    </div>
  )
}

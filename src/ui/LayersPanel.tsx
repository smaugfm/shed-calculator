import { LAYERS, LAYER_NAMES, type LayerName, type LayerMeta } from '../viewer/render'
import { Section } from './fields'

interface Props {
  layers: Record<LayerName, boolean>
  setLayers: (next: Record<LayerName, boolean>) => void
  hidden?: LayerName[]
}

const GROUPS: LayerMeta['group'][] = ['Foundation', 'Floor', 'Walls', 'Roof']

const FRAME_LAYERS: LayerName[] = ['piles', 'gradeBeams', 'joists', 'wallFraming', 'rafters', 'fascia']

export function LayersPanel({ layers, setLayers, hidden = [] }: Props) {
  const visibleLayers = LAYERS.filter((l) => !hidden.includes(l.name))
  const setAll = () => setLayers(Object.fromEntries(LAYER_NAMES.map((n) => [n, true])) as Record<LayerName, boolean>)
  const frameOnly = () => setLayers(Object.fromEntries(LAYER_NAMES.map((n) => [n, FRAME_LAYERS.includes(n)])) as Record<LayerName, boolean>)
  const toggle = (name: LayerName) => setLayers({ ...layers, [name]: !layers[name] })

  return (
    <Section title="Layers" open>
      <div className="layers-actions">
        <button onClick={setAll}>All</button>
        <button onClick={frameOnly}>Frame only</button>
      </div>
      {GROUPS.map((group) => (
        <div key={group} className="layers-group">
          <div className="layers-group-title">{group}</div>
          {visibleLayers
            .filter((l) => l.group === group)
            .map((l) => (
              <label key={l.name} className="layer-row">
                <input type="checkbox" checked={layers[l.name]} onChange={() => toggle(l.name)} />
                {l.label}
              </label>
            ))}
        </div>
      ))}
    </Section>
  )
}

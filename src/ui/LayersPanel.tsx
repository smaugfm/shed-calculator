import { LAYERS, LAYER_NAMES, type LayerName, type LayerMeta } from '../viewer/render'
import { Section } from './fields'

interface Props {
  layers: Record<LayerName, boolean>
  setLayers: (next: Record<LayerName, boolean>) => void
}

const GROUPS: LayerMeta['group'][] = ['Foundation', 'Floor', 'Walls', 'Roof']

export function LayersPanel({ layers, setLayers }: Props) {
  const setAll = (visible: boolean) => setLayers(Object.fromEntries(LAYER_NAMES.map((n) => [n, visible])) as Record<LayerName, boolean>)
  const toggle = (name: LayerName) => setLayers({ ...layers, [name]: !layers[name] })

  return (
    <Section title="Layers" open>
      <div className="layers-actions">
        <button onClick={() => setAll(true)}>All</button>
        <button onClick={() => setAll(false)}>None</button>
      </div>
      {GROUPS.map((group) => (
        <div key={group} className="layers-group">
          <div className="layers-group-title">{group}</div>
          {LAYERS.filter((l) => l.group === group).map((l) => (
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

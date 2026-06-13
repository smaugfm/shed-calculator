import { useEffect, useRef, useState } from 'react'
import { useShed } from './useShed'
import { ConfigPanel } from './ConfigPanel'
import { LayersPanel } from './LayersPanel'
import { BomTable } from './BomTable'
import { Toolbar } from './Toolbar'
import { Viewport, type ViewportHandle } from './Viewport'
import { LAYER_NAMES, type LayerName } from '../viewer/render'

const LAYERS_KEY = 'shed-calculator:layers'

function allLayersVisible(): Record<LayerName, boolean> {
  return Object.fromEntries(LAYER_NAMES.map((n) => [n, true])) as Record<LayerName, boolean>
}

function loadLayers(): Record<LayerName, boolean> {
  const base = allLayersVisible()
  try {
    const raw = localStorage.getItem(LAYERS_KEY)
    if (!raw) return base
    const stored = JSON.parse(raw) as Record<string, unknown>
    for (const n of LAYER_NAMES) if (typeof stored[n] === 'boolean') base[n] = stored[n] as boolean
    return base
  } catch {
    return base
  }
}

export function App() {
  const { config, setConfig, reset, model, bom } = useShed()
  const [rulerActive, setRulerActive] = useState(false)
  const [layers, setLayers] = useState<Record<LayerName, boolean>>(loadLayers)
  const viewportRef = useRef<ViewportHandle>(null)

  useEffect(() => {
    try {
      localStorage.setItem(LAYERS_KEY, JSON.stringify(layers))
    } catch {
      // ignore quota / serialization errors
    }
  }, [layers])

  return (
    <div className="app">
      <Toolbar
        config={config}
        setConfig={setConfig}
        rulerActive={rulerActive}
        onToggleRuler={() => setRulerActive((v) => !v)}
        onExport={() => viewportRef.current?.exportGlb()}
        onReset={reset}
      />
      <div className="main">
        <aside className="sidebar left">
          <LayersPanel layers={layers} setLayers={setLayers} hidden={config.roof.covering === 'ventilated' && config.roof.battens ? [] : ['roofBattens']} />
          <ConfigPanel config={config} setConfig={setConfig} />
        </aside>
        <Viewport ref={viewportRef} model={model} config={config} rulerActive={rulerActive} layers={layers} />
        <aside className="sidebar right">
          <BomTable bom={bom} />
        </aside>
      </div>
    </div>
  )
}

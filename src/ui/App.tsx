import { useRef, useState } from 'react'
import { useShed } from './useShed'
import { ConfigPanel } from './ConfigPanel'
import { LayersPanel } from './LayersPanel'
import { BomTable } from './BomTable'
import { Toolbar } from './Toolbar'
import { Viewport, type ViewportHandle } from './Viewport'
import { LAYER_NAMES, type LayerName } from '../viewer/render'

function allLayersVisible(): Record<LayerName, boolean> {
  return Object.fromEntries(LAYER_NAMES.map((n) => [n, true])) as Record<LayerName, boolean>
}

export function App() {
  const { config, setConfig, reset, model, bom } = useShed()
  const [rulerActive, setRulerActive] = useState(false)
  const [layers, setLayers] = useState<Record<LayerName, boolean>>(allLayersVisible)
  const viewportRef = useRef<ViewportHandle>(null)

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

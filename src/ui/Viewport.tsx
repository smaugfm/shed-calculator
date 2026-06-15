import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ShedConfig } from '../config/types'
import type { ShedModel } from '../model/types'
import { Scene } from '../viewer/Scene'
import { Ruler } from '../viewer/Ruler'
import { Selection } from '../viewer/Selection'
import { buildSceneObject, type LayerName, type SelectionInfo } from '../viewer/render'
import { exportGlb } from '../viewer/Exporter'

export interface ViewportHandle {
  exportGlb: () => void
}

interface ViewportProps {
  model: ShedModel
  config: ShedConfig
  rulerActive: boolean
  layers: Record<LayerName, boolean>
}

export const Viewport = forwardRef<ViewportHandle, ViewportProps>(function Viewport({ model, config, rulerActive, layers }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  const rulerRef = useRef<Ruler | null>(null)
  const selectionRef = useRef<Selection | null>(null)
  const [selected, setSelected] = useState<SelectionInfo | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const scene = new Scene(containerRef.current)
    const ruler = new Ruler(scene)
    const selection = new Selection(scene)
    selection.onChange = setSelected
    sceneRef.current = scene
    rulerRef.current = ruler
    selectionRef.current = selection
    return () => {
      selection.dispose()
      ruler.dispose()
      scene.dispose()
      sceneRef.current = null
      rulerRef.current = null
      selectionRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    selectionRef.current?.clear() // drop the highlight before the old group is disposed
    scene.setModel(buildSceneObject(model, config))
    for (const [name, visible] of Object.entries(layers)) {
      scene.setLayerVisible(name as LayerName, visible)
    }
  }, [model, config, layers])

  // The ruler and selection both consume clicks — only one is active at a time.
  useEffect(() => {
    const selection = selectionRef.current
    const ruler = rulerRef.current
    if (!selection || !ruler) return
    if (rulerActive) {
      if (ruler.isActive === false) ruler.enable()
      if (selection.isActive) selection.disable()
    } else {
      if (ruler.isActive) ruler.disable()
      if (!selection.isActive) selection.enable()
    }
  }, [rulerActive])

  useImperativeHandle(ref, () => ({
    exportGlb: () => {
      if (sceneRef.current?.modelGroup) exportGlb(sceneRef.current.modelGroup)
    },
  }))

  return (
    <div className="viewport" ref={containerRef}>
      {selected && (
        <div className="pick-panel">
          <div className="pick-title">{selected.title}</div>
          {selected.rows.map(([label, value]) => (
            <div className="pick-row" key={label}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

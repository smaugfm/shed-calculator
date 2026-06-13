import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { ShedConfig } from '../config/types'
import type { ShedModel } from '../model/types'
import { Scene } from '../viewer/Scene'
import { Ruler } from '../viewer/Ruler'
import { buildSceneObject, type LayerName } from '../viewer/render'
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

export const Viewport = forwardRef<ViewportHandle, ViewportProps>(function Viewport(
  { model, config, rulerActive, layers },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<Scene | null>(null)
  const rulerRef = useRef<Ruler | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const scene = new Scene(containerRef.current)
    const ruler = new Ruler(scene)
    sceneRef.current = scene
    rulerRef.current = ruler
    return () => {
      ruler.dispose()
      scene.dispose()
      sceneRef.current = null
      rulerRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setModel(buildSceneObject(model, config))
    for (const [name, visible] of Object.entries(layers)) {
      scene.setLayerVisible(name as LayerName, visible)
    }
  }, [model, config, layers])

  useEffect(() => {
    const ruler = rulerRef.current
    if (!ruler) return
    if (rulerActive && !ruler.isActive) ruler.enable()
    if (!rulerActive && ruler.isActive) ruler.disable()
  }, [rulerActive])

  useImperativeHandle(ref, () => ({
    exportGlb: () => {
      if (sceneRef.current?.modelGroup) exportGlb(sceneRef.current.modelGroup)
    },
  }))

  return <div className="viewport" ref={containerRef} />
})

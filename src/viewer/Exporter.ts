import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

export function exportGlb(group: THREE.Group, filename = 'shed.glb'): void {
  const exporter = new GLTFExporter()
  exporter.parse(
    group,
    (result) => {
      const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    },
    (error) => console.error('glTF export failed', error),
    { binary: true },
  )
}

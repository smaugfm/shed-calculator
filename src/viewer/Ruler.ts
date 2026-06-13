import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { Scene } from './Scene'

const SNAP_TOLERANCE = 120

export class Ruler {
  private scene: Scene
  private overlay = new THREE.Group()
  private points: THREE.Vector3[] = []
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private active = false
  private dom: HTMLCanvasElement

  constructor(scene: Scene) {
    this.scene = scene
    this.dom = scene.renderer.domElement
    this.overlay.name = 'ruler-overlay'
    scene.scene.add(this.overlay)
  }

  get isActive(): boolean {
    return this.active
  }

  enable(): void {
    this.active = true
    this.dom.style.cursor = 'crosshair'
    this.dom.addEventListener('pointerdown', this.onClick)
    window.addEventListener('keydown', this.onKey)
  }

  disable(): void {
    this.active = false
    this.dom.style.cursor = ''
    this.dom.removeEventListener('pointerdown', this.onClick)
    window.removeEventListener('keydown', this.onKey)
    this.clear()
  }

  clear(): void {
    this.points = []
    for (const child of [...this.overlay.children]) {
      this.overlay.remove(child)
      if (child instanceof THREE.Mesh) child.geometry.dispose()
      if (child instanceof THREE.Line) child.geometry.dispose()
      if (child instanceof CSS2DObject) child.element.remove()
    }
  }

  private onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.clear()
  }

  private onClick = (event: PointerEvent): void => {
    const hit = this.pick(event)
    if (!hit) return
    if (this.points.length === 2) this.clear()
    this.points.push(hit)
    this.addMarker(hit)
    if (this.points.length === 2) this.addMeasurement()
  }

  private pick(event: PointerEvent): THREE.Vector3 | null {
    const group = this.scene.modelGroup
    if (!group) return null
    const rect = this.dom.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.scene.camera)
    const hits = this.raycaster.intersectObjects(group.children, true)
    if (hits.length === 0) return null
    return this.snap(hits[0])
  }

  private snap(hit: THREE.Intersection): THREE.Vector3 {
    const point = hit.point.clone()
    const mesh = hit.object as THREE.Mesh
    const face = hit.face
    if (!face || !(mesh.geometry instanceof THREE.BufferGeometry)) return point
    const pos = mesh.geometry.getAttribute('position')
    let best = point
    let bestDist = SNAP_TOLERANCE
    for (const idx of [face.a, face.b, face.c]) {
      const vertex = new THREE.Vector3().fromBufferAttribute(pos, idx).applyMatrix4(mesh.matrixWorld)
      const d = vertex.distanceTo(point)
      if (d < bestDist) {
        bestDist = d
        best = vertex
      }
    }
    return best
  }

  private addMarker(p: THREE.Vector3): void {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(40, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xff3b30 }),
    )
    marker.position.copy(p)
    this.overlay.add(marker)
  }

  private addMeasurement(): void {
    const [a, b] = this.points
    const geom = new THREE.BufferGeometry().setFromPoints([a, b])
    const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xff3b30 }))
    this.overlay.add(line)

    const mm = a.distanceTo(b)
    const el = document.createElement('div')
    el.className = 'ruler-label'
    el.textContent = `${(mm / 1000).toFixed(3)} m  (${Math.round(mm)} mm)`
    const label = new CSS2DObject(el)
    label.position.copy(a.clone().add(b).multiplyScalar(0.5))
    this.overlay.add(label)
  }

  dispose(): void {
    this.disable()
    this.scene.scene.remove(this.overlay)
  }
}

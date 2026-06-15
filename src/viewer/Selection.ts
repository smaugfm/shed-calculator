import * as THREE from 'three'
import type { Scene } from './Scene'
import type { SelectionInfo } from './selectionInfo'

const DRAG_TOLERANCE = 5 // px — beyond this a pointer gesture is an orbit drag, not a click

// Click-to-select: highlights the picked mesh (red) and reports its SelectionInfo. Selection is a
// per-mesh material swap (shared highlight material), restored on deselect.
export class Selection {
  private scene: Scene
  private dom: HTMLCanvasElement
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private active = false
  private down: { x: number; y: number } | null = null
  private selected: THREE.Mesh | null = null
  private savedMaterial: THREE.Material | THREE.Material[] | null = null
  private highlight = new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.6, metalness: 0 })

  onChange: (info: SelectionInfo | null) => void = () => {}

  constructor(scene: Scene) {
    this.scene = scene
    this.dom = scene.renderer.domElement
  }

  get isActive(): boolean {
    return this.active
  }

  enable(): void {
    this.active = true
    this.dom.addEventListener('pointerdown', this.onDown)
    this.dom.addEventListener('pointerup', this.onUp)
  }

  disable(): void {
    this.active = false
    this.dom.removeEventListener('pointerdown', this.onDown)
    this.dom.removeEventListener('pointerup', this.onUp)
    this.clear()
  }

  // Restore the previously selected mesh and drop the selection.
  clear(): void {
    if (this.selected && this.savedMaterial) this.selected.material = this.savedMaterial
    this.selected = null
    this.savedMaterial = null
    this.onChange(null)
  }

  private onDown = (e: PointerEvent): void => {
    this.down = { x: e.clientX, y: e.clientY }
  }

  private onUp = (e: PointerEvent): void => {
    if (!this.down) return
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y)
    this.down = null
    if (moved > DRAG_TOLERANCE) return // an orbit drag, not a click
    this.pick(e)
  }

  private pick(event: PointerEvent): void {
    const group = this.scene.modelGroup
    if (!group) return
    const rect = this.dom.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.scene.camera)
    const hits = this.raycaster.intersectObjects(group.children, true)
    for (const hit of hits) {
      const mesh = pickable(hit.object)
      // The raycaster ignores `.visible`, so skip parts on hidden layers ourselves.
      if (mesh && isVisible(mesh)) {
        this.select(mesh)
        return
      }
    }
    this.clear()
  }

  private select(mesh: THREE.Mesh): void {
    if (mesh === this.selected) return
    this.clear()
    this.selected = mesh
    this.savedMaterial = mesh.material
    mesh.material = this.highlight
    this.onChange((mesh.userData.pick as SelectionInfo) ?? null)
  }

  dispose(): void {
    this.disable()
    this.highlight.dispose()
  }
}

// Walk up from a hit object (could be the edge LineSegments child) to the mesh carrying pick info.
function pickable(object: THREE.Object3D): THREE.Mesh | null {
  let o: THREE.Object3D | null = object
  while (o) {
    if (o instanceof THREE.Mesh && o.userData.pick) return o
    o = o.parent
  }
  return null
}

// True only if the object and all its ancestors are visible (layer visibility lives on the group).
function isVisible(object: THREE.Object3D): boolean {
  let o: THREE.Object3D | null = object
  while (o) {
    if (!o.visible) return false
    o = o.parent
  }
  return true
}

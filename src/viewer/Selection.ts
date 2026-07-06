import * as THREE from 'three'
import type { Scene } from './Scene'
import type { SelectionInfo } from './selectionInfo'

const DRAG_TOLERANCE = 5 // px — beyond this a pointer gesture is an orbit drag, not a click

// Highlights meshes red (per-mesh material swap, restored on clear). Two triggers: a pointer click
// picks one mesh (+ its SelectionInfo); `highlightByKey` lights up every mesh of a BOM line.
export class Selection {
  private scene: Scene
  private dom: HTMLCanvasElement
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private active = false
  private down: { x: number; y: number } | null = null
  private highlighted: { mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }[] = []
  private highlight = new THREE.MeshStandardMaterial({ color: 0xff3b30, roughness: 0.6, metalness: 0 })

  onChange: (info: SelectionInfo | null) => void = () => {}
  onPointerSelect: () => void = () => {} // fired on a pointer-driven pick (so external key selection can reset)

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

  // Restore all highlighted meshes and drop the selection.
  clear(): void {
    for (const { mesh, material } of this.highlighted) mesh.material = material
    this.highlighted = []
    this.onChange(null)
  }

  private paint(meshes: THREE.Mesh[]): void {
    for (const mesh of meshes) {
      this.highlighted.push({ mesh, material: mesh.material })
      mesh.material = this.highlight
    }
  }

  // Highlight every visible mesh belonging to a BOM line (by its priceKey). null / no match clears.
  highlightByKey(key: string | null): void {
    this.clear()
    if (!key || !this.scene.modelGroup) return
    const matches: THREE.Mesh[] = []
    this.scene.modelGroup.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.bomKey === key && isVisible(o)) matches.push(o)
    })
    if (matches.length === 0) return
    this.paint(matches)
    const title = (matches[0].userData.pick as SelectionInfo | undefined)?.title ?? key
    this.onChange({ title, rows: [['Highlighted', `${matches.length} pcs`]] })
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
    this.onPointerSelect()
    for (const hit of hits) {
      const mesh = pickable(hit.object)
      // The raycaster ignores `.visible`, so skip parts on hidden layers ourselves.
      if (mesh && isVisible(mesh)) {
        this.clear()
        this.paint([mesh])
        this.onChange((mesh.userData.pick as SelectionInfo) ?? null)
        return
      }
    }
    this.clear()
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

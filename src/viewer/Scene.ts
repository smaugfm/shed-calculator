import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { LayerName, RenderResult } from './render'

export class Scene {
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer
  readonly labelRenderer: CSS2DRenderer
  readonly controls: OrbitControls
  modelGroup: THREE.Group | null = null

  private container: HTMLElement
  private frame = 0
  private resizeObserver: ResizeObserver

  constructor(container: HTMLElement) {
    this.container = container

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = true
    container.appendChild(this.renderer.domElement)

    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = '0'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(this.labelRenderer.domElement)

    this.scene.background = new THREE.Color(0xeef1f4)

    this.camera = new THREE.PerspectiveCamera(50, 1, 50, 120000)
    this.camera.position.set(6000, 4500, 7000)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.target.set(1500, 1200, 1200)

    this.addLights()
    this.addGround()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.animate()
  }

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.1))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(8000, 12000, 6000)
    this.scene.add(sun)
  }

  private addGround(): void {
    const grid = new THREE.GridHelper(40000, 80, 0xc0c8d0, 0xdfe4ea)
    this.scene.add(grid)
  }

  setModel(result: RenderResult): void {
    if (this.modelGroup) {
      this.scene.remove(this.modelGroup)
      disposeGroup(this.modelGroup)
    }
    this.modelGroup = result.group
    this.scene.add(result.group)
    this.controls.target.copy(result.center)
  }

  setLayerVisible(layer: LayerName, visible: boolean): void {
    const g = this.modelGroup?.getObjectByName(layer)
    if (g) g.visible = visible
  }

  private resize(): void {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h)
    this.labelRenderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private animate = (): void => {
    this.frame = requestAnimationFrame(this.animate)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.labelRenderer.render(this.scene, this.camera)
  }

  dispose(): void {
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    if (this.modelGroup) disposeGroup(this.modelGroup)
    this.renderer.domElement.remove()
    this.labelRenderer.domElement.remove()
  }
}

function disposeGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return
    obj.geometry.dispose()
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const material of materials) {
      if (!material.userData.disposable) continue
      if ('map' in material && material.map) (material.map as THREE.Texture).dispose()
      material.dispose()
    }
  })
}

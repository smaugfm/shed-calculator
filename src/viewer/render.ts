import * as THREE from 'three'
import type { ShedConfig } from '../config/types'
import type { Member, Panel, ShedModel, Vec3 } from '../model/types'
import type { FacadeType } from '../config/types'
import { getCladdingTexture, getMetalTexture, getOsbTexture } from './textures'

export type LayerName =
  | 'piles'
  | 'gradeBeams'
  | 'joists'
  | 'floorDeck'
  | 'wallFraming'
  | 'wallOsb'
  | 'wallMembrane'
  | 'battens'
  | 'cladding'
  | 'rafters'
  | 'roofOsb'
  | 'roofMembrane'
  | 'roofing'

export interface LayerMeta {
  name: LayerName
  label: string
  group: 'Foundation' | 'Floor' | 'Walls' | 'Roof'
}

export const LAYERS: LayerMeta[] = [
  { name: 'piles', label: 'Piles', group: 'Foundation' },
  { name: 'gradeBeams', label: 'Grade beams', group: 'Foundation' },
  { name: 'joists', label: 'Joists & rim', group: 'Floor' },
  { name: 'floorDeck', label: 'OSB deck', group: 'Floor' },
  { name: 'wallFraming', label: 'Studs, plates, headers', group: 'Walls' },
  { name: 'wallOsb', label: 'Wall OSB', group: 'Walls' },
  { name: 'wallMembrane', label: 'Wall membrane', group: 'Walls' },
  { name: 'battens', label: 'Battens', group: 'Walls' },
  { name: 'cladding', label: 'Cladding', group: 'Walls' },
  { name: 'rafters', label: 'Rafters', group: 'Roof' },
  { name: 'roofOsb', label: 'Roof OSB', group: 'Roof' },
  { name: 'roofMembrane', label: 'Roof membrane', group: 'Roof' },
  { name: 'roofing', label: 'Roofing', group: 'Roof' },
]

export const LAYER_NAMES: LayerName[] = LAYERS.map((l) => l.name)

const timber = new THREE.MeshStandardMaterial({ color: 0xc8a165, roughness: 0.85 })
const batten = new THREE.MeshStandardMaterial({ color: 0xb8915a, roughness: 0.85 })
const membrane = new THREE.MeshStandardMaterial({ color: 0x1f3a4d, roughness: 1, side: THREE.DoubleSide })
const pile = new THREE.MeshStandardMaterial({ color: 0x8d8d8d, roughness: 1 })

function vec(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z)
}

function len(p: Vec3): number {
  return Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
}

function osbMaterial(uLen: number, vLen: number): THREE.MeshStandardMaterial {
  const tex = getOsbTexture().clone()
  tex.needsUpdate = true
  tex.repeat.set(Math.max(1, uLen / 600), Math.max(1, vLen / 600))
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide })
  mat.userData.disposable = true
  return mat
}

function facadeMaterial(type: FacadeType, uLen: number, vLen: number): THREE.MeshStandardMaterial {
  if (type === 'metal') {
    const tex = getMetalTexture().clone()
    tex.needsUpdate = true
    tex.repeat.set(Math.max(1, uLen / 1000), Math.max(1, vLen / 2400))
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.6, side: THREE.DoubleSide })
    mat.userData.disposable = true
    return mat
  }
  const tex = getCladdingTexture().clone()
  tex.needsUpdate = true
  tex.repeat.set(Math.max(1, uLen / 1600), Math.max(1, vLen / 3000))
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide })
  mat.userData.disposable = true
  return mat
}

function orientedBox(thickness: number, width: number, start: THREE.Vector3, end: THREE.Vector3, up: THREE.Vector3, material: THREE.Material): THREE.Mesh {
  const zAxis = new THREE.Vector3().subVectors(end, start)
  const length = zAxis.length()
  zAxis.normalize()
  let yAxis = up.clone().sub(zAxis.clone().multiplyScalar(up.dot(zAxis)))
  if (yAxis.lengthSq() < 1e-9) yAxis = new THREE.Vector3(1, 0, 0).sub(zAxis.clone().multiplyScalar(zAxis.x))
  yAxis.normalize()
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize()
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, width, length), material)
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis)
  m.setPosition(new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5))
  mesh.applyMatrix4(m)
  return mesh
}

function panelMesh(panel: Panel, material: THREE.Material): THREE.Mesh {
  const origin = vec(panel.origin)
  const u = vec(panel.u)
  const v = vec(panel.v)
  const normal = vec(panel.normal).normalize()

  if (panel.shape === 'triangle') {
    // Flat triangle sits at the layer's outer face so it stays flush with the boxed rect panels.
    const base = origin.clone().add(normal.clone().multiplyScalar(panel.offset + panel.thickness / 2))
    const p1 = base
    const p2 = base.clone().add(u)
    const p3 = base.clone().add(v)
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.Float32BufferAttribute([p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z], 3))
    geom.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2))
    geom.computeVertexNormals()
    return new THREE.Mesh(geom, material)
  }

  const center = origin.clone().add(normal.clone().multiplyScalar(panel.offset)).add(u.clone().multiplyScalar(0.5)).add(v.clone().multiplyScalar(0.5))
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(u.length(), v.length(), panel.thickness), material)
  const m = new THREE.Matrix4().makeBasis(u.clone().normalize(), v.clone().normalize(), normal)
  m.setPosition(center)
  mesh.applyMatrix4(m)
  return mesh
}

export interface RenderResult {
  group: THREE.Group
  center: THREE.Vector3
}

export function buildSceneObject(model: ShedModel, config: ShedConfig): RenderResult {
  const group = new THREE.Group()
  const layers = Object.fromEntries(
    LAYER_NAMES.map((name) => {
      const g = new THREE.Group()
      g.name = name
      group.add(g)
      return [name, g]
    }),
  ) as Record<LayerName, THREE.Group>

  for (const p of model.piles) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.size, p.top - p.bottom, p.size), pile)
    mesh.position.set(p.x, (p.bottom + p.top) / 2, p.z)
    layers.piles.add(mesh)
  }

  for (const m of model.members) layers[memberLayer(m)].add(memberMesh(m))

  const roofingMat = new THREE.MeshStandardMaterial({
    color: config.roof.covering === 'shingles' ? 0x2b2f36 : 0x6b7785,
    roughness: config.roof.covering === 'shingles' ? 1 : 0.5,
    metalness: config.roof.covering === 'shingles' ? 0 : 0.6,
    side: THREE.DoubleSide,
  })

  for (const panel of model.panels) {
    switch (panel.kind) {
      case 'osb-floor':
        layers.floorDeck.add(panelMesh(panel, osbMaterial(len(panel.u), len(panel.v))))
        break
      case 'osb-wall':
        layers.wallOsb.add(panelMesh(panel, osbMaterial(len(panel.u), len(panel.v))))
        break
      case 'osb-roof':
        layers.roofOsb.add(panelMesh(panel, osbMaterial(len(panel.u), len(panel.v))))
        break
      case 'membrane-wall':
        layers.wallMembrane.add(panelMesh(panel, membrane))
        break
      case 'membrane-roof':
        layers.roofMembrane.add(panelMesh(panel, membrane))
        break
      case 'cladding':
        layers.cladding.add(panelMesh(panel, facadeMaterial(config.walls.facadeType, len(panel.u), len(panel.v))))
        break
      case 'roofing':
        layers.roofing.add(panelMesh(panel, roofingMat))
        break
      default:
        break
    }
  }

  const center = new THREE.Vector3(
    (model.bbox.min.x + model.bbox.max.x) / 2,
    (model.bbox.min.y + model.bbox.max.y) / 2,
    (model.bbox.min.z + model.bbox.max.z) / 2,
  )
  return { group, center }
}

function memberLayer(member: Member): LayerName {
  switch (member.role) {
    case 'gradeBeam':
      return 'gradeBeams'
    case 'joist':
      return 'joists'
    case 'rafter':
      return 'rafters'
    case 'batten':
      return 'battens'
    default:
      return 'wallFraming'
  }
}

function memberMesh(member: Member): THREE.Mesh {
  const material = member.role === 'batten' ? batten : timber
  return orientedBox(member.thickness, member.width, vec(member.start), vec(member.end), vec(member.up), material)
}

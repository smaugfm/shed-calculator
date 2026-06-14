import * as THREE from 'three'
import type { ShedConfig } from '../config/types'
import type { Member, Panel, Piece, ShedModel, Vec2, Vec3 } from '../model/types'
import type { MaterialId } from '../model/materials'
import { getInsulationTexture, getMembraneTexture, getOsbTexture } from './textures'

export type LayerName =
  | 'piles'
  | 'gradeBeams'
  | 'joists'
  | 'floorDeck'
  | 'wallFraming'
  | 'wallOsb'
  | 'wallMembrane'
  | 'wallInsulation'
  | 'battens'
  | 'cladding'
  | 'rafters'
  | 'fascia'
  | 'soffit'
  | 'roofBattens'
  | 'roofOsb'
  | 'roofMembrane'
  | 'roofInsulation'
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
  { name: 'wallInsulation', label: 'Wall insulation', group: 'Walls' },
  { name: 'wallOsb', label: 'Wall OSB', group: 'Walls' },
  { name: 'wallMembrane', label: 'Wall membrane', group: 'Walls' },
  { name: 'battens', label: 'Battens', group: 'Walls' },
  { name: 'cladding', label: 'Cladding', group: 'Walls' },
  { name: 'rafters', label: 'Rafters', group: 'Roof' },
  { name: 'fascia', label: 'Fascia & barge', group: 'Roof' },
  { name: 'soffit', label: 'Soffit', group: 'Roof' },
  { name: 'roofInsulation', label: 'Roof insulation', group: 'Roof' },
  { name: 'roofOsb', label: 'Roof OSB', group: 'Roof' },
  { name: 'roofMembrane', label: 'Roof membrane', group: 'Roof' },
  { name: 'roofBattens', label: 'Roof battens', group: 'Roof' },
  { name: 'roofing', label: 'Roofing', group: 'Roof' },
]

export const LAYER_NAMES: LayerName[] = LAYERS.map((l) => l.name)

const timber = new THREE.MeshStandardMaterial({ color: 0xc8a165, roughness: 0.85 })
const batten = new THREE.MeshStandardMaterial({ color: 0xb8915a, roughness: 0.85 })
const pile = new THREE.MeshStandardMaterial({ color: 0x8d8d8d, roughness: 1 })
const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x111111 })

function withEdges(mesh: THREE.Mesh): THREE.Mesh {
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMaterial))
  return mesh
}

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

function membranePieceMaterial(): THREE.MeshStandardMaterial {
  const tex = getMembraneTexture().clone()
  tex.needsUpdate = true
  tex.repeat.set(1 / 1000, 1 / 1000)
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })
  mat.userData.disposable = true
  return mat
}

function insulationPieceMaterial(): THREE.MeshStandardMaterial {
  const tex = getInsulationTexture().clone()
  tex.needsUpdate = true
  tex.repeat.set(1 / 500, 1 / 500)
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 })
  mat.userData.disposable = true
  return mat
}

function osbPieceMaterial(): THREE.MeshStandardMaterial {
  const tex = getOsbTexture().clone()
  tex.needsUpdate = true
  tex.repeat.set(1 / 600, 1 / 600)
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 })
  mat.userData.disposable = true
  return mat
}

function solidPiece(color: number, metalness: number): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: metalness > 0 ? 0.5 : 0.85, metalness })
  mat.userData.disposable = true
  return mat
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fuzz an insulation piece's perimeter: subdivide each edge and push interior points *inward only*
// (toward the polygon interior — (nu, nv) is the left/interior normal for our CCW pieces) so the
// rough contour always stays inside the piece's bounding box, which is already recessed off the
// studs/rafters. Corners (original vertices) stay put so the strip keeps its overall footprint.
function roughenOutline(uv: Vec2[], rng: () => number): Vec2[] {
  const amp = 12
  const seg = 60
  const out: Vec2[] = []
  for (let i = 0; i < uv.length; i++) {
    const a = uv[i]
    const b = uv[(i + 1) % uv.length]
    const du = b.u - a.u
    const dv = b.v - a.v
    const len = Math.hypot(du, dv) || 1
    const nu = -dv / len
    const nv = du / len
    const steps = Math.max(1, Math.round(len / seg))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const j = s === 0 ? 0 : rng() * amp
      out.push({ u: a.u + du * t + nu * j, v: a.v + dv * t + nv * j })
    }
  }
  return out
}

function pieceMesh(piece: Piece, material: THREE.Material, rough = false): THREE.Mesh {
  const uv = rough ? roughenOutline(piece.uv, mulberry32(Math.round(piece.uv[0].u * 7 + piece.uv[0].v * 13 + piece.origin.x))) : piece.uv
  const shape = new THREE.Shape()
  uv.forEach((p, i) => (i === 0 ? shape.moveTo(p.u, p.v) : shape.lineTo(p.u, p.v)))
  const geom = new THREE.ExtrudeGeometry(shape, { depth: piece.thickness, bevelEnabled: false })
  const normal = vec(piece.normal)
  const mesh = new THREE.Mesh(geom, material)
  const m = new THREE.Matrix4().makeBasis(vec(piece.uDir), vec(piece.vDir), normal)
  m.setPosition(vec(piece.origin).add(normal.clone().multiplyScalar(piece.offset - piece.thickness / 2)))
  mesh.applyMatrix4(m)
  return withEdges(mesh)
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
    return withEdges(new THREE.Mesh(geom, material))
  }

  const center = origin.clone().add(normal.clone().multiplyScalar(panel.offset)).add(u.clone().multiplyScalar(0.5)).add(v.clone().multiplyScalar(0.5))
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(u.length(), v.length(), panel.thickness), material)
  const m = new THREE.Matrix4().makeBasis(u.clone().normalize(), v.clone().normalize(), normal)
  m.setPosition(center)
  mesh.applyMatrix4(m)
  return withEdges(mesh)
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
    const mesh = withEdges(new THREE.Mesh(new THREE.BoxGeometry(p.size, p.top - p.bottom, p.size), pile))
    mesh.position.set(p.x, (p.bottom + p.top) / 2, p.z)
    layers.piles.add(mesh)
  }

  for (const m of model.members) layers[memberLayer(m)].add(memberMesh(m))

  for (const panel of model.panels) {
    if (panel.kind === 'soffit') layers.soffit.add(panelMesh(panel, osbMaterial(len(panel.u), len(panel.v))))
  }

  const pieceLayer: Record<MaterialId, LayerName> = {
    'osb-floor': 'floorDeck',
    'osb-wall': 'wallOsb',
    'osb-roof': 'roofOsb',
    cladding: 'cladding',
    roofing: 'roofing',
    'membrane-wall': 'wallMembrane',
    'membrane-roof': 'roofMembrane',
    'insulation-wall': 'wallInsulation',
    'insulation-roof': 'roofInsulation',
  }
  const osbMat = osbPieceMaterial()
  const membraneMat = membranePieceMaterial()
  const insulationMat = insulationPieceMaterial()
  const claddingMat = config.walls.facadeType === 'metal' ? solidPiece(0x9aa3ab, 0.5) : solidPiece(0x9c7649, 0)
  const roofingMat = config.roof.covering === 'ventilated' ? solidPiece(0x8a9299, 0.5) : solidPiece(0x33363b, 0)
  const pieceMat = (id: MaterialId): THREE.Material =>
    id === 'cladding'
      ? claddingMat
      : id === 'roofing'
        ? roofingMat
        : id.startsWith('insulation')
          ? insulationMat
          : id.startsWith('membrane')
            ? membraneMat
            : osbMat
  for (const piece of model.pieces) {
    const isInsulation = piece.materialId.startsWith('insulation')
    layers[pieceLayer[piece.materialId]].add(pieceMesh(piece, pieceMat(piece.materialId), isInsulation))
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
      // Roof battens run down-slope (up.y < 0); wall battens are vertical (up.y = 0) or horizontal (up.y = 1).
      return member.up.y < -1e-6 ? 'roofBattens' : 'battens'
    case 'fascia':
      return 'fascia'
    default:
      return 'wallFraming'
  }
}

function memberMesh(member: Member): THREE.Mesh {
  const material = member.role === 'batten' ? batten : timber
  return withEdges(orientedBox(member.thickness, member.width, vec(member.start), vec(member.end), vec(member.up), material))
}

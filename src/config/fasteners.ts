import type { FastenerConfig, FastenerSpec } from './types'

export const FASTENER_CATALOG: FastenerSpec[] = [
  { id: 'nail-3.1x90', kind: 'nail', label: 'Ring-shank nail 3.1×90', size: '3.1×90 mm' },
  { id: 'nail-2.8x50', kind: 'nail', label: 'Sheathing nail 2.8×50', size: '2.8×50 mm' },
  { id: 'screw-5x80', kind: 'screw', label: 'Wood screw 5×80', size: '5×80 mm' },
  { id: 'screw-5x100', kind: 'screw', label: 'Wood screw 5×100', size: '5×100 mm' },
  { id: 'screw-4.5x60', kind: 'screw', label: 'Cladding screw 4.5×60', size: '4.5×60 mm' },
  { id: 'screw-roof-4.8x35', kind: 'screw', label: 'Roofing screw 4.8×35', size: '4.8×35 mm' },
  { id: 'nail-clout-3x20', kind: 'nail', label: 'Shingle clout nail 3×20', size: '3×20 mm' },
  { id: 'joist-hanger-45', kind: 'hanger', label: 'Joist hanger 45 mm', size: '45 mm' },
  { id: 'post-anchor', kind: 'anchor', label: 'Post anchor bracket', size: '—' },
  { id: 'angle-bracket', kind: 'bracket', label: 'Angle bracket', size: '—' },
  { id: 'epdm-adhesive', kind: 'adhesive', label: 'EPDM bonding adhesive', size: 'litres' },
]

export const DEFAULT_FASTENERS: FastenerConfig = {
  catalog: FASTENER_CATALOG,
  sheathing: { specId: 'nail-2.8x50', perimeterSpacing: 150, fieldSpacing: 300 },
  cladding: { specId: 'screw-4.5x60', spacing: 300 },
  batten: { specId: 'screw-5x80', spacing: 600 },
  framing: { specId: 'screw-5x100', perJoint: 2 },
  joistHanger: { specId: 'joist-hanger-45', perEnd: 1 },
  rafterFixing: { specId: 'angle-bracket', perEnd: 1 },
  postAnchor: { specId: 'post-anchor', perPile: 1 },
  roofCovering: { specId: 'nail-clout-3x20', kind: 'nailsPerSqm', ratePerSqm: 20 },
}

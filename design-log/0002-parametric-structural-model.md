# Design Log #0002 — Parametric Structural Model

## Background

The pure model layer (#0001) turns a `ShedConfig` into geometry: structural members
(timber), panels (sheet/area goods), and piles.

## Problem

Represent a framed shed parametrically so any dimension/spacing/profile change re-derives
correct geometry, drives the BOM, and renders — without three.js in the model.

## Questions and Answers

- **Foundation config?** Pile **count per axis** + configurable X/Y spacing, defaults derived
  from base size & count. Corner piles, no per-pile type.
- **Timber config granularity?** A shared **profile library** (cross-sections); each structural
  **role** references a profile. Presets (light/normal/heavy) write roles + spacings on top.

## Design

Core types (`src/model/types.ts`):

```ts
interface Member {
  role: StructuralRole
  profileId: string
  thickness
  width
  start: Vec3
  end: Vec3
  up: Vec3
  length
}
interface Panel {
  kind: PanelKind
  origin: Vec3
  u: Vec3
  v: Vec3
  normal: Vec3
  thickness
  offset
  shape: 'rect' | 'triangle'
  area
}
interface Pile {
  x
  z
  top
  bottom
  size
}
interface ShedModel {
  members
  panels
  piles
  openings
  joints
  floorTopY
  bbox
}
```

Coordinate system: **Y up**, base on XZ, origin at a base corner. X = width, Z = depth.

`buildModel(config)` (`src/model/build.ts`) composes, in order:
`buildFoundation → buildFloor → buildWalls → buildRoof`, then computes the bbox.

- A **member** is a swept profile: `makeMember(role, profile, start, end, up)`. `up` orients the
  cross-section; render builds an oriented box from `(thickness × width × length)`.
- A **panel** is a rectangle or right-triangle with an **explicit `normal`** and signed `offset`
  along it (so layer stacking direction is unambiguous — see #0003).
- Openings (`openings.ts`) inject framing (king/jack studs, header, sill, cripples) and clamp
  opening height to the wall (sill + height + header + plates ≤ wall height).
- Wall sheets are cut around openings via a band/strip decomposition (`sheets.ts`).

## Examples

✅ Stud profile chosen by role: `roles.stud → '45x95'`; change once, every stud updates.
❌ Hardcoding light/normal/heavy as three code paths — replaced by presets over the same schema.

## Trade-offs

- ✅ Members store centerlines + `up`, not meshes → render/BOM/export reuse them.
- ✅ Explicit panel `normal` (not `cross(u,v)`) → reliable offsets (root-cause fix, #0003).
- Joist/beam orientation simplified (joists span depth, beams a pile-to-pile grid).

## Verification

Member/panel counts and `floorTopY` derive from config; asserted in the test suite (#0007).

## Implementation Results

Implemented. `floorTopY = exposedHeight + beam.width + joist.width + deckThickness` (verified).
Grade beams form an interconnected pile-to-pile grid; floor has rim joists.

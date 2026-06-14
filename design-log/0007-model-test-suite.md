# Design Log #0007 — Model Test Suite

## Background

The model layer's geometry invariants were repeatedly verified by hand during development.
Those checks should be permanent.

## Problem

Lock in the structural invariants so regressions (corner protrusions, wrong stacking, batten
gating, overhangs) are caught automatically.

## Questions and Answers

- **Runner?** Vitest (idiomatic for Vite). Model is pure TS, so tests run without a browser.
- **Where?** `tests/` (added to `tsconfig.app.json` include so they're type-checked too).

## Design (`tests/model.test.ts`)

Build the default model once; assert invariants with a 1 mm tolerance:

- Foundation: pile count, piles sized to beam, faces inside footprint, perimeter beams reach corners.
- Floor: `floorTopY` formula, deck flush at floor level, joist+rim count, rim faces on deck edge.
- Walls/corners: front = higher eave, no stud pokes outside footprint, front/back OSB laps, side
  OSB butts, side cladding extends past corner, gable triangles per layer, gable coplanar with body.
- Plates: double > single. Roof: rafter count, rafters within footprint, fascia (4) + soffit (4),
  battens only when ventilated+enabled, battens span full width, roofing>membrane>OSB offset,
  independent overhangs. Openings: height clamped. Presets: stud spacing per grade. Determinism.

## Examples

✅ Assert the **roof deck panel extent** for overhangs (not rafter centerlines, which are offset
along the normal) — caught a wrong assumption.
❌ Filtering front plates by `z ≈ 0` — plates are inset in z; the filter caught nothing (false pass).
Fixed to "no member exceeds the footprint", a stronger non-vacuous invariant.

## Trade-offs

- ✅ Pure-model tests are fast and browser-free.
- Render-only behavior (textures, edges, z-fighting) is verified visually, not unit-tested.

## Verification

`npm test` → all green; `tsc` type-checks tests via `tsconfig.app.json`.

## Implementation Results

27/27 passing. Two real bugs were found while writing tests (vacuous stud check; rafter-centerline
vs deck-extent assumption) and fixed.

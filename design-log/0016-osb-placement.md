# Design Log #0016 — OSB Placement (inside/outside) + Under-joist OSB

## Background

Wall & roof OSB is currently always **outboard** of the studs/rafters. Per the building-science
discussion, a heated shed is often better with OSB **inboard** (warm-side air/vapour control) and only
a breather membrane + cladding/roofing outside. Also, the floor has no OSB between the joists.

## Problem

1. **OSB side** — per-surface option: wall OSB and roof OSB each **inside** or **outside** the
   frame (independent).
2. **Under-joist OSB** — always add an OSB layer at the **bottom of the joists**, using the **wall OSB
   profile** (thickness), filling **only the bays between joists** — not a continuous deck spanning
   between the joists and the grade beams.

## Questions and Answers

- **Q1. What moves when OSB is inside?** **A:** The OSB layer moves to the inboard face of the frame;
  the outer layers (membrane → batten cavity → cladding/roofing) then stack directly from the frame's
  outer face (no OSB thickness outside). Insulation stays in the cavity. For gable walls the inside
  OSB butts at the footprint (`lap = 0`) rather than lapping outward.
- **Q2. Under-joist OSB — its own layer/material or merged with wall OSB?** **A: Its own** material
  `osb-underfloor` (label "OSB under-joists") + Layers entry (group Floor) + BOM line, but using the
  **wall OSB thickness** and a default price equal to wall OSB. "Separate OSB layer" ⇒ a distinct
  Layers toggle; "wall osb profile" ⇒ wall thickness/price.
- **Q3. Geometry of under-joist OSB?** **A:** A horizontal OSB slab just below the joist bottoms,
  tiled over the floor rect with the **joists (incl. the two rim joists) subtracted as holes**, so it
  fills the bays only and leaves the joists exposed.

## Design

- **Config** (`types.ts`, `defaults.ts`): `OsbSide = 'inside' | 'outside'`; `WallConfig.osbSide` and
  `RoofConfig.osbSide` (default `'outside'`).
- **Walls** (`walls.ts`): `osbInside = osbSide==='inside'`; `outerBase = osbInside ? 0 : osb` (the
  offset the outer layers stack from); `osbOffset = osbInside ? −stud.width − osb/2 : osb/2`;
  membrane/batten/cladding offsets use `outerBase` (replacing the literal `osb`); OSB tile uses
  `outline(0)` when inside.
- **Roof** (`roof.ts`): `outerBase = osbInside ? rafter.width : rafter.width + osb`;
  `osbOffset = osbInside ? −osb/2 : rafter.width + osb/2`; membrane/batten/roofing offsets use
  `outerBase`.
- **Under-joist OSB** (`floor.ts`): new material `osb-underfloor` (wall thickness); `tilePolygon` at
  `y = joistBottom` (normal up, offset `−wallOsb/2`) over the floor rect minus every joist footprint
  (z-joists full depth + the two x-rim joists).
- **Material/BOM/render plumbing**: `MaterialId += 'osb-underfloor'`; `materialSpecs` entry;
  `pieceLines`/`waste.ts` OSB loops include it; `pieceLayer['osb-underfloor'] = 'floorUnderOsb'`; new
  `LAYERS` entry (Floor group); `DEFAULT_PRICES['sheet:osb-underfloor']`.
- **UI** (`ConfigPanel.tsx`): an "OSB position" select (Outside / Inside) in the Walls and Roof
  sections.

## Implementation Plan

1. Config + defaults + prices.
2. `materials.ts` MaterialId + spec.
3. `walls.ts` / `roof.ts` offsets.
4. `floor.ts` under-joist OSB.
5. `render.ts` layer + routing; `bom/compute.ts` + `optimizer/waste.ts` OSB loops.
6. `ConfigPanel.tsx` selects.
7. Tests: osbSide flips the OSB offset inboard/outboard; under-joist OSB exists, sits below the joists,
   and leaves gaps at the joist lines (not a full slab).

## Trade-offs

- ✅ Reuses the tiler + layer/BOM machinery. OSB-inside is the correct warm-side build.
- ❌ Inside OSB uses a simple `lap = 0` corner (butt) rather than modelling the interior corner lap
  exactly — fine for viz/BOM. Shingles still need an outboard deck; the app won't stop you choosing
  inside OSB + shingles (physically wrong, your call).

## Verification

- Toggling wall/roof OSB position moves the OSB layer inboard/outboard (piece offset sign flips) and
  the outer layers restack; under-joist OSB appears below the joists in the bays and is counted as
  "OSB under-joists" at the wall thickness.

## Implementation Results

Implemented as designed. `OsbSide` + `walls.osbSide`/`roof.osbSide` (default `outside`). In
`walls.ts`, `outerBase = osbInside ? 0 : osb` drives the membrane/batten/cladding offsets and
`osbOffset = osbInside ? −stud.width − osb/2 : osb/2`; inside OSB tiles with `outline(0)`. In
`roof.ts`, `outerBase = osbInside ? rafter.width : rafter.width + osb`,
`osbOffset = osbInside ? −osb/2 : rafter.width + osb/2` (fascia follows the recomputed roofing
offset). New material `osb-underfloor` (wall thickness) generated in `floor.ts` via `tilePolygon` at
`joistBottom` over the floor rect minus the z-joists and the two x-rim joists → fills the bays only;
routed to a new **Under-joist OSB** layer (Floor group), counted in the BOM/optimizer OSB loops, and
priced by `sheet:osb-underfloor` (= wall OSB). UI: "OSB position" selects in Walls and Roof.

**Deviation:** inside OSB uses a butt corner (`lap = 0`) rather than an exact interior-corner lap
(fine for viz/BOM). The app allows inside-OSB + shingles even though shingles need an outboard deck.

**Tests:** 76 total (added: wall/roof OSB offset flips sign with `osbSide`; under-joist OSB is at
wall thickness, sits below the deck, and covers less than the full footprint). `tsc` + Prettier +
`vite build` clean (`osb-underfloor` MaterialId is exhaustive across `pieceLayer`).

### Follow-ups

- **Under-joist OSB covers the joists, cut around the grade beams** (not the joists). The subtracted
  holes are the grade-beam footprints (the z-beams at each pile column + the x-beams at each pile
  row), so the panel spans across the joists and is only absent over the beams where the joists bear —
  never sandwiched between a joist and a beam.
- **Shares the "OSB deck" layer.** `osb-underfloor` routes to the `floorDeck` layer (no separate
  Layers toggle), so the OSB-deck checkbox hides both the deck and the under-joist OSB. It remains a
  **separate BOM line** (own MaterialId → "OSB under-joists", wall thickness/price).
- Two default-sensitive tests (corner-lap, insulation-inboard-of-OSB) were pinned to `osbSide:
'outside'` since the default flipped to `inside`.

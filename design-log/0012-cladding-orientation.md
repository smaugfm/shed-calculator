# Design Log #0012 — Cladding Orientation (vertical / horizontal)

## Background

Cladding is currently tiled as **vertical** boards (`pieceW = board width`, `pieceH = board length`),
and wall battens always run **vertically**. In real construction the battens run **perpendicular** to
the cladding so each board is fixed across several battens: vertical cladding → horizontal battens,
horizontal cladding → vertical battens.

## Problem

Add a wall **cladding orientation** (`vertical | horizontal`) that:

1. lays the cladding boards in that direction, and
2. produces battens running **perpendicular** to the boards.

## Questions and Answers

- **Q1. New config field / default?** **A:** `walls.claddingOrientation: 'vertical' | 'horizontal'`,
  default `'vertical'` (current board direction). Note: with the default, battens now become
  **horizontal** (today they're vertical) — that's the intended correct construction.
- **Q2. Batten layer routing.** **A:** Wall battens that become horizontal must not be mistaken for
  roof battens. `memberLayer` currently splits on "is the member horizontal" — switch to the roof
  batten's unique trait: its `up` (down-slope tangent) has `up.y < 0`. Wall battens have `up.y ≥ 0`
  (vertical batten `up.y = 0`, horizontal batten `up = (0,1,0)`), so `up.y < 0 ⇒ roofBattens`.
- **Q3. Gable walls with horizontal battens.** **A:** Each horizontal batten spans `u ∈ [0, uHi(y)]`,
  where `uHi = min(L, (maxTop − y) / slope)` clips it to the rake (full `L` below the eave). Cut at
  openings by subtracting their `u`-intervals at that height.
- **Q4. BOM board length axis.** **A:** Boards are nested into `cladding.length` along their long
  axis — `pieceBBox.h` for vertical, `pieceBBox.w` for horizontal.

## Design

**Config** (`config/types.ts`, `defaults.ts`): `WallConfig.claddingOrientation: 'vertical' |
'horizontal'` (default `'vertical'`).

**Cladding spec** (`materials.ts`): orientation swaps the cell/step axes.

```
vertical:   pieceW = width,  pieceH = length, courseStep = length, columnStep = width
horizontal: pieceW = length, pieceH = width,  courseStep = width,  columnStep = length
```

**Battens** (`walls.ts`): vertical cladding ⇒ horizontal battens (run along `u`, step up in `v`,
`up = (0,1,0)`, clipped to the rake on gables, cut at openings); horizontal cladding ⇒ vertical
battens (the existing path, `up = tangent`).

**Render** (`render.ts`): `memberLayer` batten case → `member.up.y < 0 ? 'roofBattens' : 'battens'`.

**BOM** (`bom/compute.ts`): cladding board length axis follows the orientation (`h` vs `w`).

**UI** (`ConfigPanel.tsx`): a `SelectRow` "Cladding direction" (Vertical / Horizontal) in the Walls
section.

## Implementation Plan

1. `types.ts` + `defaults.ts` — field + default.
2. `materials.ts` — orientation-aware cladding spec.
3. `walls.ts` — branch battens on orientation (add horizontal-batten generation).
4. `render.ts` — fix batten layer routing.
5. `compute.ts` — board length axis.
6. `ConfigPanel.tsx` — direction select.
7. Tests: orientation flips batten direction; cladding cell aspect flips; battens still cut at
   openings.

## Trade-offs

- ✅ Correct perpendicular batten/cladding construction; reuses the tiler + `subtractIntervals`.
- ❌ Horizontal battens on gables form a stair-stepped rake edge (acceptable / realistic).

## Verification

- Switching the direction flips both the cladding board aspect and the batten run direction; battens
  stay cut around openings and clipped to the gable; roof battens are unaffected.

## Implementation Results

Implemented as designed. `WallConfig.claddingOrientation: 'vertical' | 'horizontal'` (default
`'vertical'`). `materialSpecs` swaps the cladding cell/step axes by orientation. `walls.ts` branches
the batten generation: vertical cladding ⇒ horizontal battens (run along `u`, step up in `v`,
`up = (0,1,0)`, clipped to the rake via `uHi = min(L, (maxTop − y)/slope)`, cut at openings by
subtracting their `u`-intervals); horizontal cladding ⇒ the existing vertical battens. `render.ts`
`memberLayer` now routes battens by `up.y < 0 ⇒ roofBattens` (down-slope) else `battens`, so
horizontal wall battens are no longer misrouted to the roof layer. `bom/compute.ts` nests cladding
along its long axis (`h` vertical / `w` horizontal). UI: a "Cladding direction" select in the Walls
section.

**Deviation:** the existing roof-batten test helper keyed on member geometry ("runs along x"), which
now also matches horizontal wall battens — updated it (and `memberLayer`) to the `up.y < 0`
discriminator.

**Tests:** 53 total (added: wall battens run perpendicular to the cladding for both orientations;
cladding cell aspect flips with orientation). `tsc` + Prettier + `vite build` clean.

### Follow-up — trim battens at opening edges

Added trim battens along each opening's edges that run **parallel** to the batten direction, so the
cladding ends abutting an opening are backed:

- Horizontal battens (vertical cladding): a horizontal batten just above the head (`v1 + width/2`)
  and just below the sill (`v0 − width/2`, skipped for floor-level doors), spanning the opening width.
- Vertical battens (horizontal cladding): a vertical batten just outside each jamb (`u0 − width/2`,
  `u1 + width/2`), spanning the opening height.

Each trim batten sits just clear of the void so it doesn't cross the opening. **Tests:** 54 total
(added an opening-edge trim-batten check for both orientations).

### Follow-up — counter-battens (cross ventilation)

A single batten layer that runs perpendicular to the cladding can trap water/air (e.g. vertical
cladding over horizontal battens has no drainage path). Added `walls.counterBattens: boolean`
(default `false`) that adds a **second, perpendicular** batten layer, regardless of cladding
orientation:

- The batten generation was refactored into `horizontalBattens(offset, trim)` /
  `verticalBattens(offset, trim)` helpers.
- **Primary** (cladding-fixing) layer runs perpendicular to the boards at `primaryBattenOffset` and
  carries the opening trims. **Counter** layer (when enabled) runs parallel to the boards at the
  inner `innerBattenOffset`, with no trims.
- With counter-battens the cladding is pushed out by one `batten.thickness`
  (`claddingOffset = primaryBattenOffset + batten.thickness/2 + GAP + facade/2`); without them the
  geometry is unchanged.

**Tests:** 55 total (added: enabling counter-battens yields both batten directions and pushes the
cladding outward). `tsc` + Prettier + `vite build` clean.

**Fix:** the counter layer was generated with `trim = false`, so the opening edges that run parallel
to it (head/sill for horizontal cladding, jambs for vertical cladding) got no batten — the primary
layer only trims its own perpendicular edges. Changed the counter layer to `trim = true`, so the two
layers together frame all four opening edges. **Tests:** 56 total (added: counter-batten trims the
head/sill edges the vertical primary layer can't reach).

# Design Log #0003 — Corner & Edge Alignment

## Background
Framing members and skin layers meet at building corners and at the floor/footprint edges.
Naive placement made pieces poke out or leave gaps.

## Problem
Two recurring failure modes:
1. A member **centered on an edge line** has half its thickness poking past the footprint
   (corner studs, perimeter grade beams, rim joists, outermost rafters).
2. Perpendicular **skin layers** (OSB/membrane/cladding) on adjacent walls leave a notch at
   the corner because each is offset outward and the neighbour doesn't cover the gap.

## Questions and Answers
- **One generic corner abstraction?** No (decided in conversation). Geometry differs too much
  (vertical walls vs sloped roof trim vs square-cut fascia). Keep a **consistent convention**,
  applied per context. Revisit if the shed gains L-plans/multiple roofs.

## Design
**Convention:** the *long pair* (front/back walls) runs through / wraps the corner; the
*short pair* (side walls) butts between them.

- **Inset framing to the footprint:** stud/plate centerlines sit `stud.width/2` inside the
  footprint (outer face on the line); end studs additionally clamped by `stud.thickness/2`.
  Perimeter grade beams extend to the corners; rim/edge joists inset by `joist.thickness/2`;
  outermost rafters clamped by `rafter.thickness/2`. Piles sized to the beam, edge piles inset.
- **Skin lapping per layer** (`walls.ts`): front/back panels extend outward by
  `offset + thickness/2` (lap over the side); side panels extend inward by `offset − thickness/2`
  (butt to the front/back inner face). OSB inner face sits on the footprint so its side
  extension is 0; membrane/cladding extend.
- **Membrane outside OSB, battens press it, cladding outside:** correct ventilated-facade order.
- **Batten orientation:** `up` = in-plane tangent, so the batten **thickness** (not width)
  forms the cavity depth (root-cause of a "battens poke through" bug).

## Examples
✅ `lap = gable ? offset - thickness/2 : offset + thickness/2` — front laps, sides butt.
❌ Panel offset via `sign(cross(u,v))` — pointed inward on some faces; replaced by explicit `normal`.

## Trade-offs
- ✅ One convention reused for walls and roof trim (#0004).
- ❌ Per-context code (no shared helper) — accepted for a single rectangular shed.

## Verification
"No stud/rafter pokes outside the footprint"; "front OSB laps, side OSB butts"; perimeter beams
reach corners — all asserted in #0007.

## Implementation Results
Implemented across `model/floor.ts`, `model/walls.ts`, `model/roof.ts`, `model/sheets.ts`.
Gable triangles share the same lap as the rectangular wall body.

# Design Log #0004 — Roof System

## Background

Mono-pitch roof over the post-and-beam box: rafters, sheathing, membrane, covering, plus
eave/rake trim and overhangs.

## Problem

Build a sloped roof that sits correctly on the walls, overhangs cleanly on all sides, closes
its underside, and doesn't let any layer protrude through another or through the trim.

## Questions and Answers

- **Which wall is high?** Front wall is the **higher eave**; roof slopes front→back.
- **Side walls?** Rectangular framing to the low height **plus a gable triangle** rising to the
  roof line; rafters bear entirely on the front/back walls.
- **Overhangs?** Independent **front / rear / sides** values (not a single number).
- **Battens?** Only for ventilated covering; an explicit **toggle** (disabled+greyed for
  shingles) and a **configurable spacing**.

## Design (`src/model/roof.ts`)

- Roof plane via outward `normal = normalize(0, depth, Δh)`; `bearY(z)` = wall-top bearing line.
- **Rafters** rest on the plates (centerline = bearing + `normal·(rafter.width/2)`), `up = normal`.
- Layer stack along the normal: rafter → OSB → membrane → (battens) → roofing, each with a small
  gap to avoid coplanar z-fighting.
- **Soffit**: four panels on the rafter-underside plane closing the overhang ring.
- **Fascia/barge**: a configurable `fascia` role. **Eave fascias are square-cut** (`up = normal`)
  so the sloped assembly butts in; **rake/barge boards are vertical**. Corner convention (#0003):
  rakes run full length, eave fascias butt between them. Boards hang from the roofing plane
  (top tucked `reveal` under the roofing edge → no lip, no z-fighting).
- **Battens** run full width (to the barges), `up = down-slope tangent` (thickness = cavity),
  inset at both eaves by `push + edge` so they clear the square-cut fascias at any pitch.

## Examples

✅ `roof.overhangs = { front: 200, rear: 150, sides: 150 }` drives deck, rafters, fascia, soffit together.
❌ Vertical eave fascia → sloped rafters/roofing pierced it; fixed by square-cutting (`up = normal`).

## Trade-offs

- ✅ Everything derives from `bearY`, `normal`, overhangs → consistent.
- Soffit follows the rafter-underside plane (sloped), not a boxed level soffit — simpler, fine for a shed.

## Verification

Rafters within footprint; deck honors independent overhangs; battens only when ventilated+enabled
and span full width; roofing offset > membrane > OSB — asserted in #0007.

## Implementation Results

Implemented. Eave swap, overhangs, square-cut fascia, soffit, batten orientation + spacing +
toggle, and the no-lip fascia all landed. 27/27 tests pass.

# Design Log #0006 — Bill of Materials

## Background
The configurator must output a full material list derived from the same `ShedModel`.

## Problem
Turn geometry into purchasable quantities: timber by profile, sheet goods by area/count,
membrane/covering/cladding areas, piles, and **fasteners**.

## Questions and Answers
- **Fasteners configurable?** Yes — a **catalog** + per-connection assignment (mirrors the timber
  profile/role pattern): sheathing, cladding, batten, framing, joist hanger, rafter fixing, post
  anchor, roof covering. Quantities derive from model geometry × spacing/rate params.

## Design (`src/bom/compute.ts`)
`computeBom(model, config): BomLine[]`, grouped by category:
- **Timber**: group `members` by `profileId`; pieces, total metres, board count vs stock length.
- **Sheets**: OSB (floor/wall/roof) + soffit areas → sheet count at stock sheet size.
- **Membrane & covering**: roof/wall membrane, roofing (shingles | metal), facade (cladding | metal).
- **Foundation**: pile count.
- **Fasteners**: sheathing from perimeter+field spacing; cladding/battens from run/spacing; framing
  per joint; hangers per joist end; anchors per pile; roof covering per m² (pieces or adhesive litres).

```ts
interface BomLine { category: BomCategory; label: string; spec: string; qty: number; unit: string }
```

## Examples
✅ Fascia boards appear automatically — they're members with a `fascia` profile, grouped by profileId.
✅ Change sheathing fastener spacing → sheathing nail count changes.

## Trade-offs
- ✅ BOM reads the derived model → always consistent with the 3D view.
- Fastener counts are estimates (spacing/rate based), not engineered fixings.

## Verification
Hand-check a simple config (joist count = span/spacing + 1); change a spacing and watch counts move.

## Implementation Results
Implemented; rendered by `src/ui/BomTable.tsx` grouped by category. Doors/windows are not BOM
entities (only framed openings remain).

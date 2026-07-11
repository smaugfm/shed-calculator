# Design Log #0017 — Floor Insulation + "Used" in BOM

## Background

Walls and roof already carry mineral-wool insulation placed in the framing bays (`insulation-wall`,
`insulation-roof` — see `materialSpecs`, `tileBays`). The floor gained an under-joist OSB layer
(#0016) so the joist bays now form a closed cavity between the OSB deck (on top of the joists) and
the under-joist OSB (under the joists) — but nothing fills it.

## Problem

1. Add mineral wool to the floor, in the joist cavity between the deck OSB and the under-joist OSB.
2. In the BOM, every skin/sheet line shows "bought" and "off-cut" but not the **net** quantity that
   actually ends up in the structure. Add a "used" figure so you can see what's truly needed vs. the
   waste from stock sizing.

## Design

### Floor insulation (mirrors roof)

- `FloorConfig.insulation: InsulationConfig` (`{ enabled, rollLength }`), default `enabled: true`,
  `rollLength: 7500` — same shape as walls/roof.
- New material `insulation-floor` ("Mineral wool (floor)"): bay width = `floor.joistSpacing`, roll
  length = `floor.insulation.rollLength`, thickness = `joist.width − 2·INSULATION_RECESS` (recessed
  off the deck and under-joist OSB, so it tucks inside the joist depth).
- `buildFloor`: when enabled, `tileBays` over the floor plane (normal +Y, origin at `joistBottom`,
  `offset = joist.width/2` → centred at joist mid-height). Bays run **between** the main joists
  (`u` insets by `joist.thickness/2` each side) and span the depth **inside** the front/back rim
  joists (`v` from `joist.thickness` to `base.depth − joist.thickness`).
- Render: new layer `floorInsulation` (Floor group); `pieceLayer['insulation-floor']`. Hidden when
  the floor insulation is off (like the wall/roof insulation layers).
- BOM: extend the insulation loop with `['insulation-floor', config.floor.insulation,
config.floor.joistSpacing]`; category "Insulation", `piece:insulation-floor` (default ₴133/m²).
- UI: Floor section gets an "Insulation" checkbox + "Insulation roll length" row.

### "Used" in the BOM

Every cut-piece line (`Sheets` OSB, cladding, membrane, insulation) currently reads
`… bought · … off-cut`. Add the net `used` area/length (`Σ usedArea`) before "bought":
`X m² used · Y m² bought · Z m² off-cut`. Timber already reports "used"; roofing already reports
"laid" (its net). Only the sheet/skin lines change.

## Trade-offs

- ✅ Floor insulation reuses the exact wall/roof machinery (`insulation()` spec + `tileBays`).
  ❌ Bays run full depth between the rim joists — no per-pile/beam carve-out, but the beams are below
  the joist cavity so there's nothing to subtract there.

## Verification

- Default config renders wool in the floor joist bays, tucked between the two OSB layers; toggling
  "Insulation" in the Floor section hides/shows it and adds/removes the BOM line.
- Each sheet/skin BOM line shows used < bought, with off-cut = bought − used.
- `tsc` + build + tests clean.

## Implementation Results

Implemented as designed.

- **Config:** `FloorConfig.insulation: InsulationConfig`; default `{ enabled: true, rollLength: 7500 }`.
  Presets untouched (they patch `floor` partially, so they inherit the default).
- **Material:** `insulation-floor` ("Mineral wool (floor)") in `materialSpecs` — bay width
  `floor.joistSpacing`, thickness `joist.width − 2·INSULATION_RECESS`.
- **Model (`buildFloor`):** when enabled, `tileBays` over the floor plane (normal +Y, origin at
  `joistBottom`, `offset = joist.width/2`). Bays run between the rendered joist centres
  (`insetX(joistX)`), inset by `joist.thickness/2`, spanning `v = joist.thickness … depth −
joist.thickness` (inside the rim joists). Returned in `pieces`.
- **Render:** `floorInsulation` layer (Floor group, between "Joists & rim" and "OSB deck");
  `pieceLayer['insulation-floor']`. Hidden by `App.hiddenLayers` when the floor insulation is off.
- **BOM:** insulation loop extended with `insulation-floor` → category "Insulation",
  `piece:insulation-floor` (₴133/m² default).
- **UI:** Floor section — "Insulation" checkbox (marks preset custom) + "Insulation roll length".

### "Used" in the BOM

Added `Σ usedArea` as `… m² used` to every cut-piece line — OSB sheets, cladding, membrane, and
insulation — placed before "bought" (so each reads `used · bought · off-cut`). Timber ("m used") and
roofing ("m² laid") already reported their net, so they were left as-is.

**Deviations:** none. **Tests:** 77 total (added one to the `insulation` suite — floor wool present
only when enabled, recessed within the joist depth, centred between the two OSB layers). `tsc`,
Prettier, `vite build`, and `vitest` all clean.

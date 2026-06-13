# Shed Calculator & Constructor

Parametric configurator for a garden shed (post-and-beam, rectangular base, mono-pitch
roof). Configure dimensions, timber, piles, floor/wall/roof buildups, and openings; see a
live 3D model, measure it with a ruler, export glTF, and read a full bill of materials.

## Stack

Vite + React + TypeScript + three.js. three.js is driven imperatively in a canvas; React
handles the config UI and BOM table.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
npm run typecheck  # tsc --noEmit
npm test           # vitest run — model invariants
```

## Tests

`tests/model.test.ts` (Vitest) locks in the model invariants verified during development:
foundation alignment, floor stack / deck flush, corner lapping (front/back lap, sides butt),
gable triangles, plate counts, roof layer stacking, ventilated battens, and opening-height
clamping. Run with `npm test`.

> Requires network access to the npm registry for the first `npm install`.

## Architecture

The core is a **pure model layer** with no three.js dependency:

```
config (user intent)  ──►  buildModel(config): ShedModel  ──►  three.js render
                                     │                     └─►  computeBom(): BOM
                                     └─────────────────────►    GLTFExporter
```

`ShedModel` (members, panels, piles, openings) is the single derived geometry that the
viewer, the BOM, and the glTF export all consume — so the picture and the numbers can
never disagree. All dimensions are in millimetres.

```
src/
  config/   types, profile library, fastener catalog, defaults, presets
  model/    foundation, floor, walls, openings, roof, buildModel orchestrator, geometry
  bom/      timber / sheets / membrane / fasteners computation
  viewer/   Scene, render (model → meshes), Ruler, Exporter
  ui/       App, ConfigPanel, BomTable, Toolbar, Viewport, useShed
```

## Features

- **Dimensions:** base width/depth, low/high eave heights (mono-pitch slope derived).
- **Foundation:** pile count per axis + X/Y spacing (defaults derived from base & count).
- **Timber:** shared cross-section profile library; each role (beam/joist/rafter/stud/
  plate/header/batten) picks a profile. Light / normal / heavy presets sit on top.
- **Walls:** ventilated facade — studs → OSB → membrane → battens → cladding (selectable).
- **Roof:** mono-pitch — rafters → OSB → EPDM → shingles, or → membrane → battens → roofing.
- **Openings:** doors/windows placed by wall + offset; framing (king/jack studs, header,
  sill + cripples) is generated automatically and intersecting studs removed.
- **Fasteners:** configurable catalog + per-connection assignment; quantities derived from
  the model geometry (sheathing from spacing, hangers per joist end, anchors per pile, …).
- **Ruler:** toolbar toggle, click two points (snaps to framing vertices), live distance.
- **Export:** download a binary `.glb`.
- **Layers:** toggle framing / battens / OSB / cladding / roof / openings / piles.

## Known simplifications (MVP)

- Openings are placed via wall + numeric offset (drag-to-place not yet implemented).
- Side-wall sheathing/cladding panels use the average wall height for the rendered sheet
  (area is computed correctly as the trapezoid; the rendered rectangle is approximate).
- Layer-stack offsets (OSB/membrane/batten/cladding) are stacked along the wall normal /
  vertical for the roof — visually faithful, not millimetre-exact on the slope.
- Fasteners/hardware are estimated, not engineered; no structural sizing/loads.

# Design Log #0005 — Rendering, Materials & Layers

## Background

The viewer turns a `ShedModel` into a three.js scene, with textures, edge outlines, toggleable
layers, a live ruler, and glTF export.

## Problem

Render members/panels faithfully, let the user see-through the structure, keep materials looking
like real materials, and avoid z-fighting — all rebuilding cleanly on every config change.

## Questions and Answers

- **Layer granularity?** Per-element layers grouped Foundation / Floor / Walls / Roof, toggled in
  the **sidebar** (not the toolbar). `Roof battens` appears only when battens are present.
- **Textures?** Procedural canvas textures (no external assets): OSB, timber cladding (vertical
  boards), corrugated metal (facade), metal-shingle (roof), asphalt shingles, breather membrane
  (light grey, branded, mirrored to read from outside).
- **Edges?** Thin black outlines on every object (`EdgesGeometry`).

## Design (`src/viewer/`)

- `Scene.ts`: camera (**near = 50** — the key z-fighting fix: tiny near-plane wrecked depth
  precision), OrbitControls, lights, CSS2D label renderer, resize, render loop. No ground grid.
- `render.ts`: `buildSceneObject(model, config)` → a `THREE.Group` of named sub-groups (one per
  `LayerName`). Members → oriented boxes; panels → boxes (rect) or flat triangles (gable).
  Textured materials are cloned **per panel** with repeat sized to the panel, flagged
  `userData.disposable`. `withEdges()` adds a `LineSegments` child per mesh.
- `textures.ts`: lazily-built, cached `CanvasTexture`s.
- `Ruler.ts`: two-click measure with vertex snapping + CSS2D label. `Exporter.ts`: `GLTFExporter` → `.glb`.
- `Scene.disposeGroup` disposes mesh + edge geometries and cloned textures/materials on rebuild.

## Examples

✅ `layers[name]` checkbox → `scene.setLayerVisible(name, visible)`; hiding a group hides its edges too.
❌ Camera `near = 1, far = 200000` → ~4 mm depth resolution at viewing distance → membrane tearing.

## Trade-offs

- ✅ Per-panel cloned textures → consistent texel size; cost: more materials (few dozen, fine).
- ✅ Procedural textures → offline, no assets; cost: not photoreal.
- 1 px `LineBasicMaterial` edges (most GPUs ignore line width); could upgrade to `Line2` if needed.

## Verification

Visual: layers toggle, textures render, no z-fighting at the membrane/fascia. Build clean.

## Implementation Results

Implemented. Granular layers (dynamic `roofBattens`), all textures, edges, ruler, glTF export,
near-plane fix, grid removed.

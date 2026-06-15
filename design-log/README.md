# Design Log

Per `CLAUDE.md`: check these before making changes; create a new numbered log for new features
or architectural changes, and append an "Implementation Results" section as you implement.

These initial logs are **retroactive** — they document the system as built over the iterative
sessions, so each carries its Implementation Results inline.

| #    | Title                                                                        | Scope                                                     |
| ---- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| 0001 | [Architecture & Stack](./0001-architecture-and-stack.md)                     | Pure `config → model → BOM` core; Vite + React + three.js |
| 0002 | [Parametric Structural Model](./0002-parametric-structural-model.md)         | Member/Panel/Pile types, coordinate system, `buildModel`  |
| 0003 | [Corner & Edge Alignment](./0003-corner-and-edge-alignment.md)               | Inset framing; lap/butt skin convention                   |
| 0004 | [Roof System](./0004-roof-system.md)                                         | Mono-pitch, overhangs, fascia/barge, soffit, battens      |
| 0005 | [Rendering, Materials & Layers](./0005-rendering-materials-and-layers.md)    | three.js viewer, textures, edges, layers, ruler, export   |
| 0006 | [Bill of Materials](./0006-bill-of-materials.md)                             | Timber/sheets/membrane/fasteners derivation               |
| 0007 | [Model Test Suite](./0007-model-test-suite.md)                               | Vitest invariants (27 tests)                              |
| 0008 | [Discrete Materials](./0008-discrete-materials.md)                           | Tiled OSB/cladding/roofing pieces, clipping, openings     |
| 0009 | [Nesting Cut Optimizer](./0009-nesting-cut-optimizer.md)                     | 2D/1D cutting-stock packers for the cut list              |
| 0010 | [Stock Lengths & Tiled Membrane](./0010-stock-lengths-and-tiled-membrane.md) | Per-profile board lengths; membrane as overlapping rolls  |
| 0011 | [Insulation](./0011-insulation.md)                                           | Mineral-wool cavity rolls, layer, rough edges, BOM        |
| 0012 | [Cladding Orientation](./0012-cladding-orientation.md)                       | Vertical/horizontal cladding with perpendicular battens   |
| 0013 | [BOM Cost Editing](./0013-bom-costs.md)                                      | Per-line unit prices, inline + dialog editing, totals     |
| 0014 | [Click-to-Select Parts](./0014-pick-selection.md)                            | 3D pick, red highlight, role/material + dimensions panel  |

Next log number: **0015**.

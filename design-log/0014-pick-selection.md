# Design Log #0014 — Click-to-Select Parts

## Background

The viewer renders the shed as grouped three.js meshes (members, pieces, panels, piles) but parts
aren't interactive. There's already a `Ruler` tool that raycasts the model group.

## Problem

Click any part in the 3D view → that part **highlights** (red) and an **info panel** shows what it is
(role/material) and its dimensions.

## Questions and Answers

- **Q1. What info?** **A:** A title (role for timber, material for skins, "Pile"/"Soffit") plus rows:
  timber → profile, section (t×w), length; pieces → material, size (w×h), area; piles → size, height.
- **Q2. Where shown?** **A:** A small overlay panel in the viewport corner (no new sidebar).
- **Q3. Click vs orbit-drag?** **A:** Select on `pointerup` only when the pointer barely moved since
  `pointerdown` (so dragging to orbit doesn't select). Clicking empty space deselects.
- **Q4. Interaction with the ruler?** **A:** Selection is disabled while the ruler tool is active.
- **Q5. Hidden layers?** **A:** three's raycaster does **not** honour `.visible` while traversing, so
  hidden-layer parts would still be picked. `Selection` filters each hit through an `isVisible` walk
  (the mesh and all ancestors must be visible — layer visibility lives on the parent group).

## Design

- **`viewer/selectionInfo.ts`** (pure, testable): `SelectionInfo { title, rows: [label, value][] }`
  and `memberInfo / pieceInfo / panelInfo / pileInfo(element, config)` builders (use `ROLE_LABELS`,
  `materialSpecs`, `findProfile`).
- **`render.ts`**: when building each mesh, attach `mesh.userData.pick = SelectionInfo`. Export the
  type re-exported from selectionInfo.
- **`viewer/Selection.ts`** (mirrors `Ruler`): on a non-drag `pointerup`, raycast `modelGroup`, walk
  up to the object carrying `userData.pick`, **highlight** it (swap its material for a shared red
  `MeshStandardMaterial`, saving the original to restore), and fire `onChange(info)`. Empty hit →
  `clear()` (restore + `onChange(null)`). `clear()` also runs before each model rebuild.
- **`Viewport.tsx`**: construct a `Selection` alongside `Scene`/`Ruler`; route `onChange` to local
  state; enable when the ruler is off, disable (and clear) when it's on; clear on model rebuild.
  Render an overlay `<div className="pick-panel">` with the title + rows when something is selected.
- **`index.css`**: style the overlay.

## Implementation Plan

1. `viewer/selectionInfo.ts` (+ unit tests).
2. `render.ts` attach `userData.pick`.
3. `viewer/Selection.ts`.
4. `Viewport.tsx` wiring + overlay.
5. `index.css`.

## Trade-offs

- ✅ Reuses the ruler's raycast pattern; highlight is a per-mesh material swap (shared red material),
  cheap and reversible. ❌ Highlight recolors the face only (black edge outline stays) — fine, reads
  clearly. Selection is cleared on any model/layer change (acceptable).

## Verification

- Clicking a part turns it red and shows its role/material + dimensions; clicking empty space or
  toggling the ruler clears it; hidden layers can't be picked; dragging to orbit doesn't select.
- Unit tests: the info builders produce the expected title/rows for a member / piece / pile.

## Implementation Results

Implemented as designed. `viewer/selectionInfo.ts` holds `SelectionInfo` + pure builders
(`memberInfo`/`pieceInfo`/`panelInfo`/`pileInfo`). `render.ts` attaches `mesh.userData.pick` to every
pile/member/panel/piece mesh and re-exports `SelectionInfo`. `viewer/Selection.ts` mirrors `Ruler`:
on a non-drag `pointerup` it raycasts the model group, walks up to the mesh carrying `userData.pick`,
swaps its material for a shared red highlight (saving the original), and fires `onChange`; empty hit
or `clear()` restores it. `Viewport.tsx` owns the `Selection`, enables it only when the ruler is off,
clears it before each model rebuild, and renders a `.pick-panel` overlay (title + rows) bottom-left.

**Deviations:** none of substance. Selection clears on any model/config/layer change (rebuild
disposes the group). Highlight recolors the face; the black edge outline stays.

**Fix:** the raycaster ignores `.visible`, so it initially picked parts on hidden layers. `pick()`
now skips any hit whose mesh (or an ancestor group) is invisible via an `isVisible` walk.

**Tests:** 64 total (added 3 in `tests/selection.test.ts` for the info builders — member, piece,
pile). `tsc` + Prettier + `vite build` clean. (The raycast/highlight wiring itself is UI/three and
verified manually.)

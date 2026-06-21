# Design Log #0013 — BOM Cost Editing

## Background

The BOM panel lists materials (timber, sheets, insulation, membrane/covering, foundation, fasteners)
with quantities and units, but no prices. Users want to price the build.

## Problem

Let users assign a **unit price** to each BOM line and see per-line and total costs.

- **Inline**: click a material's price in the BOM panel and edit it in place.
- **Bulk**: a dedicated "Edit costs" dialog with a table of all lines, tab-navigable inputs.

## Questions and Answers

- **Q1. Where are prices stored / persisted?** **A:** `config.prices: Record<priceKey, number>`
  (unit price), persisted with the rest of the config in localStorage. Keyed by a **stable**
  `priceKey` so a price sticks to its material across rebuilds (and survives even when that line is
  temporarily absent).
- **Q2. What is the key?** **A:** A stable id per line, set by `computeBom`:
  `timber:<profileId>`, `sheet:<materialId>`, `piece:<materialId>` (cladding/membrane/insulation/
  roofing), `panel:soffit`, `foundation:piles`, `fastener:<specId>`.
- **Q3. Cost basis?** **A:** `cost = qty × unitPrice` (the line's existing `qty`/`unit`). Grand total
  = Σ line costs.
- **Q4. Currency?** **A:** Single symbol `£` (project references diysheds.co.uk). Hard-coded constant
  for now; can be made configurable later.
- **Q5. Persistence of dynamic keys.** **A:** `config.prices` is a dynamic-key map; the config
  `deepMerge` only keeps keys present in the defaults, so `loadConfig` restores `prices` **wholesale**
  from the stored JSON.

## Design

- **Types** (`bom/types.ts`): `BomLine` gains `priceKey: string`, `unitPrice: number`, `cost: number`.
  `ShedConfig.prices: Record<string, number>` (`config/types.ts`, default `{}`).
- **Compute** (`bom/compute.ts`): each line builder sets `priceKey`; a final pass fills
  `unitPrice = config.prices[priceKey] ?? 0` and `cost = qty × unitPrice`.
- **Format** (`ui/cost.ts`): `CURRENCY = '£'`, `formatMoney(n)`.
- **BomTable** (`ui/BomTable.tsx`): a price column — shown as text, click to edit inline (a single
  `editingKey` in local state → `NumberInput`); commit writes `config.prices[key]` via `setConfig`.
  A per-category subtotal column is out of scope; show a **grand total** row and an "Edit costs…"
  button.
- **PricesDialog** (`ui/PricesDialog.tsx`): modal (reuses existing `.modal*` CSS) with a row per BOM
  line (label · spec · `NumberInput` price); native tab order cycles the inputs. Writes the same
  `config.prices`.
- **Wiring**: `App.tsx` passes `config`/`setConfig` to `BomTable`. Price edits change `config`
  → `bom` recomputes (memoized) → costs/total update live.

## Implementation Plan

1. `config/types.ts` + `defaults.ts` (`prices`), `useShed.ts` (restore `prices` on load).
2. `bom/types.ts` + `bom/compute.ts` (priceKey/unitPrice/cost).
3. `ui/cost.ts`.
4. `ui/BomTable.tsx` (inline edit + total + button) and `ui/PricesDialog.tsx`.
5. `App.tsx` wiring + `index.css` tweaks.
6. Tests: `computeBom` sets a stable `priceKey` per line and `cost = qty × unitPrice` from
   `config.prices`.

## Trade-offs

- ✅ Reuses config persistence + `NumberInput`; prices live with the design.
- ❌ priceKey via ids; renaming a profile keeps the price (id stable) — good. Deleting a profile drops
  its price (fine).
- Single currency symbol (no FX); per-category subtotals deferred.

## Verification

- Editing a price inline or in the dialog updates that line's cost and the grand total, and persists
  across reloads. A line with no price reads £0.00.

## Implementation Results

Implemented as designed. `ShedConfig.prices: Record<string, number>` (default `{}`), persisted with
the config; `loadConfig` restores it wholesale (the `deepMerge` only keeps default-present keys).
`BomLine` gained `priceKey`/`unitPrice`/`cost`; builders now return a `Draft` (line minus
price/cost), and `computeBom` fills `unitPrice = config.prices[priceKey] ?? 0`,
`cost = qty × unitPrice`. Stable keys: `timber:<profileId>`, `sheet:<materialId>`,
`piece:<materialId>`, `panel:soffit`, `foundation:piles`, `fastener:<specId>`.

UI: `BomTable` shows each line's label + spec with an inline unit-price `NumberInput` (always
editable — click and type) and the computed line cost, plus a grand-total row and an "Edit costs…"
button. `PricesDialog` is a modal table (label · qty · price · cost + total) with native
tab-navigable inputs. Both write `config.prices` via `setConfig`; edits flow through the memoized
`computeBom`, so costs/total update live and persist. Currency is a single `£` constant
(`ui/cost.ts`).

**Deviation:** inline editing uses an always-present compact input rather than a click-to-toggle
text→input — simpler and still "click and edit in place".

**Tests:** 58 total (added: stable `priceKey` + `cost = qty × unitPrice` from `config.prices`;
unpriced line ⇒ £0). `tsc` + Prettier + `vite build` clean.

### Follow-up — configurable currency & multiline spec

- **Currency** is now `config.currency` (default `£`), persisted; `formatMoney(n, currency)` takes it
  as a parameter. Edited in the costs dialog via a **"Currency" dropdown** of common currencies (GBP,
  USD, EUR, ¥, UAH, PLN, kr, CHF) plus a **"Custom symbol"** text field for anything else; a typed
  custom symbol is added to the dropdown as a `Custom (…)` option. `BomTable` receives the symbol as a
  prop and shows it beside every price/cost.
- **Compact costs:** per-line costs in the BOM panel render via `formatMoneyK` (`₴1.5k` for
  thousands, whole numbers below; full value on hover `title`); only the grand **Total** stays in full
  (`formatMoney`). Unit-price inputs are unchanged.
- **Spec text** is a multiline grey block under the label, confined to the **left column** (the
  label cell, `width:100%`) with `white-space: normal` to override the label cell's `nowrap` — so it
  wraps within the label area and does not run under the price/cost on the right. The dialog's cost
  cells use a dedicated `.prices-cost` class.

### Follow-up — default costs

Costs already persist (they live in `config.prices`). Added `config/prices.ts` with `DEFAULT_PRICES`
— starting unit prices (in ₴, the default currency) keyed by the same `priceKey`s for the library
profiles, OSB sheets, skins/covering, soffit, piles and every catalogue fastener.
`defaultConfig().prices` is seeded from it, and `loadConfig` now **overlays stored prices onto the
defaults** (`{ ...defaults, ...stored }`) so new default costs fill in keys a saved config hasn't set
while the user's edits still win. **Tests:** 59 total (added: defaults are seeded and used; unpriced
key still falls back to 0). Two stale fixtures from the simplified defaults were also made
self-contained (counter-batten-aware battens test; a pinned window for the above-header insulation
test).

### Follow-up — price per metre / per m²

Prices were per discrete purchase unit (board/sheet/roll/piece). Switched to **per linear metre**
(timber) and **per m²** (OSB sheets, cladding, membrane, insulation, roofing, soffit), keeping
**per piece** for piles/fasteners and **per litre** for adhesive. `BomLine` gained `billQty` (the
amount priced, in `priceUnit`) and `priceUnit: 'm' | 'm²' | 'pc' | 'L'`; `cost = billQty × unitPrice`.
`billQty` is the **bought** amount (boards × stock length, sheets/rolls × area), so it includes
offcut you pay for. **Exception — roofing** is billed on the **net roof area** (the roof OSB tiles
the same surface without overlap, so its area = net roof area), since a per-m² roofing price already
accounts for shingle/tile overlap. `DEFAULT_PRICES` re-based to per-m/m²/pc. The BOM input and the dialog show the
unit (e.g. `₴ /m²`), and the dialog's Qty column now shows `billQty priceUnit`. **Tests:** 60 total
(added: timber priced per m, sheets per m², piles per pc; cost = billQty × price).

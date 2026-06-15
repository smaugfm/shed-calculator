// Default unit prices keyed by each BOM line's stable priceKey (see bom/compute.ts). Values are
// rough ₴ (the default currency) per the line's price unit — timber per linear metre, sheets/skins
// per m², counts per piece, adhesive per litre — and are only starting points the user can edit.
// Unknown keys fall back to 0.
export const DEFAULT_PRICES: Record<string, number> = {
  // Timber — per linear metre
  'timber:25x50': 18.8,
  'timber:50x100': 73,
  'timber:50x120': 87.6,
  'timber:50x150': 110,
  'timber:25x200': 73,

  // OSB sheets — per m²
  'sheet:osb-floor': 361,
  'sheet:osb-wall': 197,
  'sheet:osb-roof': 361,

  // Skins / covering — per m²
  'piece:cladding': 200,
  'piece:roofing': 264,
  'piece:membrane-wall': 32,
  'piece:membrane-roof': 32,
  'piece:insulation-wall': 133,
  'piece:insulation-roof': 133,

  'panel:soffit': 197, // per m²
  'foundation:piles': 0, // per pile

  // Fasteners — per piece (adhesive per litre)
  'fastener:nail-3.1x90': 0,
  'fastener:nail-2.8x50': 0,
  'fastener:screw-5x80': 0,
  'fastener:screw-5x100': 0,
  'fastener:screw-4.5x60': 0,
  'fastener:screw-roof-4.8x35': 1,
  'fastener:nail-clout-3x20': 0,
  'fastener:joist-hanger-45': 0,
  'fastener:post-anchor': 0,
  'fastener:angle-bracket': 0,
  'fastener:epdm-adhesive': 0,
}

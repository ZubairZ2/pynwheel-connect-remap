# Detect Hallways: walkable-area street network for Beans SVG maps (R&D + PoC)

Report: `BEANS_HALLWAY_DETECTION_RND_2026-10-25.md` · evidence: `wayfinding_rnd/`

## What was wrong
- The engine traced only a drawn walkway stroke and inferred "corridors" inside every building outline. On Cypress Terra (Beans, SVG-only) that gave sidewalk fragments plus a ring around each building and nothing on the roads and parking; two pieces, no route between distant units.
- Jennifer Demo FP floors 1–3 is a flattened export with no named layers: the engine returned "no hallway found" although the file draws its roads, sidewalk and floor slab in the Beans palette.
- A saved SVG-space network never reappeared on the page after a reload, and the Tour App router read raster rows only, so an SVG-only property could never route.

## What this branch does
- `inferStreets.ts` (new): reads the walkable area (roads, parking, walkways, decks) by Beans layer names, or by fill colour when the export has no names, rasterises it in document order, and skeletonises it to the street centrelines. `detectHallways` unions that with the indoor pass, now gated to corridors wider than a drawn wall margin; bridges through a building are flagged proposals; colour-mode points are proposals.
- Connect shows and edits stored SVG-space hallways and sends the stop anchors with SVG links; Rails routes SVG-only levels in SVG space and stands pointer-placed units at their anchors.
- Tests: `hallways.spec.ts` updated/extended (34 pass; 3 pre-existing fixture-missing failures), `wayfindingLogic.spec.ts` 16 pass, Rails wayfinding + tour_api services 45 runs green, `tsc` clean.

## Measured on the real exports (shipped → this branch)
Cypress Terra floor 1: on pavement 56 % → 96 %, inside buildings 43 % → 0 %, coverage 16 % → 62 %, pieces 2 → 1, sampled routes 0/3 → 3/3; live save + reload + backend route (624 px, 98 % on pavement) verified on the clone. Jennifer floors 1–3: nothing → 65 points / 68 paths (proposals). John Demo, Washington Way, Sterling College Station: same direction.

## Not done (see report §11)
Save still goes as `origin: 'edit'`; units link straight to the nearest point rather than through the building's entrance icons; public roads outside the fence are included; the Tour App client's rendering of an SVG-space route was read, not driven.

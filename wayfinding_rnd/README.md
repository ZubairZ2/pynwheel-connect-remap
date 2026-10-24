# Beans SVG hallway detection — R&D evidence (October 25, 2026)

Companion to `../BEANS_HALLWAY_DETECTION_RND_2026-10-25.md`.

- `evidence/` — live Connect screenshots on the clone (`live_*.jpg`) and the harness renders: `<map>_base.jpg` is the engine as shipped on October 10, `<map>_poc.jpg` the engine on this branch, `<map>_mask.jpg` the walkable surface the street pass reads (green). Blue = detected paths, purple = inferred corridors, orange = bridges, green dashes = stop links, red dots = stops out of reach.
- `metrics/<map>.json` — per map: the shipped and proposed networks' points, paths, length, pieces, share on pavement / inside buildings, centring, coverage, stops joined, sampled routes, timings. `route_8005_13102_6102.json` is the Tour App service's route polyline on the clone.
- `scripts/harness.ts` — runs both engines on the real exports and computes the metrics (bundle with esbuild from `pyn-connect-web`, run with node; `SCRATCH` points at a folder with `assets/` and `out/`). `streetNetwork.ts` is the original stand-alone proof of concept that became `src/core/utils/wayfinding/hallways/inferStreets.ts`. `indoor.ts` measures the indoor-corridor width gate. `routeWalk.ts` checks a backend route against the walkable mask. `render.mjs` draws SVG files and overlays to PNG with Chrome. `svg_tree.py`, `svg_palette.py`, `svg_layer_detail.py`, `svg_fills.py` print an export's structure, drawing conventions, a layer's shapes and a flattened file's fills (`python3 -I`). `route_check.rb` builds the routing graph and a Tour App route on the clone with `rails runner`.

No production export, credential or cookie is kept here; the exports are re-downloaded from the bucket named in the report.

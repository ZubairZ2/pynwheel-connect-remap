# perf_audit — evidence for performance-audit-report.md (October 11, 2026)

Untracked evidence folder, like `db_compat_audit/` and `svg_map_qa/`. Nothing here contains a session cookie.

## Setup used
- CMS: `rails server -p 3100` on `pynwheel_audit_clone` (development mode), launch entry `rails-perf-audit` in `.claude/launch.json`.
- Connect: a production build (`next build` + `next start -p 3005`) of a copy of `pyn-connect-web/`, `PYNWHEEL_CMS_URL=http://127.0.0.1:3100`, launch entry `connect-perf`.
- Session: minted with the progress doc §7 script for the clone's super admin (user 2181) into `$PERF_SCRATCH/session.json`; the real SVG exports (`8005_*.svg`, `1412_*.svg`, `1411_*.svg`) in `$PERF_SCRATCH/assets/` for `parse-cost.mjs`.
- Production evidence: `heroku logs --dyno router -a pyn-system-connect` / `-a pyn-system`, `heroku ps`, `heroku pg:info`, public S3 object headers.

## Scripts (`scripts/`)
| Script | Measures | Output |
|---|---|---|
| `cms-bench.sh` | every Connect JSON read per property: curl ms, raw/gzip bytes, Rails Completed line (total/views/db), SQL count | `results/cms-bench.out` |
| `perf.mjs` | Map & Plotting open sequence per case: DCL, hydrated, plan-svg start/ttfb/total/bytes, plan ready, Rails reads; reload, mode switch, floor switch, away-and-back | `results/perf.out` |
| `perf-wan.mjs` | the same first open under emulated 4 Mbps/300 ms and 1.5 Mbps/500 ms links, and with fonts.googleapis.com delayed 8 s | `results/perf-wan.out`, `perf-wan-results.json` |
| `perf-inventory.mjs` | Inventory open, Units tab, paging, tab round-trip, Unit Detail, Property Detail | `results/perf-inventory.out`, `perf-inventory-results.json` |
| `perf-followup.mjs` | Units search request behaviour, Hazel inventory with/without S3 thumbnails, client-side navigation Detail → Map | `results/perf-followup-results.json` |
| `parse-cost.mjs` | browser parse/mount/bbox cost of each real SVG export | (stdout; values in the report §D3) |

Run from `pyn-connect-web/`'s Node (`createRequire` resolves Playwright there): `PERF_SCRATCH=/path node scripts/perf.mjs cypress jennifer3638`.
`results/map-8005.document.html` is the map page document of Cypress Terra as served (decoded), to inspect the inlined RSC payload and script list.

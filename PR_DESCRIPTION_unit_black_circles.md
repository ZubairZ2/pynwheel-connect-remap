# Map & Plotting: no dark ring on units plotted on a floor SVG polygon (Wayfinding)

Branch: `fix/remove-unit-black-circles` → `main`
Compare: https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...fix/remove-unit-black-circles

## What the black circles were

In Wayfinding mode every plotted unit and amenity is given an **anchor**: a 10 px hollow ring with a near-black (`#171a21`) border, drawn where the unit's bridge joins the hallway paths (on a floor SVG, the edge of its polygon facing the hallway point). It is the click target for linking a unit by hand, selecting its bridge, and removing it with a double-click. They were added on Oct 2, 2026 (commit 8ee78da06, "small hollow dark outlines").

On a Beans site plan like Cypress Terra, where every unit is a polygon in the floor SVG, that is a black circle on each of the 113 units per floor.

In **Plotting** mode nothing black sits on the units: what is drawn there are the stored hallway points (blue `fa-dot-circle` glyphs, `#008fd4`) and their black path lines, the same graph the legacy plotting page draws. This PR leaves Plotting unchanged.

## The change (Connect only, no backend)

- `wayfinding.generator.ts`: a layer anchor gets `quiet` when it sits on an SVG polygon and is linked (or the floor has no paths yet) and is not selected.
- `WayfindingLayer.tsx`: `quiet` adds `bo-wf__anchor--quiet` and `data-quiet="1"`.
- `globals.css`: a quiet anchor has a transparent ring and shows it only under the pointer.

Unlinked anchors keep the red dashed ring, selected ones the yellow halo, and anchors on a floor **image** (where the ring is the unit's only mark) are unchanged. The element stays in the DOM, so click / double-click / tooltip behave as before.

## Verification

Cypress Terra 8005 on `pynwheel_audit_clone` (CMS :3100, Connect :3005, headless Playwright):

| Check | Result |
| --- | --- |
| Wayfinding, Floor 1 anchors | 113, all quiet, 0 visible rings |
| Hover a unit | ring appears, tooltip "1101 · Click to select · double-click to remove" |
| Click a unit with no tool | its bridge is selected, ring and halo shown |
| Console errors | none |
| `npm run typecheck`, `vitest run` | pass (28 tests) |

Not run: the real-data Playwright suites (need a minted session).

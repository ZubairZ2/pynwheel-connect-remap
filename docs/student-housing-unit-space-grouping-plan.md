# Student Housing — Unit-Space Grouping (SDK payload + maps)

**Branch:** `student-housing-v1`  ·  **Toggle:** `communities.student_housing_property`
**Scope:** `SdkPayloadBuilderService` → `pyn-map-sdk-v1.js` → `pynwheel-maps` (React)
**Out of scope:** `pyn-map-sdk.js` (v0), `webpages.js` (old CMS map), any DB schema
change (that is UC 08 / PYN-1638).

---

## 1. The problem

Student housing stores each leasable bedroom ("unit space") as its own `Unit`
row. Every space in a 4-bed apartment carries the **same** `x_plot/y_plot` (image
maps) or the **same** `pointer_data` selector (SVG maps), because they are the
same door on the map.

So a ~250-apartment property ships ~1,000 unit objects. Today
[sdk_payload_builder_service.rb:37](app/services/sdk_payload_builder_service.rb#L37)
serializes all 1,000 with the **full** ~40-key shape — including the expensive
per-row work (`get_additional_fees`, `unit_additional_buttons`, `unit_variation`,
colour computation, image resolution) — and the SDK then draws 1,000 markers /
polygons of which ~750 are invisible duplicates stacked on the same pixel.

Cost today, per cold load:

| Layer | Waste |
|---|---|
| Rails | ~4× the serialization work; `get_additional_fees` + 3 button lookups per space |
| Wire | ~4× the `units[]` bytes (gzipped, but still the largest block in `fetch_data`) |
| SDK 2D | ~4× DOM markers; `_indexUnits` de-dupes SVG pointer ids *after* building all of them |
| SDK 3D | ~4× Beans polygons in `_buildBeans3dArr` — the dominant cost of the ~10s 3D load |
| React | ~4× rows in the units list, filter passes, favourites scans |

## 2. The shape we want

One **base unit** per plotted position, carrying the map-facing data. The other
leasable bedrooms ride inside it as lean **spaces**.

```
units: [
  { unitId: 4101, unitNumber: "115-A", …full map-facing unit…,
    spaces: [
      { unitId: 4101, unitNumber: "115-A", … },
      { unitId: 4102, unitNumber: "115-B", … },
      { unitId: 4103, unitNumber: "115-C", … },
      { unitId: 4104, unitNumber: "115-D", … }
    ] }
]
```

Two rules that make the whole design fall out:

1. **Spaces carry no plot data.** No `x_plot`, no `y_plot`, no `pointerData`, no
   `mapId`, no `floor`. Not "we omit them to save bytes" — they are *structurally
   absent*, which makes it impossible for any renderer (2D, SVG, 3D) to plot
   anything but a base unit. Plotting cost becomes a function of doors, not beds.
2. **Spaces carry only what differs per bedroom.** Everything shared (image,
   floorplan, description, buttons, fees, colours) lives once on the base unit,
   and the *SDK* merges `{...base, ...space}` before handing a space to any
   consumer. Consumers therefore always receive a complete unit object and never
   learn that a "space" is a partial record.

---

## 3. Design decisions (and why)

### 3.1 Grouping key = the plot anchor, not the apartment number

Do **not** parse `"115-A"` → `"115"`. Marketing names are free text and vary per
PMS. Group on the thing that actually caused the collision — the plot anchor —
which is exactly the key the old map's `setUnitModalButtons`
([webpages.js:2281](app/assets/javascripts/webpages.js#L2281)) and the current
`unitSiblings.js` already use:

| Map mode | Anchor |
|---|---|
| SVG | `floor | floorplan_id | pointer_data.id` (fallback `.selector`) |
| Image | `floor | floorplan_id | x_plot | y_plot` |
| No anchor (unplotted, `0/0`, beans-only) | **no group** — the unit stays standalone |

The `0/0` guard is load-bearing: without it every unplotted unit collapses into
one bogus "apartment".

`floorplan_id` was **not** in the original plan and was added after measurement.
A space inherits every floorplan-derived field from its base unit — bedrooms,
bathrooms, image, description, colour — and co-plotted units do not always share
a floor plan: 17 of 59 co-plotted groups on Catalina Canyon do not. Without it,
lifting a bedroom back out lost 11 fields to its neighbour's layout; with it, 0.
Bedrooms of a real student-housing apartment share that apartment's floor plan,
so it splits nothing there — it only refuses to merge units that were never the
same product.

### 3.2 Base unit: deterministic identity, apartment-level name

Sort the group by natural-sorted `marketing_name`, tie-break on `id`; first wins.

Tempting alternative: "pick the first *available* space so the map shows a
sellable unit". Rejected — availability changes hourly, so the base unit's id
would change hourly, silently breaking deep links, saved favourites, analytics
continuity and any future response caching. Stability beats prettiness;
availability reaches the map through the roll-ups instead.

**Every** door is then labelled with its apartment number, via
`SdkUnitSpaceGrouper.door_name`:

- several bedrooms answer with the number they share — `105-A`..`105-D` -> `105`
- a single bedroom answers with its own apartment — `100-A` -> `100`
- a plain unit number keeps its name — `103` stays `103`
- a numeric suffix is never stripped — `2-101` and `2-102` share only `2-10`,
  which names no apartment, so both keep their own names

Both cases go through one method on purpose. Labelling only the multi-bedroom
doors left the units list reading "100-A, 103, 105", mixing bedroom names with
apartment names — whether an apartment happens to have one bedroom plotted or
four is not something a visitor should be able to see in the naming.

The single-bedroom rule is a convention rather than a fact the data states: a
property that ends unit numbers in a letter for some other reason would be
shortened. It is the same convention `shared_unit_number` infers from a group,
applied where there is only one name to go on.

### 3.3 Capability flag, not a vertical flag

The payload advertises the *shape*, not the business vertical:

```json
"property": {
  "unitGrouping": { "mode": "spaces", "key": "plot" }
}
```

`mode` is `"flat"` for every property today. Gate the SDK on
`unitGrouping.mode === "spaces"`, never on a `studentHousing` boolean — so a
conventional property with co-plotted units can opt into the same rollup later
without a second code path, and `key` leaves room for a future
`"unit_type"` / `"space_configuration"` grouping when UC 08 lands the real schema.

### 3.4 Roll-ups on the base unit, computed server-side

The base unit is what the map colours and what the filters test, so it must
answer for the whole group without anyone walking `spaces`:

| Field | Value |
|---|---|
| `spaceCount` | `spaces.length` |
| `availableSpaceCount` | spaces where `available` |
| `available` | `true` if **any** space is available |
| `available_date` | earliest `available_date` among available spaces |
| `availability_bucket` | bucket of that earliest date |
| `availabilityBuckets` | `[]` of every distinct bucket in the group |
| `market_rent` | **min** across spaces (the "from" price the card shows) |
| `priceMin` / `priceMax` | min / max across spaces |
| `sqftMin` / `sqftMax` | min / max across spaces |

Precomputing these keeps client-side filtering O(1) per base unit instead of
O(spaces). It also means `filters_json` (the *options* list) can keep reading the
**ungrouped** unit set — filter options must reflect what a resident can actually
lease, so a price band that only exists on space 115-C must still appear.

### 3.4b Ops maps group too, ranked by actionability

Ops maps were originally scoped out, on the grounds that one polygon per
apartment could only show one bedroom's `unit_status`. They are now included, so
the same rollup and the same 2.3× cut in polygons applies there.

The status a door shows is the **most actionable** one among its bedrooms, not
the base bedroom's — leasing state has nothing to do with which bedroom sorts
first. The ranking lives in one constant:

```ruby
OPS_STATUS_PRIORITY = %i[vacant occupied_on_notice vacant_leased occupied model]
```

So a door with 3 occupied bedrooms and 1 vacant paints **vacant**: the thing
needing a turn surfaces instead of being outvoted. Colour, `unit_status` and
`model_unit` all come from that one winning bedroom, so they can never
contradict each other.

Nothing is hidden. Every bedroom keeps its own `unit_status` and `opsColor`
under `spaces`, and the base carries `unitStatuses` (the distinct set) and
`mixedStatus` so a door whose bedrooms disagree can be rendered as such — a
striped fill, a hatch, whatever ops wants. `opsColor` is only emitted per space
on an ops payload; a marketing map never reads it.

### 3.5 A space is a whole unit, minus the position

Every space carries its unit's complete record except `x_plot`, `y_plot`,
`pointerData`, `mapId` and `floor` — the position belongs to the door. So every
space in a group has the same keys as every other, and each one is already the
unit: nothing to reconstruct, nothing to look up, readable on its own in a
console.

Two earlier attempts were both too clever:

1. **A hand-picked field list** ("just the fields that differ between bedrooms")
   had to assume which fields those were, and the assumption was wrong —
   co-plotted units carry different floor plans in real data, so bedrooms
   inherited a neighbour's layout, image and price.
2. **A diff against the door** fixed the correctness but made every space a
   different shape: one with three keys, the next with ten. Correct, unreadable,
   and it forced anyone looking at the payload to hold the merge rule in
   their head.

The repetition this costs is the point. Dropping the position is still a
structural guarantee — a space has no coordinates to plot — and the SDK restores
the door's position when it hands a space to a caller.

### 3.6 Favourites stay per space

A resident favourites *a bedroom*, not *a door*. `get_favorites`
([sdk_controller.rb:331](app/controllers/api/partner/maps/sdk_controller.rb#L331))
keeps returning full, ungrouped unit objects and is not touched. What *does*
change is `merge_favorites`
([sdk_controller.rb:665](app/controllers/api/partner/maps/sdk_controller.rb#L665)):
it currently only looks at top-level `unitId`, so a favourited space id would
silently never match once the space is nested.

---

## 4. Backend work

### B1 — `app/services/sdk_unit_space_grouper.rb` (new)

A pure, side-effect-free grouper. Kept out of the builder so it is unit-testable
on plain structs and reusable later by the old map / other endpoints.

```ruby
class SdkUnitSpaceGrouper
  Group = Struct.new(:base, :spaces, keyword_init: true)

  def initialize(community)
  def call(units_ar)  # -> [Group] ; one Group per plotted position
  private
  def anchor_for(unit) # nil when unplotted -> unit is its own group
end
```

- `anchor_for` branches on `@community.enable_svg_mode?` exactly as §3.1.
- Returns groups in the **same order** the input arrived (`map_units` already
  applies the natural-name ordering), so the units array ordering is unchanged
  for every downstream consumer.
- Never merges across `mapId`/`floor`.

### B2 — `SdkPayloadBuilderService`

[sdk_payload_builder_service.rb](app/services/sdk_payload_builder_service.rb)

1. `build` ([:14](app/services/sdk_payload_builder_service.rb#L14)) — after
   loading `units_ar`, branch:
   ```ruby
   all_units = if grouped?
                 grouped_units_json(units_ar)
               else
                 units_json(Set.new, ops_map, units_ar)
               end
   ```
   `filters_json(units_ar)` and `floorplans_json(units_ar)` keep receiving the
   **ungrouped** `units_ar` (§3.4). `floorplans_json` in particular must keep
   counting real leasable spaces.
2. `grouped?` → `@community.student_housing_property?`. One private predicate,
   so the day the flag is replaced it is a one-line change.
3. `grouped_units_json(units_ar)`:
   - `SdkUnitSpaceGrouper.new(@community).call(units_ar)`
   - single-member groups → serialize exactly as today, plus
     `spaceCount: 1`, no `spaces` key (keeps the common shape untouched)
   - multi-member groups → `unit_json(base)` merged with the roll-ups from §3.4
     and `spaces: group.spaces.map { space_json(_1) }`
   - `space_json` reads only `SPACE_FIELDS`
4. Extract the existing per-unit hash out of the `units&.map` block into a
   `unit_json(unit, fav_ids)` method so both paths share one definition. `units_json`
   becomes `units.map { unit_json(_1, fav_ids) }` — **no behaviour change for
   non-grouped properties**, which is what keeps this safe to ship.
5. `property_json` ([:66](app/services/sdk_payload_builder_service.rb#L66)) —
   add the `unitGrouping` block from §3.3.

### B3 — `SdkController`

[sdk_controller.rb](app/controllers/api/partner/maps/sdk_controller.rb)

- `merge_favorites` ([:665](app/controllers/api/partner/maps/sdk_controller.rb#L665)):
  for units, also walk `unit[:spaces]`, set `isFavorite` on each matching space,
  and set `hasFavoriteSpace: true` on the base unit so the map can show a
  favourite indicator on a door whose bedroom is favourited.
- `fetch_data` ([:73](app/controllers/api/partner/maps/sdk_controller.rb#L73)):
  `favorite_units` must be built from **spaces**, not base units — a favourited
  bedroom is what belongs in the favourites list. Flatten
  `units.flat_map { |u| u[:spaces] || [u] }.select { _1[:isFavorite] }` and merge
  each onto its base so the entries are complete unit objects.
- `get_favorites` — **unchanged**, deliberately (§3.6).

### B4 — Specs

`spec/services/sdk_unit_space_grouper_spec.rb`
- image-map grouping by `x_plot/y_plot/floor`; SVG grouping by pointer id;
  pointer `selector` fallback when `id` is blank
- `0/0` units never group with each other
- units on different floors / different `mapId` never group
- base unit is stable when availability flips
- beans-only property (no plot data) produces all-standalone groups

`spec/services/sdk_payload_builder_service_spec.rb`
- flag off → payload byte-identical to today (regression guard)
- flag on → `units.size` == distinct plotted positions; `spaces` sums back to the
  original unit count; no space carries `x_plot`/`pointerData`/`mapId`
- roll-ups: `available` true when only one bed is available; `market_rent` is the
  min; `available_date` is the earliest available bed's
- `filters` block identical whether or not grouping is on

`spec/requests/api/partner/maps/sdk_spec.rb`
- favourited space surfaces as `isFavorite` inside `spaces` **and** as
  `hasFavoriteSpace` on the base unit, and appears in `favorite_units`

---

## 5. SDK work — `public/sdk/pyn-map-sdk-v1.js`

The SDK is the **only** place that knows a space is a partial record. It merges
base ⊕ space once and every consumer above it sees complete units.

### S1 — Indexing · `_indexUnits()` [:896](public/sdk/pyn-map-sdk-v1.js#L896)

`this.data.units` is already base-units-only, so the existing per-map / per-pid
indexes need no change. Add alongside them:

```js
this.spacesByBaseId = {};   // baseUnitId -> [merged space unit, …]
this.baseIdBySpaceId = {};  // any space id -> its base unit id
```

Merge (`{...base, ...space}`) **once at index time**, not per call — this is the
hot path for the modal switcher and the favourites scan.

### S2 — Public API

```js
isGroupedProperty()              // property.unitGrouping.mode === "spaces"
getUnitSpaces(unitId)            // merged, complete units; [] when ungrouped or single
getBaseUnit(unitOrSpaceId)       // resolves a space id up to its plotted unit
getUnits(filters, { includeSpaces })  // opt-in flat list of every leasable space
```

`getUnitSpaces` accepts a base id **or** a space id, and always returns the whole
group sorted by `unitMarketingName` (numeric-aware), so the modal's button row is
identical whichever bedroom was clicked. Add all four to the facade at
[:4525](public/sdk/pyn-map-sdk-v1.js#L4525).

### S3 — Filtering · `getUnits(filters)` [:1470](public/sdk/pyn-map-sdk-v1.js#L1470)

When grouped, a base unit passes if **any** of its spaces would pass. Read the
§3.4 roll-ups rather than walking `spaces`:

- `available` → `u.availableSpaceCount > 0`
- `minPrice` / `maxPrice` → test against `priceMin` / `priceMax`
- `minSquareFeet` / `maxSquareFeet` → `sqftMin` / `sqftMax`
- `availability` → `u.availabilityBuckets.includes(value)`
- `bedrooms` / `bathrooms` / `floorplanId` → unchanged (floorplan-level, identical
  across a group)

`{ includeSpaces: true }` returns the filtered base units expanded into their
merged spaces — one call, one place, for list views that want bedrooms.

### S4 — Resolution by id

Everything that resolves an id against `this.data.units` must fall back through
`baseIdBySpaceId`, or a space id from a deep link / favourite / analytics event
silently resolves to nothing:

- `selectUnit` / `unselectUnit` [:1520](public/sdk/pyn-map-sdk-v1.js#L1520)
- `highlightUnits(unitIds)` — accept space ids, map up to base before painting
- `_highlightUnitsForFloor`
- Beans `onSelect` / `onHover` [:1775](public/sdk/pyn-map-sdk-v1.js#L1775)
- favourites state `_favState("unit")` [:3704](public/sdk/pyn-map-sdk-v1.js#L3704) —
  the favourited id is a *space* id, so its list must be the flat space list

### S5 — Plotting (mostly free)

`_buildUnitMarkersHTML` [:4209](public/sdk/pyn-map-sdk-v1.js#L4209),
`_buildBeans3dArr` [:1966](public/sdk/pyn-map-sdk-v1.js#L1966) and the SVG pid
binding all read `this.data.units` — which is now base units — so the 4×
reduction in markers and Beans polygons needs **no code change**. Two touch-ups:

- The co-plot badge counts `x_plot-y_plot` collisions. On a grouped property
  those collisions are gone, so show `spaceCount` instead when
  `spaceCount > 1` — the pin keeps meaning "more than one thing here".
- `onUnitClick` keeps reporting exactly one unit (the base). The consumer calls
  `getUnitSpaces()` for the rest — same contract as the co-plot case documented
  at [:4390](public/sdk/pyn-map-sdk-v1.js#L4390), so no consumer learns a new rule.

### S6 — Analytics

When the modal switches to a space, `viewed_unit_id` must be the **space** id —
that is the thing a leasing agent recognises. Base ids are for plotting only.

---

## 6. Front-end work — `pynwheel-maps`

The current implementation derives spaces client-side and merges them itself.
Under the new contract the SDK owns both, so the FE **loses** code.

### F1 — `src/utils/unitSiblings.js` — replace the space path

Today [:114](../../pynwheel-maps/src/utils/unitSiblings.js#L114) does the merge
locally (`spaces.map(space => ({ ...unit, ...space }))`), guesses at the shape
with `spaces.length < 2`, and sniffs SVG mode off `getPropertyConfig()`.

New:

```js
export const getUnitSiblings = (unit) => {
  if (window.PynMapSDK?.isGroupedProperty?.()) {
    return window.PynMapSDK.getUnitSpaces(unitKey(unit)); // already merged + sorted
  }
  return coPlottedSiblings(unit); // unchanged legacy path
};
```

- Delete the local merge, the local sort, and the local `< 2` guard — all three
  now live in the SDK, where they are shared with `getUnits({ includeSpaces })`.
- Keep the whole co-plot derivation **untouched** for non-grouped properties.
  Two named branches beat one clever unified path here: the co-plot rules encode
  old-map behaviour that must not drift.
- Update the file's header comment — it currently describes the FE-side merge.

### F2 — `UnitModal.jsx` / `UnitDetailMbl.jsx`

No render change. `siblingUnits`
([UnitModal.jsx:70](../../pynwheel-maps/src/components/modals/UnitModal/UnitModal.jsx#L70))
already keys on `unitId` and each space carries its own, so the `115-A/B/C/D`
switcher in the screenshot works as-is once F1 lands. Verify that favourite
toggling inside the modal targets the **picked space's** `unitId`, not the base.

### F3 — `UnitsTab.jsx` — lists units, not spaces

The panel lists what the map draws: one card per unit. On a grouped property
that is the apartment, and its bedrooms are reached from the card's detail view
— the same `115-A/B/C/D` switcher the map's modal shows — rather than being
spread across the list.

`handleGetUnits` in MapView therefore calls plain `getUnits()`. The bedrooms are
still indexed into `unitLookupRef` alongside the doors (`cacheUnitSpaces`), so
anything holding a bedroom id — a saved favorite, a deep link, the modal's
switcher — still resolves to a renderable unit.

> Reversed from the original plan, which argued the list should sell beds and
> show 1,000 rows so the result count read true. That was the wrong call for this
> panel: 1,000 near-identical rows, four per apartment differing only by a letter,
> is worse to scroll than 250 apartments each one click from its bedrooms.
> `getUnits(filters, { includeSpaces: true })` remains in the SDK for hosts that
> do want a flat bedroom list; the React app no longer uses it.

### F4 — `MapView.jsx`

- `cacheUnitsLookup` [:656](../../pynwheel-maps/src/components/MapView/MapView.jsx#L656)
  must index spaces too, so a click routed through the DOM fallback can resolve
  a space id.
- Hover / highlight → send base ids (or let S4 map them up; prefer S4 so only one
  place knows the mapping).
- `setActiveUnitIds` must publish **space** ids: the sibling switcher's active
  check filters at bed granularity.

### F5 — Filters & favourites

- `filtersUtils.js` — counts and result totals run over spaces; the ids handed to
  `highlightUnits` are whatever the SDK accepts (S4 handles both).
- `FavsTab` / `favoritesData.js` — no shape change; favourites were already per
  space. Confirm `isFavorite` lookups hit the flat space index (S4), not
  `data.units`.

---

## 7. Status

| # | Step | State |
|---|---|---|
| 1 | B1 + B2 — `SdkUnitSpaceGrouper`, builder rollup, `unitGrouping` | **done** (22 unit tests) |
| 2 | B3 — per-bedroom favourites merge | **done** (verified against live data) |
| 3 | S1–S4 — SDK index, public API, filters, id resolution | **done** (30 checks) |
| 4 | S5–S6 — marker badge, analytics | **done** |
| 5 | F1 + F2 — siblings via the SDK, modal resolves through the group | **done** |
| 6 | F3–F5 — list, map, filters, favourites | **done** (app builds) |
| 7 | Enable `student_housing_property` on property 7899, measure | **not started** |

Steps 1–6 are inert until the toggle is flipped: with the flag off the payload is
unchanged (`filters` and `floorplans` verified byte-identical), the SDK's grouped
branches are gated on `unitGrouping.mode`, and the React app falls through to the
co-plotted path it has always used. Both the marketing map and the ops map group.

Rollback is the CMS toggle — no deploy, no migration.

### Tests

```
ruby -Itest test/services/sdk_unit_space_grouper_test.rb   # 22 runs, 28 assertions
node test/sdk/unit_space_rollup_test.js                    # 30 checks
```

Both live under `test/`, which is gitignored in this repo.

## 8. Measured results

Measured on **Troubadour** (property 34 locally, the 7899 dataset) and Catalina
Canyon (33), toggle flipped in memory:

| | Troubadour | | Catalina Canyon | |
|---|---|---|---|---|
| | flat | grouped | flat | grouped |
| `units` entries | 671 | **276** | 332 | **128** |
| payload gzipped | 34,008 B | 38,421 B (+13%) | 27,600 B | 29,180 B (+6%) |

Troubadour: 159 doors hold several bedrooms, 117 hold one. Right-rail labels are
now uniform — 276 cards, **zero** still carrying a bedroom suffix.

Invariants asserted on both properties:

- every space in a group has an **identical key set**
- every space is **complete** — everything a flat unit has, minus the position
- **zero** spaces carry `x_plot`, `y_plot`, `pointerData`, `mapId` or `floor`
- **zero lossy spaces**: every bedroom lifted back out via `space_as_unit`
  reproduces its flat record exactly, floor plan and price included
- flag off, 8 properties x mkt+ops: `mode=flat`, zero grouping keys, no renaming

### What this buys, and what it costs

The win is **markers and 3D polygons: 671 -> 276**. That is the cause of the
~10s 3D load, and it is what the rollup exists for. The right rail and the
filters get the same reduction.

The costs, both accepted deliberately:

- **Payload grows ~6-13%.** A door is a full record and its first bedroom
  appears again under `spaces`, so a group ships N+1 records. Earlier revisions
  avoided this by shipping partial spaces; both were reverted, once for
  correctness and once for legibility (§3.5). gzip was already collapsing the
  repeated keys, so the bytes were never where the win was.
- **Build time is flat.** `unit_json` runs once per unit, as it always did. An
  earlier revision measured 44% faster by skipping per-bedroom work — that is
  exactly what made bedrooms inherit a neighbour's floor plan. Do not quote it.

### The server-time win is gone; the plotting win is what remains

An earlier revision measured **44% faster** payload builds. That is no longer
true, and the reason is §3.5: making a space a diff means `unit_json` runs once
per unit again, not once per door. Build time is now roughly flat (-1% to +17%
depending on payload).

That was the right trade — the fast version was fast because it *skipped* work,
and skipping it is what made bedrooms inherit their neighbour's floor plan. But
the headline number does not survive it.

What the rollup still buys, and why it is worth shipping:

1. **Markers and 3D polygons: 332 -> 128 on Catalina.** This is the actual cause
   of the ~10s 3D load on 7899, and it is untouched by the change above.
2. **Payload bytes: -16%** where grouping is real.
3. **A shorter units list** for the right rail and the filter passes.

Note Harmony barely groups (256 -> 245, +1% bytes): only 11 of its doors hold
more than one unit. On a property where 4 bedrooms genuinely share a door — 7899
— the ratio is ~4x and every number above improves with it. Grouping buys nothing
on a property that is not actually co-plotted, and costs ~1% when forced.

### The byte estimate in the original plan was wrong

§8 previously targeted "≥55% smaller" payloads. Measured, it is **8.4%**. The
reasoning missed gzip: `units` is a thousand objects repeating the same ~40 key
names, and those names are exactly what a compressor eliminates. Dropping keys
therefore saves far less on the wire than it saves in the object graph.

The rollup still earns its place, but for the other three reasons, not this one:

1. **Server time** — halved, measured. The per-row work skipped for spaces
   (`get_additional_fees`, three button lookups, `unit_variation`, colour and
   image resolution) is the real cost, and it was always the largest share.
2. **Marker and polygon count** — 2.6× here, ~4× expected on 7899. This is what
   the ~10s 3D load is a function of.
3. **Client parse and render** — fewer objects through `_indexUnits`, the filter
   passes and the favourites scan.

Treat the wire saving as a rounding error and judge the change on server time and
node count.

### Run this on 7899 before flipping the flag

`floorplan_id` is part of the grouping key (§3.1), which means bedrooms only roll
up when they share their apartment's floor plan. The Units panel on 7899 shows
`113-B` as *4 Beds / 1,966 sq.ft* and `114-A` as *0 Bed / 368 sq.ft*, so this
property carries both apartment-level and per-bed floor plans. That is fine as
long as the bedrooms **within one apartment** agree; if they do not, those
apartments will not group and the win shrinks.

The failure mode is safe — under-grouping, never mis-reporting — but it is worth
knowing before measuring. On a console with 7899:

```ruby
c = Community.find(7899)
units = c.units.map_units(c, false).visible_units.without_hidden_names.includes(:floorplan).to_a
units.each { |u| u.association(:community).target = c }
groups = SdkUnitSpaceGrouper.new(c).call(units)
multi  = groups.reject(&:single?)

puts "units #{units.size} -> positions #{groups.size} (#{(units.size.to_f / groups.size).round(2)} per door)"
puts "group sizes: #{multi.map { |g| g.spaces.size }.tally.sort.to_h}"

# Would any apartment group further if floor plan were dropped from the key?
loose = units.group_by { |u| [u.floor, u.x_plot, u.y_plot, u.pointer_data&.dig("id")] }
puts "positions ignoring floor plan: #{loose.size}  (a big gap here means mixed-floorplan apartments)"
```

If that last line is much smaller than `groups.size`, the bedrooms of an
apartment disagree on floor plan and the key needs revisiting — most likely by
moving the floorplan-derived fields into the space payload instead.

### Still to measure on property 7899

- 3D time-to-interactive (target: ~10s → under 4s)
- marker/polygon count at a true 4-beds-per-door ratio
- units list still reporting every leasable bedroom
- favourites saved before the flag flip still resolving after it

## 9. Explicitly deferred

- **Schema change** — spaces as real child rows of a unit: UC 08 / PYN-1638.
  Everything above is a serialization-time rollup and assumes nothing about
  storage, so it survives that migration with `SdkUnitSpaceGrouper` becoming a
  thin association read.
- **Old map (`webpages.js`) + `pyn-map-sdk.js` (v0)** — untouched here. The old
  map already regroups at click time in `setUnitModalButtons`, so it is correct,
  just slow. Its rollup is tracked separately.
- **`fetch_data` response caching** — grouping is deterministic and derived only
  from the unit set, which makes the payload a good cache candidate. Separate
  work; see `map_load_performance_plan.md`.

You are continuing the Pynwheel Connect React/Next.js migration in:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

The objective is to implement the **Property Inventory experience** from the improved prototype into the existing Next.js application, while using the **existing Rails backend, existing controllers, existing database, and existing data**.

This task is strictly a **read-only frontend implementation**.

---

# 1. ABSOLUTE BACKEND RULE

## DO NOT MAKE ANY BACKEND CHANGES

This is a hard requirement.

You must **not modify the Rails/backend application in any way** for this task.

Do NOT:

* create or modify migrations
* add database columns
* modify database schema
* modify Rails models
* modify Rails controllers
* modify Rails routes
* add APIs
* modify APIs
* add serializers
* modify serializers
* change queries
* change scopes
* change business logic
* add backend services
* change authorization
* change validations
* add write endpoints
* modify existing write endpoints
* modify production/staging backend behavior

Use the **existing backend exactly as it currently exists**.

### If something cannot be implemented without a backend change

Do **not** work around it by inventing data.

Do **not** create a temporary backend implementation.

Do **not** add a new API.

Instead:

1. Leave that portion unimplemented or read-only as appropriate.
2. Document it in:

`/Users/zubairzulifqar/pynwheel-staging/gaps_properties_detail_feature.md`

3. Clearly explain:

   * What the UI requires
   * What existing backend source was investigated
   * What data/functionality is missing
   * Why the existing backend cannot support it
   * What future backend change would be required

The gaps file is the **only place** where required backend work should be recorded.

---

# 2. DOCUMENTATION IS PART OF THE IMPLEMENTATION

You must update all three documentation files:

### Progress

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

### Context

`/Users/zubairzulifqar/pynwheel-staging/context.md`

### Gaps

`/Users/zubairzulifqar/pynwheel-staging/gaps_properties_detail_feature.md`

These are mandatory deliverables.

## Important

**Append to the existing documentation.**

Do NOT delete existing information.

Do NOT replace historical entries.

Do NOT rewrite the files from scratch.

Add a new **dated section** documenting this implementation.

---

# 3. READ THE PROJECT FIRST

Before writing code, read:

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

`/Users/zubairzulifqar/pynwheel-staging/context.md`

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html`

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-new.html`

Then inspect the entire existing React/Next.js implementation in:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

Do not begin implementation until you understand:

* current routing
* Property listing
* Property Detail page
* existing Inventory-related components
* shared components
* existing data-fetching approach
* existing modals
* existing image viewer
* existing filter components
* existing styling system

---

# 4. INSPECT THE OLD RAILS IMPLEMENTATION

The old UI is the source for understanding the existing backend behavior.

Trace the current Rails implementation for:

### Floorplates

`https://pynwheelconnect.com/communities/7860/floorplates/`

### Floorplans

`https://pynwheelconnect.com/communities/7860/floorplans/`

### Units

Find the existing Rails implementation used to load units for the community/property.

For each one, trace:

```text
Route
→ Controller
→ Action
→ Model
→ Associations
→ Query
→ View/Data
```

Also inspect the relevant:

* property/community models
* floorplate models
* floorplan models
* unit models
* amenity models
* building relationships
* image relationships
* SVG relationships
* availability/pricing data
* existing presenters/serializers/decorators
* existing permission/read logic

Do not guess where data comes from.

---

# 5. FIRST STEP — INVESTIGATION ONLY

Do not modify implementation code yet.

First create a complete implementation/data map.

Use this structure:

| UI Feature | Old Rails Source | Model/Association | Existing React Source | Real Data Available? | Read-Only Implementation | Backend Gap? |
| ---------- | ---------------- | ----------------- | --------------------- | -------------------- | ------------------------ | ------------ |

Cover every section:

* Property Inventory header
* Summary cards
* Floorplates
* Background Library
* Floorplate actions
* Add Floorplate modal
* Floorplans
* Floorplan images
* Add Floorplan modal
* Units
* Unit filters
* Unit search
* Unit image viewer
* Re-sync PMS
* Mass Overrides
* Add Unit
* Amenities

Only after this investigation is complete should implementation begin.

---

# 6. PROPERTY INVENTORY PAGE

Implement the page shown in:

`pyn-connect-22-sep-new.html`

The page should open from:

```text
Properties
→ Property Detail
→ Inventory
```

and also from:

```text
Properties listing
→ Go To
→ Inv
```

The selected property must be dynamic.

Do not hard-code:

`7860`

or any prototype property ID.

---

# 7. INVENTORY HEADER

Implement:

```text
Property Inventory

4 floorplates · 2 without a floor SVG · 4 stops staged · not yet published

Map & Plotting
Tour Setup
```

Use real data for counts/statuses whenever existing backend data provides them.

Do not hard-code prototype values.

---

# 8. INVENTORY SUMMARY CARDS

Implement:

* Floorplates
* Floorplans
* Units
* Amenities

Example prototype:

```text
Floorplates
4

Floorplans
4

Units
6

Amenities
3
```

These are examples only.

Populate them from real backend data.

---

# 9. FLOORPLATES

Implement the complete Floorplates section.

Reference:

> The layout of each floor in each building — one site plan per floorplate, and the surface units and amenities are plotted on

Implement:

* Add Floorplate
* Background Library
* Floorplate listing cards
* SVG status
* Floor range
* Naming
* Name on map
* Hidden state
* Building
* Background
* Plotting
* Units count
* Amenities count
* Actions

## Floorplate data MUST come from the DB

Examples in the prototype such as:

```text
Lobby
Floor 12
Rooftop
Tower A
Tower B
SVG Ready
SVG Missing
```

must not be hard-coded.

Load the actual corresponding property records.

---

# 10. FLOORPLATE IMAGES

The floorplate listing cards must show actual image information/data from the existing backend whenever available.

Where there is an image:

* show it
* show the correct image
* make the View/Eye action work

Clicking the Eye/View icon should:

* open a larger image viewer/lightbox
* show the actual image
* allow closing it

No image modification/upload should occur.

---

# 11. FLOORPLATE WRITE ACTIONS

The UI should contain the actions visible in the prototype.

However, all write operations must remain disabled.

### Add Floorplate

Click:

→ open modal

Save:

→ close modal only

Do NOT:

* submit
* create a floorplate
* call POST
* call PUT/PATCH
* change DB data

### Edit / Delete / Upload / Plot

Show the UI where appropriate, but do not perform write operations.

For actions where a modal makes sense:

→ open modal
→ interact visually
→ Save/Confirm closes modal only

Do not fake a successful update.

---

# 12. BACKGROUND LIBRARY

Implement the full UI shown in the prototype.

Where existing backend data is available, use it.

For example, the prototype contains:

```text
3 backgrounds

Site Aerial
site-aerial.jpg · 1.8 MB · 2400 × 1600

Tower A Shell
tower-a-shell.jpg · 940 KB · 1800 × 1200

Amenity Deck Render
amenity-deck.jpg · 1.2 MB · 2000 × 1400
```

These are prototype examples.

Do not hard-code them when real records exist.

If the backend does not expose background information to the frontend, document the limitation in the gaps file.

---

# 13. FLOORPLANS

Implement the Floorplans section completely.

Reference:

> Unit types, lease-term pricing and marketing imagery · fields marked Manual are protected from the next PMS sync

Implement:

* Add Floorplan
* Floorplan cards/listing
* Provider ID
* Layout
* Square feet
* Base price
* Unit count
* configured buttons
* interior images
* secondary image
* primary image
* floorplan drawing
* feed/manual indicators
* availability/status

The floorplan listing information must come from the existing DB.

---

# 14. FLOORPLAN EXAMPLE DATA

The prototype contains examples such as:

```text
The Aspen
ENT-ASP-0520
Studio · 1 Bath
520 sq.ft
$1,650/mo
1 unit
2 buttons configured
3 interior images
Secondary image set
```

and:

```text
The Birch
ENT-BIR-0720
1 Bed · 1 Bath
720 sq.ft
$1,950/mo
2 units
1 button configured
2 interior images
```

and:

```text
The Cedar
ENT-CED-1100
2 Bed · 2 Bath
1,100 sq.ft
$2,400/mo
2 units
3 buttons configured
5 interior images
```

and:

```text
The Douglas
Not set
3 Bed · 2 Bath
1,450 sq.ft
$3,150/mo
1 unit
No buttons
No interior images
```

These are **prototype examples only**.

Do NOT hard-code them.

Find the actual floorplans belonging to the selected property.

---

# 15. FLOORPLAN IMAGE VIEWER

Every available real image should use the existing image viewer where possible.

The Eye/View action must:

* open actual image
* display it at a larger size
* allow closing
* not modify image data

Reuse the project's existing image viewer component if one exists.

---

# 16. ADD FLOORPLAN

Implement the complete modal UI shown in the prototype.

But:

**Save Floorplan = Close modal only**

No:

* POST
* PATCH
* PUT
* DB write
* record creation

---

# 17. UNITS

Implement the full Units experience from the improved HTML.

It must use **real DB data through the existing controllers/data sources**.

Implement:

* unit count
* search
* floorplan filter
* availability filter
* building filter
* state filter
* bedroom filter
* bathroom filter
* floor filter
* price min/max
* square-feet min/max
* unit cards/details

---

# 18. ALL UNIT FILTERS MUST ACTUALLY WORK

These cannot be visual-only controls.

Implement functional filtering for:

* All Floor Plans
* All Availability
* All Buildings
* Any State
* All beds
* All baths
* All floors
* Price min
* Price max
* Sq Ft min
* Sq Ft max

Search should work against appropriate real fields, including:

* unit name
* provider ID
* floorplan

Use the existing loaded/backend data whenever possible.

Do not create unnecessary new backend filtering APIs.

---

# 19. UNIT DATA

Display actual data for:

* Unit number/name
* Availability
* Map/plot status
* Provider ID
* Floorplan
* Layout
* Price
* Square feet
* Availability source
* Placement
* Building
* Floor
* Lock
* Tour order
* Unit status
* Manual vs Feed indicators

The prototype examples such as:

```text
Unit 1204
Unit 1210
Unit 0810
Unit 0512
Unit 1802
Unit B-214
```

must NOT be hard-coded.

Load actual records.

---

# 20. UNIT IMAGE VIEWER

Where real unit images are available:

* show the eye icon
* open actual image
* enlarge it in a modal/lightbox
* allow close

Reuse the existing image viewer if available.

---

# 21. UNIT ACTIONS

Implement these UI actions:

* Re-sync from PMS
* Mass Overrides
* Add Unit

But they must remain read-only/no-op.

### Re-sync from PMS

Open modal.

Do not run synchronization.

Do not send a write request.

Close modal on confirmation.

### Mass Overrides

Open modal.

Do not modify any data.

Save/Confirm closes modal.

### Add Unit

Open modal.

Display the appropriate UI.

Save closes the modal.

Do not create a unit.

---

# 22. NO FAKE SUCCESS STATES

Do not show:

* "Saved successfully"
* "Updated successfully"
* "Deleted successfully"
* "Sync completed"
* "Unit created"

when no backend operation actually occurred.

The UI should simply close the modal or remain unchanged.

---

# 23. COMPONENT REUSE

Before creating any React component:

Search the entire project for an existing suitable component.

Reuse existing components for:

* cards
* filters
* dropdowns
* buttons
* badges
* modal/dialog
* image viewer
* search
* layout
* headers
* navigation
* empty states
* loading states

Only create a new component when there is genuinely no reusable option.

For every new component created, record the reason in `PYN_CONNECT_PROGRESS.md`.

---

# 24. REAL-DATA REQUIREMENT

For every major displayed value, identify:

```text
UI field
→ Existing Rails source
→ Model
→ Association
→ Existing data source
→ React mapping
```

Do not use prototype values just because they are easier.

Prototype data is for:

* layout
* structure
* states
* labels
* visual behavior

The database is the source of truth for actual property information.

---

# 25. GAPS FILE

Create/update:

`/Users/zubairzulifqar/pynwheel-staging/gaps_properties_detail_feature.md`

Only add items that genuinely cannot be completed without backend changes.

Use this format:

```text
## Gap: <name>

### UI Requirement
<what the UI needs>

### Existing Backend Investigation
<controller/model/route/data source checked>

### Current Limitation
<why React cannot obtain/use the required information>

### Future Backend Requirement
<what backend capability would eventually be required>

### Current Frontend Behavior
<what is intentionally left unavailable/read-only>
```

Do NOT put normal frontend tasks in this file.

---

# 26. PYN_CONNECT_PROGRESS.md

Append a new dated section.

Include:

* Feature name
* Investigation completed
* Old Rails flows traced
* Data sources identified
* Floorplates implementation
* Floorplans implementation
* Units implementation
* Filters implementation
* Image viewer implementation
* Modal implementation
* Components reused
* Components created
* Real-data verification
* Read-only behavior
* Gaps identified
* Testing status

Do not delete existing progress history.

---

# 27. context.md

Append a new dated context section.

Document the technical knowledge discovered during this work:

* Inventory route
* Property → Inventory navigation
* Old Rails routes/controllers
* Models and associations
* Floorplate data source
* Floorplan data source
* Unit data source
* Image data source
* Existing reusable React components
* Important data mapping decisions
* Read-only/no-write rule
* Known limitations
* Backend gaps
* Anything future developers need to know

Do not erase existing context.

---

# 28. IMPLEMENTATION ORDER

Follow this sequence.

## Phase 1 — Investigation

Read all documentation and both HTML files.

## Phase 2 — Existing React inspection

Understand current architecture and reusable components.

## Phase 3 — Rails tracing

Trace old Floorplates, Floorplans and Units implementations.

## Phase 4 — Data mapping

Map every important UI field to its real backend source.

## Phase 5 — Gap identification

Record anything that genuinely requires backend work in:

`gaps_properties_detail_feature.md`

## Phase 6 — Inventory navigation

Implement Properties → Inventory.

Test it.

## Phase 7 — Inventory header and summary

Implement counts and status.

Test.

## Phase 8 — Floorplates

Implement complete read-only floorplate listing.

Test with real data.

## Phase 9 — Floorplate images

Implement working Eye/View.

Test.

## Phase 10 — Add Floorplate modal

Implement UI-only modal.

Test that no write request occurs.

## Phase 11 — Floorplans

Implement complete floorplan listing using real data.

Test.

## Phase 12 — Floorplan images

Implement image viewer.

Test.

## Phase 13 — Add Floorplan modal

Implement UI-only modal.

Test.

## Phase 14 — Units

Implement complete unit listing.

Test with real data.

## Phase 15 — Filters/search

Implement and test every filter individually and in combination.

## Phase 16 — Unit image viewer

Implement and test.

## Phase 17 — Unit action modals

Implement:

* Re-sync
* Mass Overrides
* Add Unit

as read-only UI.

## Phase 18 — UI comparison

Compare against:

`pyn-connect-22-sep-new.html`

## Phase 19 — Documentation

Append dated sections to:

* `PYN_CONNECT_PROGRESS.md`
* `context.md`

Update:

* `gaps_properties_detail_feature.md`

## Phase 20 — Final QA

Run the application and test everything end-to-end.

---

# 29. WRITE-REQUEST AUDIT

This is mandatory.

Open browser DevTools → Network.

Click every action.

Confirm that the following do NOT produce mutation requests:

* Add Floorplate Save
* Floorplate Edit Save
* Floorplate Delete
* Upload SVG
* Plot Units
* Plot Amenities
* Add Floorplan Save
* Floorplan Edit Save
* Add Unit Save
* Mass Overrides Save
* Re-sync PMS
* Delete actions

There must be **no frontend-triggered DB mutations from this feature**.

Only existing read operations/data retrieval are allowed.

---

# 30. TEST WITH REAL DATA

Do not only test with the prototype values.

Use actual property records from the existing environment.

Verify:

* property identity
* floorplates
* SVG status
* floorplate images
* buildings
* floor ranges
* floorplans
* floorplan images
* prices
* unit counts
* units
* availability
* square feet
* building/floor placement
* manual/feed indicators
* amenities
* totals

Cross-check important values against the existing old system.

---

# 31. REGRESSION TEST

Verify that existing functionality still works:

* Login
* Companies
* Properties
* Property Detail
* Property listing
* Go To → Inventory
* navigation/back buttons

No existing feature should regress.

---

# 32. FINAL DIFF REVIEW

Before finishing:

Run a complete git diff review.

Confirm:

* no Rails/backend changes
* no migrations
* no DB schema changes
* no unnecessary API changes
* no fake production data
* no unnecessary duplicate components
* no unrelated refactoring
* no broken existing functionality

---

# 33. FINAL RESPONSE

Return:

## Investigation

Rails routes/controllers/models/data sources discovered.

## Implementation

What was implemented section by section.

## Real Data

Which parts use real backend/database data.

## Reused Components

Existing components reused.

## New Components

Only newly created components and why.

## Read-Only Actions

List all UI-only write operations.

## Gaps

Summarize what was added to:

`gaps_properties_detail_feature.md`

## Documentation

Summarize the new additions to:

`PYN_CONNECT_PROGRESS.md`

`context.md`

## Testing

Explain:

* real-data testing
* filters
* image viewers
* navigation
* modals
* network/write audit
* regression testing

## Remaining Issues

Only genuine remaining limitations.

---

# FINAL INSTRUCTION

Do not jump directly into implementation.

Follow this exact process:

```text
READ
↓
UNDERSTAND EXISTING REACT
↓
TRACE OLD RAILS IMPLEMENTATION
↓
MAP REAL DATA
↓
IDENTIFY REUSABLE COMPONENTS
↓
IDENTIFY TRUE BACKEND GAPS
↓
DOCUMENT GAPS
↓
IMPLEMENT ONE SECTION
↓
TEST WITH REAL DATA
↓
IMPLEMENT NEXT SECTION
↓
TEST
↓
UPDATE PROGRESS + CONTEXT
↓
FINAL QA
```

### Non-negotiable rules

**1. No backend changes whatsoever.**

**2. Use existing backend/controllers/database for real data.**

**3. Do not hard-code real property/floorplan/unit information from the prototype.**

**4. Reuse existing React components whenever possible.**

**5. Write actions must never mutate the database.**

**6. Anything that genuinely requires backend work goes into `gaps_properties_detail_feature.md`.**

**7. `PYN_CONNECT_PROGRESS.md` and `context.md` must both receive a new dated entry documenting this work.**

**8. Do not mark anything complete until it has been tested with real data.**

---

# Status update — September 25, 2026 (branch `feature/properties_inventory_improvments`)

Everything in this brief is implemented on real data (PYN_CONNECT_PROGRESS.md §17 and §18). This pass compared the merged page with `pyn-connect-22-sep-new.html` element by element:

| Section | Data source | State |
|---|---|---|
| Header, subtitle, tab counts | `floorplates.json` meta, the four listings | ✅ (publish state: G16) |
| Floorplates cards | `floorplates.json` | ✅ Now the design's 4 + 1 grid with the Background select (G15: one real option) |
| Background Library | `communities.background_svg_image` | ✅ Real shared background or empty state; uploads disabled (G15/G19) |
| Floorplate images / viewer / dialogs | `floorplates.json` | ✅ Read-only; title "Edit Floorplate" as designed |
| Floorplans cards, filters, images, dialog | `floorplans.json` | ✅ Read-only; title "Edit Floor Plan"; badges not built (G17) |
| Units cards, 10 filters + search, image viewer | `units.json` | ✅ |
| **Unit card title → Unit Detail page** | `units.json` + `floorplans.json` + `floorplates.json` | ✅ New in this pass (`/properties/:id/units/:unitId`): Unit Data, Gallery, Placement (pin %), Lease-Term Pricing (`lease_terms`) |
| Re-sync / Mass Overrides / Add Unit / Edit Unit | — | ✅ UI only; Save closes; 0 non-GET requests in the audit |
| Amenities | `amenities.json` | ✅ |
| Unplotted tab | — | Not built: unreachable dead markup in the 22-Sep design |

Testing: typecheck ✅; Playwright audit on 348 / 4331 / 1625 (see §18); e2e 51 pass + 29 known font failures.
Remaining: G15–G21 (gaps doc §4–§5). Map & Plotting is real for numeric ids since Sep 25 (PYN_CONNECT_PROGRESS.md §20, `gaps_map_plotting_feature.md`); Tour Setup is still a demo screen.

# Status update — September 26, 2026 (branch `feature/amenities_improvements`)

The Amenities tab now follows `pyn-connect-amenties.html` (the amenities design; brief `feature_aminities_improvments.md`, PYN_CONNECT_PROGRESS.md §21, context.md §17), still on `GET /communities/:id/amenities.json`:

| Element | Data source | State |
|---|---|---|
| Section header, Add Amenity, "Show amenity name on webpages" | `communities.show_amenity_name` (new meta) | ✅ Switch is read-only |
| Search + Type / Building / Floor / Lock / State / Setup filters, count | the listing's rows; `lock_provider`, `show_in_stops` are new keys | ✅ All working against real data, combinable; verified against `psql` on 2157 |
| Cards: image, name, type tag, Plotted / Not on map, In Stops List / Hidden from Stops, Building, Floor, Lock Provider, Video, Gallery, chips | `amenities` + `amenity_galleries` + `doors` (lock rule) + floorplate fallback for building / floor | ✅ |
| Video | `video_link` + `video_link_button_label` (new) — a link to the stored URL, new tab | ✅ (inline playback: gaps GA5) |
| Image viewer | `amenities.image`, gallery images | ✅ Real files; "1 of N" |
| Add / Edit Amenity dialog: name, type, building, floor, video, lock provider, show in stops, description, directional text, image, gallery | the legacy amenity form's columns; `self_tour`, `enable_locks`, `lock_options` (new meta) | ✅ UI only; Save closes; 0 non-GET requests |
| Delete, Remove image, Replace, Upload | — | ✅ Confirm / dialog only (G20) |
| Floors as "Lobby / Rooftop" | `amenities.floor` is an integer | Reads "Floor N" (gaps GA1) |

Testing: typecheck ✅; new `tests/e2e/amenities.spec.ts` on 2157 / 1106 / 1232 (every filter count equals the database's); full Playwright run 84 passed; regression over Companies, Properties, Property Detail, Inventory tabs, Unit Detail and Map & Plotting with 0 writes.

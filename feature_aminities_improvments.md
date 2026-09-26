I have improved the **Amenities listing, filters, cards, and actions**.

The new reference UI is:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-amenties.html`

Please use this file as the **primary UI/source-of-truth for the Amenities page** and update the current Amenities implementation in:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

The goal is to make the current Next.js Amenities page match the improved reference UI as closely as possible while ensuring that **all data shown on the page comes from the existing database/backend where available and is displayed accurately**.

---

# 1. IMPORTANT PROJECT CONTEXT

Before making any changes, read:

```text id="i10d9u"
/Users/zubairzulifqar/pynwheel-staging/pyn-connect-amenties.html

/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html

/Users/zubairzulifqar/pynwheel-staging/pyn-connect-new.html

/Users/zubairzulifqar/pynwheel-staging/react-architecture.md

/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/feature_inventory_page.md

/Users/zubairzulifqar/pynwheel-staging/properties_detail_feature.md

/Users/zubairzulifqar/pynwheel-staging/gaps_properties_detail_feature.md
```

Then inspect the current implementation in:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

Understand the existing:

* Amenities page
* Inventory page
* Property Detail page
* routing
* API/data fetching
* serialization/parsing
* shared components
* cards
* filters
* buttons
* modal/dialog system
* image viewer
* loading/empty states

---

# 2. PRIMARY OBJECTIVE

Improve the current Amenities page so it matches:

`pyn-connect-amenties.html`

The new UI contains:

* Property Inventory header
* Amenities summary
* Amenities heading/description
* Add Amenity
* Search
* All Types
* All Buildings
* All Floors
* Any Lock
* Any State
* Any Setup
* Amenity count
* Amenity cards
* amenity images
* video state/action
* gallery information
* description
* directional text
* lock provider
* building
* floor
* map status
* stops-list status
* image upload UI
* other actions shown in the reference

Implement the complete UI, not just the card list.

---

# 3. REAL DATABASE DATA IS MANDATORY

The new HTML contains example records such as:

```text id="ohxk4y"
Rooftop Pool
Pool
Tower A
Rooftop
Latch
3 images
In Stops List
Not on map
```

and:

```text id="e3omqf"
Fitness Center
Fitness Center
Tower A
Lobby
RemoteLock / EdgeState
2 images
In Stops List
Not on map
```

and:

```text id="zq3q7g"
Leasing Lounge
Leasing Center
Tower A
Lobby
None
1 image
In Stops List
Not on map
```

These are **prototype/example values**.

Do NOT hard-code them.

The actual Amenities page must retrieve and display the real records belonging to the selected property from the existing DB/backend.

This includes, where available:

* Amenity name
* Amenity type
* Building
* Floor
* Lock provider
* Video
* Gallery/images
* Description
* Directional text
* Map status
* Stops-list status
* Hidden state
* Any other existing amenity information

---

# 4. OLD SYSTEM IS THE BACKEND SOURCE OF TRUTH

The old Pynwheel system is HTML/ERB backed by Rails.

Use the old implementation and its labels to find the actual data source.

The old page contains:

```text id="gqgk5l"
Amenity Images

Upload images here to add to your property map.
Then plot them on the property map so that they appear in the correct place.

Images will appear at a size of 500 x 400 px.

Show Amenity Name on Webpages

No / Yes

Drag & Drop Images to Upload
```

Use the old implementation to trace:

```text id="5e90qh"
Route
→ Controller
→ Action
→ Model
→ Associations
→ Query
→ View/Data
```

Find exactly where the existing Rails system gets:

* amenities
* amenity images
* amenity type
* map information
* property/floor/building relationships
* stop visibility
* lock provider
* video information
* gallery information
* description/directional text
* other amenity attributes

Do not guess.

---

# 5. FIRST STEP — INVESTIGATION ONLY

Do not immediately start coding.

First compare:

### New target

`pyn-connect-amenties.html`

### Existing React

`pyn-connect-web`

### Old system

`pyn-connect-new.html` + corresponding Rails implementation

Create a complete implementation/data map:

| UI Element | Old Rails Source | Model/Association | Existing React Component | Real DB Data Available? | JSON Required? | Implementation |
| ---------- | ---------------- | ----------------- | ------------------------ | ----------------------- | -------------- | -------------- |

Cover every meaningful UI element.

Only after this investigation should implementation start.

---

# 6. BACKEND RULE — STRICT

## NO BUSINESS LOGIC CHANGES

The existing Rails backend remains the source of truth.

You may make **minimal controller/action changes only to expose existing data as JSON**, if required by Next.js.

### Allowed

You may:

* add `format.json`
* return JSON from an existing controller/action
* shape existing records into frontend-friendly JSON
* expose existing associations
* expose existing fields
* serialize existing data
* add read-only data mapping

Example:

```ruby id="f0tpij"
respond_to do |format|
  format.html
  format.json { render json: ... }
end
```

### Not allowed

Do NOT:

* change business logic
* change business rules
* change calculations
* change validations
* change authorization
* change database schema
* create migrations
* add columns
* change associations
* change existing write behavior
* create unnecessary new backend APIs
* introduce new business logic
* redesign existing backend architecture
* modify unrelated Rails code

The backend change must be limited to:

> **Expose existing database information in JSON for the Next.js Amenities page.**

---

# 7. SERIALIZATION ARCHITECTURE

Follow:

`/Users/zubairzulifqar/pynwheel-staging/react-architecture.md`

and:

`/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md`

throughout the implementation.

Use the same serialization/parsing/data-fetching conventions already established for:

* Login
* Companies
* Properties
* Property Detail
* Inventory
* Floorplates
* Floorplans
* Units

Do not introduce a separate ad-hoc approach for Amenities.

Before creating a new data layer, inspect what already exists and reuse it.

---

# 8. COMPONENT REUSE

Before creating a new component, search the existing Next.js application.

Reuse existing components for:

* Cards
* Filters
* Search
* Dropdowns
* Buttons
* Badges
* Modals
* Image viewers
* Tabs
* Layout
* Breadcrumbs
* Loading states
* Empty states
* Pagination if applicable

Only create a new component when an existing component cannot reasonably support the requirement.

For every new component, document why it was needed.

---

# 9. AMENITIES PAGE HEADER

Implement the complete header shown in the reference:

```text id="efwibv"
Properties
/
Luxe Mile High
/
Inventory

Property Inventory

4 floorplates · 2 without a floor SVG · 4 stops staged · not yet published

Map & Plotting
Tour Setup

Floorplates
4

Floorplans
4

Units
6

Amenities
6
```

The values must come from actual DB data wherever available.

Do not hard-code the counts.

---

# 10. AMENITIES SECTION

Implement:

```text id="zv8clj"
Amenities

Type, location, media and access for every amenity ·
the same records that become tour stops

Add Amenity
```

Then implement:

```text id="fy7uxv"
Search name, type or location

All Types
All Buildings
All Floors
Any Lock
Any State
Any Setup

6 amenities
```

The count must be derived from the actual database records.

---

# 11. SEARCH MUST WORK

The search input must actually filter the displayed real amenities.

Search at minimum across appropriate existing fields such as:

* amenity name
* amenity type
* building
* floor/location

Do not make the search a visual-only control.

---

# 12. ALL FILTERS MUST WORK

Implement every filter from the reference UI:

### Type

`All Types`

### Building

`All Buildings`

### Floor

`All Floors`

### Lock

`Any Lock`

### State

`Any State`

### Setup

`Any Setup`

Each filter must operate against the actual DB-backed amenity data.

Filters should be combinable.

For example:

```text id="h7coir"
Building = Tower A
+
Floor = Lobby
+
Lock = Latch
+
State = visible
```

must only show matching records.

Do not create fake filtering logic disconnected from the actual data.

---

# 13. AMENITY CARDS

Implement the complete amenity cards exactly as shown in the improved reference.

Each card should support data such as:

### Identity

* Amenity name
* Amenity type

### Placement

* Not on map / plotted state
* Building
* Floor

### Access

* Lock Provider

### Video

* Video exists / none
* PLAY VIDEO where applicable

### Gallery

* number of images
* empty state
* image previews where applicable

### Content

* Description
* Directional Text

### Media

* primary image
* gallery images
* upload image UI when appropriate

Use real backend data.

---

# 14. EXAMPLE AMENITY RECORDS

The prototype includes:

### Rooftop Pool

```text id="3ibjly"
Type: Pool
Map: Not on map
Stops: In Stops List
Building: Tower A
Floor: Rooftop
Lock Provider: Latch
Video: Play Video
Gallery: 3 images
```

### Fitness Center

```text id="2o5qh9"
Type: Fitness Center
Map: Not on map
Stops: In Stops List
Building: Tower A
Floor: Lobby
Lock Provider: RemoteLock / EdgeState
Video: None
Gallery: 2 images
```

### Leasing Lounge

```text id="t6x4ug"
Type: Leasing Center
Map: Not on map
Stops: In Stops List
Building: Tower A
Floor: Lobby
Lock Provider: None
Video: None
Gallery: 1 image
```

### Yoga Studio

```text id="bd42ur"
Type: Yoga Studio / Fitness Studio
Map: Not on map
Stops: Hidden from Stops
Building: Tower A
Floor: Floor 12
Lock Provider: Latch
Video: None
Gallery: Empty
```

### Dog Run

```text id="1vc2pn"
Type: Dog Park
Map: Not on map
Stops: Hidden from Stops
Building: Tower B
Floor: Lobby
Lock Provider: None
Video: Play Video
Gallery: Empty
```

### Package Room

```text id="gy0t0m"
Type: Package Locker
Map: Not on map
Stops: Hidden from Stops
Building: Tower A
Floor: Lobby
Lock Provider: Dwelo
Video: None
Gallery: Empty
```

These are only reference examples.

Do not hard-code them.

---

# 15. IMAGE HANDLING

Use real amenity images from the existing backend/storage.

Where an image exists:

* show it
* show the correct image
* preserve aspect/visual treatment from the prototype

If an amenity has multiple images:

* display the correct gallery count
* use actual images
* use the existing image viewer/lightbox if available

Where the prototype has an Eye/View action, make it work.

Clicking View/Eye:

→ open larger image
→ show actual image
→ close viewer

---

# 16. VIDEO

Where the existing backend contains video information:

display the corresponding state.

For example:

```text
PLAY VIDEO
```

or:

```text
None
```

Use the actual DB-backed state.

If video playback can safely be implemented using an existing available URL/component, implement it.

Do not invent video URLs.

If the backend does not expose the required video data, document the gap.

---

# 17. ADD AMENITY

Implement the complete Add Amenity UI shown by the reference.

However, the page remains read-only.

Therefore:

* opening the modal is allowed
* rendering the form is allowed
* field interaction is allowed
* Save/Confirm must NOT create a database record
* no POST/PUT/PATCH request should be sent

Save should simply close the modal.

Do not show fake success messages.

---

# 18. UPDATE / DELETE / UPLOAD ACTIONS

Implement the UI for actions shown in the reference where possible.

However:

### Update

No DB update.

### Delete

No DB delete.

### Upload Image

No upload request.

### Save

Close modal only.

### Confirm

Close modal only.

The database must remain untouched.

---

# 19. READ-ONLY RULE

The Amenities page is **read-only with respect to persistence**.

The user may visually interact with:

* search
* filters
* cards
* image viewer
* video UI
* tabs
* modal fields
* temporary UI states

But no action from the page may persist a change to the database.

---

# 20. DATA ACCURACY

For every displayed value ask:

> Where exactly does this value come from in the current Rails application?

For each major field identify:

```text id="uw6z4y"
Amenity Name
→ Rails source
→ Model
→ Association
→ Existing query
→ JSON
→ Parser
→ React component
```

Do this for:

* amenity name
* type
* building
* floor
* map state
* stop state
* lock provider
* video
* gallery
* description
* directional text
* images
* counts

Do not use prototype data where real data exists.

---

# 21. AMENITY IMAGE / MAP RELATIONSHIP

The old system specifically uses Amenity Images for property maps.

Investigate how:

* amenity images
* amenity records
* map plotting
* property maps
* floorplates

relate to each other.

The new Amenities UI should accurately show the existing state of the amenity even if the actual map plotting is handled by the Map & Plotting feature.

Do not invent the relationship.

---

# 22. PROPERTY/FLOOR RELATIONSHIP

Use real property/building/floor relationships.

An amenity such as:

```text
Tower A
Lobby
```

must only be shown that way if those values actually exist in the DB.

Do not derive fake building/floor labels from prototype examples.

---

# 23. EMPTY STATES

Handle actual missing data correctly.

Examples:

```text
Gallery
Empty

Video
None

Provider ID
Not set
```

Do not display misleading placeholders when the real DB field is absent.

Use the prototype's visual empty states where appropriate.

---

# 24. LOADING / ERROR STATES

Follow the existing Next.js patterns for:

* loading
* API failure
* empty results
* missing images
* missing video
* unavailable data

Do not introduce an unrelated error-handling architecture.

---

# 25. IMPLEMENTATION PROCESS

Follow this exact sequence.

## STEP 1 — Read documentation

Read all required project and feature files.

## STEP 2 — Inspect existing Amenities React page

Understand what is already implemented.

## STEP 3 — Inspect new reference HTML

Map every UI element from:

`pyn-connect-amenties.html`

## STEP 4 — Inspect old Amenities implementation

Find the old Rails page/controller/models/data.

## STEP 5 — Build UI → Backend → React data mapping

Identify every data source.

## STEP 6 — Identify reusable React components

Search before creating anything.

## STEP 7 — Identify JSON requirements

Determine whether existing controller actions can expose the required data.

## STEP 8 — Make minimal controller JSON changes where necessary

Only expose existing data.

No business logic changes.

## STEP 9 — Implement page structure

Header, summary, section, search, filters.

## STEP 10 — Implement real amenity cards

Populate from DB.

## STEP 11 — Implement working filters/search

Verify every filter.

## STEP 12 — Implement image viewer

Use real amenity images.

## STEP 13 — Implement video UI

Use real data where available.

## STEP 14 — Implement Add Amenity modal

UI only; no DB write.

## STEP 15 — Implement remaining action UI

UI only; no mutation.

## STEP 16 — Pixel comparison

Compare React directly against reference HTML.

## STEP 17 — Real-data verification

Cross-check actual DB records.

## STEP 18 — Network audit

Confirm no mutation requests.

## STEP 19 — Documentation update

Update all relevant documentation.

## STEP 20 — Final regression review

Verify existing pages still work.

---

# 26. NETWORK AUDIT

Open browser DevTools → Network.

Test all actions.

Confirm no mutation requests occur from:

* Add Amenity Save
* Edit
* Delete
* Upload Image
* any Update action
* any Save/Confirm action

Allowed:

* GET/read requests
* image loading
* video loading
* local filtering
* local UI state

Not allowed:

* POST
* PUT
* PATCH
* DELETE
* uploads
* DB mutations

---

# 27. DOCUMENTATION

After implementation, update:

### Progress

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

Append a new dated section.

Include:

* Amenities UI implementation
* filters
* search
* cards
* data source
* JSON/controller changes
* components reused
* new components
* image/video handling
* testing
* read-only verification
* remaining gaps

Do not remove historical entries.

---

### Context

`/Users/zubairzulifqar/pynwheel-staging/context.md`

Append a new dated technical context section.

Include:

* Amenities route
* controller/action
* models
* associations
* data sources
* JSON response
* serialization/parsing
* React components
* image source
* important implementation decisions
* read-only behavior
* known limitations

Do not overwrite existing context.

---

### Feature documentation

Update:

`/Users/zubairzulifqar/pynwheel-staging/feature_inventory_page.md`

where appropriate.

Also update:

`/Users/zubairzulifqar/pynwheel-staging/properties_detail_feature.md`

where Amenities is referenced.

Keep these documents consistent with the actual implementation.

---

### Gaps

If anything genuinely cannot be implemented with:

```text id="j8x8c3"
Existing DB data
+
Existing Rails controller/model logic
+
Minimal JSON response exposure
```

document it in:

`/Users/zubairzulifqar/pynwheel-staging/gaps_amenities_feature.md`

For each gap include:

```text id="efyq6i"
Requirement

Existing Rails Source Investigated

Existing DB Data

Why it cannot currently be exposed/used

Why a minimal JSON/controller change is insufficient

Future Backend Requirement
```

Do not put normal frontend work in the gaps file.

---

# 28. CODE QUALITY

Before finishing, review:

* component reuse
* serialization consistency
* API/data-fetching consistency
* TypeScript types
* loading/error handling
* duplicate logic
* hard-coded data
* unnecessary backend modifications
* business logic leakage into frontend

Follow the project's existing architecture.

---

# 29. REGRESSION TEST

Verify these still work:

* Login
* Companies
* Properties
* Property Detail
* Inventory
* Floorplates
* Floorplans
* Units
* Amenities

Verify navigation between related pages.

---

# 30. FINAL GIT REVIEW

Run:

```bash id="hf0ii8"
git status
git diff
```

Ensure:

* no migrations
* no schema changes
* no business logic changes
* no unnecessary backend changes
* only required controller JSON exposure
* no hard-coded DB records
* no unrelated refactoring
* existing components reused
* documentation updated

---

# FINAL RESPONSE

Return a structured report containing:

## Investigation

Old Rails routes/controllers/models/data sources discovered.

## UI Implementation

What was implemented from the reference HTML.

## Real Data

What actual DB data is being displayed.

## JSON / Backend

Which controllers/actions were changed only to expose JSON.

Explicitly confirm:

> No business logic, business rules, schema, validation, authorization, or unrelated backend behavior was changed.

## Components

Existing components reused and any new components created.

## Filters

Confirm each Amenities filter is functional.

## Images / Video

Confirm image and video behavior and actual data sources.

## Read-only Actions

List all actions that are intentionally UI-only/no-op.

## Documentation

Confirm updates to:

* `PYN_CONNECT_PROGRESS.md`
* `context.md`
* `feature_inventory_page.md`
* `properties_detail_feature.md`
* `gaps_amenities_feature.md`

## Testing

Report:

* real-data testing
* search
* filters
* images
* video
* modals
* network/write audit
* regression testing

## Remaining Gaps

Only genuine limitations.

---

# NON-NEGOTIABLE RULES

1. **`pyn-connect-amenties.html` is the target UI.**
2. **The existing Rails database is the source of truth for data.**
3. **Do not hard-code prototype amenity data.**
4. **Minimal controller JSON changes are allowed only to expose existing data.**
5. **Do not change business logic or database structure.**
6. **All persistent actions remain disabled/read-only.**
7. **Reuse existing React components and serialization architecture.**
8. **Every filter must actually work against real data.**
9. **Image/view actions must use actual backend data.**
10. **Anything requiring a backend mutation or functionality that cannot be achieved with minimal JSON exposure must go into `gaps_amenities_feature.md`.**
11. **Append to `PYN_CONNECT_PROGRESS.md` and `context.md`; do not overwrite history.**
12. **Do not mark anything complete until it has been tested with real DB data.**

Follow:

```text id="yb1r5v"
READ
→ INVESTIGATE
→ TRACE OLD RAILS FLOW
→ MAP REAL DB DATA
→ MAP JSON
→ FOLLOW SERIALIZATION ARCHITECTURE
→ IDENTIFY REUSABLE COMPONENTS
→ IMPLEMENT UI
→ CONNECT REAL DATA
→ IMPLEMENT FILTERS
→ IMPLEMENT IMAGE/VIDEO UI
→ IMPLEMENT READ-ONLY ACTIONS
→ TEST REAL DATA
→ NETWORK AUDIT
→ UPDATE DOCUMENTATION
→ FINAL QA
```

**Start with investigation. Do not modify code until you have inspected the reference HTML, current Amenities implementation, old Rails implementation, data sources, and existing React/serialization architecture.**

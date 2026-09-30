I have created/improved the **Map & Plotting** and **Tour Setup** UI for the Pynwheel Connect Next.js migration.

The purpose of this task is to deeply analyze the new reference UI, the current Next.js implementation, and the old Rails/HTML implementation, then complete **ONLY the Map & Plotting and Tour Setup screens**.

Do not implement unrelated screens or modules from the reference HTML.

---

# 1. Branch

I am working on the branch:

`feature/properties_inventory_improvments`

Do not make unrelated changes outside the scope of:

* Map & Plotting
* Tour Setup
* Shared components/infrastructure required by these two screens
* Minimal controller JSON exposure required to provide their existing data

---

# 2. Scope — VERY IMPORTANT

The reference file is:

`/Users/zubairzulifqar/Downloads/pyn-system-plotting.html`

**Do not implement the complete UI/application shown in this file.**

Implement **ONLY**:

## Map & Plotting

and

## Tour Setup

including all of their:

* UI
* navigation
* cards
* lists
* tabs
* selectors
* canvas/map
* SVG rendering
* real DB data
* filters/selections
* buttons
* modals
* validation
* local UI interactions
* Auto Plot workflow
* plotting workflow
* routing UI
* Tour Stops
* Elevators & Locks
* Routing
* related dialogs and states

Do not implement unrelated platform screens.

---

# 3. REQUIRED SOURCE FILES

Before changing code, read:

### New Map & Plotting / Tour Setup reference

`/Users/zubairzulifqar/Downloads/pyn-system-plotting.html`

### Existing improved UI reference

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html`

### Old UI

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-new.html`

### Architecture

`/Users/zubairzulifqar/pynwheel-staging/react-architecture.md`

`/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md`

### Documentation

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

`/Users/zubairzulifqar/pynwheel-staging/context.md`

`/Users/zubairzulifqar/pynwheel-staging/feature_inventory_page.md`

`/Users/zubairzulifqar/pynwheel-staging/properties_detail_feature.md`

`/Users/zubairzulifqar/pynwheel-staging/gaps_properties_detail_feature.md`

Then inspect the current Next.js project:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

---

# 4. DO NOT START CODING IMMEDIATELY

First perform a complete investigation.

Understand:

* current Map & Plotting implementation
* current Tour Setup implementation
* current routes
* current Property Detail
* Inventory
* Floorplates
* Floorplans
* Units
* Amenities
* existing map/canvas components
* SVG rendering
* image handling
* modals
* selectors
* tabs
* shared components
* API/data fetching
* serialization/parsing
* existing types
* existing state management

Search the project before creating any new component.

---

# 5. OLD SYSTEM IS THE DATA / BEHAVIOR SOURCE OF TRUTH

The old system was Rails/HTML.

Map & Plotting is the new representation of the old:

**Property Map → Auto Wayfinding**

Trace the old implementation deeply.

Find:

```text
Route
→ Controller
→ Action
→ Model
→ Associations
→ Queries/scopes
→ View
→ JavaScript
→ Database data
```

Find the actual sources for:

* buildings
* floors
* floorplates
* SVGs
* background images
* units
* amenities
* polygon IDs
* plotted positions
* nodes
* paths
* pathway connections
* vertical connections
* starting points
* map dimensions
* coordinate systems
* Auto Wayfinding
* plotting
* routing
* tour stops
* elevators
* locks

Do not guess.

The old labels are intentionally similar to the new UI; use them to locate the existing backend implementation.

---

# 6. FIRST DELIVERABLE — DATA / UI MAP

Before implementation, create a complete mapping:

| New UI Feature | Old Rails/UI Source | Controller/Action | Model/Association | Real DB Data | JSON Needed | Existing React Component | Required Change |
| -------------- | ------------------- | ----------------- | ----------------- | ------------ | ----------- | ------------------------ | --------------- |

Cover all Map & Plotting and Tour Setup functionality.

Do not proceed to implementation until this investigation is complete.

---

# 7. REAL DB DATA IS MANDATORY

The database is the source of truth.

Use real existing DB data for every field where available.

Do NOT hard-code:

* buildings
* floors
* floorplates
* SVG names
* image names
* units
* amenities
* polygon IDs
* coordinates
* plotted locations
* paths
* nodes
* vertical connections
* tour stops
* elevator/lock information
* counts
* statuses

Prototype values are only examples of how the UI should look.

---

# 8. BACKEND RULE — MINIMAL JSON CHANGES ONLY

You may make **minimal Rails controller/action changes only when required to expose existing DB data as JSON for Next.js**.

### Allowed

* add `format.json`
* return JSON from an existing controller/action
* include existing associations
* expose existing fields
* shape existing records into frontend-friendly JSON
* serialize existing data

Example:

```ruby
respond_to do |format|
  format.html
  format.json { render json: ... }
end
```

### NOT allowed

Do not:

* change business logic
* change business rules
* change calculations
* change validations
* change authorization
* change database schema
* create migrations
* add columns
* redesign models
* change existing associations
* change unrelated routes
* change unrelated controllers
* change existing business behavior
* implement new persistence/business behavior

The backend changes should be limited to:

> **Exposing existing data for the new Next.js UI.**

---

# 9. SERIALIZATION ARCHITECTURE

Follow:

`react-architecture.md`

and:

`data-serialization-architecture.md`

throughout.

Use the same:

* serialization
* parsing
* typing
* normalization
* API/data-fetching

patterns already used by:

* Companies
* Properties
* Property Detail
* Inventory
* Floorplates
* Floorplans
* Units
* Amenities

Do not introduce a one-off serialization approach for Map & Plotting or Tour Setup.

Preferred flow:

```text
Existing DB
→ Existing Rails controller/business logic
→ Minimal JSON exposure
→ Existing serialization/parsing layer
→ Typed Next.js data
→ React state
→ UI / Canvas
```

---

# 10. MAP & PLOTTING — COMPLETE SCOPE

Implement the complete Map & Plotting UI from:

`pyn-system-plotting.html`

Only for this screen.

The UI includes:

* page header
* breadcrumbs
* building selector
* floor/floorplate selector
* floor status
* SVG availability
* completion counts
* map/canvas
* polygon rendering
* unit pins
* amenity pins
* selection
* Place Pin
* Junction
* Connect
* Move
* Auto Plot
* Manual Plot
* Grid
* Publish
* Plot Units & Amenities
* Add Floorplate
* Auto Plot wizard
* matching
* pattern rules
* live preview
* confirm
* result
* validation
* empty states
* error states
* all relevant cards/lists/panels

Implement the full meaningful UI.

---

# 11. MAP & PLOTTING HEADER

Implement:

```text
Map & Plotting

Pick a building and floorplate, select units or amenities,
then drop them onto polygons in the floor SVG.
```

Breadcrumb:

```text
Properties
/
<Property>
/
Map & Plotting
```

Property must be dynamic.

Do not hard-code the property ID.

---

# 12. BUILDING SELECTOR

Implement the building selector.

It must load real buildings from DB.

Selecting a building must update:

* available floorplates
* floors
* counts
* SVG state
* map
* plotted objects
* unplotted objects
* related data

---

# 13. FLOOR / FLOORPLATE SELECTOR

Implement the complete floor list shown in the reference.

Each item must correctly display:

* floor name/number
* floor type
* plotted count
* total count
* SVG state
* selected state

Statuses such as:

* Done
* No SVG
* `3/4`
* `10/11`

must be calculated from actual DB-backed data.

Do not hard-code them.

---

# 14. ADD FLOORPLATE

Reuse the Add Floorplate component already created in the application.

Only create another component if absolutely necessary.

The modal must visually match the reference.

### Important

Save must **not** persist anything.

Behavior:

```text
Open modal
→ interact with fields
→ Save
→ close modal
```

No DB mutation.

No POST/PUT/PATCH.

No fake DB record.

---

# 15. MAIN MAP CANVAS — HIGHEST PRIORITY

The canvas is the most important part of this task.

It must render actual data from the selected floor.

Render:

* floor SVG
* SVG polygons
* correct scaling
* correct dimensions
* unit labels
* plotted unit pins
* amenity pins
* background/image where applicable
* pathway nodes
* pathway connections
* vertical connections where applicable
* selected state
* temporary local plotting state

The objective is:

> Existing DB-backed map data should appear in the correct logical position in the new canvas, matching the old system.

---

# 16. SVG / COORDINATE HANDLING

Investigate the old system to determine:

* SVG viewBox
* width/height
* polygon coordinates
* transforms
* coordinate system
* stored X/Y values
* canvas scaling
* offsets
* background dimensions

Do not assume stored coordinates are browser pixels.

Reproduce the old coordinate transformation where necessary.

A pin saved in the old DB at a particular position must appear in the corresponding location in the new UI.

---

# 17. EXISTING PLOTS

Load and render actual persisted plots.

If the DB says a unit/amenity is plotted:

* show it
* use its real location

If it is not plotted:

* show it in the available/unplotted list

Do not fabricate plotting state.

---

# 18. UNIT / AMENITY PLACEMENT

Implement:

**Plot Units & Amenities**

Use actual DB data.

Support:

* selecting an available unit/amenity
* placing it on the canvas
* visual plotted state
* plotted/unplotted count
* local movement

All newly created/moved plotting must remain local.

---

# 19. TEMPORARY LOCAL STATE

Separate:

### Persisted DB state

* saved positions
* saved paths
* saved nodes
* saved floorplates
* existing SVGs
* existing units
* existing amenities

from:

### Temporary UI state

* new pins
* moved pins
* new junctions
* new connections
* Auto Plot results
* manual assignments
* temporary hallway paths
* algorithm results
* grid state

Temporary state must never be sent to the backend.

---

# 20. SELECT

Implement Select mode.

User can click:

* unit
* amenity
* polygon
* node
* connection

and see the correct selected state/information.

Use real data.

---

# 21. PLACE PIN

Workflow:

```text
Select item
→ Place Pin
→ click map
→ temporary pin appears
```

Do not save.

No backend mutation.

---

# 22. JUNCTION

Implement local junction creation.

Junctions should:

* appear on canvas
* be selectable
* participate in temporary connections

Do not persist.

---

# 23. CONNECT

Implement local node-to-node connections.

Support the UI behavior shown by the reference.

Do not persist.

---

# 24. MOVE

Implement local drag/repositioning.

Moving existing pins should change only frontend state.

Do not update DB.

---

# 25. GRID

Implement Grid toggle.

The grid must visually overlay the actual map and assist plotting.

No backend request.

---

# 26. MANUAL PLOT

Implement manual plot interactions.

The user should be able to:

* select unit/amenity
* select polygon
* assign locally
* see updated UI
* see updated local counts

Do not persist.

---

# 27. AUTO PLOT

Implement the complete Auto Plot experience shown in the reference.

Do not reduce it to a button.

The workflow contains:

```text
1 Analyze
2 Match Pattern
3 Confirm
4 Result
```

Implement all meaningful UI and local behavior.

Use real DB data.

---

# 28. AUTO PLOT — ANALYZE

Analyze actual:

* PMS unit numbers
* floorplates
* SVG polygon IDs
* floorplates without SVG
* matchable records
* unmatched records
* skipped records

Do not hard-code prototype values.

---

# 29. AUTO PLOT — MATCH PATTERN

Implement the matching workflow.

Users should be able to work with:

* PMS unit number
* SVG polygon ID
* matching result
* manual assignment
* no match state

All preview operations are local.

---

# 30. AUTO PLOT — RULE BUILDER

Implement the complete reference UI for:

### Tokens

```text
{unit}
{digits}
{letters}
{floor}
{floor2}
{stack}
{stack3}
{bldg}
```

### Presets

```text
As is
Stack only
Floor-Stack
Digits only
Building + Digits
```

### Find & Replace

* add rule
* order
* reset/remove

### Trim

* none
* drop first
* drop last
* keep first
* keep last
* character count

### Pad & Wrap

* pad
* prefix
* suffix

### Comparison

* ignore separators
* ignore leading zeros
* ignore letter case

---

# 31. AUTO PLOT LIVE PREVIEW

The preview must operate against real loaded PMS/SVG data.

For example, a displayed transformation should be calculated from the actual value, not hard-coded.

---

# 32. AUTO PLOT RESULT

Implement:

* matched
* manual
* no match
* skipped
* validation state
* result table
* polygon assignment
* summary

The output remains local only.

Do not persist Auto Plot results.

---

# 33. START PLOTTING HALLWAYS / ALGORITHM

Where the new UI provides:

* Start Plotting Hallways
* Run Algorithm
* animated algorithm behavior

implement all behavior that can operate locally on the actual loaded map data.

Use real:

* nodes
* paths
* plotted objects
* coordinates
* floor information

Do not use arbitrary/demo path data.

Generated results remain temporary.

---

# 34. PUBLISH

Implement the Publish UI.

Publish normally changes application state.

Therefore:

* show the button
* show validation/confirmation UI if present
* perform local UI behavior
* do NOT send mutation request
* do NOT change DB

Do not display a fake backend success message unless the UI behavior specifically requires only a local success state.

---

# 35. UPLOAD / REMOVE

Implement UI for:

* Upload SVG
* Upload Image
* Remove Plan

but do not:

* upload
* delete
* modify DB

The UI should still behave correctly.

---

# 36. VALIDATION

Implement frontend validation for:

* no item selected
* no polygon selected
* invalid connection
* duplicate assignment
* missing SVG
* unmatched unit
* missing required pattern
* invalid pattern rule
* invalid floor/building
* unsupported operation

Do not send invalid operations to backend.

---

# 37. TOUR SETUP — COMPLETE SCOPE

Also implement **ONLY the Tour Setup screen** shown in the reference.

Do not implement unrelated screens.

Tour Setup contains:

* header
* breadcrumbs
* Inventory navigation
* Map & Plotting navigation
* Tour Stops
* Elevators & Locks
* Routing
* counts/status
* stop cards
* Plot on Plan
* View on Plan
* Edit UI
* AI Concierge information
* distance
* duration
* node information
* related metadata

---

# 38. TOUR SETUP HEADER

Implement:

```text
Tour Setup

Stops, elevator access and routing · 4 stops staged · not yet published
```

Tabs/navigation:

```text
Inventory
Map & Plotting
```

Summary:

```text
Tour Stops
4

Elevators & Locks
3

Routing
6
```

Counts must come from real data wherever available.

---

# 39. TOUR STOPS

Implement the complete Tour Stops cards/list.

Use real DB data.

Show where available:

* name
* type
* plotted/not plotted
* building
* floor
* source
* distance
* duration
* node
* AI Concierge information
* other metadata in the reference

Do not hard-code example records such as:

* Rooftop Pool
* Fitness Center
* Unit 1204
* Leasing Lounge

unless they actually exist in the selected property's DB.

---

# 40. TOUR STOP ACTIONS

Implement UI for:

* Plot on Plan
* View on Plan
* Edit
* Add Stop
* Publish

But do not persist changes.

For any write action:

```text
Open UI
→ validate locally
→ change local state if appropriate
→ close/success UI
→ no backend mutation
```

---

# 41. ELEVATORS & LOCKS

Implement the complete visible UI.

Load real existing data for:

* elevators
* stairs
* locks
* floors
* buildings
* access
* relationships
* status

Editing remains UI-only.

---

# 42. ROUTING

Implement the Routing section shown by the reference.

Use actual existing:

* nodes
* connections
* paths
* floors
* buildings

Allow local UI interactions where possible.

Do not persist anything.

---

# 43. NAVIGATION

Ensure:

```text
Properties
→ Property Detail
→ Inventory
→ Map & Plotting
→ Tour Setup
```

and:

```text
Inventory
↔ Map & Plotting
↔ Tour Setup
```

work correctly.

Preserve the selected property throughout.

Do not hard-code IDs.

---

# 44. REUSE EXISTING COMPONENTS

Before creating any new component:

Search the current project.

Reuse:

* map components
* SVG components
* cards
* tabs
* modals
* dialogs
* buttons
* selectors
* image viewers
* lists
* badges
* filters
* layout
* navigation
* loading
* empty states

Only create a new component when necessary.

Document why it was necessary.

---

# 45. NO MOCK DATA

Do not create static production-style datasets for:

* floors
* buildings
* floorplates
* units
* amenities
* paths
* nodes
* tour stops
* elevator/lock data

when real DB data exists.

---

# 46. NETWORK / READ-ONLY AUDIT

Use browser DevTools → Network.

Click every action.

Confirm that no mutation requests are sent for:

* Place Pin
* Junction
* Connect
* Move
* Auto Plot
* Manual Plot
* Grid
* Start Plotting Hallways
* Run Algorithm
* Publish
* Upload SVG
* Upload Image
* Remove Plan
* Add Floorplate
* Add Stop
* Edit
* Plot on Plan
* Elevator/Lock configuration
* Routing changes
* Save
* Delete
* Confirm

Only GET/read operations are allowed.

---

# 47. NO FAKE PERSISTENCE

Never show:

* "Saved successfully"
* "Published successfully"
* "Synced successfully"
* "Updated successfully"
* "Deleted successfully"

as if the DB was changed when it was not.

Use the reference UI's appropriate close/local-success behavior without claiming a real backend mutation.

---

# 48. GAPS DOCUMENTATION

Create/update:

`/Users/zubairzulifqar/pynwheel-staging/gaps_map_plotting_feature.md`

and:

`/Users/zubairzulifqar/pynwheel-staging/gaps_tour_setup_feature.md`

Only record genuine gaps.

A gap means:

> The functionality cannot be fully implemented using existing DB data + existing backend logic + minimal JSON exposure without requiring actual backend persistence/business functionality.

For each gap include:

```text
Requirement

Existing Rails Source Investigated

Existing DB Data

What Can Be Implemented Locally

What Cannot Be Implemented

Why Backend Work Is Required

Future Backend Requirement
```

Do not put normal frontend work into the gaps files.

---

# 49. DOCUMENTATION UPDATES

Append new dated sections to:

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

and:

`/Users/zubairzulifqar/pynwheel-staging/context.md`

Also update where relevant:

`/Users/zubairzulifqar/pynwheel-staging/feature_inventory_page.md`

`/Users/zubairzulifqar/pynwheel-staging/properties_detail_feature.md`

Do not delete existing history.

Document:

* Map & Plotting investigation
* Auto Wayfinding mapping
* Tour Setup investigation
* controllers/actions
* JSON exposure
* DB data sources
* serialization/parsing
* canvas implementation
* coordinate mapping
* plotting
* Auto Plot
* temporary local state
* Tour Stops
* Elevators & Locks
* Routing
* components reused
* components created
* testing
* network audit
* remaining gaps

---

# 50. IMPLEMENTATION PROCEDURE

Follow this sequence exactly.

## Phase 1 — Read

Read all source files, documentation and architecture.

## Phase 2 — Current implementation

Inspect existing Next.js Map & Plotting and Tour Setup.

## Phase 3 — New UI

Deeply inspect:

`pyn-system-plotting.html`

## Phase 4 — Old system

Trace Auto Wayfinding and Tour Setup in Rails/HTML/JavaScript.

## Phase 5 — Data map

Map:

```text
DB
→ Rails
→ JSON
→ Serialization
→ React
→ Canvas/UI
```

## Phase 6 — Components

Identify what can be reused.

## Phase 7 — Backend JSON

Add only minimal controller JSON exposure where necessary.

## Phase 8 — Map & Plotting shell

Build navigation/header/building/floor structure.

## Phase 9 — Canvas

Implement real SVG/background/polygon rendering.

## Phase 10 — Existing data

Render real units/amenities/plots/pathways.

## Phase 11 — Map tools

Implement:

* Select
* Place Pin
* Junction
* Connect
* Move
* Grid
* Manual Plot

## Phase 12 — Auto Plot

Implement complete local wizard.

## Phase 13 — Supporting map UI

Implement:

* placement list
* selection
* starting points
* path information
* vertical connections
* remaining controls

## Phase 14 — Tour Setup

Implement:

* Tour Stops
* Elevators & Locks
* Routing

## Phase 15 — Local action behavior

Implement all UI-only actions/modals/validation.

## Phase 16 — Real-data testing

Cross-check against existing Rails data.

## Phase 17 — Pixel review

Compare directly against new HTML.

## Phase 18 — Network audit

Confirm no mutation requests.

## Phase 19 — Documentation

Update all required files.

## Phase 20 — Final QA

Run complete regression testing.

---

# 51. CANVAS-SPECIFIC QA

The canvas must be tested separately.

Verify:

* correct floor SVG
* correct viewBox
* correct scaling
* correct polygon positions
* correct unit locations
* correct amenity locations
* correct nodes
* correct paths
* correct vertical links
* correct floor switching
* correct selected states
* correct temporary plotting
* no coordinate drift

Compare locations against the old system.

---

# 52. REAL-DATA QA

For at least one real property verify:

### Buildings

Actual DB buildings.

### Floors

Actual floors and floorplates.

### SVG

Correct SVG and status.

### Units

Actual units and plotting state.

### Amenities

Actual amenities and plotting state.

### Paths

Actual nodes/connections.

### Tour Setup

Actual tour stops and routing-related records.

Do not use demo data for this validation.

---

# 53. REGRESSION QA

Verify existing functionality remains intact:

* Login
* Companies
* Properties
* Property Detail
* Inventory
* Floorplates
* Floorplans
* Units
* Amenities
* Map & Plotting
* Tour Setup

---

# 54. GIT REVIEW

Before finishing:

```bash
git status
git diff
```

Confirm:

* no migrations
* no schema changes
* no unnecessary backend changes
* no business logic changes
* controller changes only expose JSON
* no hard-coded DB records
* no duplicate components
* no duplicate serialization logic
* no unrelated refactoring
* documentation updated

---

# 55. FINAL REPORT

Return:

## Investigation

Old Rails/HTML/JavaScript routes, controllers, models and data sources discovered.

## Data Flow

Show:

```text
DB
→ Rails
→ JSON
→ Serialization / Parser
→ Next.js
→ Canvas / UI
```

## Map & Plotting

Describe all implemented sections and interactions.

## Canvas

Explain:

* SVG loading
* background
* polygons
* units
* amenities
* coordinates
* paths
* nodes
* vertical connections

## Auto Plot

Describe:

* Analyze
* Match Pattern
* Confirm
* Result
* rule builder
* live preview
* local-only behavior

## Tour Setup

Describe:

* Tour Stops
* Elevators & Locks
* Routing

## Backend

List every controller/action changed.

Explicitly confirm:

> No business logic, business rules, database schema, validations, authorization, or unrelated backend behavior were changed. Backend changes were limited to exposing existing data as JSON.

## Components

List:

* reused components
* newly created components and why

## Real Data

List the real DB-backed data verified.

## Read-only Audit

Confirm that UI actions did not create DB mutations.

## Documentation

Confirm updates to:

* `PYN_CONNECT_PROGRESS.md`
* `context.md`
* `feature_inventory_page.md`
* `properties_detail_feature.md`
* `gaps_map_plotting_feature.md`
* `gaps_tour_setup_feature.md`

## Testing

Report:

* navigation
* building/floor switching
* canvas
* plotting
* Auto Plot
* modals
* validation
* Tour Setup
* real-data verification
* network/write audit
* regression testing

## Remaining Gaps

Only genuine backend limitations.

---

# NON-NEGOTIABLE RULES

1. **The scope is ONLY Map & Plotting and Tour Setup.**
2. **Do not implement unrelated screens from `pyn-system-plotting.html`.**
3. **The new reference HTML is the UI source of truth.**
4. **The old Rails/HTML implementation is the backend/data/behavior source of truth.**
5. **Use real DB data wherever it exists.**
6. **Do not hard-code prototype data.**
7. **Minimal controller changes for JSON exposure are allowed.**
8. **Do not change business logic or database structure.**
9. **Follow `react-architecture.md` and `data-serialization-architecture.md`.**
10. **Reuse existing React components whenever possible.**
11. **All persistent DB state is read-only from this UI.**
12. **Plotting, Auto Plot, movement, connections and algorithm results may exist as temporary local UI state only.**
13. **Every UI-only action, button, modal and validation should work properly.**
14. **Do not send mutation requests.**
15. **Do not fake backend persistence.**
16. **Anything genuinely requiring backend persistence/business functionality goes into the appropriate gaps file.**
17. **Append dated updates to `PYN_CONNECT_PROGRESS.md` and `context.md`; do not overwrite history.**
18. **Do not mark anything complete until it has been tested using real DB data.**

---

# FINAL EXECUTION PRINCIPLE

Follow:

```text
READ
↓
INVESTIGATE
↓
TRACE OLD RAILS AUTO WAYFINDING + TOUR SETUP
↓
MAP DB DATA
↓
MAP JSON
↓
FOLLOW SERIALIZATION ARCHITECTURE
↓
IDENTIFY REUSABLE COMPONENTS
↓
IDENTIFY TRUE GAPS
↓
IMPLEMENT MINIMAL JSON EXPOSURE
↓
IMPLEMENT MAP & PLOTTING
↓
IMPLEMENT REAL CANVAS DATA
↓
IMPLEMENT LOCAL PLOTTING
↓
IMPLEMENT AUTO PLOT
↓
IMPLEMENT TOUR SETUP
↓
TEST REAL DATA
↓
PIXEL REVIEW
↓
NETWORK AUDIT
↓
DOCUMENTATION
↓
REGRESSION TEST
↓
FINAL GIT REVIEW
```

**Start with investigation only. Do not modify implementation code until you have fully inspected the new Map & Plotting/Tour Setup reference, the current Next.js implementation, the old Rails/HTML/JavaScript implementation, the relevant controllers/models/data sources, and the project's serialization architecture.**

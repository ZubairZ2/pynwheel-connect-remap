We need to continue improving the current Pynwheel Connect Next.js implementation.

The scope of this task is specifically the **Map & Plotting page**, including the new **Wayfinding** toggle/mode, and the related **Plot on Map** and **Additional Stops** UI flows.

Do not re-implement functionality that is already correctly implemented. First inspect the current implementation, identify what is missing or incorrect, and build on top of what already exists.

---

# 1. PROJECT

Next.js application:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

Current branch:

`feature/properties_inventory_improvments`

---

# 2. REFERENCE FILES

Before making any changes, read and understand:

### New Map & Plotting / Wayfinding UI

`/Users/zubairzulifqar/pynwheel-staging/wayfinding-tour-app.html`

### Existing Map & Plotting reference

`/Users/zubairzulifqar/Downloads/pyn-system-plotting.html`

### Existing improved UI

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

Also inspect the relevant gaps files already present in the project.

---

# 3. FIRST: INVESTIGATION ONLY

Do not start coding immediately.

First inspect:

* current Map & Plotting page
* current Wayfinding implementation, if any
* current Plotting implementation
* current Plot on Map implementation
* current floor/floorplate navigation
* current SVG/canvas implementation
* current unit/amenity data flow
* current path/hallway data
* current tour-stop data
* current modals
* current shared components
* current serialization/parsing
* existing controller JSON responses

Then compare the current implementation with:

`wayfinding-tour-app.html`

and the old Rails/HTML implementation.

Create a clear **KEEP / REWORK / ADD / REMOVE** matrix before changing code.

---

# 4. VERY IMPORTANT: THE UI IS NOW SPLIT INTO MODES

The new design introduces a **Wayfinding** toggle/mode on Map & Plotting.

The Map & Plotting page should support the new UI state rather than showing unrelated legacy controls all at once.

Understand from the reference HTML exactly how the mode changes:

* toolbar
* side panel
* floor context
* point/path information
* plotting information
* wayfinding controls

Do not simply append the Wayfinding panel to the existing page.

The UI should transition correctly between the modes defined by the reference.

---

# 5. WAYFINDING TOGGLE

Implement the new **Wayfinding** toggle exactly as shown in:

`wayfinding-tour-app.html`

The toggle must be a real UI state.

When Wayfinding is OFF:

* show the normal Map & Plotting experience
* preserve the existing plotting UI

When Wayfinding is ON:

* show the Wayfinding-specific side panel
* show the appropriate map controls
* show the actual wayfinding points/paths/stops
* show the Wayfinding state for the selected floor/floor group
* preserve the selected property/building/floor context

Do not duplicate the whole map.

Use a shared map/canvas and switch the relevant UI/state layers.

---

# 6. WAYFINDING SIDE PANEL — SINGLE FLOOR

The reference contains a side panel similar to:

```text
Wayfinding

Tower A · Floor 1

Complete

18
Points

17
Paths

11/11
Stops Linked

Drag points to line them up with the hallways.
Click a point to select it.

Test shortest path

Route across

This Floor
Floors
Buildings

Try a sample route

Fills in a working From and To on this floor

From
Main Entrance
Lobby

To
Parking Access
Lobby

Find Shortest Path

Elevator and Stairs stops join floorplates
```

Implement all of this UI.

Do not hard-code the example values.

Use actual DB-backed data.

---

# 7. WAYFINDING COUNTS MUST BE REAL

The following must come from actual backend/database data:

* Points
* Paths
* Stops Linked
* completion state
* floor name
* building
* route nodes
* linked stops

For example:

```text
18 Points
17 Paths
11/11 Stops Linked
```

are reference values only.

Do not hard-code them.

---

# 8. WAYFINDING POINTS

Render actual wayfinding points from the existing backend.

The map should show real:

* points
* nodes
* path relationships
* stop links

Use the old Rails implementation to identify where these records come from.

The user should be able to:

* click a point
* select a point
* see selected state
* inspect relevant information
* drag a point locally where the reference allows it

Dragging must remain local-only.

---

# 9. WAYFINDING PATHS

Render actual hallway/path data.

Do not generate fake paths.

The map must use the actual existing:

* path geometry
* point/node relationships
* hallway structure
* floorplate relationships

The new UI should visually represent these paths correctly.

Continue following the old system's real map/path semantics.

---

# 10. IMPORTANT — STACKED FLOORS

Some floorplates represent **multiple physical floors sharing the same floorplate/layout**.

These are identified using the existing system's **Range** field.

This is a critical requirement.

Do not display these floors as completely independent floorplate cards when they belong to the same ranged/stacked floorplate.

---

# 11. STACKED FLOOR DETECTION

Use the existing DB floorplate `Range` information to identify stacked floors.

For example, when the range represents:

```text
5–14
```

the UI should understand this as:

```text
Tower A · Floors 5–14
```

rather than ten unrelated floorplate cards.

Do not invent your own grouping based only on sequential floor numbers.

Use the actual backend/range information.

---

# 12. STACKED FLOOR UI

For a stacked floorplate, the Wayfinding side panel should look like:

```text
Wayfinding

Tower A · Floors 5–14

Complete

Viewing floor
10 of 10 complete

5
6
7
8
9
10
11
12
13
14

—

Hallway paths are shared by all 10 floors.

Each polygon links that floor’s unit —
Unit 0501 on Floor 5.

Stops apply to every floor unless set to one floor.

19
Points

18
Paths

7/7
Stops Linked

Drag points to line them up with the hallways.

Test shortest path

Route across

This Floor
Floors
Buildings

Try a sample route

From
Elevator A
Floor 5 (shares Floors 5–14)

To
Unit 0501
Floor 5 (shares Floors 5–14)

Find Shortest Path

Elevator and Stairs stops join floorplates,
so a route can continue across floors and buildings.
```

Implement this exact concept.

Do not show ten independent copies of the same wayfinding side panel.

---

# 13. STACKED FLOOR BEHAVIOR

Within a stacked floor group:

* display the floor range
* display all floors belonging to the group
* allow selecting a specific floor
* keep shared hallway paths shared
* resolve unit polygons to the correct floor
* show floor-specific unit mappings
* preserve shared stop/path information
* correctly indicate completion for each floor

The UI must make it obvious that:

> The floorplate/layout is shared, while unit/stop assignments may be floor-specific.

---

# 14. STACKED FLOOR DATA

Use real backend data for:

* range
* floors
* units
* polygons
* path data
* points
* stops
* floor completion
* building

Do not hard-code `5–14`.

---

# 15. PLOT ON MAP TOGGLE / SIDE PANEL

The new Plotting state should include the updated side panel:

```text
Plot on Map

Tower A · Floor 3 · 5 of 5 plotted

Show
Units

Search name or floor

To Plot
0

Plotted
5

Select all (5)

Unit 0301
Polygon 0301 · Floor 3
Unplot

Unit 0302
Polygon 0302 · Floor 3
Unplot

Unit 0303
Polygon 0303 · Floor 3
Unplot

Unit 0304
Polygon 0304 · Floor 3
Unplot

Unit 0305
Polygon 0305 · Floor 3
Unplot
```

Implement the complete UI.

---

# 16. PLOT ON MAP — REAL DATA

The following must come from real DB data:

* floor
* plotted count
* available count
* unit list
* polygon IDs
* plotted/unplotted state

Do not hard-code the sample five units.

---

# 17. PLOT ON MAP INTERACTIONS

Implement UI behavior for:

* search
* select all
* deselect
* plot
* unplot
* selecting a polygon
* selecting a unit
* map highlight
* counts
* local state changes

However:

**Nothing is persisted to DB.**

The user should be able to interact with the UI exactly as the reference expects, but all changes exist only in frontend state.

---

# 18. SEARCH IN PLOT ON MAP

Implement:

**Search name or floor**

against actual loaded data.

Search should support appropriate unit fields.

Do not implement a visual-only input.

---

# 19. SELECT ALL

Implement:

**Select all (N)**

The selection should:

* select all currently visible/filtered records
* update UI state
* allow subsequent plotting/unplotting according to the reference

Do not change DB state.

---

# 20. UNPLOT

When clicking:

**Unplot**

the unit should be removed from the plotted state in the UI only.

Update:

* map marker
* list
* plotted count
* to-plot count

Do not send a backend request.

---

# 21. MAP STATE MUST STAY SYNCHRONIZED

The following must remain synchronized:

```text
Side panel
↔
Selected unit
↔
Selected polygon
↔
Map marker
↔
Plotted count
↔
To Plot count
```

Do not implement separate state copies that become inconsistent.

---

# 22. ADDITIONAL STOPS

When the appropriate UI mode is enabled, implement:

**Additional Stops**

Description:

> Entries, elevators, stairs, blockers and other self-tour stops.

Include:

**Add Stop**

---

# 23. ADDITIONAL STOP MODAL

Implement the complete modal shown in the reference:

```text
Add Additional Stop

Stops outside the data feed that guide self-tour visitors
between units and amenities.

Stop type

Entry Point
Exit Point
Elevator
Stairs
Ramp
Door / Gate
Blocker
Leasing Office
Restroom
Mail & Packages
Parking Access
Waypoint

Where self-tour visitors enter the building.
Routes start here.

Name

e.g. Main Entrance

Building

Tower A

Floorplate

Floor 3

Visitor instruction · optional,
shown in the self-tour app at this stop

e.g. Tap your tour pass on the reader to call the elevator.

Place it on the map after saving

Cancel

Add & Place on Map
```

Implement the full UI and validation.

---

# 24. ADDITIONAL STOP FORM

Implement proper frontend validation for:

* stop type
* name
* building
* floorplate
* visitor instruction
* required fields
* invalid values
* empty values
* selection state

Use the reference UI's validation behavior where available.

---

# 25. ADDITIONAL STOP SAVE

The form should behave like a complete production UI.

When the user clicks:

**Add & Place on Map**

perform the full frontend flow:

```text
Validate
→ create temporary stop
→ close/update modal
→ allow placement on map
→ show temporary stop
```

But:

**do NOT save to DB.**

No POST/PUT/PATCH/DELETE.

---

# 26. TEMPORARY ADDITIONAL STOPS

Temporary stops should:

* appear on the map
* be selectable
* have the correct local state
* participate in local routing where possible
* be removable locally where the reference supports it

They must disappear on reload unless persisted data already exists.

---

# 27. DETECT PATHS

The new Wayfinding UI contains:

**Detect Paths**

Implement the complete UI behavior from:

`wayfinding-tour-app.html`

Use the existing map/floor geometry and actual backend data.

If path detection can be performed entirely in the browser:

* implement it
* show the result in the UI
* allow the user to review it
* do not persist the result

If some part requires backend persistence:

* implement the UI
* do not send the mutation
* document that persistence requirement as a gap

---

# 28. SHORTEST PATH

Implement:

**Test shortest path**

and:

**Find Shortest Path**

The UI should support:

* From
* To
* route across:

  * This Floor
  * Floors
  * Buildings
* sample route
* route calculation
* route display
* no-route state
* invalid route state
* path highlighting

Use real points/paths/stops from the loaded database.

Do not use fake/demo route graphs.

---

# 29. TRY A SAMPLE ROUTE

Implement:

**Try a sample route**

This should:

* choose a valid From
* choose a valid To
* populate both inputs
* allow the user to run the route

The chosen records should come from actual loaded data.

---

# 30. ROUTE ACROSS

Implement:

```text
This Floor
Floors
Buildings
```

as actual UI state.

The route behavior should respect the selected scope.

Where cross-floor/cross-building routing depends on existing elevator/stair links, use the real data.

---

# 31. ELEVATORS AND STAIRS

The Wayfinding reference explains that:

> Elevator and Stairs stops join floorplates.

Use the existing backend data for:

* elevators
* stairs
* linked floorplates
* building relationships

This must allow the UI route representation to cross floors/buildings where the existing data supports it.

Do not fabricate connections.

---

# 32. WAYFINDING VISUALIZATION

On the map, render actual:

* points
* paths
* selected point
* selected path
* linked stop
* elevator/stair connection
* temporary point
* temporary path

Use the existing map/canvas architecture.

Do not create a second independent map renderer.

---

# 33. REAL DATA IS MORE IMPORTANT THAN DEMO VALUES

The reference includes examples such as:

```text
Main Entrance
Parking Access
Elevator A
Unit 0501
18 points
17 paths
11/11 stops
```

These are examples.

Do not hard-code them.

Load actual records.

If the DB does not contain equivalent data, show the correct empty state rather than inventing a record.

---

# 34. MAP/CANVAS DATA MUST REMAIN ACCURATE

The map is the most important part.

Make sure:

* unit polygons align
* unit labels align
* points align
* paths align
* stops align
* stacked floor relationships work
* coordinates are correct
* zoom/pan does not break alignment
* floor switching updates everything correctly

Continue following the existing coordinate/SVG architecture.

---

# 35. OLD SYSTEM INVESTIGATION

The labels in the old system are very similar.

Find the old controller/JavaScript implementation and determine:

* how wayfinding points are stored
* how paths are stored
* how floorplate ranges are handled
* how units are attached to polygons
* how stops are linked
* how elevators/stairs connect floors
* how route calculations work
* how path detection works

Do not implement a parallel fake data model.

---

# 36. JSON / BACKEND CHANGES

Minimal controller changes are allowed only when needed to expose existing data as JSON.

Allowed:

* add JSON response
* include existing associations
* serialize existing fields
* shape the response for Next.js

Not allowed:

* business logic changes
* schema changes
* migrations
* changing existing calculations
* changing authorization
* changing persistence behavior
* redesigning backend behavior

The backend remains the source of truth.

---

# 37. STRICT READ-ONLY RULE

The database is strictly read-only from this UI.

Allowed frontend behavior:

* plotting
* unplotting
* moving points
* adding temporary stops
* path detection
* route calculation
* shortest path
* selecting
* dragging
* validation
* modal interaction
* local state

Not allowed:

* saving plots
* saving points
* saving paths
* saving stops
* deleting stops
* publishing
* updating DB coordinates
* creating backend records

All changes are temporary/local.

---

# 38. NO FAKE BACKEND SUCCESS

If an action normally persists data:

do not claim that it was saved.

Use:

* local success state
* modal close
* temporary UI update

depending on the reference behavior.

Do not show:

```text
Saved successfully
Published successfully
Updated successfully
```

unless the message clearly represents only local UI behavior.

---

# 39. REUSE EXISTING COMPONENTS

Before creating anything new, search for:

* Map component
* SVG renderer
* floor navigation
* Plot on Map panel
* modals
* buttons
* dropdowns
* search
* cards
* stop components
* path components
* route components
* loading
* image viewer

Reuse them.

Create new components only where necessary.

Document every new component and why an existing component could not be reused.

---

# 40. SERIALIZATION

Follow:

`react-architecture.md`

and:

`data-serialization-architecture.md`

The preferred flow is:

```text
DB
→ Existing Rails controller
→ JSON
→ Existing serialization/parsing
→ Next.js types/state
→ Shared Map state
→ UI
```

Do not pass raw Rails responses directly into large UI components when the project's architecture expects parsing/normalization first.

---

# 41. PERFORMANCE

Do not load all map/wayfinding data unnecessarily.

Load data when the user reaches the Map & Plotting screen.

For stacked floorplates:

* load shared floorplate data once
* reuse it across the floors in the range
* avoid duplicating the same SVG/path data

Avoid:

* repeated SVG parsing
* repeated API calls
* duplicated unit/amenity data
* unnecessary rerenders of the canvas

---

# 42. RESPONSIVE / USABILITY

The UI must remain usable with:

* one floor
* many floors
* stacked floors
* many points
* many paths
* many stops
* no data
* no SVG
* partial data

The side panel should scroll appropriately without breaking the map.

---

# 43. TEST CASES

Use the project's existing test framework.

Add/update tests for:

## Wayfinding

* toggle OFF
* toggle ON
* single-floor panel
* stacked-floor panel
* point selection
* path selection
* drag point
* route scope
* sample route
* shortest path
* no route
* invalid route

## Stacked Floors

* range detection
* 5–14 example-style group
* floor selection inside group
* shared paths
* floor-specific unit
* shared stops
* completion states

## Plot on Map

* search
* select all
* plot
* unplot
* count updates
* map/list synchronization

## Additional Stops

* modal
* stop type
* validation
* missing required fields
* Add & Place on Map
* temporary stop
* cancel
* close

## Detect Paths

* detect
* preview
* result
* no-result
* local-only behavior

## Navigation

* Map & Plotting
* Inventory
* Tour Setup
* floor selection
* stacked floor selection

---

# 44. REAL-DATA TESTING

Use an actual property from the current DB.

Test at least:

### Single floor

Verify:

* real points
* real paths
* real units
* real stops
* actual map

### Stacked floor

Find a real floorplate with a `Range` covering multiple floors.

Verify:

* range is detected
* floors are grouped
* shared paths work
* floor-specific units are correct

Do not use hard-coded test records.

---

# 45. OLD SYSTEM COMPARISON

For each major behavior compare:

```text
Old Rails/HTML
vs
New Next.js
```

Focus on:

* data
* point placement
* path placement
* floor relationships
* stop relationships
* route behavior
* stacked floor behavior

The new UI can look better, but the underlying meaning/data must remain accurate.

---

# 46. DOCUMENTATION

After implementation, append a new dated section to:

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

and:

`/Users/zubairzulifqar/pynwheel-staging/context.md`

Document:

* Wayfinding toggle
* single-floor Wayfinding
* stacked-floor handling
* Range-based grouping
* Plot on Map panel
* Additional Stops
* Detect Paths
* shortest path
* route scopes
* JSON exposure
* real data sources
* serialization/parsing
* temporary local state
* reused components
* new components
* testing
* remaining gaps

Do not overwrite existing history.

---

# 47. GAPS

Create/update:

`/Users/zubairzulifqar/pynwheel-staging/gaps_map_plotting_feature.md`

and, if appropriate:

`/Users/zubairzulifqar/pynwheel-staging/gaps_tour_setup_feature.md`

Only document functionality that genuinely cannot be implemented with:

```text
existing DB data
+
existing Rails behavior
+
minimal JSON exposure
+
frontend/local state
```

For each gap:

```text
Requirement

Existing Rails Source Investigated

Existing DB Data

What Can Be Implemented in Next.js Today

What Cannot Be Implemented

Why It Requires Backend Persistence/Business Logic

Future Requirement
```

---

# 48. NETWORK AUDIT

Use browser DevTools → Network.

Exercise all actions.

Verify no mutation requests occur for:

* Plot
* Unplot
* Move
* Detect Paths
* Auto/Wayfinding changes
* Add Stop
* Delete Stop
* Publish
* Save
* Add & Place on Map
* path changes
* point changes
* routing changes

Only read operations are allowed.

---

# 49. FINAL UI REVIEW

Compare the final implementation directly against:

`/Users/zubairzulifqar/pynwheel-staging/wayfinding-tour-app.html`

Review:

* Wayfinding toggle
* side panel
* single floor
* stacked floor
* range grouping
* plot panel
* floor navigation
* map
* points
* paths
* stops
* route controls
* Additional Stops modal
* validation
* button placement
* spacing
* typography
* selected states
* responsive behavior

---

# 50. FINAL IMPLEMENTATION ORDER

Follow this exact order:

```text
1. Read all architecture/documentation
        ↓
2. Inspect current Map & Plotting implementation
        ↓
3. Read wayfinding-tour-app.html
        ↓
4. Compare current UI vs target
        ↓
5. Trace old Rails/HTML/JS
        ↓
6. Identify all real data sources
        ↓
7. Identify reusable components
        ↓
8. Identify required JSON exposure
        ↓
9. Implement Wayfinding toggle
        ↓
10. Implement single-floor Wayfinding panel
        ↓
11. Implement Range-based stacked-floor grouping
        ↓
12. Implement stacked-floor side panel
        ↓
13. Implement Plot on Map side panel
        ↓
14. Connect real unit/polygon data
        ↓
15. Implement local plot/unplot
        ↓
16. Implement Additional Stops modal
        ↓
17. Implement local temporary stops
        ↓
18. Implement Detect Paths UI/behavior
        ↓
19. Implement shortest-path UI/behavior
        ↓
20. Implement route scopes
        ↓
21. Implement elevator/stair floor linking
        ↓
22. Validate map/canvas rendering
        ↓
23. Test single floors
        ↓
24. Test stacked floors
        ↓
25. Test real DB data
        ↓
26. Network/write audit
        ↓
27. Pixel/UI review
        ↓
28. Update documentation
        ↓
29. Regression testing
        ↓
30. Final git review
```

---

# 51. FINAL ACCEPTANCE CRITERIA

The feature is complete only when:

### Wayfinding

* toggle works
* single-floor UI works
* stacked-floor UI works
* Range-based grouping works
* points are real
* paths are real
* stops are real
* route UI works
* shortest path works where supported
* sample route works
* floor/building routing scope works

### Plot on Map

* actual units load
* actual polygons load
* search works
* select all works
* plot works locally
* unplot works locally
* map and side panel remain synchronized

### Additional Stops

* modal works
* all stop types are supported visually
* validation works
* Add & Place works locally
* no DB mutation occurs

### Data

* real DB data is shown
* no hard-coded demo records
* correct stacked-floor relationships
* correct points/paths/stops

### Read-only

* no mutation requests
* no DB persistence

### UI

* matches the reference
* responsive
* usable
* consistent with existing Pynwheel Connect UI

---

# NON-NEGOTIABLE RULES

1. **Implement ONLY Map & Plotting and its Wayfinding/Plot-on-Map related UI.**
2. **Do not re-implement already working functionality.**
3. **Use `wayfinding-tour-app.html` as the primary reference for the new Wayfinding UI.**
4. **Use the old Rails/HTML/JS implementation as the behavior/data reference.**
5. **Use the existing DB as the source of truth.**
6. **Do not hard-code example points, paths, units, stops or counts.**
7. **Use the existing `Range` field to identify stacked floorplates.**
8. **Do not treat stacked floors as unrelated floorplates.**
9. **Use shared hallway/path data for stacked floors where the existing model requires it.**
10. **Implement the Plot on Map panel completely.**
11. **Implement Additional Stops UI and validation completely.**
12. **Implement local plotting and temporary stops without persistence.**
13. **Implement Wayfinding interactions using actual DB-backed map data.**
14. **Minimal controller changes are allowed only to expose existing data as JSON.**
15. **Do not change business logic, schema, validation, authorization, or persistence behavior.**
16. **Follow `react-architecture.md` and `data-serialization-architecture.md`.**
17. **Reuse existing components before creating new ones.**
18. **No mutation requests may be sent by this UI.**
19. **Test with real database data, including at least one real stacked floorplate.**
20. **Update `PYN_CONNECT_PROGRESS.md` and `context.md` with a dated implementation entry.**
21. **Document genuine backend/persistence limitations in the appropriate gaps file.**
22. **Do not mark the feature complete until real-data testing, UI testing and the network audit pass.**

---

# FINAL PRINCIPLE

Use:

```text
wayfinding-tour-app.html
        ↓
NEW UI / interaction source of truth

Old Rails/HTML/JavaScript
        ↓
Behavior + data-source truth

Existing DB
        ↓
Actual data

Existing React architecture
        ↓
Implementation foundation
```

The final result should be:

> **A complete Map & Plotting UI with the new Wayfinding mode, correct single/stacked floor behavior, real DB-backed points/paths/units/stops, complete Plot on Map and Additional Stops flows, full frontend validation and local interactions, with zero database mutations.**

**Start with investigation. Before changing any code, produce the KEEP / REWORK / ADD / REMOVE matrix and the DB → Controller → JSON → Serialization → React mapping for the affected Map & Plotting/Wayfinding features.**

We need to extend the current **Map & Plotting** implementation with the **Detect Hallways / Auto-Connect Paths** workflow.

This work is strictly for the existing **Map & Plotting / Wayfinding functionality** in the Pynwheel Connect Next.js application.

The goal is to reproduce the functionality of the existing POC and old system in the new UI, using **real existing DB data**, while keeping all editing/plotting changes **frontend-only and non-persistent**.

---

# 1. CURRENT PROJECT

Next.js application:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

Current branch:

`feature/properties_inventory_improvments`

---

# 2. POC IS THE SOURCE OF TRUTH FOR THIS ALGORITHM

We created a POC specifically for this functionality.

Before implementing anything, you MUST read:

```text
/Users/zubairzulifqar/sample_pyn_wheel_map/CONTEXT.md
```

and the corresponding feature documentation in:

```text
/Users/zubairzulifqar/sample_pyn_wheel_map/
```

Locate/read the POC `feature.md` as well.

The POC is the reference implementation for:

* hallway detection
* path/node generation
* Auto-Connect Paths
* shortest path
* node/path editing
* path splitting
* automatic neighbour reconnection
* undo behavior
* map graph behavior

**Do not recreate the algorithm from scratch based on assumptions.**

First understand how the POC works, then adapt that behavior into the existing Pynwheel Connect Map & Plotting architecture.

---

# 3. IMPORTANT — IGNORE POC FEATURES THAT ARE OUT OF SCOPE

The POC may contain functionality such as:

* Save Map
* My Maps
* Upload New Floor Plan (SVG)
* Auto-Plot Nodes

These are explicitly **out of scope** for this task.

Do not implement or expose them as part of this feature unless they already belong to the current Pynwheel Map & Plotting UI.

We only need the hallway/path/shortest-path functionality.

---

# 4. EXISTING UI

The current Map & Plotting page already has:

* property/floor navigation
* building selection
* floorplate selection
* map/SVG
* plotting
* Map & Plotting toolbar
* Wayfinding mode
* Plot on Map mode
* existing unit/amenity data
* existing path/node visualization

Do NOT reimplement functionality that already works.

First inspect the existing implementation and extend it.

Reuse the existing:

* map/canvas
* SVG renderer
* floor navigation
* side panels
* controls
* buttons
* modals
* state management
* data fetching
* serializers/parsers
* types
* loading/error components

Create a new component only when there is no reasonable existing component.

---

# 5. NEW DETECT HALLWAYS UI

Implement:

## Detect hallways on

with the following options:

```text
This floorplate

1 · Floor 1

All floorplates in 1

31 floorplates
```

The UI must clearly communicate what scope will be processed.

---

# 6. DETECT HALLWAYS — SCOPE BEHAVIOR

When the user selects:

### This floorplate

Run hallway detection only for the currently selected floorplate.

### All floorplates in 1

Run detection across the relevant floorplate group according to the current property's floor/range structure.

### All floorplates

Run detection across all applicable floorplates.

Use the current property's real floorplate data.

Do not hard-code:

* Floor 1
* 31 floorplates
* group counts

---

# 7. IMPORTANT — SKIP FLOORPLATES THAT ALREADY HAVE PATHS

When the user selects more than one floorplate:

> **Floorplates that already have paths must be skipped.**

This behavior is mandatory.

For example:

```text id="5fb8dx"
All floorplates
→ inspect floorplate 1
→ inspect floorplate 2
→ floorplate 2 already has paths
→ skip floorplate 2
→ inspect floorplate 3
→ ...
```

Do not overwrite existing paths.

Do not replace existing graph data.

Do not regenerate paths for floorplates that already have persisted path data.

The UI must show the user which floorplates were:

* processed
* skipped because paths already exist
* skipped because no SVG exists
* failed
* completed

Use actual DB state.

---

# 8. DETECT HALLWAYS MUST USE REAL FLOORPLATE DATA

For each floorplate being processed, load actual:

* floorplate
* SVG
* SVG geometry
* polygons
* building
* floor
* dimensions
* existing nodes
* existing paths

Do not use the POC's sample floorplan as production data.

The POC provides the algorithm.

The Pynwheel DB provides the actual data.

---

# 9. AUTO-CONNECT PATHS

Implement the POC's **Auto-Connect Paths** behavior.

This is the key algorithmic part of the feature.

The algorithm should operate on:

* actual floor SVG geometry
* detected hallway geometry
* actual points/nodes
* actual paths where applicable

The result must be shown in the new Map & Plotting UI.

---

# 10. AUTO-CONNECT MUST WORK FOR ONE FLOORPLATE

When the user selects:

```text
1 · Floor 1
```

the current floorplate should be processed.

The generated hallway/path graph should be shown on the map.

Do not persist the result.

---

# 11. AUTO-CONNECT MUST WORK FOR ALL FLOORPLATES

When the user selects:

```text
All floorplates
```

the algorithm should process the eligible floorplates.

For each floorplate:

1. Load actual floorplate/SVG data.
2. Determine whether paths already exist.
3. Skip if paths already exist.
4. Skip if there is no usable SVG.
5. Detect hallways.
6. Generate/auto-connect the path graph.
7. Store the result in temporary frontend state.
8. Update the UI progress/result state.

Do not overwrite existing persisted paths.

---

# 12. DO NOT PERSIST RESULTS

This is extremely important.

The DB remains strictly **read-only**.

The following are allowed:

* detecting hallways
* generating nodes
* generating paths
* editing nodes
* editing paths
* moving nodes
* splitting paths
* deleting local paths
* shortest-path calculation
* temporary Auto-Connect results
* temporary plotting

All of these must remain **frontend-only**.

Do NOT send:

* POST
* PUT
* PATCH
* DELETE
* save
* publish
* update coordinates
* update nodes
* update paths

The generated/editing state exists only in React/client state.

Reloading the page may discard the temporary changes.

---

# 13. DEFAULT EDITING MODE

The following POC interactions:

* drag a node
* double-click a node to delete it
* click empty space to add a node
* drag a path to bend it
* double-click a path to delete it
* Ctrl/Cmd + Z to undo

are only allowed when the normal map editing controls are disabled/unselected.

### Default state

By default:

```text
Move = OFF
Connect = OFF
Add Point = OFF
Erase = OFF
```

In this default state, the POC editing interactions should be available.

---

# 14. DEFAULT POC EDITING BEHAVIOR

When Move/Connect/Add Point/Erase are all disabled:

### Drag node

Drag a node to reposition it.

It should update local graph state.

It counts as reviewed once the user moves it.

### Double-click node

Delete that node locally.

Its neighbours should automatically be rejoined according to the POC's behavior.

### Click empty space

Create a local node.

It should link to its nearest eligible neighbours according to the POC algorithm.

### Drag path

Allow the user to bend a path.

A node should appear at the release point.

The path should split around the new node according to the POC behavior.

### Double-click path

Delete only that connection locally.

Do not remove unrelated paths.

### Ctrl/Cmd + Z

Undo the last local editing change.

Support repeated undo where the POC supports it.

---

# 15. IMPORTANT — TOOL SELECTION OVERRIDES DEFAULT POC EDITING

The POC editing behavior above is only the default state.

If a Map & Plotting toolbar icon is active:

```text
Move
Connect
Add Point
Erase
```

then the behavior should follow the semantics of the **selected tool**.

For example:

### Move ON

Only Move-specific interactions should be active.

### Connect ON

Use Connect-specific interaction.

### Add Point ON

Use Add Point-specific interaction.

### Erase ON

Use Erase-specific interaction.

Do not allow the default drag/double-click behavior to interfere with an active tool.

---

# 16. TOOL STATE MUST BE CLEAR

The UI must make the active tool obvious.

There should never be ambiguity about whether the user is:

* selecting
* moving
* connecting
* adding
* erasing

Use the current Map & Plotting visual language.

---

# 17. PATH SPLITTING

Follow the POC exactly.

When dragging a path:

```text
Existing path
A ───────── B

User drags path

A ───── C ───── B
```

The new node should be created at the appropriate location.

The original path should be replaced by the appropriate split connections.

All changes remain local.

---

# 18. NEIGHBOUR RECONNECTION

When deleting a node:

```text
A ── X ── B
      ↓
Delete X
      ↓
A ───── B
```

Follow the POC's actual neighbour/reconnection rules.

Do not invent a different graph algorithm.

---

# 19. UNDO

Implement:

**Ctrl/Cmd + Z**

for local hallway/path/node edits.

Undo should correctly restore:

* node positions
* deleted nodes
* added nodes
* deleted paths
* split paths
* restored connections

Do not undo unrelated page state such as:

* floor selection
* modal open state
* search
* filters

unless the POC explicitly does so.

---

# 20. FIND SHORTEST PATH

The POC's **Find Shortest Path** behavior is used by the current Pynwheel:

**Wayfinding → Find Shortest Path**

Therefore, adapt the POC's shortest-path implementation into the current Wayfinding panel.

Use the actual current map graph.

---

# 21. SHORTEST PATH MUST USE REAL GRAPH DATA

The route must use actual:

* nodes
* paths
* stop locations
* elevator/stair connections where supported
* floor relationships
* building relationships

Do not generate a fake route.

The POC algorithm should operate against the real graph loaded from the existing property.

---

# 22. SHORTEST PATH UI

Support the existing Wayfinding UI:

```text
Test shortest path

Route across

This Floor
Floors
Buildings

Try a sample route

From
...

To
...

Find Shortest Path
```

The route should:

* validate From
* validate To
* calculate shortest path
* highlight the resulting route
* show no-route state
* support changing From/To
* support route scope

---

# 23. ROUTE SCOPE

Implement:

### This Floor

Route only within the current floor.

### Floors

Allow route traversal between floors when valid floor connections exist.

### Buildings

Allow cross-building routing when valid connections exist.

Use real elevator/stair relationships.

Do not fabricate cross-floor connections.

---

# 24. DETECT HALLWAYS + SHORTEST PATH INTEGRATION

After hallway detection:

```text
SVG
→ detected hallway graph
→ nodes
→ paths
→ graph
→ shortest path
```

The generated local graph should immediately be usable by the current Wayfinding shortest-path UI.

No persistence should occur.

---

# 25. REAL DATA + LOCAL TEMPORARY GRAPH

Maintain two distinct layers:

### Persisted state

Loaded from DB:

* floorplate
* SVG
* existing points
* existing paths
* saved plotting
* actual units
* actual amenities
* actual stops

### Temporary graph state

Created in the UI:

* detected hallway nodes
* detected hallway paths
* moved nodes
* newly added nodes
* deleted nodes
* split paths
* deleted paths
* temporary connections
* shortest-path result

Never send temporary state back to the backend.

---

# 26. SVG / GEOMETRY ACCURACY

The hallway algorithm must operate on the actual SVG.

Before implementing:

* inspect the POC's SVG parsing
* inspect how it extracts geometry
* inspect how it determines hallway regions
* inspect how nodes are placed
* inspect how paths are connected
* inspect coordinate transformations

Use the same geometric assumptions where applicable.

Do not replace geometry processing with hard-coded coordinates.

---

# 27. EXISTING MAP/CANVAS MUST BE REUSED

Do not create a second map system.

The same Map & Plotting canvas should be used for:

* units
* amenities
* labels
* points
* paths
* hallway graph
* temporary graph
* shortest path

Everything must share the same coordinate system.

---

# 28. PERFORMANCE

For:

**All floorplates**

be careful with large properties.

Do not render every floorplate's full graph simultaneously if the UI does not require it.

Process intelligently and update the UI progressively where appropriate.

Reuse existing:

* parsed SVG
* floor metadata
* graph calculations

where possible.

Avoid repeated expensive geometry calculations.

---

# 29. DETECT HALLWAYS UI STATES

Implement complete UI states:

### Initial

No detection run yet.

### Processing

Show:

* currently processing floorplate
* overall progress
* processed count
* skipped count

### Complete

Show:

* detected nodes
* paths
* floorplates processed
* floorplates skipped
* no-SVG count

### Partial result

Some floorplates processed, some skipped/failed.

### No hallway found

Show a proper empty/result state.

### Existing paths

Show:

> Skipped — existing paths

Do not overwrite them.

---

# 30. VALIDATION

Handle:

* no floorplate selected
* floorplate has no SVG
* invalid SVG
* empty SVG
* SVG with no hallway geometry
* floorplate already has paths
* no graph nodes generated
* disconnected graph
* no route
* invalid From
* invalid To
* cross-floor route without connector
* cross-building route without connector

All validation should happen in the UI where possible.

---

# 31. NO BACKEND BUSINESS-LOGIC CHANGES

Minimal controller changes are allowed only if required to expose existing map/floor/path/node data as JSON.

Allowed:

* `format.json`
* exposing existing fields
* including existing associations
* frontend-friendly JSON response

Not allowed:

* changing hallway business logic in Rails
* changing existing path persistence
* changing route calculations in backend
* changing DB schema
* migrations
* new persistence behavior
* modifying existing business rules

The POC algorithm should be implemented in the Next.js/client side using the real data supplied by the existing backend.

---

# 32. SERIALIZATION ARCHITECTURE

Follow:

`/Users/zubairzulifqar/pynwheel-staging/react-architecture.md`

and:

`/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md`

Use:

```text
Existing DB
→ Existing Rails controller
→ JSON
→ Existing parser/serializer
→ Typed map data
→ Local graph state
→ Map & Plotting UI
```

Do not pass raw controller responses directly into the canvas if the existing architecture expects parsing/normalization.

---

# 33. REUSE EXISTING COMPONENTS

Search before creating.

Reuse current:

* map
* SVG renderer
* node/point renderer
* path renderer
* Wayfinding panel
* toolbar
* floor selector
* modal
* shortest-path UI
* loading state
* error state

Only create new components where genuinely necessary.

---

# 34. TESTING

Use the existing project's test framework.

Add tests for:

### Detect Hallways

* This floorplate
* All floorplates
* multi-floor selection
* existing-path skip
* no SVG
* invalid SVG
* no hallway result

### Graph Editing

* drag node
* delete node
* neighbour reconnection
* add node
* nearest-neighbour links
* bend path
* split path
* delete path
* undo

### Tool Modes

* default mode
* Move
* Connect
* Add Point
* Erase
* tool switching

### Shortest Path

* same-floor
* cross-floor
* cross-building
* no route
* invalid endpoints

---

# 35. REAL-DATA TESTING

Use a real property from the current DB.

Prefer a property/floorplate with:

* actual SVG
* actual hallway geometry
* existing unit polygons
* actual points/paths where available

Verify the detected graph against the old system/POC behavior.

For **All floorplates**, test a property with many floorplates.

Verify that floorplates with existing paths are skipped.

---

# 36. DO NOT USE DEMO GRAPH DATA

Do not hard-code:

* nodes
* path coordinates
* hallway coordinates
* floor numbers
* path counts
* graph sizes

Use actual loaded SVG/DB data.

The POC's sample values are algorithm examples, not production data.

---

# 37. DOCUMENTATION

Append a new dated section to:

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

and:

`/Users/zubairzulifqar/pynwheel-staging/context.md`

Document:

* POC mapping
* hallway detection
* Auto-Connect Paths
* floorplate scope
* existing-path skip rule
* graph editing
* undo
* shortest path
* real DB data source
* JSON changes
* serialization
* local-only state
* tests
* limitations

Do not overwrite existing history.

---

# 38. GAPS

Update/create:

`/Users/zubairzulifqar/pynwheel-staging/gaps_map_plotting_feature.md`

Only document functionality that genuinely cannot be completed using:

```text
existing DB data
+
existing Rails behavior
+
minimal JSON exposure
+
POC/client-side algorithm
```

For each gap include:

```text
Requirement

POC Capability

Existing Rails/DB Capability

What Can Be Implemented Locally

What Cannot

Why

Future Backend Requirement
```

Do not classify normal UI work as a gap.

---

# 39. IMPORTANT — DO NOT IMPLEMENT SAVE MAP

The POC may have:

* Save Map
* My Maps

Ignore those features completely.

They are not part of this implementation.

---

# 40. IMPORTANT — NO DB MUTATIONS

Under no circumstances should the following persist:

* hallway detection result
* auto-connected paths
* added nodes
* deleted nodes
* moved nodes
* split paths
* deleted paths
* manual connections
* shortest-path result
* temporary plotting
* route edits

The database is read-only.

Use local state.

---

# 41. FINAL QA

Before declaring complete:

### Detection

* This floorplate works
* All floorplates works
* existing paths skipped
* no-SVG floors skipped correctly

### Graph

* nodes correct
* paths correct
* coordinates correct
* SVG alignment correct

### Editing

* drag
* add
* delete
* split
* connect
* undo

### Shortest path

* correct route
* correct route scope
* no-route state

### UI

* dialogs
* progress states
* validation
* selection
* toolbar state
* side panel
* map

### Read-only

No mutation requests.

### Regression

Existing:

* Map & Plotting
* Wayfinding
* Plot on Map
* Inventory
* Floorplates
* Floorplans
* Units
* Amenities

must continue working.

---

# 42. FINAL EXECUTION ORDER

Follow this exact process:

```text
1. Read POC CONTEXT.md
        ↓
2. Read POC feature.md
        ↓
3. Inspect POC implementation
        ↓
4. Inspect current Next.js Map & Plotting
        ↓
5. Inspect current Wayfinding implementation
        ↓
6. Trace old Rails/HTML map/path data
        ↓
7. Map DB → Rails → JSON → Parser → React
        ↓
8. Compare POC algorithm with current data model
        ↓
9. Identify reusable components
        ↓
10. Implement Detect Hallways UI
        ↓
11. Implement This Floorplate
        ↓
12. Implement All Floorplates
        ↓
13. Implement existing-path skip logic
        ↓
14. Integrate Auto-Connect Paths
        ↓
15. Integrate graph editing
        ↓
16. Implement undo
        ↓
17. Integrate POC shortest path
        ↓
18. Connect it to current Wayfinding panel
        ↓
19. Test with real DB/SVG data
        ↓
20. Test all edge cases
        ↓
21. Audit network requests
        ↓
22. Pixel/UI review
        ↓
23. Update documentation
        ↓
24. Regression testing
        ↓
25. Final git review
```

---

# FINAL ACCEPTANCE CRITERIA

The implementation is complete only when:

1. **Detect Hallways → This floorplate works using the real selected floorplate/SVG.**
2. **Detect Hallways → All floorplates works using actual property data.**
3. **Floorplates that already have paths are skipped and never overwritten.**
4. **No-SVG floorplates are handled correctly.**
5. **Auto-Connect Paths follows the POC behavior.**
6. **The graph is rendered correctly on the existing Map & Plotting canvas.**
7. **Default node/path editing follows the POC when Move/Connect/Add Point/Erase are OFF.**
8. **Selected tools override the default editing behavior.**
9. **Node deletion reconnects neighbours according to the POC.**
10. **Path dragging creates/splits nodes according to the POC.**
11. **Path deletion removes only that connection.**
12. **Ctrl/Cmd + Z restores the last local graph change.**
13. **Find Shortest Path uses the POC logic and the actual loaded graph.**
14. **Shortest-path route scopes work where actual floor/building connectors exist.**
15. **All plotting/path/graph edits remain local-only.**
16. **No DB mutation requests are sent.**
17. **No demo graph data is hard-coded.**
18. **Existing components are reused wherever possible.**
19. **The POC behavior, old system data, and new UI are all aligned.**
20. **Documentation is updated with the actual implementation and limitations.**

---

# MOST IMPORTANT PRINCIPLE

Use these as the three sources of truth:

```text
POC
→ algorithm and graph-editing behavior

Old Pynwheel Rails/HTML system
→ actual data model, existing map/path behavior and backend source

Current DB
→ real production/staging data

New Map & Plotting UI
→ final visual and interaction design
```

The desired result is:

> **A complete Detect Hallways + Auto-Connect Paths + local graph editing + shortest-path experience inside the existing Next.js Map & Plotting UI, powered by real existing DB/SVG data, while keeping the database strictly read-only.**

**Start with investigation. First read the POC `CONTEXT.md` and `feature.md`, inspect the POC implementation, and map its graph/hallway/shortest-path behavior to the current Next.js Map & Plotting data model. Do not begin coding until that mapping is complete.**

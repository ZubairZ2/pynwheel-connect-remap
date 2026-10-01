We need to make the following **UX/UI improvements to the current Map & Plotting implementation** in the Next.js application.

Do not treat these as isolated cosmetic changes. First inspect the current implementation, understand how the old system handled these behaviors, and then implement them consistently with the new UI.

Current project:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

Primary reference:

`/Users/zubairzulifqar/Downloads/pyn-system-plotting.html`

Old UI / behavior reference:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-new.html`

Also follow:

`/Users/zubairzulifqar/pynwheel-staging/react-architecture.md`

`/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md`

---

# 1. FIRST — INVESTIGATE BEFORE CHANGING CODE

Before making changes:

1. Inspect the current Map & Plotting implementation.
2. Reproduce all three issues below.
3. Inspect the old system's Map / Auto Wayfinding implementation.
4. Determine how the old system handled:
   - map zoom
   - map reset/reload
   - map labels
   - SVG polygons
   - polygon names
   - label positioning
   - scaling
   - hover behavior
   - selected states

5. Search the existing Next.js codebase for reusable map/zoom/label components.

Create a small implementation map:

| Issue | Current Behavior | Old System Behavior | Root Cause | Required Change | Reusable Component |
| ----- | ---------------- | ------------------- | ---------- | --------------- | ------------------ |

Then implement one issue at a time and test it before moving to the next.

---

# 2. FIX MANUAL PLOT HOVER STATE

## Current bug

When:

**Manual Plot = ON**

hovering over the Manual Plot control causes the button/background to turn blue in a way that makes the text effectively disappear.

The problem is that the hover state is visually overriding the active state.

The current behavior is approximately:

```text id="m2d5c1"
Manual Plot ON
        ↓
Hover
        ↓
Background becomes same blue as active/background
        ↓
Text loses contrast / becomes hidden
```

This must be fixed.

---

# 3. CORRECT MANUAL PLOT ACTIVE + HOVER STATES

The control needs distinct visual states for:

### OFF

- normal background
- normal text
- normal border

### ON / Active

- active background
- active text
- active border/icon treatment

### ON + Hover

The hover state must **not destroy the active-state readability**.

The text must remain clearly visible.

Do not simply remove the hover effect.

Instead design the interaction so:

```text id="hjd7kw"
OFF
OFF + HOVER
ON
ON + HOVER
DISABLED
```

all have intentional visual states.

---

# 4. USE THE FINAL THEME

Match the visual language of:

`pyn-system-plotting.html`

Do not introduce arbitrary colors.

The active/hover design should be:

- readable
- accessible
- visually consistent
- clearly distinguishable
- consistent with the rest of the toolbar

Pay particular attention to:

- text contrast
- icon contrast
- border
- background
- hover transition
- focus state

---

# 5. MAP ZOOM CONTROLS

Add **Zoom In, Zoom Out and Reset/Reload controls** to the Map & Plotting map.

These should be visible on the map itself, not somewhere unrelated on the page.

The old system has similar map controls.

First inspect exactly how the old system handles them, then implement an improved version appropriate for the new UI.

Required controls:

```text id="i6kiqc"
Zoom In
Zoom Out
Reset / Reload View
```

---

# 6. ZOOM CONTROL UX

The controls should be easy to discover and use.

Prefer a compact floating map control such as:

```text id="y8kib7"
┌─────┐
│  +  │
├─────┤
│  −  │
├─────┤
│  ↻  │
└─────┘
```

Use the project's existing icon system where possible.

Do not copy the old UI's styling blindly.

Use the new UI's visual language while preserving the old system's useful behavior.

---

# 7. ZOOM BEHAVIOR

Implement real zooming on the map.

Zoom must affect the map/canvas itself, including:

- floor SVG
- polygons
- unit pins
- amenity pins
- labels
- nodes
- paths

Everything should remain spatially aligned.

Do not zoom only the background image while leaving overlays behind.

---

# 8. ZOOM CENTERING

When zooming:

- keep the map centered appropriately
- avoid sudden jumps
- preserve the user's current area of interest where practical
- keep pins/labels attached to their underlying map location

Do not allow overlays to drift away from the SVG.

---

# 9. ZOOM LIMITS

Define sensible minimum/maximum zoom levels.

At minimum:

- prevent zooming out to an unusably tiny map
- prevent zooming in so far that the map becomes unusable

Use the existing application's map behavior where applicable.

---

# 10. RESET / RELOAD VIEW

The third control should reset the map viewport to its default state.

It should restore:

- default zoom
- default pan/position
- correct selected floor
- correct map alignment

It should NOT reload the browser page.

The preferred behavior is:

```text id="v6j1qq"
Click Reset
→ restore default map viewport
→ keep current floor
→ keep current DB-backed map data
→ keep UI state where appropriate
```

Do not trigger unnecessary API calls.

---

# 11. MAP LABELING — IMPORTANT

The map currently needs proper labels similar to the old system.

Do not simply add plain text absolutely positioned over the canvas.

First understand **how the old system associated labels with map portions/polygons**.

The goal is to reproduce the old behavior in the new Next.js UI.

---

# 12. TRACE OLD LABELING IMPLEMENTATION

Inspect the old system to determine:

- where polygon IDs come from
- where unit/amenity names come from
- how polygon geometry is identified
- how labels are generated
- how labels are positioned relative to polygons
- how labels scale with the map
- whether labels are centered using polygon geometry
- how labels behave during zoom/pan
- how labels behave for different polygon sizes
- whether labels are hidden/shortened in small polygons
- how overlapping labels are handled
- how labels behave when a polygon is selected/hovered

Do not guess.

Use the old implementation and actual SVG data.

---

# 13. LABELS MUST BE DATA-DRIVEN

Labels must come from real DB/SVG information.

For example, if a polygon corresponds to:

```text id="bt72ka"
0201
0202
0203
0204
```

the displayed label should be derived from the actual polygon/associated unit data.

Do not hard-code:

```text
0201
0204
0207
```

or any other prototype values.

The flow should be:

```text id="prh2is"
DB / SVG
→ polygon
→ associated unit / amenity
→ label
→ map position
```

---

# 14. LABELS SHOULD BELONG TO POLYGONS

The label should visually appear as part of the corresponding map region.

For each labeled polygon:

- determine its geometry
- determine its visual center/appropriate label anchor
- place the label accordingly

Do not manually specify arbitrary X/Y positions for individual labels.

This must work for any property/floor.

---

# 15. LABEL POSITIONING

Use the SVG polygon geometry to calculate the label position.

Where appropriate:

- polygon centroid
- bounding-box center
- interior point
- an existing positioning algorithm from the old system

Use whichever approach matches the old system most accurately.

The label should remain attached to the polygon when:

- zooming
- panning
- changing floor
- resizing the map
- changing map dimensions

---

# 16. LABEL CONTENT

Determine the correct label based on the old system.

Depending on the underlying data, labels may represent:

- unit number
- amenity name
- polygon identifier
- floor/map region
- another map label

Do not assume every polygon uses the same label.

Use the old system's actual rules.

---

# 17. LABEL STYLING

The labels should be visually consistent with the new design.

Implement:

- readable font
- appropriate size
- sufficient contrast
- correct alignment
- subtle background/halo where necessary
- selected state
- hover state

Avoid labels that become unreadable against the map background.

---

# 18. LABEL SCALING

Labels must behave correctly when zooming.

They should not:

- detach from the polygon
- become incorrectly positioned
- scale disproportionately
- overlap the wrong polygon

Determine from the old system whether the labels:

- scale with the map
- remain constant in screen size
- use a hybrid approach

Then implement the appropriate behavior.

---

# 19. LABELS + POLYGON INTERACTION

When hovering a polygon:

- preserve readable label
- show the correct polygon hover state

When selecting a polygon:

- clearly indicate the selected region
- preserve its label
- show related information in the selection UI

When Manual Plot is enabled:

- ensure hover/selected styling does not interfere with label readability.

---

# 20. LABELS + PINS

If a polygon already has:

- unit pin
- amenity pin

ensure the label and marker do not visually conflict unnecessarily.

Use the actual map geometry to position them correctly.

Do not simply hide labels whenever a pin exists unless that is how the old system behaved.

---

# 21. MAP CONTROLS + LABELS MUST SHARE THE SAME VIEWPORT

Zooming and resetting must operate on the same viewport state for:

```text id="i9z2q0"
SVG
+
polygons
+
labels
+
pins
+
nodes
+
paths
```

Do not maintain separate coordinate systems for each overlay unless required by the SVG architecture.

---

# 22. SVG COORDINATE SYSTEM

Before implementation, inspect the actual SVG files and determine:

- `viewBox`
- width
- height
- polygon points
- transforms
- coordinate system
- scaling

The map labels must use the SVG's coordinate system.

Do not use browser pixel coordinates that break when the viewport changes.

---

# 23. RESPONSIVE BEHAVIOR

Verify zoom and labels at different viewport sizes.

Test:

- large desktop
- normal desktop
- narrower browser
- resized map panel

The labels must remain correctly associated with their polygons.

---

# 24. REUSE EXISTING COMPONENTS

Before creating new components, search the current project.

Reuse existing:

- map/canvas component
- SVG renderer
- zoom controls
- toolbar controls
- button components
- icon components
- selected state
- modal
- tooltip
- map overlays

Only create a new component when an existing one cannot reasonably support the feature.

---

# 25. REAL DATA

Use a real property/floor from the current DB for validation.

Verify:

- SVG
- polygons
- unit associations
- amenity associations
- labels
- pins
- coordinates
- paths
- nodes

Do not validate only using mock data.

---

# 26. PERFORMANCE

Do not introduce expensive processing on every mouse movement.

For labels:

- parse SVG only when necessary
- memoize polygon geometry
- avoid recalculating all centroids on every render
- avoid unnecessary DOM/SVG updates
- keep zoom smooth

For the zoom controls:

- avoid unnecessary API calls
- keep the interaction entirely client-side

---

# 27. TEST CASES

Add/update tests using the project's existing testing framework.

Cover:

### Manual Plot

- OFF
- hover OFF
- ON
- hover ON
- active text remains readable
- focus state

### Zoom

- zoom in
- zoom out
- min zoom
- max zoom
- reset
- repeated zoom
- zoom after floor switch

### Map

- SVG loads
- polygons load
- pins load
- labels load
- paths load
- nodes load

### Labels

- unit label
- amenity label
- small polygon
- large polygon
- zoomed in
- zoomed out
- panned map
- different floor
- different property
- selected polygon
- hovered polygon

### Integration

- floor switch
- selected floor state
- temporary plotting
- zoom reset
- labels after rerender
- labels after viewport resize

---

# 28. TEST AGAINST OLD SYSTEM

For at least one real property/floor:

1. Open the old Auto Wayfinding/map UI.
2. Identify the actual polygons and labels.
3. Compare the same floor in Next.js.
4. Verify that:
   - labels correspond to the same map regions
   - labels are positioned correctly
   - pins align correctly
   - map scaling is correct
   - zoom behavior does not break alignment

The old system is the behavior/data reference.

The new system is the UI reference.

---

# 29. NO BACKEND BUSINESS-LOGIC CHANGES

If data required for labels/coordinates is already available through the current backend:

use it.

If minimal controller JSON exposure is needed:

- update the existing controller/action
- return the existing data as JSON

Do not change:

- business logic
- business rules
- DB schema
- migrations
- authorization
- persistence behavior

---

# 30. READ-ONLY RULE

All map interactions remain UI-only.

Allowed:

- zoom
- pan
- reset
- hover
- select
- labels
- local plotting
- local movement
- temporary connections

Not allowed:

- save plotting
- persist movement
- publish
- update coordinates
- modify polygons
- database mutation

---

# 31. DOCUMENTATION

After implementation, append a dated section to:

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

and:

`/Users/zubairzulifqar/pynwheel-staging/context.md`

Document:

- Manual Plot hover fix
- zoom controls
- reset behavior
- map label implementation
- old-system behavior discovered
- coordinate/geometry handling
- real DB data used
- reusable components
- new components
- tests performed
- remaining issues

Do not overwrite existing documentation.

---

# 32. FINAL VALIDATION

Before declaring complete, verify:

### Manual Plot

The text remains readable when active + hovered.

### Zoom

- - works
- − works
- reset works

### Map

- SVG remains aligned
- polygons remain aligned
- pins remain aligned
- paths remain aligned
- labels remain aligned

### Labels

Labels correctly represent real units/amenities/polygons and follow the actual map geometry.

### Floor switching

Labels and overlays update correctly.

### Responsiveness

No layout/positioning bugs at different sizes.

### Regression

Verify:

- Inventory
- Floorplates
- Floorplans
- Units
- Amenities
- Map & Plotting
- Tour Setup

still work.

---

# FINAL IMPLEMENTATION ORDER

Follow this exact sequence:

```text id="q79h9i"
1. Inspect current Map & Plotting
        ↓
2. Reproduce Manual Plot hover issue
        ↓
3. Trace old map implementation
        ↓
4. Trace old zoom/reset behavior
        ↓
5. Trace old label/polygon behavior
        ↓
6. Inspect current reusable components
        ↓
7. Fix Manual Plot active/hover state
        ↓
8. Implement map zoom controls
        ↓
9. Implement reset viewport
        ↓
10. Map SVG coordinate system
        ↓
11. Map polygons to real data
        ↓
12. Implement data-driven labels
        ↓
13. Implement label positioning
        ↓
14. Integrate labels with zoom/pan
        ↓
15. Integrate labels with selection/hover
        ↓
16. Test with real DB data
        ↓
17. Compare against old system
        ↓
18. Add/update automated tests
        ↓
19. Pixel/UI review
        ↓
20. Regression testing
        ↓
21. Update documentation
        ↓
22. Final git diff review
```

# NON-NEGOTIABLE REQUIREMENTS

1. **Fix the Manual Plot active + hover state so the text always remains readable.**
2. **Add Zoom In, Zoom Out and Reset controls to the Map itself.**
3. **Zoom must affect the entire map coordinate system, not just the background.**
4. **Reset must restore the viewport without reloading the browser page or making unnecessary API calls.**
5. **Trace the old system before implementing map labels.**
6. **Map labels must be derived from real polygon/unit/amenity data.**
7. **Do not hard-code label coordinates.**
8. **Use SVG geometry/coordinate space for label positioning.**
9. **Labels must remain correctly aligned during zoom, pan, resize and floor switching.**
10. **Use the existing React components and architecture wherever possible.**
11. **Use real DB data for validation.**
12. **Only minimal controller JSON changes are allowed when required to expose existing data.**
13. **Do not change business logic or database schema.**
14. **Map interactions remain read-only and must not mutate the DB.**
15. **Add proper automated tests for the new behavior.**
16. **Update `PYN_CONNECT_PROGRESS.md` and `context.md` with the implementation findings.**

**Start by reproducing the Manual Plot hover bug and tracing how the old system handles map controls and polygon labels. Do not begin with a CSS-only fix until you understand the current state model and the old map implementation.**

# ADDITIONAL MAP & PLOTTING REQUIREMENTS — LABELS, PINS, PATHS & JOHN DEMO

There are several important visual/data discrepancies in the current Next.js Map & Plotting implementation that need to be investigated and fixed.

I have uploaded:

1. **A reference image/screenshot of the old UI** showing how the map labels, pins, paths and markers should appear.
2. **A reference image/screenshot of the new UI** showing the current incorrect rendering.

Use these uploaded images as additional visual references.

### Important

The **old UI screenshot is the reference for the actual map visualization behavior**, while:

`/Users/zubairzulifqar/Downloads/pyn-system-plotting.html`

remains the reference for the overall new UI layout/design.

Do not simply copy the old page styling. Instead:

> Preserve the new UI structure while reproducing the old system's correct map rendering, labeling, marker and path behavior.

---

# 1. CURRENT MAP RENDERING IS INCORRECT

The current Next.js Map & Plotting page does not render the map the same way as the old system.

Currently the new UI is showing things such as:

- large colored dots
- vector/arrow-like markers
- coordinate text
- oversized point markers
- incorrect pin styling
- incorrect path rendering
- missing labels

This is not how the old UI renders the map.

We need to investigate and reproduce the actual old rendering behavior.

---

# 2. OLD UI MAP VISUALIZATION IS THE SOURCE OF TRUTH

For:

- unit pins
- amenity pins
- path markers
- path lines
- labels
- location markers
- plus markers
- polygon labels
- selected markers

the old system should be treated as the behavioral/visual reference.

Specifically reproduce the visual semantics of:

### Yellow location markers

The old UI uses the yellow location-style marker for the appropriate plotted locations.

### Green plus markers

The old UI uses green `+` style markers for the appropriate map plotting/selection points.

### Paths

The old system renders actual pathways on the map.

Do not replace them with:

- arbitrary vectors
- coordinate labels
- large dots
- generic SVG arrows

unless that is actually how the old system renders that particular object.

### Unit pins

Unit plotting should use the old visual treatment.

### Amenity pins

Amenity plotting should use the appropriate old-system visual treatment.

---

# 3. DO NOT SHOW DEBUG COORDINATES IN THE FINAL MAP

The current implementation shows large markers plus coordinate/vector information.

This appears to be debugging/implementation visualization rather than the intended production UI.

Do not display raw:

```text
x
y
coordinates
```

or vector/debug information on the map unless the reference UI explicitly shows it.

The final map should look like a usable production map, not a debugging canvas.

---

# 4. TRACE THE OLD MAP IMPLEMENTATION

Do not solve this only with CSS.

Inspect the old implementation to understand:

- how markers are created
- marker DOM/SVG structure
- marker dimensions
- marker colors
- marker icons
- path structure
- path stroke
- path direction
- labels
- label anchors
- selected state
- hover state
- polygon state
- marker scaling
- map zoom behavior
- coordinate transformation

Trace the old system's:

```text id="qkfyw6"
DB data
→ Rails controller
→ map data
→ JavaScript
→ SVG/canvas
→ marker/path DOM
```

Also inspect the old Auto Wayfinding/map JavaScript.

Do not infer the behavior from the screenshots alone when the old source code can establish the actual implementation.

---

# 5. LABELING MUST MATCH THE OLD SYSTEM

The new UI is currently missing some labels even though they are visible in the old system.

This must be fixed.

Do not assume that all labels are generated only from the current unit/amenity list.

Investigate whether labels originate from:

- SVG polygon IDs
- unit numbers
- floorplan/unit relationships
- amenity records
- floorplate data
- static SVG text elements
- map-specific labels
- another existing mapping

The implementation must support all label types that the old system displays.

---

# 6. JOHN DEMO — FLOOR 3 — SPECIFIC CASE

Use this as a mandatory validation case:

**John Demo → Properties → 1411 → Map → Floor 3**

There is a specific discrepancy:

### Current/new UI

The map is missing the label for:

**Tenant lease space**

### Old UI

The corresponding map correctly displays the **Tenant lease space** label.

This must be investigated and fixed.

Do not hard-code:

```text
Tenant lease space
```

into the frontend.

Instead determine exactly where the old system gets that label and reproduce the same data flow in Next.js.

---

# 7. OLD SYSTEM REFERENCE URL

Use the old system page as an additional reference:

`https://pynwheelconnect.com/communities/1411/floorplates/1870/plotexp`

This specific page is important because it demonstrates the correct map rendering for the John Demo Floor 3 case.

Use it to understand:

- map image/background
- labels
- plotted points
- green markers
- yellow markers
- paths
- unit labels
- amenity labels
- polygon labels
- marker positioning
- overall map rendering

If the map image does not load correctly in the local Next.js environment, do not use that as a reason to skip the investigation.

Trace how the old page obtains its:

- SVG
- background image
- map assets
- labels
- plotting data

and use the underlying existing backend/data source.

---

# 8. MAP IMAGE / BACKGROUND ISSUE

The local implementation currently has cases where the map image/background is not loading correctly.

Investigate:

```text id="5ymt4k"
Old page
→ image/SVG source
→ storage URL
→ Rails response
```

versus:

```text id="g47in9"
Next.js
→ JSON
→ serialized image URL
→ browser request
```

Determine whether the issue is:

- missing URL
- incorrect URL
- relative path
- host mismatch
- asset path
- authentication
- CORS
- serialization
- storage URL generation
- wrong property/floor mapping

Fix the actual data flow where possible.

Do not replace the real map with a screenshot or static local image.

---

# 9. MAP SVG + BACKGROUND MUST REMAIN ALIGNED

The selected floor may contain:

- Floor SVG
- Background image

Both must align correctly.

Verify:

- width
- height
- viewBox
- scaling
- offsets
- coordinate systems

The following must all share the same coordinate space:

```text id="0g4t0m"
Background
+
SVG polygons
+
labels
+
unit pins
+
amenity pins
+
paths
+
nodes
```

There must not be separate coordinate transformations causing drift.

---

# 10. LABEL POSITIONING

Do not hard-code label positions.

Determine label location using the actual:

- SVG geometry
- polygon geometry
- old-system coordinate mapping
- existing map metadata

Labels must remain correctly positioned when:

- zooming
- panning
- changing floor
- resizing
- switching building

---

# 11. LABEL TYPES

Determine every label type used by the old map.

Do not limit implementation to unit numbers.

Examples may include:

- Unit numbers
- Amenity names
- Space names
- Area names
- Tenant/lease-space labels
- Map-region labels
- Polygon labels
- Other embedded labels

Use the old system to identify the complete set.

---

# 12. PATH RENDERING

The current new UI does not represent paths correctly.

Investigate the old system's actual path representation.

Reproduce:

- line/path geometry
- start/end points
- direction if applicable
- visual styling
- connection points
- junctions
- vertical relationships where applicable

Do not represent a path as a large dot or a generic vector.

The map should visually read as a pathway graph, consistent with the old system.

---

# 13. PIN RENDERING

The current large colored circles are not acceptable when they do not match the old system.

Determine the old marker types and reproduce them.

Pay particular attention to:

- yellow location markers
- green plus markers
- unit markers
- amenity markers
- selected markers
- hover markers
- plotting markers

The new implementation should use the correct visual representation for each object type.

---

# 14. MAP STATES

Ensure the following states are visually distinct:

### Existing persisted plot

Render according to the old system.

### Selected object

Use the new UI's selected-state styling while retaining the correct object shape/meaning.

### Hovered object

Use appropriate hover styling without changing the marker into an unrelated shape.

### Temporary local plot

Show a temporary marker that clearly belongs to the new UI, but is still visually consistent with the old map semantics.

### Unplotted object

Do not render it as if it were already persisted.

---

# 15. MANUAL PLOT INTERACTION

When Manual Plot is enabled:

- selecting an item should work
- selecting a polygon should work
- temporary plotting should work
- plotted count should update locally
- marker should render correctly

But:

**do not persist the change.**

The marker should be added to frontend state only.

---

# 16. IMPORTANT — DO NOT CONFUSE POLYGONS AND PINS

The map may contain:

```text id="65j0m0"
SVG polygon
Unit pin
Amenity pin
Path node
Path line
Label
```

These are separate concepts.

Do not render every item as the same type of circle.

A polygon should remain a polygon.

A unit marker should remain a unit marker.

A path should remain a path.

A node should remain a node.

A label should remain a label.

---

# 17. DATA → VISUAL OBJECT MAPPING

Create explicit mappings between backend objects and their visual representation.

For example:

```text id="v8j1bh"
Unit
→ polygon
→ unit label
→ unit pin

Amenity
→ amenity location/polygon
→ amenity label
→ amenity marker

Path node
→ node marker

Path connection
→ SVG/canvas line

Map label
→ polygon/SVG geometry
→ text
```

Use the actual existing backend relationships.

---

# 18. TEST WITH JOHN DEMO FLOOR 3

This is a mandatory test.

Open:

**John Demo → Property 1411 → Floor 3**

Compare:

### Old UI

`https://pynwheelconnect.com/communities/1411/floorplates/1870/plotexp`

### New UI

Current Next.js Map & Plotting.

Verify:

- same floor
- same map/background
- same polygons
- same labels
- same unit labels
- same amenity labels
- Tenant lease space present
- same plotted objects
- same marker semantics
- same paths
- same logical positioning

The new UI can have improved styling, but the **meaning and placement of map objects must correspond to the old system**.

---

# 19. USE THE UPLOADED SCREENSHOTS FOR VISUAL COMPARISON

Use the uploaded:

### Old UI screenshot

to verify:

- marker shapes
- colors
- labels
- paths
- map structure

Use the uploaded:

### New UI screenshot

to identify:

- what is currently missing
- what is incorrectly rendered
- what needs to change

Do not rely only on textual descriptions.

---

# 20. PIXEL / VISUAL COMPARISON

For the map itself, compare:

- marker size
- marker shape
- marker color
- label size
- label placement
- path thickness
- path geometry
- map alignment
- polygon alignment
- spacing
- selected state
- hover state

The overall page should follow the new UI design, but the actual map semantics should closely follow the old system.

---

# 21. IMAGE/SVG LOADING

Use real backend/storage assets.

If an image fails:

- show the shared loading state while loading
- show an appropriate error state if the request fails
- log enough information during development to identify the broken URL
- do not silently substitute fake images

---

# 22. TEST CASES TO ADD

Add tests for:

### Labels

- unit label
- amenity label
- Tenant lease space
- missing label data
- polygon with no label
- label after floor change
- label after zoom
- label after pan

### Markers

- yellow location marker
- green plus marker
- unit marker
- amenity marker
- selected marker
- temporary marker

### Paths

- path rendering
- multiple paths
- junction
- selected node
- path after zoom
- path after floor change

### Images

- SVG loads
- background loads
- missing SVG
- missing image
- invalid URL
- image loading state

### Map

- correct property
- correct building
- correct floor
- correct coordinate alignment
- John Demo Floor 3

---

# 23. REAL DATA — NO HARDCODED JOHN DEMO VALUES

Do not add special-case code such as:

```text id="2qoz0s"
if property_id === 1411
```

or:

```text if floor === 3

```

to make this particular case pass.

The fix must operate from the actual backend/map data model so it works for other properties and floors too.

---

# 24. BACKEND CHANGES

Minimal controller changes are allowed only if existing information needs to be exposed as JSON.

For example:

- map labels
- polygon metadata
- plotting data
- coordinates
- image URLs
- paths
- nodes

If the information already exists in Rails, expose it through the existing controller/data flow.

Do NOT:

- alter business logic
- change database schema
- create migrations
- introduce new persistence behavior
- change existing calculations
- change authorization
- redesign the map backend

---

# 25. READ-ONLY RULE

All new Map interactions remain read-only with respect to the DB.

The user may:

- zoom
- pan
- select
- hover
- place temporary pins
- move temporary pins
- create temporary junctions
- create temporary connections
- run local Auto Plot
- create temporary labels/assignments where appropriate

But none of these may persist to the DB.

---

# 26. FINAL ACCEPTANCE CRITERIA

Do not consider this task complete until:

### Map

- real SVG loads
- real background loads
- polygons render correctly
- units render correctly
- amenities render correctly
- paths render correctly
- nodes render correctly
- labels render correctly

### Visual correctness

- no oversized debug dots
- no debug coordinates
- correct marker semantics
- correct yellow/green marker behavior
- correct path rendering
- correct label positioning

### Specific case

**John Demo → Property 1411 → Floor 3**

must correctly show:

**Tenant lease space**

and the other labels/markers that appear in the old implementation.

### Interaction

- Manual Plot works locally
- Select works
- zoom works
- pan works
- floor switching works
- temporary plotting works

### Persistence

No DB mutation occurs.

---

# 27. IMPORTANT FINAL PRINCIPLE

For this part of Map & Plotting:

```text id="6s0bmt"
New HTML
→ overall UI/layout reference

Uploaded old screenshot
→ map visual/marker/label reference

Uploaded new screenshot
→ current discrepancy reference

Old Rails Auto Wayfinding
→ behavior/data-source reference

John Demo Floor 3 old URL
→ concrete validation reference

Current DB
→ actual data source
```

The goal is **not** to copy the old page.

The goal is:

> **New UI + old system's correct map semantics + real DB data.**

Do not accept a map that looks visually modern but displays incorrect markers, paths, labels or coordinates.

---

# REQUIRED STARTING ACTION

Before making changes:

1. Inspect the uploaded old/new screenshots.
2. Reproduce the John Demo Floor 3 issue.
3. Open/inspect the old Auto Wayfinding implementation.
4. Inspect:

`https://pynwheelconnect.com/communities/1411/floorplates/1870/plotexp`

5. Trace the actual source of:
   - Tenant lease space label
   - green markers
   - yellow markers
   - paths
   - unit labels
   - map image

6. Compare that with the current Next.js rendering.
7. Identify the root causes.
8. Only then implement the fixes.

Do not solve this by adding static labels or changing marker CSS without tracing the actual old-system implementation.

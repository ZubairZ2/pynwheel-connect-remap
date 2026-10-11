Before making any changes, **read these files completely**:

* `/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`
* `/Users/zubairzulifqar/pynwheel-staging/context.md`

Also review the existing Map & Plotting implementation, the relevant feature/gaps documentation, and the POC/reference used for hallway/path plotting before modifying code.

## Task

We have several issues in the latest Map & Plotting implementation that need to be fixed.

The most important requirements are the **hallway/path persistence, Detect Hallways behavior, plotting markers, and editing behavior**. These require careful implementation and testing.

---

## 1. Browser tab icon

Use the Pynwheel logo as the browser favicon/tab icon:

`/Users/zubairzulifqar/pynwheel-staging/public/logo_transparent_bg.png`

Make sure it is correctly configured for the Next.js application and appears in the Chrome tab.

Do not introduce a duplicate logo asset if the existing asset can be reused.

---

## 2. Move the user profile to the top-right navigation

Move:

```text
ZZ
Zubair Zulfiqar
Super admin
```

to the **top-right corner**, positioned between:

**Notifications** → **Profile** → **Logout**

Keep the existing visual style of the application and make sure the spacing/alignment works correctly at normal desktop widths.

---

# MOST IMPORTANT: Map & Plotting

Test primarily on:

`http://localhost:3001/properties/1411/map`

Path:

```text
Properties
/
John Demo
/
Map & Plotting
```

Use the real DB/SVG data already available for this property.

Do **not** replace real data with hardcoded/demo values.

---

## 3. Clear Paths must also remove unconnected-unit markers

There are solid red dots showing units that are not connected.

When the user clicks:

**Clear Paths**

the following must be cleared together:

* hallway/path connections
* plotted path state
* red "not connected" unit markers/dots

After `Clear Paths`, the map must not continue showing stale red unit dots.

This must be handled through the same local plotting state used by the map.

---

## 4. Remove the "Auto-Connect Paths" button

Remove the separate:

**Auto-Connect Paths**

button/action from the UI.

Its behavior should now happen automatically as part of:

**Detect Hallways**

When the user clicks **Detect Hallways**, the application should:

1. Detect/process hallway paths according to the existing POC/reference behavior.
2. Automatically perform the required path connection step.
3. Update the local map state.
4. Never require the user to click a second "Auto-Connect Paths" action.

Do not leave an obsolete button, duplicate action, or dead code path in the UI.

---

# 5. CRITICAL: Detect Hallways must NEVER overwrite existing DB hallway paths

This is the highest-priority bug.

Current behavior:

On:

`/properties/1411/map`

when I click **Detect Hallways**, the hallway mapping already fetched from the DB is being overwritten/changed/removed.

### This must NEVER happen.

Existing hallway/path data loaded from the DB must be treated as **authoritative persisted data**.

### Required behavior

When Detect Hallways runs:

* Existing DB hallway paths must remain intact.
* Existing DB nodes/points must remain intact.
* Detect Hallways must not replace persisted paths with a newly generated graph.
* Detect Hallways must not silently remove existing hallway connections.
* Detect Hallways must not modify existing persisted geometry.
* Detect Hallways must not modify DB-backed path records.
* Automation must never change existing DB data.

Only an explicit user editing action may change/remove a hallway/path in the UI, and even then **the current migration remains UI/local-state only** unless an existing supported persistence flow is explicitly required.

### Important distinction

Treat these as separate concepts:

```text
Persisted DB hallway/path data
        ↓
Existing saved mapping — READ ONLY
        ↓
Local user edits / detected temporary paths
        ↓
Temporary frontend state
```

**Detect Hallways must merge/add/derive local results without destroying persisted DB paths.**

If a floor already has DB paths:

* preserve them exactly;
* do not regenerate them over the top;
* do not clear them before detection;
* do not replace them with the detector output.

If detection needs to create additional paths, those should exist only in the local frontend state and must coexist with the DB-backed paths.

### Never do this

```text
load DB paths
↓
Detect Hallways
↓
clear existing paths
↓
replace with detected paths
```

### Required instead

```text
load DB paths
↓
preserve DB paths
↓
Detect Hallways
↓
calculate local detected paths
↓
merge/show detected local paths without overwriting DB paths
```

Before implementing, trace exactly where the current overwrite happens and fix the state/data flow at the source rather than adding a visual workaround.

---

# 6. Hollow plotting markers instead of solid dots

The current red/yellow/blue solid circles are visually blocking the unit/amenity labels.

Change these markers to **small dark hollow markers/outlines**.

Requirements:

* Hollow center.
* Dark border/stroke.
* Small and visually subtle.
* Positioned on/near the **edge of the corresponding unit/amenity polygon** rather than directly obscuring the label.
* Unit/amenity names must remain clearly readable.
* Do not use large filled circles.
* Maintain the semantic distinction between marker types without using large colored blobs.

Apply this consistently to:

* unit markers
* amenity markers
* other plotting markers where applicable

The final result should visually match the old Pynwheel plotting semantics more closely, while fitting the new UI design.

### Important

The label should not be hidden behind the marker.

The marker should behave as a location/connection indicator, not as the main visual representation of the unit.

---

# 7. Dotted blue bridges must be editable/deletable

The blue dotted bridge connections currently cannot be properly removed.

They must become editable in the same way as the other path/connection elements.

This is especially important for the Wayfinding flow.

The existing UI text says:

```text
Not linked · 1

Pick Connect, click the nearest hallway point, then click the unit or stop marker.

Business Center

Plotted on the floor SVG only

Elevator and Stairs stops join floorplates, so a route can continue across floors and buildings.
```

This workflow must actually work.

### Required behavior

In Wayfinding:

* hallway paths must be editable;
* blue bridge connections must be editable;
* unit-to-hallway connections must be editable;
* stop-to-hallway connections must be editable;
* elevator/stairs connections must remain usable for cross-floor routing;
* connections should be removable explicitly by the user;
* deleting a bridge must remove only that bridge/connection, not unrelated hallway paths.

All editing must remain **local/UI-only**.

No mutation request should be sent to the DB.

---

# 8. Wayfinding: all path types must be editable

The Wayfinding map should treat all currently displayed route/path structures as editable frontend state.

At minimum verify:

* detected hallway paths
* manually created paths
* unit → hallway bridges
* amenity → hallway bridges
* stop → hallway bridges
* elevator/stairs connections
* other route edges represented in the current UI

The user should be able to select/remove/edit the relevant connection without breaking unrelated graph edges.

Do not introduce a special-case implementation only for blue bridges. Use the existing graph/path model where possible so the behavior stays consistent.

---

# 9. Preserve existing behavior when clearing/editing

Be careful not to introduce regressions.

Examples:

### Clear Paths

Should clear the appropriate **temporary/local plotting state**, including visual unconnected markers, without accidentally deleting or mutating persisted DB data.

### User edits

A user explicitly deleting or moving a path should update local frontend state only.

### Detect Hallways

Must never treat detection as an implicit user edit of DB-backed paths.

### Existing DB paths

Must remain visible and intact unless the user explicitly changes them in the UI.

---

# 10. POC/reference behavior

Before changing the plotting behavior, review the existing POC and use it as the behavioral reference for:

* hallway detection
* graph creation
* path editing
* node editing
* bridge connections
* shortest-path behavior
* local graph mutations

Do not blindly copy the POC implementation.

Reuse/adapt the relevant algorithm and interaction patterns into the current Next.js architecture.

Ignore POC features explicitly excluded from the current scope, such as:

* Save Map
* My Maps
* Upload New Floor Plan (SVG)
* Auto-Plot Nodes

The current application remains **DB read-only / UI-local for these changes**.

---

# 11. Data and backend constraints

Follow:

* `react-architecture.md`
* `data-serialization-architecture.md`
* existing React patterns/components
* existing Rails API/data-shaping conventions

Backend changes are allowed **only when absolutely necessary to expose existing DB data to the frontend**.

Allowed:

* existing controller/action JSON response changes
* serialization/mapping of existing records
* including existing associations/fields

Not allowed:

* DB schema changes
* migrations
* new business logic
* changing existing business rules
* changing validations
* changing authorization
* changing existing write behavior
* mutating DB data from the new UI
* unrelated backend changes

Do not hardcode John Demo's map data.

---

# 12. Testing requirements

Test the changes specifically on:

`John Demo / Property 1411 / Map & Plotting`

Verify at minimum:

### Detect Hallways

* Existing DB hallway paths remain unchanged.
* Existing DB nodes remain unchanged.
* Detect Hallways can run without destroying the existing mapping.
* Detection output can coexist with existing DB paths.
* Auto-connect behavior happens automatically.
* No obsolete Auto-Connect Paths button remains.

### Clear Paths

* Local detected/manual paths are cleared correctly.
* Red unconnected-unit markers disappear.
* Persisted DB path data is not accidentally removed from application state.

### Markers

* Red/yellow/blue solid circles are replaced by small hollow dark markers.
* Unit/amenity labels remain readable.
* Markers stay correctly positioned when zooming/resizing/changing floors.

### Bridges

* Blue dotted bridges can be selected/edited/removed.
* Removing a bridge does not remove the underlying hallway network.
* Reconnecting a unit/stop works.

### Wayfinding

* Hallway paths remain editable.
* Bridges remain editable.
* Stop connections remain editable.
* Cross-floor elevator/stairs routing still works.
* Shortest-path behavior is not broken.

### Regression

Also verify:

* floor navigation
* map zoom/reset
* unit/amenity plotting
* labels
* existing DB-backed map rendering
* no unexpected API mutation requests

Use browser/devtools/network inspection where useful to confirm that these interactions do **not** send POST/PUT/PATCH/DELETE requests.

---

# 13. Code quality

Before finishing:

* Find the root cause of the DB hallway overwrite instead of masking it visually.
* Reuse existing graph/map/path components where possible.
* Avoid duplicated plotting/path state.
* Keep persisted DB data and temporary frontend edits clearly separated.
* Remove obsolete Auto-Connect Paths code if no longer needed.
* Keep the implementation consistent with the existing architecture.
* Do not introduce unrelated refactors.

---

# 14. Documentation

After implementation, update:

* `/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`
* `/Users/zubairzulifqar/pynwheel-staging/context.md`

Append dated entries; do not overwrite existing history.

Also update the relevant Map & Plotting / Wayfinding gap documentation so it reflects the issues fixed and any remaining genuine gaps.

At the end, provide a concise summary of:

1. Root cause of the DB hallway overwrite.
2. Files/components changed.
3. How DB paths are now protected from automatic replacement.
4. How Detect Hallways + auto-connect now works.
5. How bridge/path deletion works.
6. Tests performed and results.
7. Any remaining known issue.

Do not claim a feature is fixed unless it was actually tested.









# FINAL STEP — PRODUCTION-LEVEL FULL APPLICATION TEST

After implementing all fixes above, do a **complete end-to-end production-readiness test of the application**.

Do not only test whether the page renders. Test the actual interactions, state transitions, navigation, data loading, error handling, and regressions across the application.

The **primary focus must be PlottingWayfinding, Detect Paths, and Wayfinding**.

## 1. Primary test area — PlottingWayfinding

Test the complete flow for:

**Properties → John Demo → Map & Plotting → Plotting / Wayfinding**

Use real DB-backed data.

Verify:

* building selection
* floorplate selection
* floor navigation
* map rendering
* SVG/background rendering
* units and amenities
* polygons
* labels
* points/nodes
* hallway paths
* bridge connections
* stop markers
* zoom in/out
* reset/reload viewport
* plotting state
* plotted/unplotted counts
* Detect Paths
* Wayfinding
* shortest-path testing
* route scope selection
* editing/deleting paths
* editing/deleting bridges
* unit/stop connections
* elevator/stairs cross-floor connections

Make sure all interactions work with the actual map coordinates and DB data.

---

# 2. Detect Paths — full validation

Test:

**Detect Paths / Detect Hallways**

For:

**Tower A · Floor 3**

Verify the UI/state correctly represents:

```text
Tower A · Floor 3
Incomplete
20 Points
19 Paths
8/9 Stops Linked
```

Do not assume these exact numbers if the real DB data differs; verify that the counts are calculated from the actual current graph/data.

Test Detect Paths repeatedly.

Verify:

* existing DB hallway paths are preserved;
* existing DB nodes are preserved;
* detection does not overwrite persisted hallway mapping;
* detection does not remove existing paths;
* detection does not unexpectedly move existing nodes;
* automatically detected paths are added to local state correctly;
* Auto-Connect behavior occurs automatically;
* repeated Detect Paths calls do not duplicate paths/nodes;
* existing paths remain stable after detection;
* Clear Paths only affects intended temporary/local state;
* no DB mutation request is generated.

Test both a floor that already has paths and a floor that has no existing paths.

---

# 3. Wayfinding — full validation

Test the complete Wayfinding panel and graph behavior.

Verify these UI sections work:

```text
Detect Paths

Tower A · Floor 3

Incomplete

Points
Paths
Stops Linked
```

Verify:

```text
Click a point or a line to remove it.
```

actually works.

A user must be able to:

* click a point and remove it;
* click a line/path and remove it;
* remove only the selected graph element;
* keep unrelated paths intact;
* continue editing the graph after deletion;
* undo supported local changes where implemented.

---

# 4. Shortest path

Test:

```text
Test shortest path

Route across
This Floor
Floors
Buildings
```

Verify each routing scope behaves correctly.

Also test:

```text
Try a sample route
```

and confirm it fills valid From/To values.

Test:

```text
From
Elevator A
Floor 3

To
Stair Door
Floor 3
```

Then:

```text
Find Shortest Path
```

Verify that:

* the graph is actually used;
* the returned route follows connected graph edges;
* disconnected points correctly produce an appropriate no-route state;
* the path is rendered correctly on the map;
* route state updates when graph connections change;
* changing From/To works;
* changing floor/building scope works;
* cross-floor routing uses Elevator/Stairs connections correctly.

Do not hardcode a route simply to make the UI appear successful.

---

# 5. Unlinked units/stops

Test:

```text
Not linked · 1

Pick Connect, click the nearest hallway point,
then click the unit polygon or stop marker.

Unit 0304
Polygon 0304
```

Verify this workflow end-to-end.

The user must be able to:

1. identify the unlinked item;
2. select Connect;
3. select the nearest hallway point;
4. select the unit polygon or stop marker;
5. create the bridge locally;
6. update the linked/unlinked count;
7. see the bridge on the map;
8. remove that bridge later;
9. reconnect it again.

Test with both:

* unit polygons
* stop markers

Verify:

```text
Elevator and Stairs stops join floorplates,
so a route can continue across floors and buildings.
```

Test this behavior across multiple floors where real data allows it.

---

# 6. Path and bridge editing

Test every supported editable graph element:

* hallway path
* manually created path
* unit → hallway bridge
* amenity → hallway bridge
* stop → hallway bridge
* elevator connection
* stairs connection
* nodes/points

For every deletion:

* only the selected element is removed;
* unrelated graph edges remain;
* counts update correctly;
* map rendering updates immediately;
* shortest-path results update accordingly;
* no mutation request is sent to the DB.

---

# 7. UI state consistency

Test transitions between:

* Plotting
* Wayfinding
* different buildings
* different floors
* Detect Paths
* manual plotting
* Connect
* Select
* editing/deleting
* shortest path mode

Verify there are no stale states.

For example:

* deleted paths must not reappear after switching tabs;
* deleted bridges must not reappear after changing floors;
* detected local paths must not overwrite DB paths;
* counts must match what is actually rendered;
* selected items must reset appropriately when changing floors;
* route state must not reference deleted nodes.

---

# 8. Full application regression test

After the PlottingWayfinding tests, test the rest of the application:

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
* navigation/header/profile/logout
* browser favicon
* loading states
* sorting
* pagination
* search/filter behavior

Pay particular attention to previously fixed performance issues and make sure Inventory data is still loaded lazily rather than unnecessarily on the Properties page.

---

# 9. Network/API safety check

Use browser DevTools/network inspection while testing.

For all Plotting/Wayfinding interactions verify that the application does **not** send:

```text
POST
PUT
PATCH
DELETE
```

for local plotting/path/wayfinding edits.

These operations must remain frontend-only.

GET/read requests are allowed for loading real DB data.

---

# 10. Refresh and navigation test

Test:

* browser refresh;
* direct URL navigation;
* moving Property → Map & Plotting → Wayfinding;
* changing floors;
* returning to Properties;
* reopening the same property;
* opening the same map again.

Confirm there are no crashes, hydration errors, stale React state issues, or unexpected data loss caused by navigation.

---

# 11. Error/empty/loading states

Test realistic cases for:

* floor with SVG
* floor without SVG
* floor with existing DB paths
* floor with no paths
* floor with unlinked units
* floor with all units linked
* no shortest-path route
* missing/invalid map data
* slow API response
* empty result

Verify the UI gives a meaningful state instead of crashing or displaying misleading information.

Use the application's existing loading indicator/component consistently.

---

# 12. Production-readiness criteria

Before declaring the work complete, verify:

* no console errors;
* no React warnings introduced by these changes;
* no broken links/routes;
* no obvious layout issues at normal desktop sizes;
* no duplicate API calls without reason;
* no unnecessary data fetching;
* no hardcoded John Demo/map values;
* no accidental DB mutations;
* no regression in existing DB-backed functionality;
* no debug coordinates/vector text left on the map;
* no temporary/test buttons left in the production UI;
* no obsolete "Auto-Connect Paths" UI/code path remains;
* no duplicated graph/path state causing inconsistent rendering.

Run the appropriate existing test suite and lint/type checks.

If possible, perform a production build and verify that it completes successfully.

## Final report

At the end, provide a concise production-test report containing:

```text
Production Test Status:
Passed:
Failed:
Blocked:

Primary areas tested:
- PlottingWayfinding
- Detect Paths
- Wayfinding
- Shortest Path
- Unit/Stop Bridges
- Path Editing/Deletion
- DB Path Preservation

Other application areas tested:
...

Console errors:
...

Network/API mutation requests:
...

Build/Test status:
...

Known remaining issues:
...
```

Do **not** report "Passed" for anything that was not actually tested.

If a test fails, identify the actual failure, root cause where known, and fix it before moving on whenever the fix is within the scope of this task.

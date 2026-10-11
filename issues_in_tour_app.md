# FINAL PHASE — TOUR APP GAPS ONLY + REAL-PROPERTY PERFORMANCE & QA

The Rails Tour App API and Capacitor Tour App are implemented.

Perform one final **Tour-App-only gap closure, real-data validation, and performance pass** before declaring the Tour App production-ready.

---

# 1. CRITICAL SCOPE

**Only investigate, fix, and validate issues that directly affect the Tour App.**

Use these gap documents only to identify Tour-App dependencies:

```text
/Users/zubairzulifqar/pynwheel-staging/gaps_map_plotting_feature.md
/Users/zubairzulifqar/pynwheel-staging/gaps_tour_setup_feature.md
```

Do NOT turn this into a general Map & Plotting or Tour Setup cleanup.

Do not fix unrelated:

* admin-only UI issues;
* admin plotting controls;
* admin Tour Setup styling;
* inventory issues unrelated to Tour App;
* Companies/Properties issues unrelated to Tour App;
* unrelated legacy behavior.

A gap is in scope only when it directly impacts:

```text
Tour App
→ property selection
→ stops
→ SVG/map
→ graph
→ routing
→ floor transitions
→ Play Route
→ mobile UX/performance
```

---

# 2. IMPORTANT CURRENT ISSUES ALREADY OBSERVED

I have manually tested the Tour App against real data and found these issues.

## John Demo

Using `pynwheel_prod`:

* routing is extremely slow;
* the app becomes stuck during routing;
* John Demo maps take a very long time to load;
* Play Route is very slow and not smooth;
* the overall John Demo experience is significantly worse than Hazel.

## Hazel

Hazel currently works well and should be treated as the **performance and UX baseline**.

The goal is:

> **All supported properties should work smoothly like Hazel.**

Do not optimize only for Hazel or hardcode Hazel-specific behavior.

The implementation must work generically across different property configurations, map sizes, graph sizes, stop counts, buildings, floors, and SVG structures.

---

# 3. PROPERTIES SEARCH BUG

There is also a Tour App Properties-screen bug:

> The **Cancel** button on the Properties search is not working correctly.

Reproduce this on real data.

Verify:

```text
Search Properties
→ enter query
→ results update
→ press Cancel
→ search closes/resets correctly
→ full property list/state is restored
```

Also test:

* empty search;
* short search;
* rapid typing;
* clearing text;
* opening/closing search repeatedly;
* selecting a result;
* pressing Cancel while results are loading.

Make sure stale/debounced requests cannot restore old search state after Cancel.

The UI must never get stuck with:

* stale search text;
* stale results;
* loading state;
* disabled controls;
* an unresponsive Cancel button.

---

# 4. REAL `pynwheel_prod` PROPERTY TESTING

For this phase, test against the **real `pynwheel_prod` dataset** where the existing environment permits safe validation.

Find multiple properties with:

```text
Self-Guided Tour / Self Tour enabled
```

Do not test only:

```text
Hazel
John Demo
```

Also discover additional real properties from the production dump/database.

At minimum include:

```text
Jennifer Demo FP
Hazel
Hazel Test
John Demo
```

plus multiple additional Self-Tour-enabled properties.

Record the actual property IDs and characteristics.

Do not invent test data.

---

# 5. PROPERTY CONFIGURATION MATRIX

Before testing, build a matrix like:

| Property              |     ID | Self Tour | Buildings | Floors | SVG    |  Stops |  Nodes |  Paths | Notes             |
| --------------------- | -----: | --------- | --------: | -----: | ------ | -----: | -----: | -----: | ----------------- |
| Hazel                 | actual | Yes       |    actual | actual | Yes    | actual | actual | actual | Baseline          |
| John Demo             | actual | Yes       |    actual | actual | Yes    | actual | actual | actual | Performance issue |
| Jennifer Demo FP      | actual | Yes       |    actual | actual | actual | actual | actual | actual | ...               |
| Hazel Test            | actual | Yes       |    actual | actual | actual | actual | actual | actual | ...               |
| Additional properties | actual | Yes       |       ... |    ... | ...    |    ... |    ... |    ... | ...               |

---

# 6. AUTO-DETECT PATH TESTING

Some Self-Tour-enabled properties may contain stops that do not currently have valid wayfinding paths.

For each such property:

1. Inspect the existing graph/path state.
2. Identify stops that cannot currently be routed.
3. Use the existing **Auto Detect / Detect Hallways** functionality to generate the required paths.
4. Test the generated graph.
5. Verify the affected Tour Stops become routable.
6. Test the Tour App with those paths.
7. Verify shortest-path routing.
8. Test Play Route.
9. After testing, **remove/revert the temporary paths and restore the original database state**.

### CRITICAL SAFETY RULE

The auto-detected paths are for validation only.

Do not permanently alter the production dataset simply to make a property pass QA.

Before modifying `pynwheel_prod`:

* capture the original state of the affected floorplate/path records;
* record exactly what will change;
* make only the minimum temporary changes required;
* do not touch unrelated records;
* after testing, restore/remove the temporary paths;
* verify the original state is restored.

Do not leave test-generated paths, nodes, or graph records behind.

If the existing environment does not provide a safe way to make and fully revert these temporary changes, stop short of modifying production data and document the limitation.

---

# 7. IMPORTANT ROUTING REQUIREMENT

The fact that a property does not currently have connected paths is **not automatically a Tour App frontend bug**.

Determine whether the problem is:

```text
No source graph data
OR
Graph construction problem
OR
Auto-detect problem
OR
Route API performance problem
OR
Frontend rendering problem
```

Identify the actual bottleneck before changing code.

Do not hide disconnected data by inventing routes.

---

# 8. JOHN DEMO PERFORMANCE INVESTIGATION

John Demo is currently the most important performance failure.

Profile the entire flow:

```text
Property selection
↓
Property detail
↓
Stops request
↓
Map request
↓
SVG request
↓
Graph request
↓
Route request
↓
Route rendering
↓
Play Route
```

Measure each stage independently.

Determine where the slowdown occurs.

Investigate:

### API

* database queries;
* N+1 queries;
* graph building;
* route calculation;
* serialization;
* oversized JSON;
* duplicate API work;
* repeated graph construction;
* repeated asset lookup;
* unnecessary joins;
* unnecessary requests.

### SVG / map

* SVG size;
* SVG parsing;
* SVG DOM complexity;
* background image size;
* expensive rendering operations;
* duplicate SVG loading;
* redundant map initialization;
* unnecessary rerenders.

### React / Capacitor

* unnecessary React renders;
* expensive state updates;
* route geometry recalculation;
* pointer animation;
* large SVG DOM updates;
* blocking synchronous work;
* repeated route parsing;
* duplicate requests;
* memory growth.

### Play Route

* animation frequency;
* route-point density;
* distance calculation;
* interpolation;
* React state updates per frame;
* map redraw frequency;
* floor transition handling.

Do not guess. Measure.

---

# 9. HAZEL = PERFORMANCE BASELINE

Hazel currently works correctly.

Use Hazel as the baseline for:

* initial map load;
* route generation;
* route rendering;
* Play Route;
* floor transitions;
* stop selection;
* general responsiveness.

Compare John Demo and other large/complex properties against Hazel.

Do not simply make John Demo faster with property-specific conditions.

The solution must improve the generic architecture so other large properties benefit too.

---

# 10. MAP LOAD PERFORMANCE

For John Demo and the other large properties:

Measure:

```text
API response time
SVG download time
SVG parsing/render time
Map initialization time
Time until map is interactive
```

Investigate why John Demo maps take significantly longer than Hazel.

The user should never see an app that appears frozen while the map loads.

Show appropriate loading state, but more importantly fix the underlying performance bottleneck.

Do not replace real SVG maps with static screenshots or property-specific rasterized images as a shortcut.

---

# 11. ROUTING PERFORMANCE

Measure real route requests for:

* short route;
* long route;
* cross-floor route;
* multi-stop route.

For John Demo specifically, identify:

```text
Route API start
→ graph loading/build
→ shortest-path calculation
→ serialization
→ frontend receive
→ frontend render
```

Record timings for each where practical.

Fix the actual bottleneck.

A route request should not make the entire mobile application appear frozen.

---

# 12. PLAY ROUTE PERFORMANCE

John Demo currently has a major Play Route issue:

> Play Route is very slow and not smooth.

Fix this generically.

Verify:

* smooth pointer movement;
* stable frame rate;
* no visible jumping;
* no excessive React rerenders;
* no route recalculation during animation;
* no API request per animation frame;
* map remains responsive;
* instructions stay synchronized;
* pointer remains aligned with route geometry;
* floor transitions remain synchronized.

Play Route should behave smoothly on large routes as well as small routes.

Do not reduce functionality just to hide the lag.

---

# 13. ROUTE ANIMATION OPTIMIZATION

Inspect whether the current implementation is doing expensive work inside:

```text
requestAnimationFrame
```

or equivalent animation loops.

Avoid repeatedly triggering:

```text
React state updates
API requests
graph calculations
SVG reconstruction
route recalculation
```

when they are not necessary.

Prefer calculating route/animation data once and animating efficiently.

Use distance-aware timing where appropriate so movement remains visually consistent on different route segment lengths.

---

# 14. LARGE-PROPERTY TESTING

Do not select properties randomly.

Find a useful range of real properties from `pynwheel_prod`, including combinations such as:

* small graph;
* large graph;
* many stops;
* many nodes;
* many paths;
* many floors;
* large SVG;
* multiple buildings;
* cross-floor routes;
* properties requiring Auto Detect to establish missing paths.

This is required because Hazel working does not prove the architecture handles large/complex properties.

---

# 15. TOUR APP FULL FLOW

For every representative property:

```text
Login
↓
Properties
↓
Search
↓
Cancel Search
↓
Select Property
↓
Load Property
↓
Build Your Tour
↓
Select real stops
↓
Load real map
↓
Load correct SVG
↓
Find Shortest Path
↓
Display route
↓
Display route instructions
↓
Play Route
↓
Floor transition if applicable
↓
Destination
```

The flow must remain responsive throughout.

---

# 16. SEARCH + PROPERTY SWITCHING

Test:

```text
Hazel
→ John Demo
→ Jennifer Demo FP
→ Hazel Test
→ another property
```

and repeatedly switch between them.

Verify there is no leakage of:

* previous map;
* previous SVG;
* previous graph;
* previous stops;
* previous route;
* previous loading state;
* previous search state.

---

# 17. NO PROPERTY-SPECIFIC HARDcoding

Absolutely no:

```text
if property == Hazel
if property == John Demo
if property_id == ...
```

for functional behavior.

Do not create special-case performance logic for John Demo.

Any optimization must be generic and based on:

* graph size;
* route complexity;
* payload size;
* SVG size;
* rendering complexity;
* data characteristics.

---

# 18. SVG VALIDATION

For each tested property verify:

* SVG HTTP status;
* `Content-Type`;
* URL;
* redirects;
* authentication;
* CORS/CSP;
* valid XML/SVG;
* `viewBox`;
* width/height;
* internal `<use>`;
* embedded `<image>`;
* external references;
* coordinate system;
* correct floor;
* correct property.

Confirm the exact SVG delivered to the Tour App is the intended real asset.

---

# 19. API REQUEST EFFICIENCY

Verify there are no request storms.

Examples:

```text
Opening property
→ only required requests

Loading SVG
→ no duplicate SVG requests

Finding route
→ no repeated route request

Play Route
→ no API request per frame

Zoom
→ no unnecessary API request

Animating pointer
→ no API request
```

Check browser/Capacitor Network logs.

---

# 20. MOBILE PERFORMANCE

Test on:

### iOS

* simulator;
* real device where available.

### Android

* emulator;
* real device where available.

Pay particular attention to:

* John Demo;
* other large properties;
* large SVG files;
* large graphs;
* long routes;
* Play Route.

The app must remain responsive and must not appear frozen.

---

# 21. ERROR HANDLING

Test:

* no route;
* disconnected stops;
* missing SVG;
* missing graph;
* missing map;
* invalid property;
* unauthorized property;
* tour disabled;
* invalid From/To;
* expired authentication.

The UI must show a usable state instead of becoming stuck indefinitely.

---

# 22. CURRENT TOUR APP GAPS

Review:

```text
gaps_map_plotting_feature.md
gaps_tour_setup_feature.md
```

but create a **Tour App-only filtered list**.

For each applicable item:

```text
RESOLVED
NOT APPLICABLE
REQUIRES PRODUCT DECISION
BLOCKED
```

For unrelated items:

```text
OUT OF SCOPE — NOT TOUR APP RELATED
```

Do not spend implementation time on unrelated gaps.

---

# 23. DATABASE SAFETY

Because `pynwheel_prod` is production data:

**Do not perform destructive or permanent QA modifications.**

For temporary Auto Detect testing:

```text
Capture original state
↓
Apply minimum temporary paths
↓
Test
↓
Record results
↓
Remove/revert temporary changes
↓
Verify original state
```

Never leave:

* temporary nodes;
* temporary edges;
* temporary paths;
* duplicate records;
* test stops;
* orphan records

in `pynwheel_prod`.

If a complete rollback cannot be guaranteed, do not modify production.

---

# 24. FINAL PERFORMANCE COMPARISON

Create a comparison such as:

| Flow             | Hazel | John Demo | Other Large Property | Target |
| ---------------- | ----: | --------: | -------------------: | ------ |
| Property load    |   ... |       ... |                  ... | Smooth |
| Stops load       |   ... |       ... |                  ... | Smooth |
| Map load         |   ... |       ... |                  ... | Smooth |
| SVG load/render  |   ... |       ... |                  ... | Smooth |
| Graph load       |   ... |       ... |                  ... | Smooth |
| Route generation |   ... |       ... |                  ... | Smooth |
| Route rendering  |   ... |       ... |                  ... | Smooth |
| Play Route       |   ... |       ... |                  ... | Smooth |

Use measured results, not assumptions.

---

# 25. FINAL TEST MATRIX

At minimum:

| Property            | Self Tour | SVG | Stops | Existing Paths | Auto Detect Needed | Route     | Play Route | Performance | Result |
| ------------------- | --------- | --- | ----- | -------------- | ------------------ | --------- | ---------- | ----------- | ------ |
| Hazel               | Yes       | Yes | ...   | ...            | ...                | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | ...    |
| John Demo           | Yes       | Yes | ...   | ...            | ...                | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | ...    |
| Jennifer Demo FP    | Yes       | ... | ...   | ...            | ...                | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | ...    |
| Hazel Test          | Yes       | ... | ...   | ...            | ...                | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | ...    |
| Additional property | Yes       | ... | ...   | ...            | ...                | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | ...    |
| Additional property | Yes       | ... | ...   | ...            | ...                | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | ...    |

---

# 26. FINAL QA CHECKLIST

```text
Tour App Login                    PASS/FAIL
Properties Search                PASS/FAIL
Properties Cancel                PASS/FAIL
Property Switching                PASS/FAIL
Tour Enabled Property             PASS/FAIL
Tour Disabled Property            PASS/FAIL
Real Tour Stops                   PASS/FAIL
SVG Map                           PASS/FAIL
Large SVG Performance             PASS/FAIL
Graph Loading                     PASS/FAIL
Route Generation                  PASS/FAIL
John Demo Routing                 PASS/FAIL
John Demo Map Load                PASS/FAIL
John Demo Play Route              PASS/FAIL
Hazel Baseline                    PASS/FAIL
Cross-Floor Routing               PASS/FAIL
Auto Detect Temporary Test        PASS/FAIL
Temporary DB Changes Reverted     PASS/FAIL
Multi-Stop Route                  PASS/FAIL
Route Instructions                PASS/FAIL
API Contract                      PASS/FAIL
API Performance                   PASS/FAIL
No Request Storms                 PASS/FAIL
iOS                               PASS/FAIL
Android                           PASS/FAIL
```

---

# 27. FINAL REPORT

Create:

```text
/Users/zubairzulifqar/pynwheel-staging/tour-app-final-qa-report.md
```

Include:

```text
# Tour App Final QA

## Scope
Tour App gaps only.

## Known Issues Tested
- John Demo routing slow/stuck
- John Demo map loading slow
- John Demo Play Route slow/not smooth
- Properties Search Cancel not working

## Hazel Baseline
...

## Tour-App-Relevant Gaps
...

## Out-of-Scope Gaps
...

## Real Production-DB Properties Tested
...

## Auto Detect Tests
...

## Temporary DB Changes and Restoration
...

## SVG Performance
...

## Routing Performance
...

## Play Route Performance
...

## Property Comparison
...

## Search/Cancel Validation
...

## API Findings
...

## Mobile Findings
...

## Issues Fixed
...

## Remaining Tour App Issues
...

## Overall Status
READY / NOT READY
```

---

# 28. PRODUCTION-READINESS RULE

Do not mark the Tour App `READY` merely because Hazel works.

The Tour App is ready only when:

1. Hazel still works as the baseline.
2. John Demo no longer becomes stuck during routing.
3. John Demo map loading is acceptably responsive.
4. John Demo Play Route is smooth.
5. Properties Search Cancel works reliably.
6. Multiple real `pynwheel_prod` Self-Tour-enabled properties work.
7. Different property configurations work without property-specific code.
8. Properties requiring temporary Auto Detect paths can be validated safely.
9. Temporary production test changes are fully reverted.
10. SVG, graph, routing, stops, floor transitions, and Play Route work with real data.
11. iOS and Android validation does not reveal blocking issues.

The required standard is:

> **All supported properties should provide a smooth Tour App experience comparable to the current Hazel experience, not just a successful API response.**

Do not declare production readiness until the evidence supports that conclusion.

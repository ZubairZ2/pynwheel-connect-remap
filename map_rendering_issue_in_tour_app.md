# CRITICAL PRODUCTION BUG FIX — TOUR APP MAP / SVG / ZOOM / ROUTE PLAYBACK

We have a **major production-blocking issue** in the Capacitor Tour App.

The Tour App is successfully generating/showing the route, but the **actual map/SVG is not visible at all**.

This is a critical issue because the long-term plan is to convert the Pynwheel maps to SVG and the mobile Tour App must reliably support the real Pynwheel SVG maps.

There are also critical issues with map zoom controls and route playback speed.

Do not treat these as cosmetic fixes. Investigate the complete data/API/rendering flow and fix the root causes.

---

# 1. READ PROJECT CONTEXT FIRST

Before changing code, read completely:

```text id="93htxv"
/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/tour-app-implementation.md

/Users/zubairzulifqar/pynwheel-staging/tour-app-backend-api.md

/Users/zubairzulifqar/pynwheel-staging/backend_architecture_plan_report.md

/Users/zubairzulifqar/pynwheel-staging/start-the-planing-task-logical-papert.md

/Users/zubairzulifqar/pynwheel-staging/tour-app.html
```

Also inspect the current FastAPI implementation, Tour App repository/data provider, map renderer, route renderer, and Capacitor configuration.

Use the uploaded **Hazel property screenshot** as the visual reference for the current broken state.

---

# 2. ISSUE A — CRITICAL: REAL SVG MAP IS NOT APPEARING

## Current behavior

The Tour App can show the route/path information, but the **actual map image/SVG is missing**.

The user sees route information but not the underlying floor/map.

This is unacceptable.

The map must render together with:

* SVG/floor geometry;
* units;
* amenities;
* stops;
* hallway/path network;
* route;
* current position/pointer;
* floor information.

---

# 3. DO NOT PATCH THE UI BLINDLY

Find the actual failure point.

Trace the complete flow:

```text id="jv1m5x"
Pynwheel DB / asset
↓
Existing Rails/domain data
↓
FastAPI
↓
API response
↓
Tour App repository
↓
Map model
↓
SVG/map URL or SVG content
↓
Capacitor WebView
↓
SVG renderer
↓
Map displayed
```

Determine exactly where the map is being lost.

Possible causes to investigate include:

* SVG URL missing from API response;
* incorrect SVG URL;
* relative URL that does not resolve in Capacitor;
* authenticated asset URL that the WebView cannot access;
* incorrect MIME type;
* CORS;
* CSP;
* URL encoding;
* SVG XML parsing failure;
* unsupported embedded references;
* external image/resource references inside SVG;
* incorrect `viewBox`;
* incorrect width/height;
* invalid SVG;
* API serialization issue;
* response field mismatch;
* frontend parser dropping the SVG;
* React sanitization;
* Capacitor asset-loading issue;
* incorrect map/container dimensions;
* SVG rendered outside the viewport;
* scaling/transformation bug;
* route layer rendering while the underlying map layer is not mounted.

Do not assume the cause.

Inspect the actual request/response and rendering behavior.

---

# 4. USE REAL HAZEL DATA FIRST

Start with the Hazel property represented in the uploaded screenshot.

Use the real property/floorplate/map data.

Verify:

```text id="n9mdoj"
Property
→ Hazel

Floorplate
→ actual floorplate

SVG
→ actual DB-backed SVG

Route
→ actual route
```

Do not replace the SVG with a local placeholder.

Do not hardcode a test SVG.

---

# 5. VERIFY THE FASTAPI RESPONSE

Inspect the actual FastAPI response for the affected Hazel map.

Verify the response contains the correct map information.

Check:

* SVG identifier;
* SVG URL/path;
* floorplate identifier;
* building;
* floor;
* viewBox;
* dimensions;
* map/background metadata;
* relevant asset URLs.

If the API is supposed to return SVG content directly, verify the content is complete and valid.

If it returns an asset URL, verify the URL can actually be loaded by the mobile application.

Use the actual browser/WebView Network and console tooling to determine where the request fails.

Do not declare the backend correct merely because the route endpoint succeeds.

The **map asset must also be successfully retrievable and renderable**.

---

# 6. VERIFY SVG ASSET DELIVERY

For an actual SVG map, verify:

```text id="v3v20v"
HTTP request
→ status code
→ response headers
→ content type
→ response body
→ SVG validity
→ WebView accessibility
→ rendering
```

Specifically check:

* HTTP status;
* `Content-Type`;
* URL;
* redirects;
* authentication;
* CORS;
* CSP;
* SVG XML;
* external image references;
* embedded resources;
* relative paths;
* `<image href>`;
* `<use href>`;
* styles;
* fonts if relevant;
* `viewBox`;
* width;
* height.

Do not convert SVG to PNG just to hide the problem.

SVG support is a critical requirement.

---

# 7. SVG SUPPORT MUST BE GENERAL, NOT HAZEL-SPECIFIC

The fix must work for **all valid Pynwheel SVG maps**.

Do not write:

```text id="4l8z1q"
if property === Hazel
```

or:

```text id="i9p87a"
if floorplate === ...
```

The implementation must be generic.

The long-term requirement is:

```text id="2gwcxa"
Any valid Pynwheel SVG
↓
FastAPI
↓
Tour App
↓
renders correctly
```

---

# 8. TEST MULTIPLE REAL SVG PROPERTIES

Find real properties in the DB that have SVG maps.

Test several properties, including:

* Hazel;
* John Demo;
* Testing 123;
* Jennifer Demo FP;
* other properties with SVG floorplates.

Also test multiple SVG floorplates within the same property where available.

Do not stop after Hazel works.

At least test:

```text id="98r7jm"
Property A
SVG floor 1

Property A
SVG another floor

Property B
SVG floor

Property C
SVG floor
```

Record the actual properties/floors tested in the final report.

---

# 9. SVG FLOOR SWITCHING

When the user changes floor:

```text id="zkk4p6"
Floor 1
↓
Floor 2
↓
Floor 3
```

the correct SVG must replace the previous floor's SVG.

Verify:

* old SVG disappears;
* new SVG loads;
* paths belong to the new floor;
* units/amenities/stops belong to the new floor;
* route layer aligns with the new SVG;
* no stale map from the previous floor remains.

---

# 10. SVG + ROUTE ALIGNMENT

This is critical.

The route currently appears even when the map does not.

Once the SVG is fixed, verify that:

```text id="b1bixv"
SVG geometry
+
path graph
+
route
+
current pointer
```

use the **same coordinate system**.

The route must line up with the actual hallways/map.

Do not fix alignment with arbitrary offsets for one property.

Investigate:

* SVG viewBox;
* graph coordinate system;
* map dimensions;
* transforms;
* scaling;
* translation;
* coordinate origin;
* aspect ratio.

There must be one canonical coordinate mapping.

---

# 11. DO NOT USE A RASTER FALLBACK AS THE PRIMARY FIX

The system is moving toward SVG maps.

Therefore:

**SVG must remain the primary map representation.**

Do not silently replace SVG with:

* screenshot;
* PNG;
* generated image;
* simplified placeholder.

A fallback may exist only for an explicitly supported legacy asset type, and it must not hide an invalid SVG.

---

# 12. SVG WITH INTERNAL / EXTERNAL ASSETS

Some real SVG files may contain:

* paths;
* polygons;
* text;
* embedded images;
* external references;
* CSS;
* symbols;
* `<use>`.

Test actual Pynwheel SVG files, not only the simplest SVG.

If SVG rendering fails because of nested/external references:

* identify the actual cause;
* implement a safe generic solution;
* preserve the original geometry;
* do not flatten the SVG into a fake image.

---

# 13. SVG ERROR HANDLING

If an SVG genuinely cannot be loaded:

show a meaningful map error state.

Do not silently display a blank map.

The UI should distinguish:

```text id="c5klt4"
Loading map
Map loaded
Map unavailable
Invalid SVG
Network/API failure
```

Do not show route overlays over an empty map and make the user believe the map exists.

---

# 14. MAP LOADING STATE

While the SVG is loading:

* show the existing Pynwheel loading state;
* do not display stale map content;
* do not display route overlays against the wrong floor;
* do not display markers from the previous property/floor.

After the SVG loads:

* render the SVG;
* render map entities;
* render paths;
* render route;
* render current pointer.

---

# 15. ISSUE B — ZOOM IN / ZOOM OUT / RESET CONTROLS

The current zoom controls are incorrect.

### Current problems

1. The user must click **Zoom In (+)** twice before the expected zoom occurs.
2. **Zoom Out (-)** is missing.
3. **Reset Zoom** is missing.

Fix all three.

---

# 16. ZOOM CONTROLS MUST BE REAL CONTROLS

Implement exactly:

```text id="p4w6h8"
+
−
Reset
```

or the exact visual controls represented by the existing UI/reference.

Each press must cause exactly one zoom action.

### Zoom In

One tap:

```text id="4h1lne"
current zoom
→
one zoom increment
```

Not:

```text id="0i7e2p"
current zoom
→
nothing
→
second tap
→
zoom
```

Investigate whether:

* event propagation;
* pointer handling;
* debouncing;
* gesture handlers;
* map state updates;
* stale state;
* nested click handlers;

are causing the current double-click behavior.

Fix the underlying event/state issue.

---

# 17. ZOOM OUT

Add a working **minus (-)** control.

It must:

* zoom out one step per tap;
* never invert the direction;
* respect a sensible minimum zoom;
* keep the map centered appropriately.

---

# 18. RESET

Add a **Reset Zoom / Reset View** control.

It must return the map to its initial viewport:

* initial scale;
* initial center;
* correct floor/map bounds.

Reset must not:

* reload the entire application;
* re-fetch the API unnecessarily;
* reset From/To selection;
* reset the route unless the UI explicitly requires it.

It should reset the map viewport only.

---

# 19. ZOOM MUST APPLY TO THE COMPLETE MAP

Zoom must affect all map layers together:

```text id="h9fvso"
SVG
+
unit polygons
+
amenity polygons
+
stops
+
hallway paths
+
route
+
pointer
+
labels/overlays
```

Nothing should drift away from the SVG during zoom.

Do not implement zoom only on the SVG while leaving route/pointer layers at a different scale.

---

# 20. ZOOM + FLOOR CHANGE

Test:

```text id="x4c1o0"
Zoom in
↓
change floor
↓
new SVG
↓
correct initial/appropriate viewport
```

No previous-floor transformation should leak into the next floor.

---

# 21. ZOOM + ROUTE PLAYBACK

Test zoom while:

* route exists;
* Play Route is active;
* pointer is moving;
* floor changes.

The route pointer and route geometry must remain correctly aligned.

---

# 22. ISSUE C — PLAY ROUTE POINTER IS TOO FAST

The current **Play Route** pointer movement is too fast.

The movement must be slowed down so the user can clearly follow the route.

The route simulation should feel like an actual guided tour rather than a fast animation.

---

# 23. DO NOT SIMPLY ADD A LARGE DELAY

Do not fix this by adding arbitrary delays everywhere.

Inspect the current route animation implementation.

Determine whether the speed is based on:

* duration;
* distance;
* node count;
* animation frame interval;
* interpolation;
* timer;
* requestAnimationFrame;
* step duration.

Then implement a controlled route-playback speed.

---

# 24. POINTER SPEED SHOULD BE DISTANCE-AWARE

Prefer a route playback model where movement speed is based on route geometry rather than simply "one point every X milliseconds".

For example conceptually:

```text id="s1f9h4"
short segment
→ short duration

long segment
→ proportionally longer duration
```

This prevents the pointer from:

* jumping across long paths;
* crawling unnecessarily over tiny segments.

The resulting speed should be visibly slower and easier to follow.

Use a configurable constant so the playback speed can be adjusted later without rewriting the animation.

---

# 25. PLAY ROUTE MUST REMAIN SYNCHRONIZED WITH THE MAP

During playback:

```text id="cvj4c9"
Pointer
+
route
+
map
+
current floor
+
instruction
+
current stop
```

must remain synchronized.

When the pointer reaches a stop:

* update the active step;
* update the instruction;
* update the stop state;
* update the floor if needed.

Do not let the pointer move independently of the route-step state.

---

# 26. ROUTE STEP UI

The mobile app should continue supporting the route-step information:

```text id="x7mb2m"
Walk on Floor 1

From Tour start to Fitness Centre · 1,032 px
```

and:

```text id="z7a5k0"
Arrive at Fitness Centre

Floor 1
```

Verify that these updates happen at the correct point during playback.

---

# 27. FLOOR TRANSITION DURING PLAYBACK

For routes involving:

* elevators;
* stairs;
* other supported vertical transitions;

the pointer/simulation must:

```text id="5w3rhb"
arrive at transition
↓
show transition state
↓
change floor
↓
load correct SVG
↓
continue route
```

Do not keep rendering the Floor 1 route over the Floor 3 SVG.

---

# 28. REAL ROUTE DATA ONLY

Do not hardcode:

* route;
* path;
* pointer coordinates;
* floor;
* stop names;
* distance;
* SVG.

Everything must come from the real API/backend data.

The frontend should only control playback of the route returned by the API.

---

# 29. PERFORMANCE

SVG maps can be large.

Make sure rendering remains responsive on mobile.

Investigate:

* SVG size;
* DOM complexity;
* unnecessary re-renders;
* repeated SVG parsing;
* repeated route calculations;
* excessive React state updates;
* animation causing full-map re-rendering.

During Play Route, do not re-render the entire map on every animation frame if avoidable.

Prefer updating only the moving pointer/current position.

---

# 30. CAPACITOR-SPECIFIC TESTING

This must work inside the actual Capacitor WebView.

Do not consider the issue fixed simply because SVG works in desktop Chrome.

Test:

### iOS

* real iPhone where available;
* otherwise iOS Simulator.

### Android

* real Android device where available;
* otherwise Android Emulator.

Verify:

* SVG loads;
* map is visible;
* zoom works;
* reset works;
* floor switching works;
* route overlays align;
* pointer moves correctly;
* Play Route works;
* no WebView-specific failures.

---

# 31. API / WEBVIEW NETWORK DEBUGGING

During testing inspect:

* FastAPI network requests;
* SVG/map asset requests;
* HTTP status;
* request URL;
* response headers;
* CORS;
* console errors;
* WebView errors;
* failed resource loads.

If the API response is correct but the WebView cannot retrieve the SVG, fix the actual delivery/access issue.

Do not add a client-side fake map.

---

# 32. API PERFORMANCE

Measure the map endpoint with real properties.

The API should not:

* return unrelated inventory;
* load unnecessary data;
* repeatedly reconstruct the same SVG;
* make N+1 queries;
* return oversized duplicated payloads.

Map data should be retrieved efficiently.

Do not make a new API request on every zoom action.

Do not make a new API request on every route animation frame.

---

# 33. CACHING

Where safe, allow the mobile app/API to reuse:

* SVG map data;
* floor metadata;
* static map assets;
* immutable map resources.

Do not cache mutable route/stop data incorrectly.

The design should support changing floor without unnecessarily downloading unrelated assets.

---

# 34. DO NOT BREAK THE EXISTING MAP & PLOTTING SYSTEM

The Tour App consumes the Pynwheel map/graph.

Do not modify the behavior or meaning of the existing Map & Plotting graph simply to make the mobile rendering work.

If the FastAPI representation is wrong:

* fix the API adapter/serialization;
* preserve the underlying DB/domain data.

Do not alter existing saved path/graph data merely for presentation.

---

# 35. DO NOT BREAK EXISTING TOUR APP FUNCTIONALITY

While fixing the map:

Verify that the following still work:

* login;
* property selection;
* Build Your Tour;
* stop selection;
* route generation;
* shortest path;
* route instructions;
* Play Route;
* floor transitions;
* logout.

---

# 36. TEST MATRIX

Create and execute a real test matrix.

### Map rendering

```text id="ph6qot"
Property       Floor       SVG available   SVG visible   Route aligned
Hazel          real        yes             PASS/FAIL     PASS/FAIL
John Demo      real        yes             PASS/FAIL     PASS/FAIL
Testing 123    real        yes             PASS/FAIL     PASS/FAIL
Jennifer Demo  real        yes             PASS/FAIL     PASS/FAIL
Other property real       yes             PASS/FAIL     PASS/FAIL
```

Add additional real SVG-enabled properties.

Do not fabricate the results.

---

### Zoom

Test:

```text id="zj3j79"
Zoom In
Zoom In again
Zoom Out
Reset
Zoom + route
Zoom + playback
Zoom + floor change
```

Verify every action works with exactly one tap.

---

### Playback

Test:

```text id="bgrh5j"
Play Route
Pause/resume if supported
Slow pointer movement
Step transition
Stop arrival
Floor transition
Final destination
```

---

# 37. FAILURE CASES

Test:

* missing SVG;
* invalid SVG;
* unavailable floor;
* network failure;
* API timeout;
* no route;
* disconnected route;
* route with many points;
* route across floors;
* route across buildings where supported.

The app must fail gracefully.

---

# 38. NO HARDCODED PROPERTY-SPECIFIC FIXES

Do not add code such as:

```text id="au5a8k"
if Hazel...
if propertyId === ...
if floorplateId === ...
```

unless a real domain/business rule explicitly requires it.

The SVG renderer and map loader must work generically for the Pynwheel dataset.

---

# 39. CODE QUALITY

Before completion:

* reuse existing map components;
* reuse the current route model;
* avoid duplicate SVG renderers;
* avoid duplicate zoom state;
* avoid duplicate playback state;
* remove obsolete map workarounds;
* remove debug logs;
* remove temporary SVG placeholders;
* keep the implementation typed;
* keep API models consistent with FastAPI schemas.

---

# 40. AUTOMATED TESTS

Add/fix appropriate tests for:

### API

* SVG/map returned correctly;
* valid floor;
* invalid floor;
* property access;
* missing SVG;
* route response;
* route step data.

### Frontend

* SVG map renders;
* zoom in one click;
* zoom out one click;
* reset;
* floor switching;
* route overlay alignment;
* playback progression.

### Integration

Test the real flow:

```text id="q9y1wd"
FastAPI
→ mobile repository
→ map
→ SVG
→ route
→ playback
```

---

# 41. FINAL REAL-DATA END-TO-END TEST

Perform the complete flow using real SVG-enabled properties:

```text id="j2f4jq"
Launch Tour App
↓
Login with real Super Admin credentials
↓
Select real property
↓
Build Your Tour
↓
Select real stops
↓
Find route
↓
Load real SVG map
↓
Verify map is visible
↓
Verify route overlays align with map
↓
Zoom In
↓
Zoom Out
↓
Reset
↓
Play Route
↓
Verify slow pointer movement
↓
Verify route instructions
↓
Verify stop arrival
↓
Verify floor transition
↓
Continue
↓
Reach destination
```

Repeat with multiple real SVG-enabled properties.

---

# 42. LEGACY REGRESSION

After the changes, verify that the existing Pynwheel system is unaffected:

* legacy HTML/ERB application;
* Rails backend;
* Map & Plotting;
* Tour Setup;
* existing graph/path data;
* existing Tour Stops.

No destructive DB changes are allowed as part of this fix.

---

# 43. FINAL DOCUMENTATION

Update:

```text id="fms8zq"
/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/tour-app-backend-api.md

/Users/zubairzulifqar/pynwheel-staging/tour-app-implementation.md
```

Append dated entries.

Document:

* root cause of SVG rendering failure;
* API changes;
* SVG delivery strategy;
* Capacitor/WebView considerations;
* zoom implementation;
* playback-speed implementation;
* real SVG properties tested;
* performance results;
* remaining issues.

Do not overwrite existing history.

---

# 44. FINAL VERIFICATION REPORT

At the end provide:

```text id="iq0j3d"
## Critical Tour App QA

### SVG Map Rendering
Hazel: PASS/FAIL
John Demo: PASS/FAIL
Testing 123: PASS/FAIL
Jennifer Demo FP: PASS/FAIL
Other SVG properties: PASS/FAIL

### SVG Delivery
API response: PASS/FAIL
Asset request: PASS/FAIL
WebView loading: PASS/FAIL
SVG rendering: PASS/FAIL

### Map Alignment
SVG ↔ paths: PASS/FAIL
SVG ↔ route: PASS/FAIL
SVG ↔ pointer: PASS/FAIL

### Zoom
Zoom In: PASS/FAIL
Zoom Out: PASS/FAIL
Reset: PASS/FAIL
Single-tap behavior: PASS/FAIL

### Playback
Pointer speed: PASS/FAIL
Route synchronization: PASS/FAIL
Stop transitions: PASS/FAIL
Floor transitions: PASS/FAIL

### Mobile
iOS: PASS/FAIL
Android: PASS/FAIL

### API Performance
Map response:
Route response:
Queries:
Payload size:

### Regression
Legacy Pynwheel: PASS/FAIL
Existing Map & Plotting: PASS/FAIL
Existing Tour Setup: PASS/FAIL

### Root Cause
...

### Files Changed
...

### Remaining Issues
...
```

Do not report PASS unless it was actually tested.

---

# FINAL REQUIREMENT

The most important acceptance criterion is:

**A real Pynwheel SVG map must appear correctly in the Tour App, underneath the real route, on actual SVG-enabled properties, on both iOS and Android.**

The final experience must be:

```text id="3n3o8f"
Real Property
↓
Real Floor
↓
Real SVG Map
↓
Real Units / Amenities / Stops
↓
Real Hallway Graph
↓
Real Route
↓
Correct zoom
↓
Slow, understandable Play Route
↓
Stop-by-stop instructions
↓
Correct floor transitions
↓
Destination
```

Do not declare this task complete because the route is visible.

**The map itself is a first-class requirement and must be proven to render correctly with real Pynwheel SVG data.**

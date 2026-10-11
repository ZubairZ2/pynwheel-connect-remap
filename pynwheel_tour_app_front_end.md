# CRITICAL TASK — BUILD THE PYNWHEEL TOUR MOBILE APP

We need to build the **Pynwheel Tour Mobile App** for both **iOS and Android** using **Capacitor**.

This is currently a **frontend/UI-only implementation**.

The mobile app will communicate with the Pynwheel Rails backend in the future, but **NO backend work is required or allowed in this task**.

The immediate goal is to build a complete, production-quality mobile application shell with fully working frontend interactions using clearly identified dummy data, so that the backend/API layer can be connected later without rebuilding the UI architecture.

---

# 1. PROJECT LOCATION

Keep the mobile app inside the existing Pynwheel repository:

```text
/Users/zubairzulifqar/pynwheel-staging
```

Do not create a completely separate repository.

Create an appropriately isolated mobile-app directory inside the existing repository, following the existing project structure.

For example, use an appropriate structure such as:

```text
pynwheel-staging/
├── pyn-connect-web/
├── ...
└── tour-app/
```

Use the existing repository conventions where applicable.

Before creating anything, inspect the repository and determine whether a suitable frontend/shared structure already exists.

---

# 2. UI SOURCE OF TRUTH

The complete mobile UI is defined by:

```text
/Users/zubairzulifqar/pynwheel-staging/tour-app.html
```

Read this file completely before implementing anything.

The HTML file is the **primary visual/source-of-truth reference** for the mobile app.

Do not simplify it into a basic prototype.

Implement the UI in depth, including:

* layout;
* typography;
* colors;
* spacing;
* cards;
* buttons;
* icons;
* controls;
* maps;
* route UI;
* navigation;
* modals;
* bottom sheets;
* drawers;
* tabs;
* overlays;
* empty states;
* loading states;
* error states;
* selected/unselected states;
* disabled states;
* animations/transitions where represented;
* mobile-specific behavior.

---

# 3. FIRST STEP — INSPECT BEFORE CODING

Before writing implementation code:

1. Read `tour-app.html` completely.
2. Inspect the current repository.
3. Inspect existing frontend dependencies and conventions.
4. Determine whether React/Next.js/shared components can be reused safely.
5. Determine the most appropriate Capacitor architecture for this repository.
6. Identify all screens, states, overlays, and interactions represented by the HTML.
7. Create a screen/feature map before implementation.

Do not start by writing a minimal single-page mock.

---

# 4. CAPACITOR REQUIREMENT

The application must be a real **Capacitor mobile application**, not simply a browser page.

The project must support:

```text id="4m44py"
iOS
Android
```

Use Capacitor correctly so the application can be:

* built for iOS;
* built for Android;
* installed on physical devices;
* launched and tested as a native mobile app.

Set up the required Capacitor configuration and native projects inside the mobile app structure.

Do not modify unrelated Pynwheel applications.

---

# 5. ACTUAL DEVICE REQUIREMENT

The application must be designed and tested for real mobile devices, not only desktop Chrome.

Test on:

### iOS

A real iPhone or iOS simulator.

### Android

A real Android device or Android emulator.

Verify:

* touch interactions;
* scrolling;
* tapping;
* swiping;
* modal behavior;
* keyboard behavior;
* safe areas;
* status bar;
* bottom navigation area;
* device rotation behavior where relevant;
* viewport sizing;
* native back behavior;
* loading behavior;
* app launch;
* app resume/reopen.

Do not consider the task complete because it works in a desktop browser.

---

# 6. PIXEL-PERFECT UI

The target is the provided:

```text
tour-app.html
```

Implement the new application so it visually matches the reference as closely as possible.

Pay particular attention to:

* exact spacing;
* sizing;
* typography;
* border radius;
* shadows;
* alignment;
* icon size;
* icon placement;
* line height;
* card dimensions;
* button dimensions;
* map container proportions;
* bottom sheets;
* headers;
* fixed-position elements;
* scrolling behavior.

Do not replace detailed UI with generic mobile components merely because they are easier to implement.

---

# 7. ALL FUNCTIONALITY MUST WORK WITH DUMMY DATA

Every interaction represented by the HTML should work.

The app must not be a static visual mock.

Implement functional frontend behavior for:

* navigation;
* selection;
* search;
* filtering;
* map interactions;
* choosing From;
* choosing To;
* route generation;
* shortest-path result display;
* route simulation;
* Play Route;
* floor changes;
* building changes;
* stop selection;
* unit selection;
* amenity selection;
* route progress;
* back/close behavior;
* modals;
* bottom sheets;
* dialogs;
* toggles;
* buttons;
* reset actions;
* cancel actions;
* confirmation flows;
* loading transitions;
* empty/error states where represented.

The interaction should behave as though a real backend exists, but all current data should be local dummy data.

---

# 8. DUMMY DATA MUST BE OBVIOUSLY IDENTIFIED

Every dummy value displayed to the user must clearly indicate that it is dummy data.

Add an asterisk:

```text
*
```

to every dummy-data label/value where appropriate.

For example:

```text
Main Entrance *
Parking Access *
Tower A *
Floor 3 *
Unit 0304 *
Business Center *
```

Do not allow the user to mistake dummy data for real production/backend data.

The dummy marker should remain visually consistent with the UI.

Do not make the entire UI ugly by adding large warning text.

Use a subtle but unmistakable `*` indicator.

---

# 9. DO NOT HARD-CODE DUMMY DATA DIRECTLY INTO UI COMPONENTS

Even though we are using dummy data, do not scatter it throughout React components.

Create a clean frontend data layer such as:

```text
dummy/
  properties
  buildings
  floorplates
  units
  amenities
  stops
  graph
  routes
```

Use models/types/interfaces that represent the **future backend response shape**.

Conceptually:

```text
UI
 ↓
Repository / Data Provider
 ↓
Dummy Data
```

Later this should become:

```text
UI
 ↓
Repository / API Client
 ↓
Pynwheel Backend
```

The UI components should not need to be rewritten when the real backend is connected.

---

# 10. FUTURE BACKEND-READY ARCHITECTURE

Although backend integration is NOT part of this task, structure the frontend so future API integration is straightforward.

Create clear boundaries for:

### Data provider

Responsible for retrieving:

* properties;
* buildings;
* floorplates;
* units;
* amenities;
* stops;
* graph data.

### Route provider/service

Responsible for:

* resolving From/To;
* finding a route;
* returning ordered route information.

### Dummy implementation

Use dummy/local data for now.

Later:

```text
DummyTourRepository
        ↓
RealTourApiRepository
```

The UI should depend on the repository interface rather than directly on dummy arrays.

Do not build fake HTTP endpoints.

Do not create backend APIs.

Do not modify the Rails application.

---

# 11. MAP DATA MODEL

The mobile app will eventually receive the same map/graph information created by the Pynwheel Map & Plotting system.

Create frontend models capable of representing:

```text
Property
Building
Floorplate
Floor
SVG / map
Background
Unit
Amenity
Stop
Node
Edge
Vertical Connection
Route
```

The graph model should support:

* nodes;
* hallway edges;
* unit connections;
* amenity connections;
* stop connections;
* elevators;
* stairs;
* cross-floor routing;
* cross-building routing where applicable.

Use dummy data to exercise the full model.

---

# 12. MAP EXPERIENCE

Implement the map experience shown in `tour-app.html`.

The map must support the complete visual hierarchy:

```text
Map
├── floor/map background
├── SVG/map geometry
├── units
├── amenities
├── hallway/path network
├── stops
├── elevator/stairs transitions
└── route
```

Do not use arbitrary colored dots merely to represent everything.

Use appropriate map symbols/visual semantics matching the supplied UI/reference.

---

# 13. FROM / TO FLOW

The user must be able to select:

```text
From
```

and:

```text
To
```

from the available dummy locations.

For example:

```text
From
Main Entrance *

To
Parking Access *
```

The selection UI must function correctly.

Handle:

* selecting a location;
* changing selection;
* clearing selection;
* invalid selection;
* same From/To;
* unavailable destination;
* disconnected destination.

---

# 14. FIND SHORTEST PATH

Implement the complete frontend flow:

```text
From
↓
To
↓
Find Shortest Path
↓
Route calculated
↓
Route displayed
```

Use a real graph algorithm against the dummy graph data.

Do **not** hardcode a visual route.

The dummy route should actually be calculated from:

```text
nodes
+
edges
+
connections
+
vertical links
```

This is important because the same frontend graph model will later receive real backend data.

---

# 15. CROSS-FLOOR ROUTING

The dummy graph must include enough data to demonstrate:

* same-floor routing;
* elevator routing;
* stairs routing;
* cross-floor routing;
* cross-building routing where represented by the reference UI.

For example:

```text
Floor 1
↓
Elevator
↓
Floor 3
↓
Hallway
↓
Parking Access
```

The UI must clearly show the floor transition.

Do not fake the transition with a simple screen change.

The route model must contain the transition.

---

# 16. PLAY ROUTE

Implement:

**Play Route**

as a real frontend simulation.

After a route is calculated:

```text
Find Shortest Path
↓
Route available
↓
Play Route
↓
route begins
```

The simulation should progress through the calculated route.

Support:

* start;
* pause/resume where represented;
* progress;
* current point/step;
* next point;
* previous point where appropriate;
* floor transitions;
* destination reached;
* completion state.

The route should be based on the calculated ordered graph path.

---

# 17. POINT-BY-POINT / STOP-BY-STOP SIMULATION

The future mobile Tour App should be able to simulate navigation along the route.

Therefore the dummy route should contain ordered route segments such as:

```text
Start
↓
Node
↓
Hallway
↓
Node
↓
Stop
↓
Elevator
↓
Floor transition
↓
Node
↓
Destination
```

Use this structure to drive the simulation.

Do not build the animation as an unrelated slideshow.

---

# 18. TOUR STOPS

Implement dummy data for multiple stop types supported by the UI.

Where applicable include:

```text
Entry Point *
Exit Point *
Elevator *
Stairs *
Ramp *
Door/Gate *
Leasing Office *
Restroom *
Mail & Packages *
Parking Access *
Waypoint *
```

Do not assume every stop type is traversable.

The frontend model should preserve stop type semantics for future backend integration.

---

# 19. UNITS AND AMENITIES

Include dummy:

* Units
* Amenities

and make them usable as destinations where appropriate.

Example:

```text
Unit 0304 *
Business Center *
```

The map should correctly associate these with:

* polygons;
* graph nodes;
* bridge connections;
* routes.

---

# 20. FLOOR / BUILDING NAVIGATION

Implement the exact floor/building behavior represented by the UI.

The user should be able to:

* view a building;
* select a floor;
* move between floors;
* see the correct map;
* see the correct units/amenities/stops;
* see the correct route segment for that floor.

The selected floor must control the rendered map state.

Do not display data belonging to another floor.

---

# 21. MOBILE NAVIGATION / GESTURES

Use native-mobile-friendly interactions.

Test:

* tap;
* swipe;
* scroll;
* drag where required;
* pinch/zoom where the design requires it;
* map interaction;
* modal dismissal;
* bottom-sheet interaction.

Avoid hover-only interaction because mobile devices do not have hover.

Every desktop-oriented interaction in the reference must have an appropriate touch equivalent.

---

# 22. SAFE AREAS

Correctly handle iPhone safe areas.

Verify the UI does not place:

* buttons;
* text;
* route controls;
* bottom navigation;
* close buttons;

under:

* the iOS status bar;
* the Dynamic Island/notch;
* the home indicator.

Also verify Android navigation/system bars.

---

# 23. KEYBOARD AND INPUTS

For every text input/search field:

* keyboard should open correctly;
* content should remain visible;
* focused controls should not be obscured;
* keyboard dismissal should work;
* scrolling should behave correctly.

Test on both iOS and Android.

---

# 24. LOADING STATES

Implement proper loading states for:

* app startup;
* map loading;
* route calculation;
* floor changes;
* location/stop loading;
* simulated route transitions where represented.

Use the existing Pynwheel loading visual language where appropriate.

Do not display final map data before the map state is ready.

---

# 25. ERROR / EMPTY STATES

Implement the states represented or implied by the UI for cases such as:

* no route;
* disconnected destination;
* no stops;
* no map;
* no results;
* invalid From/To;
* failed local operation.

The application must never crash because dummy data is missing.

---

# 26. NO BACKEND CHANGES

This task is frontend-only.

Do NOT modify:

* Rails controllers;
* Rails services;
* Rails models;
* Rails routes;
* Rails database;
* migrations;
* backend settings;
* CMS;
* production API behavior.

Do not create fake backend endpoints in Rails.

Do not connect to production DB.

All current app data must come from the local dummy data provider.

---

# 27. NO PRODUCTION API CALLS

At this stage the app must not attempt to call the Pynwheel backend.

There should be no accidental requests to:

* localhost Rails API;
* staging API;
* production API.

The app should work completely using dummy data.

Keep the future API integration boundary isolated so it can be enabled later without changing the screen architecture.

---

# 28. DESIGN FOR FUTURE BACKEND CONNECTION

When real APIs are introduced later, the expected replacement should be approximately:

```text
Current:

UI
 ↓
TourRepository
 ↓
DummyTourRepository


Future:

UI
 ↓
TourRepository
 ↓
PynwheelApiTourRepository
 ↓
Rails Backend
```

Do not make components depend on `dummyData` directly.

This is essential.

---

# 29. OFFLINE-FIRST FRONTEND BEHAVIOR

Because the current task has no backend dependency, the application should launch and operate without network connectivity.

Verify:

* app launches offline;
* maps load;
* routes work;
* simulation works;
* dummy data remains available.

Do not add real backend/network requirements.

---

# 30. APP ICON / SPLASH / BRANDING

Use the Pynwheel branding appropriately for the mobile app.

Inspect the existing branding assets in:

```text
/Users/zubairzulifqar/pynwheel-staging/public/
```

Reuse existing Pynwheel assets where appropriate.

Do not create fake/random branding.

Configure the Capacitor application so:

* app icon is set;
* splash/startup experience is appropriate;
* app name is correct;
* iOS and Android native configuration are valid.

Do not expose internal/demo branding to users.

---

# 31. NATIVE BACK BUTTON

Implement appropriate Android back behavior.

For example:

```text
Modal open
→ Back closes modal

Bottom sheet open
→ Back closes sheet

Route simulation open
→ Back returns to route state

Normal screen
→ Back navigates to previous screen
```

Do not let Android Back unexpectedly close the entire application when an overlay can be dismissed first.

Use the appropriate Capacitor/native integration.

---

# 32. APP STATE / RESUME

Test:

```text
Open app
↓
Select route
↓
Background app
↓
Resume app
```

Verify that the app returns to a consistent state.

No unexpected reset of:

* selected floor;
* From;
* To;
* route;
* simulation state;

unless that behavior is explicitly represented in the UI.

---

# 33. ACCESSIBILITY

Implement sensible mobile accessibility:

* semantic buttons;
* readable text;
* sufficient touch targets;
* accessible labels for icons;
* meaningful screen-reader labels;
* visible focus where keyboard navigation applies.

Do not let accessibility work destroy the pixel-perfect design.

---

# 34. PERFORMANCE

The app must feel responsive on actual mobile devices.

Avoid:

* unnecessarily large bundles;
* unnecessary re-renders;
* repeated graph calculations;
* rendering all unrelated floors simultaneously;
* loading huge dummy payloads;
* recreating map geometry unnecessarily.

Keep map rendering efficient.

The architecture should also make it possible to replace dummy data with larger real backend datasets later.

---

# 35. PROJECT STRUCTURE

Use a clean structure appropriate for the application.

Conceptually:

```text
tour-app/
├── src/
│   ├── components/
│   ├── screens/
│   ├── navigation/
│   ├── map/
│   ├── wayfinding/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   ├── dummy/
│   └── styles/
├── ios/
├── android/
├── capacitor.config.*
├── package.json
└── ...
```

Adapt this to the actual project's conventions.

Do not create unnecessary duplication.

---

# 36. TEST EVERY SCREEN AND INTERACTION

Create a complete test checklist from `tour-app.html`.

Every visible action must have a corresponding working interaction.

Check:

```text
Navigation
Forms
Search
Filters
Map
Floor selector
Building selector
Stops
From
To
Shortest Path
Route display
Play Route
Simulation
Modals
Sheets
Close
Back
Reset
Loading
Empty state
Error state
```

Nothing should be decorative-only when the reference presents it as interactive.

---

# 37. REAL DEVICE TESTING

Test the application on:

### iOS

* iPhone simulator
* preferably at least one real iPhone

### Android

* Android emulator
* preferably at least one real Android device

Verify:

* visual fidelity;
* touch;
* scrolling;
* gestures;
* keyboard;
* safe areas;
* navigation;
* app lifecycle;
* performance.

Do not report device compatibility based solely on code inspection.

---

# 38. BUILD VALIDATION

Verify that both native projects build correctly.

### iOS

Ensure the Capacitor iOS project opens/builds correctly in Xcode.

### Android

Ensure the Capacitor Android project opens/builds correctly in Android Studio/Gradle.

Also verify the web build succeeds before syncing Capacitor.

Do not leave the native projects partially configured.

---

# 39. NO LEGACY PYNWHEEL REGRESSION

This mobile app must not change behavior of:

* `pyn-connect-web`;
* Rails backend;
* legacy HTML/ERB application.

Keep the mobile implementation isolated.

Do not modify shared code unless it is genuinely safe and does not change behavior of existing applications.

When shared code is reused, verify there is no regression.

---

# 40. DOCUMENTATION

After implementation create:

```text
/Users/zubairzulifqar/pynwheel-staging/tour-app-implementation.md
```

Document:

### Project structure

What was created and why.

### Screens

Each screen and its relationship to `tour-app.html`.

### Components

Reusable components and their responsibilities.

### Dummy data

Where it lives and how it is structured.

### Future API architecture

Explain:

```text
UI
↓
Repository
↓
Dummy provider today
↓
Real Pynwheel API provider later
```

### Map model

Explain:

* nodes;
* edges;
* units;
* amenities;
* stops;
* elevators;
* stairs;
* floors;
* buildings.

### Routing

Explain how shortest path is calculated.

### Play Route

Explain how the route simulation works.

### Capacitor

Document:

* iOS setup;
* Android setup;
* native configuration;
* icons;
* splash;
* app ID;
* build commands.

---

# 41. DOCUMENT EVERY DUMMY DATA SOURCE

Clearly document that:

```text
* = dummy/demo data
```

and identify where those values are defined.

Do not allow dummy values to be mistaken for real backend data.

---

# 42. FINAL QA PASS

Before finishing, perform a complete end-to-end test.

Test:

```text
Launch app
↓
Navigate through every screen
↓
Select building
↓
Select floor
↓
Inspect map
↓
Select From
↓
Select To
↓
Find Shortest Path
↓
Inspect route
↓
Play Route
↓
Move through simulation
↓
Cross floor if available
↓
Return to normal state
↓
Repeat
```

Then test:

* close/reopen app;
* background/resume;
* Android Back;
* modal/sheet dismissal;
* invalid route;
* no-route state;
* empty state;
* loading state.

---

# 43. FINAL CODE QUALITY REVIEW

Before completion:

* remove unused imports;
* remove dead code;
* remove debug logging;
* remove temporary placeholder components;
* remove unused dummy data;
* keep types/models consistent;
* avoid duplicated business logic;
* avoid direct dummy-data access from UI components;
* ensure no accidental backend requests;
* ensure no production secrets;
* ensure no API credentials;
* ensure no environment-specific hardcoding.

---

# 44. FINAL ACCEPTANCE CRITERIA

The task is complete only when:

### UI

* `tour-app.html` has been fully translated into the mobile application;
* UI is pixel-perfect/very close to the reference;
* all represented functionality works.

### Mobile

* iOS build works;
* Android build works;
* real touch interactions work;
* safe areas work;
* keyboard behavior works;
* native navigation works.

### Data

* all current data is dummy data;
* dummy data is marked with `*`;
* dummy data is isolated from UI components;
* no backend requests are made.

### Architecture

* frontend is structured around repositories/data providers;
* future Rails API integration can replace the dummy provider;
* map/graph models are backend-ready;
* shortest-path logic operates against graph data.

### Functionality

* From/To works;
* shortest path works;
* route rendering works;
* Play Route works;
* floor transitions work;
* stop selection works;
* map interactions work;
* all important UI actions work.

### Safety

* no Rails/backend changes;
* no DB changes;
* no legacy Pynwheel changes;
* no production behavior affected.

---

# 45. FINAL REPORT

At the end provide:

```text
## Tour App Implementation

### Screens implemented
...

### Major components
...

### Dummy data architecture
...

### Map/graph architecture
...

### Shortest-path implementation
...

### Play Route implementation
...

### Capacitor setup
...

### iOS status
PASS / FAIL

### Android status
PASS / FAIL

### Real-device testing
iOS:
Android:

### Desktop/browser testing
...

### Backend changes
NONE

### Rails/legacy changes
NONE

### Known issues
...
```

Do not claim:

* pixel perfect;
* iOS working;
* Android working;
* real-device tested;

unless it was actually verified.

---

# FINAL PRINCIPLE

Build this as a **real mobile application**, not as a desktop web mockup wrapped in Capacitor.

The immediate architecture is:

```text
                    ┌── iOS
Tour App UI
    ↓               └── Android
Repository/Data Layer
    ↓
Dummy Data
```

The future architecture will become:

```text
                    ┌── iOS
Tour App UI         │
    ↓               └── Android
Repository/Data Layer
    ↓
Pynwheel API
    ↓
Rails Services
    ↓
Pynwheel Database
```

The UI and interaction layer should require minimal or no rewriting when the real Pynwheel backend is connected.

**Do not modify the backend in this task. Do not modify the legacy HTML system. Build the complete mobile frontend, make every interaction functional with dummy data, clearly mark every dummy value with `*`, and validate the app on both iOS and Android.**

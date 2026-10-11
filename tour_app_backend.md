# CRITICAL TASK — BUILD AND INTEGRATE THE FASTAPI BACKEND FOR THE PYNWHEEL TOUR APP

The Tour Mobile App UI has already been implemented using Capacitor and dummy data.

The next task is to build the **production FastAPI backend/API for the Tour App**, connect the mobile app to it, replace dummy data with real Pynwheel data, and make the complete tour flow work end-to-end.

This is a **backend-critical integration task**.

The implementation must be:

* based on the existing Pynwheel system;
* compatible with the current Rails application and database;
* safe for the existing legacy HTML/ERB system;
* efficient;
* secure;
* production-oriented;
* consistent across API, mobile UI, and existing business rules.

Do not redesign the Pynwheel backend unnecessarily.

---

# 1. READ ALL PROJECT CONTEXT FIRST

Before changing anything, read these files completely:

```text id="7zj5hw"
/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/backend_architecture_plan_report.md

/Users/zubairzulifqar/pynwheel-staging/start-the-planing-task-logical-papert.md

/Users/zubairzulifqar/pynwheel-staging/tour-app-implementation.md

/Users/zubairzulifqar/pynwheel-staging/tour-app.html
```

Also inspect the existing:

* Rails authentication flow;
* Rails models;
* Rails services;
* map/path/wayfinding implementation;
* Tour Stop implementation;
* Unit/Amenity stop-list implementation;
* current APIs/controllers;
* database schema;
* existing authorization rules.

The architecture documents are the starting point, but **the actual repository code is the final source of truth**.

If the documentation and implementation differ, investigate the actual code before making a decision.

---

# 2. CURRENT OBJECTIVE

We now have:

```text id="d3n4em"
Capacitor Tour Mobile App
        ↓
currently uses Dummy Data
```

Change this to:

```text id="9r8gqf"
Capacitor Tour Mobile App
        ↓
FastAPI Tour API
        ↓
Existing Pynwheel data/domain source
        ↓
Existing Pynwheel DB / services
```

The mobile application must now display **real Pynwheel data**.

This includes:

* properties;
* buildings;
* floorplates;
* maps;
* units;
* amenities;
* tour stops;
* graph paths;
* nodes;
* elevators;
* stairs;
* routing;
* shortest paths;
* route-step descriptions;
* tour configuration.

---

# 3. FASTAPI REQUIREMENT

The Tour App API must be implemented using **FastAPI**.

Create the FastAPI service in the existing repository:

```text id="g7v6hh"
/Users/zubairzulifqar/pynwheel-staging
```

Do not create a separate unrelated repository.

First inspect the repository and determine the cleanest location for the FastAPI service.

Use an architecture that keeps:

* API routes;
* authentication;
* service/domain adapters;
* repositories;
* schemas;
* database access;
* routing;
* configuration;

clearly separated.

Do not put database/business logic directly into route handlers.

---

# 4. DO NOT BREAK THE EXISTING RAILS SYSTEM

This is a hard requirement.

The current Rails application and legacy HTML/ERB system must continue to work exactly as before.

Do not:

* modify legacy controller behavior unnecessarily;
* alter existing Rails routes;
* change existing database semantics;
* replace existing business logic;
* break existing login;
* break existing Map & Plotting;
* break existing Tour Setup;
* change existing graph persistence behavior;
* introduce incompatible schema changes.

Prefer the FastAPI service to operate as an **additional API layer** over the existing system.

Conceptually:

```text id="x8jz5q"
                    ┌── Legacy HTML/ERB
                    │
Existing Pynwheel ──┼── Existing Rails UI/API
DB + domain logic   │
                    └── FastAPI Tour API
                              ↓
                         Capacitor App
```

The existing system remains authoritative.

---

# 5. FIRST INVESTIGATION — DO NOT IMMEDIATELY CODE

Before implementing API endpoints, inspect the current backend thoroughly.

Identify the actual source of truth for:

### Authentication

* User model;
* Super Admin role;
* password storage;
* password verification;
* Devise or other authentication mechanism;
* session/token mechanism;
* authorization.

### Properties

* property model;
* company;
* property configuration;
* Self-Guided Tour enabled/disabled state.

### Inventory

* Units;
* Amenities;
* Floorplans;
* Floorplates;
* Buildings.

### Map

* SVG;
* background;
* polygons;
* coordinates;
* plotted state.

### Wayfinding

* nodes;
* edges;
* hallway paths;
* bridges;
* stop connections;
* elevators;
* stairs;
* shortest path;
* route generation.

### Tour Setup

* Tour Stops;
* Additional Stops;
* stop types;
* stop descriptions;
* stop ordering;
* stop placement;
* Unit/Amenity → Tour Stop relationship.

Create a real data-source map before implementing.

---

# 6. AUTHENTICATION — SAME PYNWHEEL CSM CREDENTIALS

The Tour App login must allow **all existing Pynwheel Super Admin users** to log in using their existing Pynwheel/CSM credentials.

Do not create a second unrelated user database.

Do not hardcode users.

Do not create dummy accounts.

The FastAPI authentication flow must use the existing Pynwheel authentication source.

## Very important

First inspect how the existing Rails application authenticates users.

If there is an existing authentication/service/token mechanism that can safely be reused, prefer that.

Do not blindly reimplement Rails password rules in FastAPI.

The final design must preserve:

* existing password hashing;
* existing user status;
* existing Super Admin authorization;
* existing account rules.

If FastAPI must verify credentials against existing user data, use the same password hashing algorithm and semantics used by the current Rails system.

Never expose:

* password hashes;
* passwords;
* authentication secrets;

through API responses.

---

# 7. FASTAPI AUTH API

Implement an appropriate authentication API.

For example:

```text id="3qfd8c"
POST /api/v1/auth/login
```

The exact path should follow the project's API conventions.

Request conceptually:

```json id="6u1a1j"
{
  "email": "...",
  "password": "..."
}
```

Response should contain only the information required by the mobile app, such as:

```json id="4gc8ku"
{
  "access_token": "...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "name": "...",
    "role": "super_admin"
  }
}
```

Do not expose internal Rails user fields.

---

# 8. AUTHORIZATION

Only users who are actually authorized as Pynwheel Super Admins should access the Tour App administrative/API functionality defined by this task.

Do not treat "any authenticated user" as a Super Admin.

Use the actual existing authorization source.

Return proper errors for:

* invalid credentials;
* inactive user;
* non-Super-Admin user;
* expired token;
* missing token;
* invalid token.

Do not weaken existing permissions.

---

# 9. PROPERTY SELECTION

The mobile app must now load the **real available properties** from the backend.

The user should see the existing UI property dropdown populated from actual DB data.

Do not hardcode properties such as:

```text id="ch3v6q"
Hazel
John Demo
Testing 123
Jennifer Demo FP
```

Those are test records, not hardcoded application data.

The API should return actual accessible properties.

Only expose properties that the authenticated user is allowed to access.

---

# 10. PROPERTY CAPABILITY / SELF-GUIDED TOUR

Before exposing Tour functionality for a property, use the actual property/company configuration.

The API must distinguish:

```text id="4hfqk2"
Self-Guided Tour ENABLED
```

from:

```text id="5it8fr"
Self-Guided Tour DISABLED
```

For disabled properties:

* do not pretend there are Tour Stops;
* do not expose invalid tour functionality;
* do not fabricate route data.

For enabled properties:

* return the actual tour data;
* expose actual stops;
* expose actual routable map data.

Do not create a duplicate frontend-only capability flag.

---

# 11. BUILD YOUR TOUR

The current mobile flow contains:

```text id="mtv6m6"
Build Your Tour

Select stops — we’ll route you automatically.

Amenities
Floorplans
```

Replace the dummy data with real data.

The API must return the real available destinations grouped appropriately.

At minimum investigate and support:

* amenities that are valid Tour Stops;
* Units/Floorplans where they are configured as tour stops;
* existing Additional Stops;
* other stop types supported by the current system.

Only return items that are actually valid for the selected property and Tour configuration.

---

# 12. UNIT AND AMENITY TOUR STOPS

The backend must honor the existing:

```text id="f1j2ew"
Show in Stops List
```

state.

For a Unit/Amenity:

```text id="3p98aq"
Show in Stops List = ON
```

the Tour App should be able to retrieve it as a selectable Tour Stop.

When:

```text id="r4a9f9"
Show in Stops List = OFF
```

it should not appear as a selectable Self-Guided Tour stop.

Do not infer this state from plotting alone.

Use the actual persisted relationship/configuration.

---

# 13. TOUR STOP DATA CONTRACT

Each returned stop should contain enough information for the mobile app.

Determine the exact required response, but conceptually include:

```json id="feu8kp"
{
  "id": "...",
  "type": "...",
  "name": "...",
  "description": "...",
  "building": "...",
  "floor": "...",
  "floorplate_id": "...",
  "location": {
    "x": 0,
    "y": 0
  },
  "map_node_id": "...",
  "routable": true
}
```

Only return fields that are supported by actual backend data.

Do not invent descriptions.

---

# 14. MAP API

The Tour App must receive the real map data required to render the selected property.

The API must support:

* building;
* floorplate;
* floor;
* floor range;
* SVG;
* background;
* unit polygons;
* amenity polygons;
* plotted locations;
* stops;
* hallway geometry;
* graph nodes;
* graph edges;
* vertical connections.

Do not make the mobile app reverse-engineer Rails database records.

Return a clean, stable domain-level representation.

---

# 15. GRAPH API

This is one of the most important APIs.

The mobile app needs the **same real navigable graph** used by Pynwheel Map & Plotting / Wayfinding.

The graph must represent:

```text id="hz3p3r"
Nodes
Edges
Hallways
Unit bridges
Amenity bridges
Stop bridges
Elevator connections
Stair connections
Floor transitions
Building transitions where supported
```

Do not generate a second unrelated graph for the mobile app.

The API should expose the persisted/approved graph produced by the Pynwheel backend.

---

# 16. DO NOT RECALCULATE THE MAP GRAPH IN THE MOBILE APP

The mobile app should not attempt to recreate:

* hallway detection;
* SVG graph extraction;
* graph persistence;
* Pynwheel business rules.

It should consume the normalized graph returned by the API.

The FastAPI layer should adapt the existing backend representation into a mobile-friendly structure.

---

# 17. ROUTING API

The Tour App needs real shortest-path routing.

Implement an appropriate API such as:

```text id="2p6o4t"
POST /api/v1/properties/{property_id}/route
```

or the appropriate architecture discovered from the current codebase.

Request conceptually:

```json id="gq51j0"
{
  "from_stop_id": "...",
  "to_stop_id": "...",
  "route_scope": "floors"
}
```

The actual API contract must follow the real domain model.

---

# 18. ROUTING MUST USE REAL GRAPH DATA

Do not hardcode routes.

The route must be generated from:

```text id="7s7pqp"
Real persisted graph
+
Real stop locations
+
Real hallway paths
+
Real vertical connections
```

The API must return an ordered route.

Conceptually:

```json id="p0qs67"
{
  "route": {
    "start": {},
    "destination": {},
    "steps": [],
    "total_distance": 0,
    "floors": [],
    "buildings": []
  }
}
```

---

# 19. ROUTE STEP DATA — CRITICAL FOR MOBILE UI

The mobile UI should move the user **from stop to stop / point to point**.

Each route step must contain enough information for the app to render the corresponding screen.

The UI needs information such as:

```text id="pyrjkg"
Walk on Floor 1
From Tour start to Fitness Centre · 1,032 px

Arrive at Fitness Centre
Floor 1
```

These values must be generated from the actual route.

Do not hardcode:

```text id="3edvsc"
1,032 px
Fitness Centre
Floor 1
```

The API should calculate/return the correct information based on the real graph.

---

# 20. ROUTE STEP CONTRACT

Define a stable route-step model.

Conceptually:

```json id="cij9bo"
{
  "sequence": 1,
  "type": "walk",
  "title": "Walk on Floor 1",
  "description": "From Tour start to Fitness Centre",
  "distance": 1032,
  "unit": "px",
  "floor": {
    "id": "...",
    "name": "Floor 1"
  },
  "from": {
    "id": "...",
    "type": "...",
    "name": "Tour start"
  },
  "to": {
    "id": "...",
    "type": "...",
    "name": "Fitness Centre"
  },
  "geometry": []
}
```

The actual contract should be adapted to the real domain model.

---

# 21. STOP ARRIVAL STEP

When the user reaches a stop, return a clear arrival step.

For example:

```text id="n3ts6q"
Arrive at Fitness Centre
Floor 1
```

The mobile application should use this information to display the correct stop screen.

Do not generate arrival screens separately from the route returned by the API.

---

# 22. DESCRIPTION TEXT MUST COME FROM THE PYNWHEEL WAYFINDING DATA

The route description shown below the map should use the same semantic information used by the current Wayfinding system.

Do not create generic AI-generated text.

Prefer existing:

* stop names;
* route metadata;
* floor information;
* path distance;
* existing directional/wayfinding text.

Where the current backend already has a description/directional text for a stop, use it.

Do not invent a different source of truth.

---

# 23. TOUR ORDER

When the user selects multiple destinations:

```text id="nqzpo9"
Stop A
Stop B
Stop C
Stop D
```

the backend should produce a route that follows the intended Tour flow.

Determine whether the current Pynwheel system already has:

* explicit tour order;
* ranking;
* stop order;
* route optimization;
* nearest-next-stop logic.

Reuse the existing business logic where available.

Do not invent a conflicting tour-order system.

If the new UI expects automatic routing between selected stops, the API should return the complete sequence.

---

# 24. MULTI-STOP TOUR

The complete expected flow is:

```text id="j0u2mk"
Login
↓
Select Property
↓
Build Your Tour
↓
Select Amenities / Floorplans / valid Tour Stops
↓
Confirm selection
↓
Backend validates selected stops
↓
Backend resolves routes between them
↓
Complete ordered route returned
↓
Mobile displays stop-by-stop screens
↓
Play / navigation simulation
```

Implement the backend so the mobile app can follow this flow without embedding Pynwheel business rules in React.

---

# 25. ROUTE ACROSS FLOORS

Support real cross-floor routes using:

* elevators;
* stairs;
* other existing vertical connectors where supported.

Example:

```text id="j4w8bd"
Floor 1
↓
Elevator
↓
Floor 3
↓
Hallway
↓
Destination
```

The API must explicitly represent the transition.

The mobile app should receive enough information to:

* switch to the correct floor map;
* show the transition;
* continue route simulation.

---

# 26. ROUTE ACROSS BUILDINGS

Where the existing graph/business rules support it, support:

```text id="2m2ed4"
Building A
↓
connector
↓
Building B
```

Do not claim cross-building routing if the current graph/business rules do not support it.

Inspect the actual system first.

---

# 27. PLAY ROUTE API / DATA

The existing mobile app already has the Play Route experience.

The real API must provide enough route information for the mobile app to replay the route.

The preferred model is:

```text id="76e4u7"
API returns ordered route
↓
Mobile steps through route
↓
Each step has:
- map/floor
- geometry
- from
- to
- description
- distance
- transition metadata
```

The mobile app should not need to call the backend for every pixel/animation frame.

Do not make the mobile app repeatedly request the backend while animating the route.

Return the route data once where practical.

---

# 28. MAP + ROUTE RESPONSE EFFICIENCY

Do not return the entire property database to the mobile app.

For a selected property:

* return only required buildings/floorplates;
* return only required map assets;
* return only relevant Tour Stops;
* return only graph data required for routing.

Use lazy loading where appropriate.

For example:

```text id="0d3a6w"
Property selected
→ property summary

Build Your Tour opened
→ stops/destinations

Specific floor/map opened
→ floor map

Route requested
→ route/required graph
```

Avoid massive responses containing:

* all inventory;
* all unrelated floors;
* unrelated properties;
* unnecessary metadata.

---

# 29. API RESPONSE CONSISTENCY

All APIs must use consistent response/error conventions.

Define:

* success structure;
* validation errors;
* authorization errors;
* not found;
* no route;
* unavailable property;
* unavailable floor;
* invalid stop;
* internal server error.

Do not leak:

* SQL errors;
* stack traces;
* internal table names;
* Rails internals;
* credentials.

---

# 30. FASTAPI SCHEMAS

Use typed request/response schemas.

Prefer Pydantic models for:

* auth;
* property;
* building;
* floor;
* map;
* graph;
* stop;
* route;
* route step.

Do not return unstructured database rows directly from endpoints.

This is important for API stability.

---

# 31. DATABASE ACCESS

Determine the safest database access strategy from the existing architecture.

Do not introduce unnecessary competing database logic.

Prefer one of:

```text id="d3t6u9"
FastAPI
↓
Existing Rails/API/domain layer
```

or, only where appropriate and proven safe:

```text id="4a0nfv"
FastAPI
↓
read-only DB/repository layer
↓
existing DB
```

The correct choice must be based on the architecture investigation.

Do not bypass critical Rails business logic for operations where business rules matter.

For read-only map/tour data, a safe optimized repository/read layer may be appropriate.

---

# 32. DO NOT DUPLICATE RAILS BUSINESS LOGIC

FastAPI should not independently recreate:

* Tour Stop business rules;
* product enablement;
* authorization;
* graph persistence rules;
* Pynwheel map rules;
* existing routing rules;

unless there is a clearly documented reason and the behavior can be proven equivalent.

Where Rails already has authoritative logic, reuse/adapt it.

---

# 33. CACHING

Investigate whether map/graph data can be safely cached.

Potential candidates:

* property list;
* property configuration;
* floorplate metadata;
* immutable SVG/background assets;
* published graph;
* Tour Stop list.

Do not cache mutable data incorrectly.

Define cache invalidation behavior for:

* changed stops;
* changed graph;
* changed property configuration.

Do not introduce caching simply for appearance.

---

# 34. AUTH TOKEN LIFECYCLE

Use a secure mobile-compatible authentication mechanism.

Define:

* access token;
* expiration;
* refresh strategy if required;
* logout;
* invalid token behavior.

Do not store credentials insecurely in the mobile application.

Use secure native storage appropriate for Capacitor where needed.

Follow the existing Pynwheel authentication conventions where possible.

---

# 35. PROPERTY DATA FILTERING

The API must enforce property access server-side.

Do not rely on the mobile client to hide properties.

For every property request:

```text id="rj2m0f"
Authenticated user
↓
authorization
↓
property access
↓
data
```

A user must not retrieve another property's map/tour data simply by changing a URL ID.

---

# 36. TOUR-ENABLED PROPERTY RULE

Build Your Tour should only work for a property that actually supports the Self-Guided Tour.

The API must enforce this.

Do not trust:

```text id="w8o9v2"
tour_enabled=true
```

from the client.

The server must resolve the real value.

---

# 37. SECURITY

At minimum verify:

* authentication;
* authorization;
* input validation;
* property isolation;
* stop ownership/property relationship;
* route request validation;
* SQL injection protection;
* safe error responses;
* token security;
* no password/hash exposure.

Do not log credentials or access tokens.

---

# 38. AUTOMATED TESTS

Create FastAPI backend tests for:

### Authentication

* valid Super Admin;
* invalid password;
* unknown user;
* disabled user;
* non-Super-Admin;
* missing token;
* invalid token;
* expired token.

### Properties

* authorized property list;
* unauthorized property;
* tour-enabled property;
* tour-disabled property.

### Tour Stops

* correct stop list;
* Unit included when `Show in Stops List = ON`;
* Unit excluded when OFF;
* Amenity included when ON;
* Amenity excluded when OFF;
* duplicate stop handling;
* invalid stop.

### Maps

* correct building;
* correct floor;
* correct SVG;
* correct plotted data;
* correct graph.

### Routing

* same-floor route;
* multi-floor route;
* elevator;
* stairs;
* disconnected destination;
* invalid From/To;
* multiple-stop route;
* route step descriptions;
* route distance;
* route geometry.

---

# 39. REAL-DATA TESTING

Do not rely only on fixtures or fake data.

Test against actual data for:

```text id="r7r0x7"
Hazel
John Demo
Testing 123
Jennifer Demo FP
```

and additional real properties covering:

* Self-Guided Tour enabled;
* Self-Guided Tour disabled;
* multiple buildings;
* multiple floorplates;
* existing paths;
* existing Tour Stops;
* Unit stops;
* Amenity stops;
* elevators;
* stairs;
* cross-floor routing.

Do not modify production data during testing.

Use a safe development/staging environment and verify all writes are intentional.

---

# 40. MOBILE APP INTEGRATION

Replace the dummy repository in:

```text id="73z6w1"
/Users/zubairzulifqar/pynwheel-staging/tour-app
```

with the FastAPI-backed repository.

Keep the existing repository/data-provider abstraction.

The desired transition is:

```text id="1g8ybr"
Before:
UI
↓
DummyRepository

After:
UI
↓
TourRepository
↓
FastAPIRepository
↓
FastAPI
```

Do not rewrite the entire mobile UI simply to connect the API.

Keep UI behavior intact while replacing the data source.

---

# 41. MOBILE API ERROR HANDLING

The mobile app must gracefully handle:

* authentication failure;
* expired session;
* network failure;
* property unavailable;
* no Tour Stops;
* no map;
* no route;
* backend error;
* malformed response;
* slow API.

Never crash because an API field is missing.

---

# 42. MAP LOADING

The mobile app must show proper loading states while retrieving:

* property data;
* stops;
* map;
* route.

Do not show stale map data from a previous property/floor while the new data is loading.

---

# 43. STOP-BY-STOP SCREEN FLOW

The final mobile behavior must be:

```text id="xj6f9x"
Tour Start
↓
Route step
↓
Map
↓
Instruction text
↓
Next stop
↓
Map updates
↓
Instruction text
↓
Next stop
...
↓
Final destination
```

The API should return enough route-step data for the mobile app to know:

* current stop;
* next stop;
* current floor;
* destination floor;
* distance;
* path geometry;
* transition;
* description.

---

# 44. EXACT UI EXAMPLE

The backend must support UI states like:

```text id="pkl2s0"
Walk on Floor 1

From Tour start to Fitness Centre · 1,032 px
```

followed by:

```text id="vfsr4j"
Arrive at Fitness Centre

Floor 1
```

These strings should be assembled from real route/stop data.

Do not return UI screenshots or HTML from the backend.

Return structured data and let the mobile app render it.

---

# 45. BUILD YOUR TOUR — REAL STOP SELECTION

When the user selects:

```text id="2w5h5e"
Amenities
Floorplans
```

the mobile app should retrieve actual valid destinations from the API.

The selected destination IDs should be sent back to the API for route construction.

Do not send arbitrary display names as the primary identity.

Use stable backend IDs.

---

# 46. MULTI-STOP ROUTE REQUEST

Define a stable request for multiple selected stops.

Conceptually:

```json id="fws9t6"
{
  "property_id": "...",
  "start_stop_id": "...",
  "stop_ids": [
    "...",
    "...",
    "..."
  ]
}
```

The API should validate every selected stop belongs to the selected property and is currently routable.

Determine whether selected stop ordering should come from:

* user's selection;
* existing Tour order;
* optimized route;
* existing business logic.

Do not invent a new ordering rule without investigating the current system.

---

# 47. API VERSIONING

Use an explicit API version:

```text id="us5w2q"
 /api/v1/...
```

unless the existing FastAPI/API conventions establish another versioning pattern.

The mobile app should not depend on unstable internal endpoints.

---

# 48. OBSERVABILITY

Add appropriate backend logging/monitoring for:

* authentication failures;
* API failures;
* route calculation failures;
* invalid property/stop requests.

Do not log secrets.

Keep logs useful for debugging production issues.

---

# 49. PERFORMANCE REQUIREMENTS

The API must be efficient with real Pynwheel data.

Investigate and avoid:

* N+1 database queries;
* loading all Units when only Tour Stops are needed;
* loading unrelated Amenities;
* loading every floor when one is requested;
* repeated graph reconstruction;
* repeated route calculations for the same request;
* unnecessarily large JSON responses.

Measure actual API response/query performance with real data.

---

# 50. API DOCUMENTATION

FastAPI's generated OpenAPI documentation should accurately describe:

* auth;
* properties;
* stops;
* maps;
* graph;
* routing;
* errors.

Do not leave endpoints undocumented.

Use meaningful Pydantic schemas and field descriptions.

---

# 51. NO DEMO DATA AFTER INTEGRATION

Once FastAPI integration is complete:

**the production flow of the Tour App must no longer use dummy data.**

The dummy repository may remain available for development/testing where useful, but the normal configured application path must use FastAPI.

Do not silently fall back to dummy data when the API fails.

An API failure should show a real error/loading/empty state.

---

# 52. ENVIRONMENT CONFIGURATION

Do not hardcode the FastAPI URL.

Support environment-based configuration for:

* API base URL;
* development;
* staging;
* production.

Do not commit secrets.

---

# 53. BACKWARD COMPATIBILITY

After FastAPI implementation, verify:

* Rails server still runs;
* legacy HTML pages still work;
* existing APIs still work;
* existing Map & Plotting works;
* existing Tour Setup works;
* existing path/graph data remains intact;
* existing authentication still works.

The new API must be an addition, not a replacement of the current system.

---

# 54. END-TO-END TEST

Perform the complete real-data flow:

```text id="v4n9ar"
Open Tour App
↓
Login with real Super Admin credentials
↓
Load real properties
↓
Select property
↓
Verify Self-Guided Tour capability
↓
Build Your Tour
↓
Load real Amenities / Floorplans / valid Tour Stops
↓
Select stops
↓
Request route
↓
Backend validates stops
↓
Backend resolves real graph
↓
Shortest route generated
↓
Mobile displays route
↓
User moves stop-by-stop
↓
Map changes by floor when needed
↓
Instruction text changes
↓
Arrival state shown
↓
Next stop
↓
Continue
↓
Final destination
```

Test both:

### Successful route

and:

### No-route / disconnected route

---

# 55. CROSS-FLOOR END-TO-END TEST

Where real data supports it:

```text id="xyg8zw"
Start on Floor 1
↓
Elevator / Stairs
↓
Floor 3
↓
Destination
```

Verify:

* API route contains the transition;
* mobile changes floor/map;
* instruction text changes appropriately;
* simulation continues;
* final destination is correct.

---

# 56. REAL-DATA VALIDATION

For every API response verify that:

* property name is correct;
* floor name is correct;
* stop name is correct;
* stop type is correct;
* map is correct;
* polygon/position is correct;
* path is correct;
* route is correct;
* distance is derived from real geometry;
* floor transition is correct.

Do not accept "the screen looks right" as sufficient.

Compare important values against the existing Pynwheel Map & Plotting / Tour Setup system.

---

# 57. API VS EXISTING SYSTEM CONSISTENCY

For the same property and floor:

```text id="d8r6ax"
Legacy Map & Plotting
        VS
FastAPI Tour API
```

must agree on:

* floorplates;
* plotted units;
* plotted amenities;
* paths;
* nodes;
* stops;
* elevator/stairs links.

If there is a mismatch, investigate the source of truth rather than patching the mobile UI.

---

# 58. DO NOT MODIFY THE GRAPH FROM THE MOBILE APP

The Tour App is a consumer of the Pynwheel map/wayfinding system.

The mobile application should not:

* create hallway paths;
* edit hallway paths;
* delete graph nodes;
* modify floorplates;
* create administrative Tour Stops;
* modify Unit/Amenity map placement.

Those remain admin/backend responsibilities.

The mobile app should consume the approved/current graph and route through it.

---

# 59. TOUR APP SHOULD USE PUBLISHED/APPROVED DATA

Determine from the existing backend whether the Tour App should consume:

* current draft;
* published graph;
* approved graph;
* CMS-synced graph.

Do not expose half-finished administrator edits if the existing publishing model distinguishes them.

Reuse the existing publication semantics if they exist.

---

# 60. IMPLEMENTATION DOCUMENTATION

Create/update:

```text id="nrq88s"
/Users/zubairzulifqar/pynwheel-staging/tour-app-backend-api.md
```

Document:

### FastAPI structure

* files;
* modules;
* routers;
* services;
* repositories;
* schemas;
* auth.

### Every endpoint

For each endpoint:

```text id="xmm4ib"
Method
Path
Purpose
Authentication
Authorization
Request
Response
DB/domain source
Caching
Errors
```

### Authentication flow

Document:

```text id="zjz1j1"
Mobile
↓
FastAPI login
↓
Existing Pynwheel auth source
↓
Super Admin validation
↓
Token
↓
Authenticated API requests
```

### Tour flow

Document:

```text id="0s3q9m"
Property
↓
Stops
↓
Selection
↓
Route
↓
Route steps
↓
Mobile simulation
```

### Backend → mobile mapping

Document how each API field maps to the mobile UI.

---

# 61. CONTEXT AND PROGRESS FILES

After implementation, update:

```text id="0w6z7o"
/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md
```

Append dated entries.

Do not overwrite existing history.

Document:

* FastAPI architecture;
* API endpoints;
* authentication approach;
* data sources;
* graph API;
* route API;
* mobile integration;
* testing;
* known gaps.

---

# 62. TESTING MUST BE DEEP, NOT SUPERFICIAL

Do not only test the happy path.

Test:

### Authentication

* valid credentials;
* invalid credentials;
* non-Super Admin;
* expired token;
* unauthorized property.

### Property

* enabled;
* disabled;
* missing map;
* multiple buildings.

### Stops

* no stops;
* one stop;
* many stops;
* Unit stop;
* Amenity stop;
* Additional Stop;
* elevator;
* stairs.

### Routing

* same floor;
* cross-floor;
* cross-building if supported;
* disconnected;
* invalid From;
* invalid To;
* missing graph;
* route with many nodes.

### Mobile

* API loading;
* API failure;
* route failure;
* app restart;
* logout/login;
* property change;
* repeated route creation.

---

# 63. REAL API PERFORMANCE TESTING

Measure actual:

* response time;
* DB query count;
* payload size;
* route calculation time;
* property list performance;
* Tour Stop loading;
* map loading.

Use real properties, including those with larger graphs/inventory.

Do not declare the API efficient without measuring it.

---

# 64. SECURITY TESTING

Verify:

```text id="d7k3tq"
User A token
↓
tries Property B
↓
403/404
```

Also test:

* malformed token;
* expired token;
* missing token;
* invalid stop ID;
* invalid property ID;
* stop from another property;
* route request referencing another property.

The backend must enforce these boundaries.

---

# 65. FINAL REGRESSION TEST

After everything is integrated:

### Legacy Pynwheel

Verify:

* Login;
* Companies;
* Properties;
* Property Detail;
* Inventory;
* Map & Plotting;
* Tour Setup;
* existing paths;
* existing Tour Stops.

### New Tour App

Verify:

* Login;
* Properties;
* Build Your Tour;
* real stops;
* route generation;
* route rendering;
* step-by-step navigation;
* floor changes;
* Play Route;
* logout.

No existing functionality should regress.

---

# 66. FINAL ACCEPTANCE CRITERIA

The task is complete only when:

### FastAPI

* FastAPI service runs correctly;
* API is versioned;
* schemas are typed;
* authentication is secure;
* authorization is correct;
* APIs are documented;
* errors are consistent;
* performance is acceptable.

### Data

* real Pynwheel properties;
* real Tour Stops;
* real Units/Amenities;
* real floorplates;
* real maps;
* real paths;
* real graph;
* real elevators/stairs;
* real routing.

### Mobile

* dummy repository successfully replaced by FastAPI repository;
* all important screens now show real data;
* Build Your Tour works;
* selected stops route correctly;
* route step descriptions appear correctly;
* stop-by-stop flow works;
* Play Route works;
* cross-floor routing works where supported.

### Compatibility

* Rails system unaffected;
* legacy HTML system unaffected;
* existing business logic preserved;
* existing database remains compatible.

---

# 67. FINAL REPORT

At the end provide:

```text id="x9v6kd"
## 1. FastAPI Architecture

## 2. Authentication Architecture

## 3. Authorization

## 4. Property API

## 5. Tour Stop API

## 6. Map API

## 7. Graph API

## 8. Routing API

## 9. Route-Step / Simulation API

## 10. Mobile Integration

## 11. Existing Rails Logic Reused

## 12. Database/Data Sources

## 13. Files Added/Changed

## 14. Tests Added

## 15. Real Properties Tested

## 16. API Performance Results

## 17. Security Tests

## 18. Legacy Regression Results

## 19. Known Gaps

## 20. Documentation Updated
```

For every endpoint explicitly state:

```text id="m2j9qk"
Endpoint
↓
FastAPI router
↓
Service
↓
Repository / existing Rails/domain source
↓
DB
↓
Response schema
↓
Mobile UI
```

Do not claim an endpoint is production-ready unless it has actually been tested.

---

# FINAL ARCHITECTURE PRINCIPLE

The intended long-term architecture is:

```text id="q6x8t4"
                 ┌───────────────┐
                 │ Legacy Rails  │
                 │ HTML / ERB    │
                 └───────┬───────┘
                         │
                         │
              Existing Pynwheel
              DB + Domain Logic
                         │
                         │
                  ┌──────▼───────┐
                  │   FastAPI    │
                  │  Tour API    │
                  └──────┬───────┘
                         │
                         │
                  ┌──────▼───────┐
                  │ Capacitor    │
                  │ Tour App     │
                  │ iOS/Android  │
                  └──────────────┘
```

The FastAPI layer should expose a **stable domain-level API**, not expose the Rails database schema directly.

The Tour App should consume:

```text id="9w31cg"
Properties
+
Tour Stops
+
Maps
+
Graph
+
Routing
+
Route Steps
```

and should be able to provide:

```text id="5e0axr"
Select Property
↓
Build Your Tour
↓
Select real stops
↓
Find route
↓
Move stop-by-stop
↓
Show map + instruction
↓
Change floor when necessary
↓
Arrive
↓
Continue
↓
Play Route / simulation
```

**Do not create a parallel Pynwheel business system in FastAPI.**

**Do not break the existing Rails/HTML application.**

**Do not hardcode real properties, stops, routes, distances, or credentials.**

**Use the existing Pynwheel source of truth, expose it safely through FastAPI, integrate the existing Capacitor Tour App, and validate the entire flow with real data before declaring the implementation complete.**

# CRITICAL PRODUCTION BACKEND IMPLEMENTATION

## Map & Plotting + Tour Setup for the New Next.js UI

You are implementing the **production backend** for the new Next.js **Map & Plotting** and **Tour Setup** experience.

This is a **backend-critical production task**.

The implementation must be based on the existing Rails application, existing database, existing models, existing services, existing business rules, and the architecture already documented in the project.

The new backend must support the new Next.js UI completely and correctly while the existing legacy HTML/ERB system continues to work exactly as it does today.

---

# 0. NON-NEGOTIABLE REQUIREMENTS

These requirements override convenience and implementation speed.

### Legacy system must remain fully functional

The current HTML/ERB system is working correctly.

**Do not break, alter, regress, or change its behavior.**

The new implementation must be:

- backward compatible;
- additive wherever possible;
- isolated where necessary;
- compatible with existing records;
- compatible with existing services/business logic;
- safe for existing users.

After every significant backend change, verify that the legacy flow still works.

---

### Use the existing architecture as the source of truth

Before changing anything, read these files completely:

```text
/Users/zubairzulifqar/pynwheel-staging/backend_architecture_plan_report.md

/Users/zubairzulifqar/pynwheel-staging/start-the-planing-task-logical-papert.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/react-architecture.md

/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md
```

Also inspect:

```text
/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html

/Users/zubairzulifqar/pynwheel-staging/pyn-connect-new.html
```

The first HTML file is the target/improved UI.

The second HTML file is the legacy UI/reference.

The architecture documents above are the basis for the backend implementation strategy.

**Do not invent a new architecture before understanding these documents and the existing Rails codebase.**

---

# 1. THIS IS AN IMPLEMENTATION TASK — NOT A NEW ARCHITECTURE EXERCISE

The architecture plan has already been created.

Your job now is to:

1. Read and validate the architecture plan against the actual repository.
2. Inspect the real current Rails implementation.
3. Resolve any mismatch between the plan and actual code.
4. Implement the backend required by the new Next.js UI.
5. Preserve the existing legacy system.
6. Test the entire implementation with real DB data.

If the architecture document proposes something that does not match the actual code, **do not blindly follow the document**.

Investigate the real implementation first.

Then make the smallest safe correction and document it.

---

# 2. FIRST: CREATE A PRE-IMPLEMENTATION BACKEND INVENTORY

Before modifying code, inspect the actual Rails codebase and identify the real implementation of:

### Map/Floor data

- Property
- Building
- Floorplate
- Floor/floor range
- SVG
- Background
- Units
- Amenities
- existing polygon/map data

### Path/graph data

- Nodes
- Hallways
- Edges
- Connections
- plotted paths
- detected paths
- manual paths
- graph relationships

### Tour data

- Tour Stops
- stop types
- elevator stops
- stairs stops
- additional stops
- stop-to-map relationships
- stop-to-path relationships

### Wayfinding

- shortest path
- routing
- auto wayfinding
- route generation
- cross-floor connections
- cross-building connections

### Existing business logic

Inspect:

- controllers;
- models;
- service objects;
- concerns;
- queries/scopes;
- serializers;
- decorators/presenters;
- background jobs;
- callbacks;
- validations;
- authorization;
- sync/import code;
- CMS integration;
- routes;
- migrations;
- schema.

Create the implementation map internally before coding:

```text
Next.js UI action
        ↓
New/Existing API endpoint
        ↓
Controller
        ↓
Service/domain logic
        ↓
Model(s)
        ↓
Database
```

The implementation must reuse existing domain/business logic wherever possible.

---

# 3. DO NOT DUPLICATE BUSINESS LOGIC IN NEXT.JS

The Next.js UI must not become the owner of business rules.

The Rails backend/domain layer must remain authoritative for:

- graph persistence;
- stop persistence;
- path validation;
- relationship validation;
- permissions;
- routing semantics;
- cross-floor relationships;
- cross-building relationships;
- business rules;
- data integrity.

Next.js should be responsible for:

- UI state;
- user interaction;
- local editing state;
- API calls;
- presentation.

Do not move existing business rules into React.

---

# 4. IMPLEMENT THE BACKEND FOR THE CURRENT NEXT.JS MAP & PLOTTING UI

The backend API must support the actual current UI, including all existing Map & Plotting functionality.

The UI currently needs to represent:

```text
Map & Plotting

Building
Floorplate

Plotting
Wayfinding

Detect Hallways / Detect Paths

Units
Amenities
Additional Stops

Nodes
Paths
Connections

Elevators
Stairs

Shortest Path
Play/route simulation support
```

The backend response should provide the data required by the UI without forcing the frontend to reconstruct the Rails database model.

---

# 5. MAP DATA API

Implement/read the existing appropriate API architecture for the new UI.

The API must provide enough information for the Map & Plotting page to render the real map.

At minimum support the real data needed for:

- property;
- building;
- floorplate;
- floor;
- floor range;
- SVG;
- background;
- unit polygons;
- amenity polygons;
- plotted state;
- existing path data;
- graph nodes;
- graph edges;
- stops;
- stop connections;
- vertical connections.

Do not hardcode:

- property IDs;
- building names;
- floor names;
- unit IDs;
- amenity IDs;
- counts;
- path counts;
- stop counts.

Everything must come from real DB data.

---

# 6. DETECT HALLWAYS / DETECT PATHS

The current UI has:

```text
Detect hallways on

This floorplate
1 · Floor 1

All floorplates in 1
5 floorplates
```

Implement the backend behavior according to the architecture plan and actual existing business logic.

## CRITICAL RULE

An existing persisted hallway graph must **never be silently overwritten by automatic detection**.

If a floorplate already has persisted paths:

```text
Existing DB paths
        ↓
Detect Hallways
        ↓
Existing persisted paths remain
```

The detection process may add or derive additional paths according to the approved architecture, but it must not destroy existing persisted mappings.

---

# 7. DETECT HALLWAYS MUST BE SAFE AND IDEMPOTENT

Running Detect Hallways repeatedly must not:

- duplicate nodes;
- duplicate edges;
- duplicate bridges;
- duplicate stop connections;
- move existing persisted nodes;
- remove existing persisted paths;
- corrupt graph relationships.

For example:

```text
Detect Hallways
↓
Persist result
↓
Detect Hallways again
↓
Same logical graph
```

The implementation must be idempotent.

Test repeated detection explicitly.

---

# 8. USER DELETION MUST BE DISTINGUISHABLE FROM AUTOMATIC DETECTION

This is critical.

Consider:

```text
Existing persisted hallway
↓
User explicitly deletes it
↓
Detect Hallways runs again
```

The deleted path must not automatically reappear simply because the detector cannot see it anymore.

Determine how the existing domain model can safely represent:

- generated;
- manual;
- persisted;
- deleted;
- user-modified;
- user-approved;
- regenerated.

If the current schema cannot represent this safely, implement the **minimum additive change** required.

Do not replace the existing path system.

---

# 9. AUTO-CONNECT

There should be no separate dependency on an `Auto-Connect Paths` UI action if the current Next.js UI expects connection to occur as part of Detect Hallways.

The backend must support the intended flow:

```text
Detect Hallways
↓
detect/derive paths
↓
auto-connect where required
↓
return resulting graph
```

Do not create duplicate connections on repeated runs.

Do not modify unrelated persisted paths.

---

# 10. COMPLETE GRAPH PERSISTENCE

The backend must be able to persist the graph represented by the new UI.

Determine from the actual DB architecture whether existing structures already support:

### Nodes

- stable ID;
- floorplate;
- building;
- coordinates;
- type;
- metadata.

### Paths/edges

- source node;
- destination node;
- floorplate;
- geometry;
- edge type;
- directionality if applicable.

### Plot connections

- unit → graph;
- amenity → graph;
- stop → graph.

### Vertical connections

- elevator;
- stairs;
- other supported vertical connectors.

### State

- created;
- updated;
- deleted;
- detected;
- manual;
- persisted;
- user-approved.

Prefer existing tables/relationships when they can safely represent these concepts.

Only add schema when the existing DB genuinely cannot support the requirement.

---

# 11. DO NOT STORE THE GRAPH AS OPAQUE JSON WITHOUT INVESTIGATION

Do not introduce a giant serialized graph blob simply because it is easy to implement.

First determine whether the current application already stores individual graph entities.

The architecture must preserve the ability to:

- edit one node;
- delete one edge;
- reconnect one stop;
- query one floor;
- query one building;
- calculate routes;
- expose data to the Tour App;
- maintain legacy compatibility.

If an existing JSON/JSONB representation is already the domain source of truth, evaluate whether it is safe to extend rather than introducing unnecessary normalized tables.

Use evidence from the existing repository.

---

# 12. MANUAL GRAPH EDITING

The new UI supports manual graph editing.

Backend support must correctly handle the relevant UI actions:

- add node;
- move node;
- delete node;
- add path;
- edit path;
- split path;
- delete path;
- reconnect;
- add bridge;
- delete bridge.

Trace every operation to existing Rails domain logic.

Do not implement separate business logic for each UI button if a shared graph service can safely handle them.

---

# 13. GRAPH UPDATE MUST BE TRANSACTIONAL

When saving a graph change that affects multiple records, use the appropriate Rails transaction boundary.

For example:

```text
Graph update
    ↓
Transaction
    ├── nodes
    ├── edges
    ├── connections
    ├── stop relationships
    └── vertical links
```

The final state must never be partially persisted.

If one part fails:

```text
ROLLBACK
```

and the graph remains valid.

Reuse existing transactional services where available.

---

# 14. TOUR STOPS — REAL BACKEND IMPLEMENTATION

The new UI must support the **Tour Setup** page completely.

The following current sections must be backed by real DB data:

```text
Additional Stops
51

Elevators & Locks
3

Routing
6

Tour Stops
```

The numbers above are examples/current UI expectations.

**Do not hardcode them.**

Calculate/read them from the real DB.

If actual DB values differ, display the actual values.

---

# 15. ADD STOP MUST WORK PROPERLY

Implement the new UI's:

**Add Stop**

action.

The backend must support the complete lifecycle:

```text
Add Stop
↓
Validate
↓
Persist
↓
Associate with property
↓
Associate with building/floorplate where applicable
↓
Make available to Map & Plotting
↓
Make available to Tour Setup
↓
Make available to Wayfinding
```

Use the existing Tour Stop/domain model and business logic whenever possible.

Do not create a parallel stop system.

---

# 16. STOP TYPES

The new UI may expose stop types such as:

```text
Entry Point
Exit Point
Elevator
Stairs
Ramp
Door/Gate
Blocker
Leasing Office
Restroom
Mail & Packages
Parking Access
Waypoint
```

Do **not** assume all these are currently supported identically.

For each type:

1. Identify the existing representation.
2. Identify the existing business rules.
3. Identify the current routing behavior.
4. Identify required persistence fields.
5. Extend only where necessary.
6. Preserve existing behavior.

The implementation must define explicit backend semantics for each supported stop type.

Do not silently treat every stop as an ordinary hallway node.

---

# 17. STOP ROUTING SEMANTICS

The backend must correctly model how each stop affects Wayfinding.

Examples:

### Entry/Exit

Can be a routing origin/destination where supported.

### Unit/Amenity stop

Can be a destination connected to the graph.

### Elevator

Must support vertical routing between appropriate floorplates.

### Stairs

Must support vertical routing between appropriate floorplates.

### Ramp

Must follow existing domain semantics.

### Blocker

Must not become traversable simply because it exists as a stop.

### Normal destination stops

Must be routable according to the existing domain rules.

**Do not invent routing behavior.**

Use the current business logic wherever it exists.

Where the current system has no defined semantic, document the gap and implement the safest compatible behavior required by the UI.

---

# 18. UNITS AND AMENITIES — ONLY ONE EDIT MAY PERSIST

This requirement is extremely important.

For Units and Amenities, the new UI may display many fields/actions, but **the only field that may update the backend through this new UI is:**

```text
Show in Stops List
```

Everything else must remain read-only.

No other Unit/Amenity edit should mutate the database.

---

# 19. SHOW IN STOPS LIST — UNIT

When the user changes:

```text
Show in Stops List
```

for a Unit:

### ON

The backend must persist the state so that:

```text
Unit
↓
is included as a stop in the Self-Guided Tour
↓
appears on Tour Setup → Tour Stops
↓
is available to Map & Plotting / Wayfinding
↓
can participate in routing where appropriate
```

### OFF

Use the existing domain behavior to remove/unlink it from the Self-Guided Tour stop list safely.

Do not leave orphaned stop relationships.

Do not delete the underlying Unit.

Do not mutate unrelated Unit data.

---

# 20. SHOW IN STOPS LIST — AMENITY

When the user changes:

```text
Show in Stops List
```

for an Amenity:

### ON

The backend must persist the state so that:

```text
Amenity
↓
is included as a Self-Guided Tour stop
↓
appears on Tour Setup → Tour Stops
↓
is available to Map & Plotting / Wayfinding
↓
can participate in routing where appropriate
```

### OFF

Use the existing domain behavior to remove/unlink it safely from the stop list.

Do not delete the underlying Amenity.

Do not modify unrelated Amenity fields.

---

# 21. SHOW IN STOPS LIST MUST BE IDEMPOTENT

Repeatedly turning the setting ON must not create duplicate Tour Stops.

For example:

```text
OFF
→ ON
→ ON
→ ON
```

must result in exactly one logical stop.

Similarly:

```text
ON
→ OFF
→ OFF
```

must not produce errors or duplicate deletion behavior.

Use unique relationships/constraints/business logic where the existing system supports them.

If the current system lacks a safe uniqueness rule, determine the minimum additive solution.

---

# 22. UNIT/AMENITY STOP IDENTITY

Do not create a second unrelated stop record every time a Unit/Amenity toggle is turned on.

Determine how the existing system can represent the relationship:

```text
Unit/Amenity
       ↓
Tour Stop
```

The stop must remain traceable to its source entity.

This is important for:

- editing;
- rendering;
- disabling;
- deleting;
- routing;
- API responses;
- legacy compatibility.

---

# 23. MAP ↔ TOUR SETUP SYNCHRONIZATION

The backend must ensure Map & Plotting and Tour Setup see the same source of truth.

For example:

```text
Unit → Show in Stops List ON
        ↓
Tour Stop exists
        ↓
Tour Setup shows it
        ↓
Map & Plotting can plot/connect it
        ↓
Wayfinding can route to it
```

Similarly:

```text
Additional Stop created
        ↓
Tour Setup
        ↓
Map & Plotting
        ↓
Wayfinding
```

Do not create separate independent copies of the same stop.

---

# 24. ELEVATORS, STAIRS, LOCKS

Implement the backend support required by the current:

```text
Elevators & Locks
```

section.

Inspect the current Rails system for:

- elevator relationships;
- stairs;
- floor connections;
- lock records;
- access-control relationships;
- existing Tour Setup behavior.

Do not invent a separate lock/elevator model if one already exists.

The new API must expose enough information for the Next.js UI to display and use these existing records.

---

# 25. ROUTING

Implement the backend support required by:

```text
Routing
6
```

again using actual DB data and existing domain logic.

Do not hardcode the count.

Inspect the existing auto-wayfinding/routing system and determine:

- what routing configuration exists;
- what records represent it;
- how it is consumed;
- what the new UI requires;
- what needs to be exposed through the API.

---

# 26. SHORTEST PATH

The backend implementation must support the current Next.js Wayfinding UI:

```text
From
Main Entrance
Lobby

To
Parking Access
Lobby

Find Shortest Path
```

The system must use the real persisted graph.

Do not hardcode routes.

The final architecture should allow:

```text
From
↓
resolve graph node/stop
↓
To
↓
resolve graph node/stop
↓
route graph
↓
shortest path
↓
ordered route
```

Reuse the existing pathfinding service/algorithm if one exists and is suitable.

If the POC contains the current algorithm, compare it with production Rails behavior before adopting it.

---

# 27. CROSS-FLOOR AND CROSS-BUILDING ROUTING

The backend must support:

```text
Elevator
Stairs
```

as graph transitions where applicable.

A route may need to go:

```text
Building A
Floor 1
↓
Elevator
↓
Floor 3
↓
Hallway
↓
Stairs
↓
Floor 4
```

Do not fake floor transitions in the frontend.

The persisted graph/API must represent real connections.

---

# 28. PLAY ROUTE / TOUR APP DATA

One of the main goals of this backend is to provide map and route information to the **Tour App**.

The mobile application must be able to receive enough information to:

- render the floor/map;
- render units;
- render amenities;
- render stops;
- render hallways;
- render paths;
- render nodes;
- understand floor/building transitions;
- calculate or consume shortest paths;
- simulate route progression.

The API must expose a stable, documented representation.

---

# 29. TOUR APP API MUST NOT EXPOSE INTERNAL DB COMPLEXITY

Do not force the mobile application to understand the Rails database schema.

The API should expose domain-level concepts such as:

```text
property
building
floor
floorplate
map
nodes
edges
units
amenities
stops
vertical connections
route
```

The mobile application should not need to know:

- internal join-table names;
- Rails implementation details;
- legacy controller quirks;
- database-specific structures.

---

# 30. PLAY ROUTE / SIMULATION DATA

The Tour App must eventually support:

```text
From
↓
To
↓
Find Shortest Path
↓
Play Route
↓
point-by-point / stop-by-stop navigation
```

The API/graph representation must therefore preserve enough information to build an ordered route:

```text
Start
→ node
→ edge
→ node
→ edge
→ floor transition
→ node
→ destination
```

If the existing graph does not contain enough geometry for animation/simulation, identify exactly what is missing and implement the minimum additive representation necessary.

Do not generate fake coordinates.

---

# 31. API VERSIONING / ISOLATION

The new Next.js/Tour App APIs must be isolated from the legacy controllers where necessary.

Do not alter legacy HTML endpoints merely to make React work.

Prefer:

```text
Existing legacy endpoints
        ↓
remain unchanged
```

and:

```text
New React/Tour APIs
        ↓
new or explicitly supported JSON endpoints
```

using the project's existing API conventions.

If an existing controller can safely serve both formats without altering legacy behavior, reuse it carefully.

Every change must be checked for legacy impact.

---

# 32. AUTHORIZATION MUST REMAIN IN RAILS

Do not weaken or bypass existing authorization to support the new UI.

The new APIs must use the appropriate current authorization mechanism.

Verify:

- read access;
- graph edit access;
- stop create/update/delete access;
- Unit/Amenity stop-list permission;
- Tour App read access.

Do not expose unrestricted map data simply to make development easier.

---

# 33. DATABASE CHANGES

Use the current DB structure whenever possible.

If a schema change is genuinely required:

### It must be additive.

Prefer:

- new table;
- new nullable column;
- new relation;
- new index;
- compatibility field.

Avoid:

- removing columns;
- renaming existing columns without compatibility;
- deleting existing tables;
- destructive migrations;
- changing meaning of existing data.

For every migration provide:

```text
Purpose
Existing data impact
Backfill strategy
Default behavior
Legacy compatibility
Rollback strategy
```

Do not run destructive migrations against existing production-style data.

---

# 34. LEGACY COMPATIBILITY TESTING

This is a hard acceptance criterion.

After backend implementation, verify the existing HTML system still works for:

- loading properties;
- loading floorplates;
- loading map data;
- loading existing plotted units;
- loading amenities;
- loading existing paths;
- loading Tour Setup;
- loading existing stops;
- existing map plotting;
- existing wayfinding where applicable.

If the legacy system writes any of these records, verify that the new Next.js implementation continues to understand those records.

If the new backend writes any records, verify that the legacy system does not crash or misinterpret them.

---

# 35. REAL-DATA TEST MATRIX

Do not test only one property.

Test using real records including:

```text
Hazel
John Demo
Testing 123
Jennifer Demo FP
```

and other real properties covering:

- Self-Guided Tour enabled;
- Self-Guided Tour disabled;
- one building;
- multiple buildings;
- multiple floorplates;
- existing DB paths;
- no existing paths;
- plotted units;
- unplotted units;
- plotted amenities;
- unplotted amenities;
- existing Tour Stops;
- no Tour Stops;
- elevators;
- stairs;
- cross-floor routing;
- different floor ranges.

Do not assume these records have identical data.

Inspect actual DB values.

---

# 36. SPECIFIC TEST — UNITS / AMENITIES

Test real data such as the current Unit/Amenity datasets.

For Units:

- load the real list;
- verify plotting state;
- open edit;
- verify only `Show in Stops List` can persist;
- change ON;
- verify Tour Stop appears;
- verify Map/Wayfinding can see it;
- change OFF;
- verify stop relationship is removed safely;
- verify no unrelated Unit fields changed.

Repeat the same flow for Amenities.

---

# 37. SPECIFIC TEST — ADD STOP

For every supported Add Stop type that the current system supports, test:

```text
Open Add Stop
↓
Enter valid data
↓
Submit
↓
DB record created
↓
Tour Setup shows it
↓
Map & Plotting can find it
↓
Wayfinding can use it where applicable
```

Also test invalid data and verify:

- validation errors;
- no partial records;
- no orphan relationships;
- no broken graph.

---

# 38. SPECIFIC TEST — DETECT HALLWAYS

Test on a floorplate with existing DB paths:

```text
Load DB graph
↓
Record baseline
↓
Detect Hallways
↓
Compare graph
```

Verify:

- old persisted paths remain;
- existing nodes remain;
- no unexpected deletions;
- no unexpected movement;
- no duplicate paths;
- no duplicate nodes.

Run Detect Hallways again.

Verify idempotency.

Then explicitly delete/edit a path according to the supported user workflow.

Run Detect Hallways again.

Verify the result follows the defined user-deletion semantics.

---

# 39. SPECIFIC TEST — GRAPH SAVE

Test a realistic editing session:

```text
Load floor
↓
Move node
↓
Add node
↓
Add path
↓
Delete path
↓
Create unit bridge
↓
Delete unit bridge
↓
Connect stop
↓
Delete stop bridge
↓
Save
```

Verify the final DB state exactly matches the intended graph.

Then reload the page from scratch and verify the graph is reconstructed correctly from DB.

---

# 40. SPECIFIC TEST — SHORTEST PATH

Test:

```text
From Main Entrance
To Parking Access
```

and at least one cross-floor route where real data allows it.

Verify:

- valid route;
- correct ordered nodes/edges;
- correct floor transitions;
- no fake edges;
- no disconnected route segments;
- no duplicate nodes;
- route remains valid after graph editing.

Then test a disconnected destination and verify a correct "no route" response.

---

# 41. API CONTRACT TESTING

For each new API:

Test:

- success;
- missing resource;
- invalid property;
- invalid floorplate;
- invalid node;
- invalid stop;
- unauthorized request;
- forbidden request;
- malformed payload;
- duplicate request;
- stale data/version if supported;
- transaction failure;
- empty result.

Verify correct:

- HTTP status;
- JSON structure;
- validation errors;
- authorization behavior.

Do not return Rails/database implementation details in API errors.

---

# 42. N+1 / PERFORMANCE TESTING

Use real properties with large datasets.

Check:

- number of SQL queries;
- eager loading;
- duplicate queries;
- payload size;
- graph loading time;
- floor-specific loading;
- Tour Setup loading;
- shortest-path performance.

Do not load the entire property's inventory when a single floorplate is requested unless the existing architecture explicitly requires it.

Avoid loading hundreds of unrelated Units/Amenities simply to render Map & Plotting.

---

# 43. CONCURRENCY / DATA SAFETY

Consider:

```text
Legacy UI editing a map
+
Next.js UI editing the same map
```

and:

```text
Next.js UI editing
+
another admin editing
```

Determine whether the existing architecture requires:

- optimistic locking;
- version checking;
- timestamps;
- conflict detection.

Do not silently allow newer edits to overwrite newer data with stale data.

Use existing Rails mechanisms where possible.

---

# 44. NO SILENT DATA DESTRUCTION

Never use code such as:

```ruby
destroy_all
delete_all
replace(...)
```

against an existing graph unless the current business logic explicitly requires it and the operation has been proven safe.

Especially prohibit destructive behavior during:

- Detect Hallways;
- Auto-connect;
- graph synchronization;
- stop synchronization;
- API serialization;
- floor switching;
- graph regeneration.

Any destructive operation must be an explicit, validated user action governed by the backend domain rules.

---

# 45. CODE STRUCTURE

Before adding new services/models/controllers:

Search for existing implementations.

Prefer:

```text
Existing service
    ↓
extend safely
```

over:

```text
New duplicate service
    ↓
parallel business logic
```

If a new service is necessary, its responsibility must be narrow and documented.

Controllers should remain thin.

Business logic should stay in services/domain/models according to the existing architecture.

---

# 46. TESTING THE LEGACY SYSTEM AFTER EVERY HIGH-RISK CHANGE

After changes to:

- models;
- associations;
- services;
- graph persistence;
- Tour Stop persistence;
- path logic;
- controllers used by both systems;

immediately run focused legacy tests/flows before proceeding.

Do not wait until the end to discover that legacy functionality was broken.

---

# 47. UPDATE THE ARCHITECTURE/IMPLEMENTATION DOCUMENTATION

After implementation, create:

```text
/Users/zubairzulifqar/pynwheel-staging/map_plotting_backend_implementation.md
```

This document must explain **every backend addition** and its relationship to the new UI.

For every added/changed file include:

```text
File
Purpose
Why it was changed
Existing code reused
New behavior
UI feature supported
Database impact
Legacy impact
Tests
```

---

# 48. REQUIRED UI → BACKEND FLOW DOCUMENTATION

The implementation document must include explicit flow diagrams such as:

```text
Map & Plotting
    ↓
Next.js API request
    ↓
Rails Controller
    ↓
Service / Domain Logic
    ↓
Model
    ↓
Database
    ↓
JSON response
    ↓
Next.js Map
```

Also:

```text
Show in Stops List
    ↓
Next.js mutation
    ↓
Rails Controller
    ↓
existing/new Tour Stop service
    ↓
Unit/Amenity relationship
    ↓
DB
    ↓
Tour Setup
```

And:

```text
Find Shortest Path
    ↓
Wayfinding API/service
    ↓
Persisted graph
    ↓
Pathfinding algorithm
    ↓
ordered route
    ↓
Next.js / Tour App
```

Document every important flow.

---

# 49. DOCUMENT ALL EXISTING VS NEW CODE

The final implementation document must clearly separate:

### Reused

Existing models/services/controllers/business logic.

### Modified

Existing code changed for compatibility/extension.

### Added

New API/service/model/schema code.

### Deprecated

Anything that is no longer required.

Do not remove legacy functionality unless explicitly proven unnecessary and safe.

---

# 50. DO NOT CHANGE LEGACY UI CODE

Do not modify the old HTML/ERB implementation merely to make the new backend work.

If an existing backend response is consumed by the legacy UI, preserve its existing response shape/behavior.

Add JSON/API behavior alongside it where appropriate.

---

# 51. VERIFY THE ACTUAL DATABASE AFTER WRITES

Do not rely only on the React UI after mutation.

For every backend write test:

1. perform action in Next.js;
2. verify API response;
3. verify DB record;
4. reload Next.js;
5. verify UI;
6. verify Tour Setup/Wayfinding;
7. verify legacy UI;
8. verify no unrelated DB records changed.

For graph operations, inspect the complete affected record set.

---

# 52. WRITE-SCOPE SAFETY

The new Next.js backend should mutate only the records necessary for the requested operation.

Examples:

### Unit Show in Stops List

Allowed:

```text
Unit ↔ Tour Stop relationship
```

Not allowed:

```text
Unit price
Unit availability
Unit floorplan
Unit images
Unit provider data
```

### Amenity Show in Stops List

Allowed:

```text
Amenity ↔ Tour Stop relationship
```

Not allowed:

```text
Amenity name
Amenity description
Amenity images
Amenity provider data
```

### Graph edit

Allowed:

```text
specific nodes/edges/connections being edited
```

Not allowed:

```text
unrelated floorplates
other properties
other units/amenities/stops
```

---

# 53. PRODUCTION BUILD / TEST SUITE

Run the appropriate:

- Rails tests;
- model tests;
- service tests;
- request/controller tests;
- integration tests;
- API tests;
- lint/static analysis;
- Next.js type checks/build where relevant.

Add focused tests for all new backend behavior.

Do not rely exclusively on manual browser testing.

---

# 54. REQUIRED REGRESSION TESTS

At minimum verify:

### Legacy

- existing map loads;
- existing paths load;
- existing stops load;
- existing tour setup loads;
- existing wayfinding remains functional.

### New Next.js

- Map & Plotting loads;
- Detect Hallways works;
- graph persists;
- manual edits persist;
- deletion persists;
- Tour Stops load;
- Add Stop works;
- Unit stop toggle works;
- Amenity stop toggle works;
- Elevator/Stairs relationships work;
- shortest path works;
- cross-floor route works;
- Tour App API returns complete graph.

---

# 55. REAL-DATA ACCEPTANCE MATRIX

Test multiple real properties and record results:

```text
Property                Tour Enabled   Map Data   Paths   Stops   Cross-floor
--------------------------------------------------------------------------------
Hazel                    verify         verify     verify  verify  verify
John Demo                verify         verify     verify  verify  verify
Testing 123              verify         verify     verify  verify  verify
Jennifer Demo FP         verify         verify     verify  verify  verify
Other tour-enabled       verify         verify     verify  verify  verify
Other tour-disabled      verify         verify     verify  verify  verify
```

Do not fill these with assumptions.

Populate the final report from actual test results.

---

# 56. IMPORTANT: TOUR-DISABLED PROPERTIES

For properties where Self-Guided Tour is disabled:

- do not fabricate Tour Stops;
- do not incorrectly show them as tour-enabled;
- do not create stops simply because a Unit/Amenity exists;
- do not expose invalid routing state.

For properties where Self-Guided Tour is enabled:

- the relevant stop functionality must work.

The backend must use the real existing product/capability configuration.

---

# 57. FINAL DATA-INTEGRITY CHECK

After testing, verify that no unrelated records were modified.

For a mutation test:

```text
Before
↓
capture affected IDs/counts
↓
perform operation
↓
After
↓
compare
```

Verify that only intended rows/relationships changed.

Pay special attention to:

- path records;
- nodes;
- stops;
- unit/amenity records;
- floorplates;
- cross-floor relationships.

---

# 58. FINAL GIT REVIEW

Before completion:

- inspect `git diff`;
- inspect all changed Rails files;
- inspect migrations;
- inspect routes;
- inspect controllers;
- inspect services;
- inspect models;
- inspect tests.

Verify:

- no unrelated refactor;
- no destructive migration;
- no demo data;
- no hardcoded production values;
- no legacy behavior changes;
- no temporary debug code;
- no console logging containing sensitive production data;
- no dead endpoints;
- no unused services.

---

# 59. FINAL ACCEPTANCE CRITERIA

This task is complete only when all of the following are true:

### Backend

- Map & Plotting has complete required backend support.
- Tour Setup has complete required backend support.
- Detect Hallways is persistent and safe.
- Existing paths are not silently overwritten.
- Graph edits persist correctly.
- Graph deletion persists correctly.
- Unit/Amenity stop-list behavior persists correctly.
- Add Stop works.
- Stop types work according to actual business rules.
- Elevators/Stairs work.
- Routing works.
- Shortest Path works.
- Tour App API exposes the required graph.
- Transactions protect graph consistency.
- Authorization is preserved.

### Legacy

- Existing HTML system still works.
- Existing map behavior still works.
- Existing Tour Setup behavior still works.
- Existing path data remains readable.
- Existing stops remain readable.
- Existing business logic remains intact.

### Data

- Real DB data is used.
- No hardcoded/demo data.
- No orphan records introduced.
- No unexpected records modified.
- No duplicate paths/stops created.

### Quality

- automated tests pass;
- focused integration tests pass;
- real-data tests pass;
- production build/checks pass;
- no known critical issue remains.

---

# 60. FINAL REPORT

At the end, provide a concise but technically complete report with:

```text
## 1. Implementation Summary

## 2. Existing Backend Reused

## 3. Backend Files Changed

## 4. Models Changed

## 5. Services Added/Changed

## 6. Controllers/APIs Added/Changed

## 7. Database Changes

## 8. Detect Hallways Persistence Design

## 9. Graph Persistence Design

## 10. Tour Stop Persistence Design

## 11. Unit/Amenity "Show in Stops List" Flow

## 12. Elevator/Stairs/Cross-Floor Design

## 13. Shortest Path Design

## 14. Tour App API

## 15. Legacy Compatibility Verification

## 16. Real Properties Tested

## 17. Automated Tests

## 18. Manual UI → Backend Tests

## 19. DB Integrity Verification

## 20. Performance Results

## 21. Known Gaps / Limitations

## 22. Rollback / Safety Notes
```

---

# 61. IMPLEMENTATION DOCUMENT — MANDATORY CONTENT

The file:

```text
/Users/zubairzulifqar/pynwheel-staging/map_plotting_backend_implementation.md
```

must specifically document:

### Every backend file added/changed

For example:

```text
controllers/...
services/...
models/...
serializers/...
queries/...
routes/...
migrations/...
tests/...
```

For each:

```text
Purpose
UI relationship
Business logic relationship
DB relationship
Legacy relationship
```

### Every API

Document:

```text
Method
Path
Purpose
Request
Response
Authorization
Validation
Transaction
DB records affected
Legacy compatibility
```

### Every mutation

Document:

```text
UI action
↓
API
↓
Controller
↓
Service
↓
Model
↓
DB
↓
Related entities
```

---

# 62. VERY IMPORTANT — DO NOT CLAIM SUCCESS WITHOUT EVIDENCE

Do not say:

- "implemented";
- "working";
- "production-ready";
- "legacy-safe";
- "tested";

unless you actually verified it.

Where something could not be tested, explicitly state:

```text
NOT VERIFIED
```

and explain why.

---

# 63. FINAL PRINCIPLE

The goal is **not** to build a second map/wayfinding backend.

The goal is to safely evolve the existing Pynwheel backend so that:

```text
                    ┌── Legacy HTML/ERB system
                    │
Existing Rails DB ← Rails domain/business logic
                    │
                    ├── Next.js Map & Plotting
                    │
                    ├── Next.js Tour Setup
                    │
                    └── Tour App API
```

all operate against a coherent, validated source of truth.

The existing HTML system must continue to function.

The new Next.js system must gain the complete persistence and API capabilities it needs.

The Tour App must be able to consume the same map/graph/stop information and reproduce the routing experience.

**Do not optimize for the easiest implementation. Optimize for correctness, backward compatibility, data integrity, maintainability, and production safety.**

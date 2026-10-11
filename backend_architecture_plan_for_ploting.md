# CRITICAL BACKEND ARCHITECTURE TASK — DO NOT CODE YET

We need to design a **robust, production-safe backend persistence and API plan** for the new Next.js Map & Plotting / PlottingWayfinding / Detect Paths / Wayfinding system.

This is a **planning and investigation task first**.

## VERY IMPORTANT

**Do not start implementing code, migrations, models, controllers, services, or APIs yet.**

First investigate the existing Rails application, database structure, services, models, controllers, jobs, serializers, routes, and business logic.

The objective is to produce a detailed implementation plan that tells us exactly:

* what we can reuse;
* what already exists;
* what must be extended;
* what must not be changed;
* how the new Next.js UI will persist its graph and edits;
* how the existing legacy HTML/ERB system will remain fully functional;
* how the Tour App will consume the saved map/path graph through APIs;
* how shortest-path calculation and route simulation will work from the persisted data.

Do not guess the current DB design.

Everything must be based on the actual repository and actual database/application code.

---

# 1. Read the project context first

Before investigating the backend, read:

* `/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`
* `/Users/zubairzulifqar/pynwheel-staging/context.md`
* `/Users/zubairzulifqar/pynwheel-staging/react-architecture.md`
* `/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md`

Also inspect the relevant Map & Plotting / Wayfinding / Tour Setup documentation and existing gap documents.

Read the current POC/reference material for hallway detection and graph behavior where available.

Do not assume the POC database model is suitable for production.

The POC is an algorithm/interaction reference only.

---

# 2. Understand the current Rails system before proposing anything

Trace the existing production flow end-to-end.

For Map / Floorplates / Plotting / Tour Setup / Wayfinding, identify:

```text
Route
↓
Controller
↓
Action
↓
Service / Domain Object
↓
Model
↓
Association
↓
Database table
↓
Persisted record
↓
Legacy UI rendering
```

Do this for all relevant operations.

Specifically investigate:

### Floor/map data

* Property
* Building
* Floorplate
* Floor/floor range
* SVG
* Background image
* Polygon information
* Unit placement
* Amenity placement
* Existing map metadata

### Hallway/path data

Identify exactly how the current system stores:

* hallway paths;
* nodes/points;
* path segments/edges;
* connections;
* plotted paths;
* graph relationships;
* coordinates;
* floor association;
* building association;
* path ordering;
* path geometry;
* deleted paths;
* any path metadata.

Search the complete Rails codebase for all relevant models/services/controllers and not just the obvious Map controller.

---

# 3. Identify the existing DB schema precisely

Create a database/data-model inventory.

For every table relevant to this feature document:

| Table | Purpose | Important columns | Relationships | Current writer | Current readers | Can represent new requirement? |
| ----- | ------- | ----------------- | ------------- | -------------- | --------------- | ------------------------------ |

At minimum investigate all tables/models related to:

* properties;
* buildings;
* floorplates;
* units;
* amenities;
* tour stops;
* hallway/path data;
* wayfinding;
* map plotting;
* SVG/map geometry;
* elevators;
* stairs;
* other connectors.

Do not assume the table names.

Find the real table/model names from the repository/schema.

Also inspect:

* migrations;
* schema;
* model validations;
* callbacks;
* concerns;
* scopes;
* serialized columns;
* JSON/JSONB fields;
* polymorphic associations;
* service objects;
* background jobs;
* import/sync services;
* CMS integration;
* existing API serializers.

---

# 4. Trace existing save/update/delete behavior

This is critical.

For every current map operation, determine exactly what happens today.

Investigate:

### Existing hallway plotting

When a hallway is manually created:

* what model is written?
* what table is written?
* what columns are populated?
* what service performs the write?
* are multiple records created?
* is there a graph structure?
* how is geometry stored?
* how are nodes related to edges?

### Existing hallway deletion

When a user deletes an existing DB-saved hallway/path:

* which record is deleted?
* are child records deleted?
* are relationships removed?
* are any dependent records affected?
* does the system use soft delete?
* does deletion update another record?
* is there audit/history?
* is the path referenced by wayfinding or tour-stop data?

### Existing stop plotting

When a tour stop is plotted:

* where is the stop itself stored?
* where is its floor association stored?
* where is its map location stored?
* where is its connection to a hallway stored?
* how does the current system distinguish a stop from a unit/amenity?
* how are stop types represented?
* what is persisted for elevator/stairs/etc.?

### Existing auto-wayfinding

Determine:

* where existing generated paths are stored;
* whether generation is persisted;
* whether generated paths are distinguishable from manually created paths;
* how regeneration currently behaves;
* whether existing paths are overwritten;
* what services are responsible;
* how the legacy UI consumes the resulting data.

---

# 5. Detect Hallways — new persistence requirement

The new UI has:

```text
Detect hallways on

This floorplate
1 · Floor 1

All floorplates in 1
5 floorplates
```

Current intended behavior:

> A floorplate that already has paths keeps them exactly as stored. Detect Hallways only auto-connects them, adding paths on this page where the network forces a detour. Nothing is sent to the CMS.

We now need to determine how this should evolve into a **persistent production system**.

## Important distinction

Do not assume "Detect Hallways" should overwrite existing DB records.

The plan must explicitly define the lifecycle of:

```text
Existing persisted hallway graph
+
Auto-detected temporary/new paths
+
User-created paths
+
User-deleted paths
+
User-modified paths
```

Determine the safest persistence model.

The plan must answer:

### Scenario A — floorplate has existing DB paths

What happens when Detect Hallways runs?

The plan must preserve the existing persisted network.

Do not regenerate and replace the graph.

### Scenario B — detector discovers additional required paths

How are they represented?

For example:

```text
Existing DB graph
+
new detected edge(s)
```

How are those additions distinguished?

### Scenario C — detector runs again

How do we avoid:

* duplicate edges;
* duplicate nodes;
* geometry duplication;
* graph explosion;
* repeated records;
* unexpected path movement?

### Scenario D — user manually edits a detected path

How do we distinguish:

* auto-detected data;
* user-created data;
* persisted user-approved data?

### Scenario E — user deletes a persisted hallway

How is that deletion represented safely so that Detect Hallways does not immediately recreate the deleted path?

This is particularly important.

The plan must explain how the system remembers an explicit user deletion versus "this path does not exist".

---

# 6. Define ownership of graph state

We need an explicit source-of-truth model.

Determine and document whether the final architecture should represent the map graph as:

```text
Floorplate
    └── Graph
        ├── Nodes
        ├── Edges
        ├── Unit connections
        ├── Amenity connections
        ├── Stop connections
        └── Cross-floor connections
```

or whether the existing schema already provides an equivalent structure.

Do not create a new graph model simply because it is conceptually cleaner.

First determine whether the existing models can represent the graph safely.

If the existing schema cannot represent the complete new graph, document exactly what is missing and propose the **minimum additive schema extension** required.

---

# 7. Persisting the entire graph

The new Next.js UI needs to persist the complete graph represented on the map.

The final plan must explain how we will save:

### Nodes

* ID
* floorplate
* building
* X/Y or equivalent coordinate system
* node type
* metadata
* persisted/local status

### Edges

* source node
* destination node
* geometry/path
* floorplate
* edge type
* directionality if applicable
* state/source

### Plot relationships

* unit → graph node/edge
* amenity → graph node/edge
* stop → graph node/edge

### Cross-floor relationships

* elevator ↔ corresponding floor nodes
* stairs ↔ corresponding floor nodes
* ramps where applicable
* other vertical connections

### User modifications

The plan must explain how to represent:

* created;
* updated;
* moved;
* deleted;
* restored;
* auto-detected;
* manually created;
* system-generated;
* user-approved.

Do not propose blindly storing the whole graph as one opaque JSON blob if the existing application needs individual records for editing/querying/API use.

Conversely, do not introduce many new normalized tables if the current application already has an appropriate serialized representation.

Evaluate both approaches against the existing architecture.

---

# 8. Coordinate system and geometry

This is critical because the map is rendered from SVGs.

Determine exactly how the current system stores coordinates.

Investigate:

* SVG coordinate system;
* viewport;
* viewBox;
* image coordinates;
* polygon coordinates;
* node coordinates;
* map scaling;
* floorplate dimensions;
* coordinate transformations.

The persistence plan must guarantee:

```text
Saved coordinates
↓
Next.js Map & Plotting
↓
Legacy map
↓
Tour App
```

all interpret the geometry consistently.

Do not introduce a second incompatible coordinate system.

If transformation is required, document the canonical coordinate system and where conversion occurs.

---

# 9. Tour Stops — complete persistence model

The new UI needs to create and manage different stop types.

The plan must identify how the current system represents stops and whether it can support the new requirements.

Potential UI stop types include:

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

Do not assume all of these currently exist in the DB.

For each type determine:

| Stop Type | Existing representation | Persistable today? | Graph effect | Cross-floor? | Needs schema/service change? |
| --------- | ----------------------- | ------------------ | ------------ | ------------ | ---------------------------- |

Define the semantic behavior of each stop.

For example:

### Entry Point

Normally a routable starting point.

### Exit Point

Normally a routable destination/end point.

### Elevator

A vertical connector joining corresponding graph nodes across floors/buildings where the existing system supports this.

### Stairs

A vertical connector joining relevant floors.

### Ramp

Potentially connects levels depending on existing system semantics.

### Door/Gate

May function as a pass-through or constrained connector depending on existing business logic.

### Blocker

Must not be treated as a normal traversable route node unless current business logic explicitly defines it that way.

### Leasing Office / Restroom / Mail & Packages / Parking Access / Waypoint

Normal destination/wayfinding stops unless current domain rules say otherwise.

Do not invent routing semantics.

Inspect the current application and clearly distinguish:

* existing behavior;
* required new behavior;
* missing backend capability.

---

# 10. Tour Stop lifecycle

The plan must define the complete lifecycle:

```text
Create Stop
↓
Place on Map
↓
Connect to hallway
↓
Persist
↓
Edit
↓
Move
↓
Reconnect
↓
Delete
↓
Regenerate routes
```

Explain what happens to graph relationships when:

* a stop moves;
* a stop is deleted;
* its connecting bridge is deleted;
* its floor changes;
* its building changes;
* an elevator/stairs stop is deleted;
* a stop becomes unlinked.

Also explain how old/legacy tour-stop functionality continues to work.

---

# 11. Manual hallway editing

The new Next.js UI supports editing such as:

* add node;
* move node;
* bend path;
* split path;
* delete path;
* delete node;
* reconnect;
* create bridges;
* remove bridges.

The plan must explain exactly how these operations map to existing Rails/domain operations.

For example:

```text
UI: Move node
↓
Existing backend operation?
↓
Service?
↓
Model?
↓
DB records changed?
```

Do this for each major editing action.

Do not assume every UI operation requires a new endpoint.

If several operations can safely be represented as one graph update transaction, document that option and explain why.

---

# 12. Transaction and consistency strategy

This graph is highly relational.

The final plan must explain how a graph update will be persisted safely.

For example:

```text
Save graph
↓
transaction
├── nodes
├── edges
├── unit connections
├── amenity connections
├── stop connections
└── cross-floor links
```

Determine whether the existing application already provides transaction/service boundaries.

Avoid partial saves such as:

```text
node saved
edge failed
stop connection saved
another edge failed
```

which would leave an invalid graph.

The plan must include:

* transaction boundaries;
* validation;
* rollback behavior;
* concurrency considerations;
* partial failure handling;
* idempotency where appropriate.

---

# 13. Detect Hallways must be idempotent

The plan must explicitly guarantee that repeated execution does not corrupt data.

Example:

```text
Detect Hallways
→ persist result

Detect Hallways again
→ no duplicate graph
```

Also address:

```text
Detect
→ user deletes path
→ Detect again
```

The deleted path must not blindly return unless the user/system explicitly requests regeneration according to the defined business rule.

Explain how this is tracked.

---

# 14. Legacy application compatibility — HIGHEST PRIORITY

The existing HTML/ERB system is currently working correctly.

**It must not be broken.**

This is a hard requirement.

The implementation must be backward compatible.

The plan must explicitly describe:

### Existing legacy UI

How does it continue reading:

* floorplates;
* units;
* amenities;
* hallway paths;
* tour stops;
* wayfinding data?

### New Next.js UI

How does it read/write the same data?

### Shared domain logic

Which existing services/models/business logic should remain the single source of truth?

The preferred architecture is:

```text
                    ┌── Legacy HTML/ERB UI
                    │
Existing DB ← Existing domain/business logic
                    │
                    └── Next.js API/UI
```

rather than:

```text
Legacy UI → old DB logic

Next.js → completely separate new DB logic
```

Avoid duplicating business rules in Next.js.

The backend/domain layer should remain authoritative.

---

# 15. Safe backend evolution strategy

If the current DB/schema/business logic is insufficient, do not immediately replace it.

For every required change determine:

### Reuse

Can existing models/services support it exactly as-is?

### Extension

Can an existing model/service be safely extended backward-compatibly?

### Addition

Does a new table/column/service/API need to be added?

If addition is required, explain:

* why;
* exact purpose;
* relationships;
* migration strategy;
* backfill requirements;
* default behavior;
* legacy compatibility;
* rollback strategy.

**Do not propose destructive migrations.**

Do not rename/remove existing columns/tables unless there is a proven migration path and a compelling technical requirement.

Prefer additive evolution.

---

# 16. CMS relationship must be explicitly defined

The current UI contains messaging such as:

> Nothing is sent to the CMS.

Determine exactly what "CMS" means in the current architecture.

Investigate:

* CMS models;
* external CMS APIs/services;
* synchronization jobs;
* publishing flows;
* whether map/path data is sent externally;
* whether the DB already acts as the intermediate source of truth.

The final plan must distinguish:

```text
Database persistence
vs.
CMS publishing
vs.
Next.js local editing
vs.
public/tour-app consumption
```

We need an explicit lifecycle.

For example:

```text
Next.js editing
↓
Application DB
↓
publish/sync mechanism if required
↓
CMS / Tour App
```

But do not assume this exact flow until verified against the codebase.

---

# 17. API for the Tour App

This is one of the main goals of the architecture.

The saved map/path information must be exposed through an API so the Tour App can render the same navigation model that exists in Map & Plotting.

The Tour App needs enough information to show:

* map/floorplate;
* SVG/background;
* units;
* amenities;
* plotted locations;
* hallway graph;
* nodes;
* paths;
* stops;
* stop types;
* building;
* floor;
* floor range;
* elevators;
* stairs;
* vertical connections;
* route relationships;
* route metadata.

The API must avoid forcing the mobile app to recreate the backend's business logic.

Prefer returning a normalized, stable route/map representation.

---

# 18. Define the Tour App API contract

The final plan must include an example API contract.

For example conceptually:

```text
GET /api/.../properties/:property_id/wayfinding
```

But first investigate the existing API routing conventions and use those where appropriate.

The proposed response should describe:

```json
{
  "property": {},
  "buildings": [],
  "floorplates": [],
  "nodes": [],
  "edges": [],
  "units": [],
  "amenities": [],
  "stops": [],
  "vertical_connections": []
}
```

This is an example structure only.

Use the actual architecture to determine the final shape.

Explain:

* identifiers;
* relationships;
* coordinates;
* floor/building identity;
* stop type;
* edge type;
* traversal rules;
* version;
* cacheability;
* publication state if applicable.

---

# 19. Shortest-path calculation

The Tour App should not need to understand the internal Rails database model.

The API should provide enough normalized graph data for shortest-path navigation.

Determine where shortest-path calculation should live:

### Option A

Backend calculates shortest path.

### Option B

Tour App calculates shortest path from graph data.

### Option C

Shared algorithm/service is used in both environments.

Evaluate these against:

* existing POC algorithm;
* current Rails behavior;
* performance;
* mobile constraints;
* graph size;
* consistency;
* maintainability;
* offline capability if relevant.

Do not simply choose an option without investigating the current system.

The plan must explain the recommended architecture and why.

---

# 20. Play Route / route simulation

The final Tour App flow should support:

```text
From
Main Entrance
Lobby

To
Parking Access
Lobby

Find Shortest Path
```

and then:

**Play Route**

The mobile user should be able to select:

```text
From
↓
To
↓
Find Shortest Path
↓
Route generated
↓
Play Route
↓
step-by-step / point-by-point simulation
```

The plan must explain what data is required for route simulation.

For example:

```text
Route
→ ordered nodes
→ ordered edges
→ floor transitions
→ stop transitions
→ movement geometry
```

Determine whether the current graph already provides enough information.

If not, identify the exact missing backend information.

The simulation should support:

* hallway movement;
* unit/amenity destinations;
* stops;
* elevators;
* stairs;
* floor changes;
* building changes where supported.

---

# 21. Graph traversal semantics

Define the routing semantics from actual business rules.

For every graph element determine:

```text
Traversable?
One-way?
Two-way?
Destination?
Start point?
Vertical connector?
Blocked?
Cross-floor?
Cross-building?
```

Do not invent rules that are not supported by the current application.

Where the current system has no explicit semantics, flag it as a backend/business-rule gap that requires a decision.

---

# 22. Publishing/versioning strategy

Because this will affect both the new Next.js UI and the Tour App, investigate whether we need a distinction between:

```text
Draft graph
vs.
Published graph
```

The plan must determine whether the current system already supports this.

If it does:

* reuse it.

If it does not:

* determine whether introducing graph versions/status is necessary.

The goal is to prevent the Tour App from receiving half-finished edits while an administrator is editing the map.

Do not add publishing/versioning automatically unless the investigation establishes that it is required.

---

# 23. Concurrency and legacy/new UI interaction

Consider this scenario:

```text
Legacy UI modifies map
+
Next.js UI is open
```

and:

```text
Next.js UI modifies map
+
Legacy UI is open
```

The plan must explain:

* how stale data is detected;
* whether optimistic locking/version numbers are needed;
* how conflicting updates are handled;
* whether the system can safely reject stale writes;
* how cache invalidation works.

Do not introduce data-loss behavior.

---

# 24. Performance requirements

The solution must work efficiently with real properties that can contain:

* many floorplates;
* hundreds of units;
* many amenities;
* many paths/nodes;
* many tour stops.

Do not load unrelated property/inventory data just to construct the wayfinding graph.

Define:

* what is loaded at property level;
* what is loaded per floorplate;
* what is loaded for the whole property;
* what is cached;
* what is lazy-loaded;
* what is needed by the Tour App;
* what can be queried separately.

Avoid N+1 database queries.

Reuse existing preload/includes/query patterns where appropriate.

---

# 25. Security and authorization

The plan must inspect current authorization rules and explain:

* who can read map data;
* who can edit map data;
* who can delete graph elements;
* who can create/update stops;
* who can access the Tour App API;
* whether legacy and Next.js use the same authorization rules.

Do not weaken existing authorization simply to make the new UI work.

---

# 26. Audit existing gaps and technical problems

This investigation must identify existing problems in the current DB/business logic that could affect the new architecture.

Examples to investigate:

* missing relationships;
* inconsistent path records;
* orphan nodes;
* orphan edges;
* stops without valid floorplates;
* invalid coordinates;
* duplicate paths;
* duplicate nodes;
* missing SVGs;
* inconsistent building/floor references;
* deleted records still referenced elsewhere;
* current Auto Wayfinding overwriting manual paths;
* inconsistent stop-type representation;
* lack of distinction between generated and manual paths;
* missing cross-floor relationships;
* legacy services that mutate data unexpectedly.

Do not merely list possible problems.

Inspect the actual code/data and report only confirmed issues.

For every confirmed issue:

| Problem | Existing behavior | Risk | Affected feature | Recommended safe solution | Legacy impact |
| ------- | ----------------- | ---- | ---------------- | ------------------------- | ------------- |

---

# 27. Data integrity / validation plan

The final architecture must define validation rules for persisted graph data.

Examples to investigate:

* node belongs to valid floorplate;
* edge endpoints belong to the correct graph;
* stop belongs to valid property/floor;
* unit connection belongs to same property/floor where required;
* elevator/stairs have valid floor relationships;
* duplicate edges are prevented;
* invalid coordinates are rejected;
* deleted entities cannot remain referenced.

Reuse existing Rails validations/business rules whenever possible.

Do not duplicate validation logic in Next.js.

---

# 28. Migration/backfill strategy

If the new graph model requires additional DB structures, define:

1. schema change;
2. migration;
3. existing-data backfill;
4. compatibility period;
5. read path;
6. write path;
7. validation;
8. rollout;
9. rollback.

The legacy system must remain operational throughout.

Do not propose a migration that requires taking the current system offline unless absolutely necessary.

---

# 29. Dual-read / dual-write evaluation

Explicitly determine whether we need:

* dual-read;
* dual-write;
* migration of existing records;
* compatibility adapters;
* legacy-to-new graph translation;
* new-to-legacy translation.

Do not assume dual-write is required.

Evaluate it based on the actual existing schema and business logic.

The preferred approach should minimize duplicated sources of truth.

---

# 30. API strategy

Determine which existing APIs/controllers can be reused.

For every proposed endpoint document:

| Endpoint | Purpose | Existing equivalent | HTTP method | Auth | Data source | Write? |
| -------- | ------- | ------------------- | ----------- | ---- | ----------- | ------ |

For mutation APIs, document:

* request payload;
* validation;
* transaction;
* response;
* error handling;
* authorization;
* idempotency;
* concurrency behavior.

For read APIs, document:

* pagination where needed;
* caching;
* associations;
* payload size;
* stable identifiers.

Do not create APIs that duplicate an existing endpoint without a concrete reason.

---

# 31. Service/domain architecture

Identify which existing services/business objects should become the authoritative layer for:

* hallway detection;
* graph construction;
* graph persistence;
* graph mutation;
* stop placement;
* stop connections;
* cross-floor connections;
* shortest path;
* route simulation data preparation.

If existing services can be extended safely, prefer that.

If a new service is necessary, define its responsibility precisely.

Avoid putting domain/business logic directly into Rails controllers or Next.js components.

---

# 32. Backward compatibility requirement

The final architecture must satisfy this invariant:

```text
Existing legacy system continues working exactly as before
while
new Next.js UI gains the new persistence/API capabilities.
```

Any proposed backend change must answer:

```text
What does the legacy system see after this change?
```

and:

```text
Can the legacy system still read and operate on the data?
```

No destructive changes.

No behavior changes to existing flows unless explicitly required and demonstrated safe.

---

# 33. Required first deliverable — architecture investigation report

Before any implementation, produce a detailed report containing:

## A. Current architecture

```text
Routes
Controllers
Services
Models
Tables
Associations
Existing APIs
Legacy UI
```

## B. Current map graph data model

Show the actual relationships.

For example:

```text
Property
 ↓
Building
 ↓
Floorplate
 ↓
?
```

Then the actual graph relationships discovered from code.

## C. Current tour-stop model

Show exactly how the existing system represents stops.

## D. Current wayfinding model

Show exactly how shortest-path and route data currently works.

## E. Current persistence flow

Explain current create/update/delete flows.

## F. Confirmed backend gaps

Only real, code/data-backed gaps.

## G. Proposed target architecture

Explain how the new Next.js UI will persist data using the existing system.

## H. Proposed schema changes

Only when genuinely necessary.

## I. Proposed APIs

For Next.js and the Tour App.

## J. Compatibility strategy

Explain exactly how legacy + Next.js will coexist safely.

## K. Migration strategy

If required.

## L. Rollout and rollback strategy

How we deploy without risking the existing application.

---

# 34. Required target-state model

The final plan must explain the complete lifecycle:

```text
Existing DB data
        ↓
Next.js Map & Plotting loads graph
        ↓
User runs Detect Hallways
        ↓
Existing persisted paths remain protected
        ↓
New detected/derived paths are generated
        ↓
User reviews/edits graph
        ↓
User creates/deletes/moves paths
        ↓
User plots units/amenities/stops
        ↓
User connects bridges
        ↓
User configures elevators/stairs/vertical links
        ↓
Graph is persisted through Rails business/domain layer
        ↓
Validated persisted graph
        ↓
Wayfinding consumes graph
        ↓
Shortest path calculated
        ↓
Route returned
        ↓
Tour App consumes same map + graph
        ↓
User selects From / To
        ↓
Shortest route
        ↓
Play Route
        ↓
Point-by-point / stop-by-stop simulation
```

For every arrow, explain:

* component responsible;
* DB interaction;
* service/business logic;
* API;
* validation;
* failure behavior.

---

# 35. Do not implement until the plan is approved

This task is **PLAN ONLY**.

Do not:

* edit DB;
* run migrations;
* modify models;
* modify controllers;
* create endpoints;
* change services;
* change React code;
* change legacy code.

The only code-level activity allowed during investigation is reading/searching the existing code to understand how the current system works.

---

# 36. Final recommendation must be conservative

The final architecture should follow these principles:

### 1. Existing DB/business logic first

Reuse what already works.

### 2. One source of truth

Avoid creating a parallel map database.

### 3. Additive changes

Prefer extending the current system rather than replacing it.

### 4. Legacy-safe

The current HTML/ERB application must continue working.

### 5. Explicit graph state

Do not allow Detect Hallways to silently overwrite persisted user data.

### 6. User edits are authoritative

Explicit user changes/deletions must be distinguishable from automatic detection.

### 7. API-first graph consumption

The Tour App should consume a stable graph representation through an API.

### 8. Domain logic stays in Rails

Do not duplicate core business rules in Next.js or the mobile application.

### 9. Production performance

Avoid unnecessary full-property/full-inventory loading.

### 10. Safe rollout

Every schema/service/API change must have a compatibility and rollback strategy.

---

# 37. Final deliverable format

End your response with these sections:

```text
1. Executive Summary

2. Existing DB/Data Model

3. Existing Rails Services & Business Logic

4. Existing Map/Path Persistence Flow

5. Existing Tour Stop Persistence Flow

6. Existing Wayfinding & Shortest Path Flow

7. Current Legacy UI Dependencies

8. Confirmed Problems/Gaps

9. Target Graph Architecture

10. Detect Hallways Persistence Strategy

11. Manual Plotting Persistence Strategy

12. Path Deletion Strategy

13. Tour Stop Persistence Strategy

14. Stop-Type Routing Semantics

15. Elevator/Stairs Cross-Floor Strategy

16. Graph Save/Update/Delete Transaction Strategy

17. Draft vs Published Strategy

18. Next.js API Strategy

19. Tour App API Contract

20. Shortest Path Architecture

21. Play Route / Simulation Architecture

22. Coordinate/Geometry Strategy

23. Performance Strategy

24. Authorization Strategy

25. Legacy Compatibility Strategy

26. Migration/Backfill Strategy

27. Rollout Strategy

28. Rollback Strategy

29. Testing Strategy

30. Exact Files/Classes/Services That Would Need Changes

31. Recommended Implementation Order

32. Open Questions / Decisions Required
```

For every proposed backend change, clearly state:

```text
Existing:
What we already have.

Reuse:
What can remain unchanged.

Change:
What must be modified.

Add:
What must be newly introduced.

Risk:
What could affect the current application.

Compatibility:
How the legacy system remains safe.

Migration:
How existing data is handled.

Rollback:
How we safely undo the change.
```

## MOST IMPORTANT FINAL REQUIREMENT

Do not produce a generic architecture proposal.

The final plan must be **specific to the existing Pynwheel Rails codebase, existing DB schema, existing services, existing business logic, and existing legacy Map/Tour system**.

Every recommendation must be traceable to something discovered in the repository.

Where the existing system does not support a requirement, clearly say:

```text
Current system does not support this directly.
```

Then explain the **minimum safe extension** required.

Do not invent existing models, columns, services, APIs, or business rules.

The goal is not to redesign the backend from scratch.

The goal is to **safely evolve the existing backend so the new Next.js Map & Plotting / Wayfinding system can persist a complete navigable graph and expose that same graph to the Tour App, while the existing HTML/ERB application continues to work without regression.**

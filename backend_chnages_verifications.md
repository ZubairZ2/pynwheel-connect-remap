# CRITICAL PRODUCTION SAFETY TASK

## Verify New Backend/DB Changes Are 100% Backward-Compatible With the Existing Legacy HTML/ERB Application

This is a **high-risk production verification task**.

We have already implemented and merged the newer backend/CMS/Map & Plotting changes into `main`.

Now we need to verify, **before deploying the newer backend**, that:

1. The new database changes are safe.
2. The new Rails/backend code is safe.
3. The existing legacy HTML/ERB application continues to work exactly as before.
4. The shared production database remains compatible with both backend versions.
5. No existing legacy functionality is broken, changed, or made unstable.
6. The new Next.js / FastAPI / Map & Plotting functionality can use the new schema safely.

This must be treated as a **production database compatibility and regression audit**, not as a normal code review.

---

# 1. SYSTEM TOPOLOGY — UNDERSTAND THIS FIRST

The current deployment architecture is:

```text
                     SAME DATABASE
                          │
             ┌────────────┴─────────────┐
             │                          │
        Server A                    Server B2
   Legacy Rails/HTML app       Newer backend code
             │                          │
             │                          │
             └──────────┬───────────────┘
                        │
                    PostgreSQL
```

### Server A

Contains:

* current legacy HTML/ERB application;
* older Rails/backend code;
* currently working production behavior.

### Server B1

Contains:

* new Next.js application.

### Server B2

Contains:

* newer backend changes;
* new backend/API functionality.

### Critical fact

**Server B2 points to the same production DB used by Server A.**

Therefore:

> A migration or backend change made for B2 can potentially affect Server A even though Server A's code has not changed.

This is the exact risk we need to eliminate.

---

# 2. DATABASE SAFETY ENVIRONMENT

The local database:

```text id="tvq6zu"
pynwheel_prod
```

is the local copy/dump of the production DB.

Use this database for deep schema/data compatibility testing wherever possible.

Do **NOT** experiment directly against the live shared production DB.

Do not:

* drop production tables;
* truncate production tables;
* delete production graph/path data;
* run destructive test mutations;
* change production feature flags during investigation;
* enable production writes unless explicitly instructed.

---

# 3. READ ALL ARCHITECTURE / IMPLEMENTATION DOCUMENTATION FIRST

Before touching the code, read:

```text id="vzwtrg"
/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/backend_implementation.md

/Users/zubairzulifqar/pynwheel-staging/backend_architecture_plan_report.md

/Users/zubairzulifqar/pynwheel-staging/backend_architecture_plan_for_ploting.md
```

Also inspect the relevant Map & Plotting / Tour Setup / CMS implementation documentation.

These documents contain the history and reasoning for the backend changes that have already been made.

Do not recreate assumptions from memory.

---

# 4. FIRST TASK — BUILD AN EXACT CHANGE INVENTORY

Before declaring anything safe, identify **every DB and backend change that was introduced by the merged branch**.

Inspect:

* `git diff`;
* merge commit;
* migrations;
* schema changes;
* models;
* services;
* controllers;
* routes;
* serializers;
* callbacks;
* concerns;
* jobs;
* DB functions;
* triggers;
* indexes;
* constraints;
* foreign keys;
* enums;
* data migrations;
* seeds;
* configuration changes.

Produce an exact inventory:

| Change | Type                    | New/Modified | Existing data affected | Legacy risk |
| ------ | ----------------------- | ------------ | ---------------------- | ----------- |
| ...    | table/column/index/etc. | ...          | ...                    | ...         |

Do not assume the only changes are the migrations you remember.

Search the entire merged diff.

---

# 5. CLASSIFY EVERY DATABASE CHANGE

For every migration, classify the change as:

```text
ADD TABLE
ADD COLUMN
ALTER COLUMN
ADD INDEX
ADD FOREIGN KEY
ADD CONSTRAINT
ADD ENUM
ADD FUNCTION
ADD TRIGGER
DATA MIGRATION
UPDATE EXISTING DATA
DELETE EXISTING DATA
RENAME
DROP
CHANGE DEFAULT
CHANGE NULLABILITY
CHANGE TYPE
```

This is important because **not all "additive" changes are automatically safe**.

---

# 6. NEW TABLE COMPATIBILITY AUDIT

For every new table added by the new backend:

Verify:

* no existing legacy query depends on that table;
* no existing table was modified in a way that requires the legacy app to know about the new table;
* foreign keys do not unexpectedly alter existing delete/update behavior;
* triggers do not affect existing legacy records;
* constraints do not affect unrelated existing operations;
* indexes do not change behavior;
* table names do not collide with legacy Rails models;
* PostgreSQL objects do not conflict with the legacy application.

A new table should generally be invisible to the old application unless the old application explicitly interacts with it.

But do not assume this — prove it.

Search the legacy code for:

* table name;
* association name;
* model name;
* foreign key;
* related service.

---

# 7. NEW COLUMN COMPATIBILITY AUDIT

For every new column added to an existing table, investigate:

```text id="k3f7gs"
Column name
Data type
NULL allowed?
Default?
DB constraint?
Existing records?
Existing Rails model?
Existing INSERT paths?
Existing UPDATE paths?
```

### Critical question

Could the older Server A code perform an INSERT that fails because of the new column?

For example:

```text id="rjq4hj"
new column
NOT NULL
no default
```

can break an old application that inserts into the table without providing that field.

This must be explicitly checked.

Also check whether any existing Rails code uses:

* raw SQL `INSERT`;
* `INSERT ... SELECT`;
* bulk insert;
* `update_all`;
* `upsert`;
* direct database writes;
* database functions.

Do not only inspect ActiveRecord models.

---

# 8. CHECK EXISTING SELECT BEHAVIOR

Verify that adding columns does not break legacy queries.

Inspect legacy code for:

* `SELECT *`;
* explicit column lists;
* raw SQL;
* views;
* reports;
* serializers;
* CSV exports;
* database functions.

Determine whether any code assumes a fixed number/order of columns.

Do not assume `SELECT *` is automatically harmless in every code path.

---

# 9. CHECK EXISTING INSERT BEHAVIOR

This is one of the most important tests.

For every existing table modified by the new migration:

Identify all legacy write paths.

Test the old application operations that create/update records in that table.

Examples:

```text id="0z7qx0"
Legacy UI
→ create record
→ DB
```

and:

```text id="d4w3cg"
Legacy UI
→ update existing record
→ DB
```

Verify the new schema does not cause:

* validation failure;
* database constraint failure;
* missing-column failure;
* null violation;
* foreign-key failure;
* callback failure;
* serialization failure.

---

# 10. CHECK EXISTING DELETE BEHAVIOR

This is especially important for the new graph/path relationships.

Inspect:

* foreign keys;
* `ON DELETE`;
* `ON UPDATE`;
* Rails `dependent:` behavior;
* callbacks;
* service-layer cleanup.

A new foreign key must not cause a legacy operation such as deleting a property, floorplate, unit, amenity, or stop to fail unexpectedly.

Also verify the opposite:

A legacy delete must not unexpectedly delete newly added graph/path records unless that is explicitly intended.

---

# 11. CHECK EXISTING UPDATE BEHAVIOR

Test legacy operations that update the existing tables touched by the new changes.

Verify:

```text id="8b4u8z"
Legacy update
↓
existing fields remain correct
↓
new fields/relations remain safe
```

The new fields must not accidentally alter legacy business behavior.

---

# 12. CHECK RAILS MODEL COMPATIBILITY

For every existing Rails model whose table was changed:

inspect:

* model definition;
* validations;
* callbacks;
* associations;
* scopes;
* serializers;
* decorators;
* service objects;
* forms;
* controllers.

Determine whether the old Server A code will:

* load the model;
* instantiate it;
* save it;
* update it;
* destroy it;

without knowing about the new fields/tables.

---

# 13. CHECK `schema.rb` / `structure.sql`

Compare:

### Before migration

against:

### After migration

Identify all structural differences.

Do not rely only on Rails migration filenames.

Verify the actual PostgreSQL schema.

Record:

* tables;
* columns;
* indexes;
* constraints;
* foreign keys;
* sequences;
* enums;
* functions;
* triggers.

The final report must represent the **actual database**, not just migration intent.

---

# 14. VERIFY MIGRATION ORDER

Inspect all new migrations.

Verify:

* correct ordering;
* dependencies;
* no migration relies on a later migration;
* migration is reversible where applicable;
* rollback does not corrupt existing data;
* production migration can run while Server A remains active.

Pay particular attention to migrations that:

* change nullability;
* change data types;
* rename objects;
* create constraints;
* backfill data;
* update many rows;
* create foreign keys.

---

# 15. TEST THE LEGACY APP AGAINST THE NEW DATABASE SCHEMA

This is the most important practical test.

We need to simulate:

```text id="q7a9zt"
Server A code
        ↓
NEW database schema
        ↓
old HTML application
```

Use a safe database clone based on `pynwheel_prod`.

Apply the new migrations to that clone.

Then run the **old/legacy Rails application code** against that migrated DB.

Do not merely run the new Rails application.

The objective is specifically:

> Can the old application continue operating against the new schema?

---

# 16. LEGACY REGRESSION TEST MATRIX

Run real legacy flows against the migrated DB.

At minimum test:

### Authentication

* login;
* logout;
* session;
* authorization.

### Companies

* company listing;
* search;
* filters;
* company details;
* navigation.

### Properties

* property listing;
* search;
* filters;
* property details;
* navigation.

### Inventory

Where supported by the legacy system:

* floorplates;
* floorplans;
* units;
* amenities.

### Map

Critical:

* property map loads;
* floorplates load;
* SVG/map loads;
* plotted units load;
* plotted amenities load;
* existing paths load;
* existing wayfinding data loads.

### Tour Setup

* Tour Stops;
* existing Additional Stops;
* existing elevator/stairs;
* routing;
* existing wayfinding behavior.

Record every failure.

---

# 17. TEST REAL PRODUCTION-SHAPED DATA

Use the local `pynwheel_prod` production dump.

Do not limit testing to synthetic records.

Test real properties covering:

```text id="v0g6df"
Hazel
John Demo
Testing 123
Jennifer Demo FP
```

plus other properties with:

* existing maps;
* existing SVGs;
* existing paths;
* existing Tour Stops;
* multiple buildings;
* multiple floors;
* elevators;
* stairs;
* units;
* amenities.

---

# 18. COMPARE LEGACY BEHAVIOR BEFORE VS AFTER

Where possible, establish a baseline using:

```text id="yv8hws"
Legacy code
+
Original DB schema
```

Then:

```text id="rky26q"
Legacy code
+
New DB schema
```

Compare:

* page load;
* queries;
* record counts;
* rendered values;
* map data;
* Tour Stops;
* errors.

The objective is not necessarily byte-for-byte identical responses, but **no unintended business/functional change**.

---

# 19. CRITICAL GRAPH/PATH COMPATIBILITY

The new backend added/changed Map & Plotting / graph persistence.

Verify that legacy Map & Plotting can still read:

* existing nodes;
* existing paths;
* existing hallway mappings;
* unit connections;
* amenity connections;
* stop connections.

If the new backend creates additional graph records, verify the legacy system does not:

* crash;
* render malformed data;
* misinterpret them;
* delete them accidentally;
* treat them incorrectly.

---

# 20. DETECT HALLWAYS COMPATIBILITY

Test:

### Before

Legacy Map & Plotting with existing persisted paths.

### After

Same legacy Map & Plotting against the new schema/backend.

Verify:

* existing paths remain;
* existing map renders;
* path counts are correct;
* no legacy route is broken;
* no unexpected records disappear.

Also verify that Detect Hallways in the new system does not create a DB state that the legacy system cannot understand.

---

# 21. TOUR STOP COMPATIBILITY

This is particularly important because the new backend now supports:

```text id="cw6j0e"
Unit/Amenity
→ Show in Stops List
→ Tour Stop
```

Verify that a legacy Tour Setup page can still read those resulting records correctly.

Test:

```text id="gwsq7x"
Unit Show in Stops List ON
↓
new DB record/relationship
↓
legacy Tour Setup
```

and:

```text id="v7rt3p"
Amenity Show in Stops List ON
↓
new DB record/relationship
↓
legacy Tour Setup
```

Verify no duplicate or malformed records are created.

---

# 22. FOREIGN-KEY / CASCADE AUDIT

For every new FK:

document:

```text id="c7jh9f"
Parent
Child
ON DELETE
ON UPDATE
Existing Rails dependent behavior
Legacy impact
```

Look for dangerous combinations such as:

```text id="x8f70w"
ON DELETE CASCADE
```

where deleting an existing legacy record could unexpectedly delete newly created map/route/tour data.

If this exists, determine whether it is intentional.

---

# 23. DATA BACKFILL SAFETY

If the merged migration contains a data backfill:

inspect exactly:

* what records it touches;
* how many rows;
* which properties;
* whether null values are introduced;
* whether existing business values are changed;
* whether it is reversible;
* whether legacy code expects the old values.

Do not accept "backfill completed" as sufficient.

Verify actual records.

---

# 24. INDEX / CONSTRAINT SAFETY

For every new:

* index;
* unique constraint;
* check constraint;
* foreign key;

verify that existing production data satisfies it.

Before applying the migration to a production-like clone:

run validation queries to identify conflicts.

For example:

```text id="2fm7r6"
duplicates
null references
orphan records
invalid foreign keys
```

Do not allow a migration to expose latent data inconsistencies without documenting them.

---

# 25. DATABASE PERFORMANCE IMPACT

Check whether the new migrations could affect Server A performance.

Inspect:

* new indexes;
* indexes on high-volume tables;
* large backfills;
* lock behavior;
* long-running migration queries;
* full-table updates.

The migration should not create unacceptable locking or query regressions.

For large tables, determine whether the migration strategy is safe for production.

---

# 26. ROLLBACK SAFETY

The existing rollout safety mechanism is:

```bash
heroku config:set PYN_CONNECT_WRITES=on PYN_CONNECT_WRITES_COMMUNITY_IDS=1411 -a pyn-system
```

and rollback begins with:

```bash
heroku config:set PYN_CONNECT_WRITES=off -a pyn-system
```

followed by release rollback, and only then:

```text
db:rollback STEP=11
```

if the schema itself must be reverted.

### Verify this mechanism

Do not modify it unnecessarily.

Confirm from the actual implementation:

* where `PYN_CONNECT_WRITES` is checked;
* which operations it protects;
* whether turning it OFF immediately prevents new writes;
* whether legacy behavior depends on it;
* whether migration rollback is actually safe.

---

# 27. IMPORTANT: DEFAULT PRODUCTION WRITE STATE

Unless explicitly instructed otherwise:

```text id="ez88af"
PYN_CONNECT_WRITES=off
```

must remain the default safe production state.

Do not enable production writes merely to complete testing.

Use the known safe rollout model.

---

# 28. VERIFY NEW TABLES ARE INVISIBLE TO LEGACY CODE

For each newly introduced table, verify:

```text id="9y6g7s"
Old Rails application
↓
loads normal property/map/tour screens
↓
does not require new table
↓
does not fail because new table exists
```

Also verify the new tables do not introduce unexpected database-level behavior through:

* triggers;
* foreign keys;
* callbacks;
* functions.

---

# 29. VERIFY NEW COLUMNS ARE SAFE FOR OLD CODE

For each new column confirm:

```text id="w2xqbj"
nullable?
default?
existing INSERT safe?
existing UPDATE safe?
existing SELECT safe?
existing Rails model safe?
```

Pay particular attention to old code that performs direct writes without the new field.

---

# 30. API/BACKEND CODE COMPATIBILITY

Review the merged backend code for:

* shared controllers;
* shared services;
* changed models;
* changed callbacks;
* changed serializers;
* changed routes.

A new API endpoint is normally isolated from Server A.

But modifications to shared models/services are not automatically safe.

For every shared-code change ask:

> Can the old Server A code execute this code path without knowing about the new feature?

If yes, prove it through tests.

---

# 31. DO NOT "FIX" LEGACY REGRESSIONS BY CHANGING LEGACY BEHAVIOR

If testing reveals a legacy regression:

Do not immediately alter Server A behavior.

First identify whether the new change can be isolated.

Preferred order:

```text id="9j6sdf"
1. Make new change additive.
2. Isolate new behavior.
3. Preserve old behavior.
4. Add compatibility adapter if required.
5. Only change legacy behavior if explicitly approved.
```

The goal is **zero legacy functional change**.

---

# 32. CHECK DATABASE RECORD COUNTS

Before and after migration, compare counts for important existing tables.

For example:

* properties;
* buildings;
* floorplates;
* floorplans;
* units;
* amenities;
* tour stops;
* path/node records.

A schema-only migration should not unexpectedly alter these counts.

If records do change because of a deliberate backfill, document exactly why.

---

# 33. CHECK EXISTING DATA INTEGRITY

Run integrity checks after migration:

```text id="mt7r2k"
Orphan floorplates
Orphan units
Orphan amenities
Orphan stops
Orphan paths
Orphan nodes
Invalid foreign keys
Duplicate logical paths
Duplicate stops
Invalid property relationships
Invalid floor relationships
```

Compare the result with the pre-migration baseline.

---

# 34. CHECK SCHEMA CACHE / DEPLOYMENT BEHAVIOR

Inspect whether the new migration requires:

* application restart;
* schema cache refresh;
* Rails schema reload;
* connection recycle.

Verify Server A does not continue operating with stale assumptions after the DB migration.

The deployment plan must explicitly address:

```text id="df79c0"
Migration
↓
existing Server A processes
↓
new Server B2 processes
```

and whether any rolling-deployment compatibility issue exists.

---

# 35. BACKWARD-COMPATIBLE DEPLOYMENT ORDER

Determine the safest production deployment order.

For example, evaluate:

```text id="xkx2kk"
1. Add backward-compatible DB schema
2. Keep legacy app running
3. Deploy B2
4. Deploy B1
5. Enable new writes only when verified
```

Do not assume this exact order.

Determine the safest order from the actual changes.

The important principle is:

> During every intermediate deployment state, Server A must remain functional.

---

# 36. TEST WITH BOTH APPLICATION VERSIONS

The final test environment should simulate:

```text id="v6s0fc"
Legacy Server A
+
New Server B2
+
Same DB
```

with both operating against the same migrated database.

Test read/write scenarios where appropriate.

Examples:

```text id="aeq7hq"
Server A reads
Server B2 reads
Server A writes
Server B2 reads

Server B2 writes
Server A reads
```

For every supported shared entity, verify the other system remains functional.

---

# 37. MAP/Tour SHARED-DATA TEST

This is especially important.

Test:

```text id="dekvuk"
Legacy Map & Plotting
↓
existing graph

New Map & Plotting
↓
same graph

Legacy Tour Setup
↓
same stops

New Tour Setup
↓
same stops

Tour App API
↓
same graph/stops
```

All three consumers must agree on the same underlying data.

---

# 38. REAL-DATA TEST SCENARIOS

Use the local `pynwheel_prod` dump and test:

### Hazel

* map;
* SVG;
* paths;
* stops;
* units;
* amenities.

### John Demo

* existing graph;
* paths;
* stops;
* Map & Plotting;
* Tour Setup.

### Testing 123

* property data;
* map/tour features where available.

### Jennifer Demo FP

* floorplates;
* SVG;
* paths;
* tour data where available.

### Additional real properties

Select properties with different combinations of:

* Tour enabled;
* Tour disabled;
* SVG present;
* SVG missing;
* paths present;
* no paths;
* elevators;
* stairs;
* multiple buildings.

---

# 39. NO HARDCODED SAFETY TESTS

Do not validate compatibility only with hardcoded property IDs.

Use actual queries/data to discover affected records.

The final system must be safe for the complete database, not only:

```text
1411
```

---

# 40. AUTOMATED TESTS

Add or run tests covering:

### Migration

* up;
* down where supported;
* existing data compatibility;
* constraints;
* indexes.

### Models

* existing model behavior;
* new relationships;
* old validations.

### Services

* old service behavior;
* new graph/tour service behavior.

### Controllers/APIs

* existing legacy endpoints;
* new endpoints.

### Integration

* old application + new schema;
* new backend + new schema.

---

# 41. PRODUCTION-LIKE SMOKE TEST

After migration, run a complete legacy smoke test:

```text id="d9x9v5"
Login
↓
Companies
↓
Properties
↓
Property
↓
Inventory
↓
Map
↓
Floorplate
↓
Units
↓
Amenities
↓
Tour Setup
↓
Wayfinding
```

No critical error should occur.

---

# 42. DATABASE WRITE SAFETY TEST

For every newly introduced write operation:

1. Capture the DB state before.
2. Perform the new operation in a safe clone.
3. Capture DB state after.
4. Identify exactly which rows changed.
5. Verify only intended rows changed.
6. Verify the legacy application can still read the affected records.

Do not accept UI success alone.

---

# 43. SHARED DB CONTRACT

At the end of the audit, explicitly define:

```text id="y02qtw"
Existing columns/tables
→ legacy dependency

New columns/tables
→ new-system dependency

Shared records
→ compatibility rule
```

There must be a clear contract explaining which changes are safe for both application versions.

---

# 44. CRITICAL QUESTIONS THAT MUST BE ANSWERED

The final report must explicitly answer:

### Q1

Can the old Server A application run against the new migrated DB?

**YES / NO**

Evidence:

...

### Q2

Can Server A continue writing to every existing table it currently writes to?

**YES / NO**

Evidence:

...

### Q3

Can Server A continue reading every affected table?

**YES / NO**

Evidence:

...

### Q4

Can the new B2 backend run against the same DB?

**YES / NO**

Evidence:

...

### Q5

Can both versions operate simultaneously?

**YES / NO**

Evidence:

...

### Q6

Can a new B2 graph/tour write be read safely by Server A?

**YES / NO / NOT APPLICABLE**

Evidence:

...

### Q7

Can a legacy Server A write be read correctly by B2?

**YES / NO**

Evidence:

...

### Q8

Are any migration/schema changes potentially destructive?

**YES / NO**

Evidence:

...

---

# 45. REQUIRED OUTPUT — DATABASE COMPATIBILITY MATRIX

Create:

```text
database_legacy_compatibility_report.md
```

with:

| Change | DB Object | Legacy Read | Legacy Write | New Backend | Risk | Test Result |
| ------ | --------- | ----------- | ------------ | ----------- | ---- | ----------- |
| ...    | ...       | PASS/FAIL   | PASS/FAIL    | PASS/FAIL   | ...  | ...         |

For every table/column/migration involved.

---

# 46. REQUIRED OUTPUT — EXACT MIGRATION SAFETY REPORT

In the same document include:

```text id="0o1h16"
Migration:
Purpose:
Tables affected:
Columns affected:
Existing data affected:
New records created:
Constraints:
Indexes:
Foreign keys:
Triggers:
Legacy impact:
B2 impact:
Rollback:
Test result:
```

Do not skip migrations just because they appear small.

---

# 47. REQUIRED OUTPUT — LEGACY TEST REPORT

Document:

```text id="e70kwx"
Environment:
Database:
Legacy code version:
New backend version:

Authentication:
Companies:
Properties:
Inventory:
Floorplates:
Units:
Amenities:
Map:
SVG:
Paths:
Wayfinding:
Tour Setup:

Console/server errors:
Database errors:
Unexpected behavior:
```

Use real observed results.

---

# 48. REQUIRED OUTPUT — RISK CLASSIFICATION

Classify every change:

```text id="zj8t7p"
SAFE
LOW RISK
MEDIUM RISK
HIGH RISK
BLOCKER
```

Anything that can break Server A must be treated as **BLOCKER** until resolved or explicitly approved.

---

# 49. FINAL ACCEPTANCE CRITERIA

Do not declare this task complete unless:

### Database

* migrations reviewed;
* actual schema verified;
* existing data integrity verified;
* no unintended data changes;
* new tables safe;
* new columns safe;
* constraints safe;
* foreign keys safe;
* indexes safe;
* rollback understood.

### Legacy

* Server A can run against the new schema;
* existing login works;
* Companies work;
* Properties work;
* Inventory works;
* Map works;
* existing SVG maps work;
* existing paths work;
* Tour Setup works;
* existing wayfinding works.

### New system

* B2 works against the same DB;
* new graph works;
* new Tour Stop features work;
* APIs work;
* new writes are controlled by the existing safety switch.

### Coexistence

* Server A + B2 can operate simultaneously;
* Server A reads new-safe data;
* B2 reads legacy data;
* no cross-system corruption;
* no unexpected deletion;
* no legacy regressions.

---

# 50. FINAL DEPLOYMENT RECOMMENDATION

Based on the actual evidence, provide a production recommendation:

```text id="0j5m3u"
GO
```

or:

```text id="s7w8e0"
DO NOT DEPLOY
```

Do not give a "GO" merely because tests passed superficially.

A GO requires evidence that:

```text id="8a8z1x"
Legacy Server A
        +
New Server B2
        +
Same Production DB
```

can safely coexist.

If anything is uncertain, explicitly identify it.

---

# 51. FINAL REPORT

End with:

```text id="2f3s8m"
# Production DB / Legacy Compatibility Decision

## Database Schema Safety
PASS / FAIL

## Migration Safety
PASS / FAIL

## Existing Data Integrity
PASS / FAIL

## Legacy Server A
PASS / FAIL

## New Server B2
PASS / FAIL

## Shared-DB Coexistence
PASS / FAIL

## Map & Plotting
PASS / FAIL

## Tour Setup
PASS / FAIL

## SVG Maps
PASS / FAIL

## Graph / Paths
PASS / FAIL

## Overall Deployment Decision
GO / DO NOT DEPLOY

## Critical Findings
...

## Required Fixes Before Deployment
...

## Rollback Plan
...

## Evidence / Tests Performed
...
```

---

# FINAL NON-NEGOTIABLE RULE

**The existing legacy HTML/ERB application is the protected system.**

The new backend/DB implementation must adapt around it.

Do not break the current system to make the new system easier.

Do not assume a new table or new column is automatically harmless.

Prove compatibility at:

```text id="jz71x2"
Database schema
↓
Rails models
↓
Rails services
↓
Rails controllers
↓
Legacy HTML/ERB
```

and simultaneously:

```text id="fg1v2m"
Same database
↓
New B2 backend
↓
Next.js / Tour APIs
```

The final objective is:

```text id="a9q4zv"
                    SAME DB
                      │
          ┌───────────┴───────────┐
          │                       │
     Legacy Server A          New Server B2
     Old Rails/HTML           New Backend/API
          │                       │
          └───────────┬───────────┘
                      │
                 No conflict
                 No regression
                 No corruption
```

**Do not modify the production database merely to test compatibility. Use a production-data clone wherever possible. Do not enable new production writes during this audit unless explicitly required and approved.**

The final result must be based on **actual code inspection, actual migration/schema inspection, actual DB validation, and actual legacy/new-system testing with real Pynwheel data** — not assumptions.
